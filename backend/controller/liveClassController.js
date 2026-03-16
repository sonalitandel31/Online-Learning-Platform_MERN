const courseModel = require("../models/courseModel");
const enrollmentModel = require("../models/enrollmentModel");
const liveClassModel = require("../models/liveClassModel");
const liveAttendanceModel = require("../models/liveAttendanceModel");

const sendEmail = require("../utils/sendEmail");
const {
  emailLiveCreated,
  emailLiveReminder10Min,
  emailLiveRescheduled,
  emailLiveCancelled,
  emailLiveRecordingReady,
} = require("../utils/liveClassEmails");

const { createZoomMeeting } = require("../config/zoom");
const { emitToLiveClass } = require("../socket/liveClassSocket");
const { syncLiveClassAttendance } = require("../services/liveAttendanceSyncService");
const { getMeetingRecordings } = require("../config/zoom");

// -----------------------------
// Helpers
// -----------------------------

const ALLOWED_PROVIDERS = ["zoom", "webrtc"];
const JOIN_WINDOW_MINUTES = 10;

const isValidHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const isValidDate = (value) => {
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
};

const normalizeRole = (role) => String(role || "").trim().toLowerCase();

const activeEnrollmentQuery = (userId, courseId, now = new Date()) => ({
  student: userId,
  course: courseId,
  status: { $in: ["active", "completed"] },
  $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }],
});

const getLiveClassEndAt = (liveClass) => {
  return new Date(
    new Date(liveClass.startAt).getTime() +
      Number(liveClass.durationMin || 60) * 60000
  );
};

const getAttendanceStatus = (minutesAttended, totalDurationMin) => {
  const total = Math.max(1, Number(totalDurationMin || 0));
  const attended = Math.max(0, Number(minutesAttended || 0));
  const ratio = attended / total;

  if (ratio >= 0.75) return "present";
  if (ratio > 0) return "partial";
  return "absent";
};

const resolveLiveClassStatus = async (liveClass) => {
  if (!liveClass || liveClass.status === "cancelled") return liveClass;

  const now = new Date();
  const startAt = new Date(liveClass.startAt);
  const endAt = getLiveClassEndAt(liveClass);

  let nextStatus = liveClass.status;

  if (now >= endAt) {
    nextStatus = "ended";
  } else if (now >= startAt && now < endAt) {
    nextStatus = "live";
  } else {
    nextStatus = "scheduled";
  }

  if (nextStatus !== liveClass.status) {
    liveClass.status = nextStatus;
    liveClass.lastStatusSyncedAt = now;
    await liveClass.save();

    emitToLiveClass(liveClass._id, "liveClass:statusUpdated", {
      liveClassId: liveClass._id,
      status: liveClass.status,
    });
  }

  return liveClass;
};

const syncRecordingAfterClass = async (liveClassId) => {
  try {
    const liveClass = await liveClassModel.findById(liveClassId);

    if (!liveClass || !liveClass.meetingId) return;

    const recordingData = await getMeetingRecordings(liveClass.meetingId);

    if (!recordingData) return;

    const files = recordingData.recording_files || [];

    if (!files.length) return;

    const video = files.find((f) => f.file_type === "MP4");

    if (!video) return;

    liveClass.recordingLink = video.play_url || video.download_url;
    liveClass.recordingStatus = "ready";
    liveClass.recordingDurationMin = Math.round(
      Number(video.recording_end) - Number(video.recording_start)
    );

    liveClass.recordingAvailableAt = new Date();

    await liveClass.save();

    console.log("Recording synced for class:", liveClassId);
  } catch (err) {
    console.log("Recording sync error:", err.message);
  }
};

const syncAttendanceForEndedClass = async (liveClassId) => {
  const liveClass = await liveClassModel.findById(liveClassId).select(
    "_id startAt durationMin status"
  );

  if (!liveClass || liveClass.status !== "ended") return;

  const endAt = getLiveClassEndAt(liveClass);
  const records = await liveAttendanceModel.find({ liveClass: liveClassId });

  for (const record of records) {
    let minutesAttended = Number(record.minutesAttended || 0);

    if (record.joinAt && !record.leaveAt) {
      const diffMs = new Date(endAt).getTime() - new Date(record.joinAt).getTime();
      minutesAttended = Math.max(0, Math.round(diffMs / 60000));
      record.leaveAt = endAt;
      record.lastLeftAt = endAt;
    }

    record.minutesAttended = Math.max(
      minutesAttended,
      Number(record.minutesAttended || 0)
    );

    record.attendanceStatus = getAttendanceStatus(
      record.minutesAttended,
      liveClass.durationMin
    );

    await record.save();
  }

  emitToLiveClass(liveClassId, "attendance:summaryRefresh", {
    liveClassId,
  });

  await syncLiveClassAttendance(liveClassId);
  await syncRecordingAfterClass(liveClassId);
};

const canJoinLiveClassNow = (liveClass, now = new Date()) => {
  if (!liveClass) return false;
  if (liveClass.status === "cancelled" || liveClass.status === "ended") return false;
  if (liveClass.status === "live") return true;

  if (liveClass.status === "scheduled" && liveClass.startAt) {
    const diffMs = new Date(liveClass.startAt).getTime() - now.getTime();
    return diffMs <= JOIN_WINDOW_MINUTES * 60 * 1000;
  }

  return false;
};

const getRecipientsForCourse = async (courseId) => {
  const now = new Date();

  const course = await courseModel
    .findById(courseId)
    .select("_id title instructor status")
    .populate("instructor", "email name");

  if (!course) {
    return { course: null, instructorUser: null, studentEmails: [] };
  }

  const enrollments = await enrollmentModel
    .find({
      course: courseId,
      status: { $in: ["active", "completed"] },
      $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }],
    })
    .populate("student", "email name");

  const studentEmails = enrollments
    .map((e) => e.student?.email)
    .filter(Boolean);

  const instructorUser =
    course.instructor && course.instructor.email ? course.instructor : null;

  return { course, instructorUser, studentEmails };
};

const ensureClassAccess = async ({ liveClass, user }) => {
  const role = normalizeRole(user.role);
  const isAdmin = role === "admin";
  const isInstructorOwner = String(liveClass.instructor) === String(user._id);

  if (isAdmin || isInstructorOwner) {
    return { allowed: true, roleType: role };
  }

  const enrolled = await enrollmentModel.exists(
    activeEnrollmentQuery(user._id, liveClass.course, new Date())
  );

  if (!enrolled) {
    return { allowed: false, roleType: role };
  }

  return { allowed: true, roleType: role };
};

const buildLiveClassListResponse = async (list) => {
  const classIds = list.map((item) => item._id);

  const attendanceAgg = await liveAttendanceModel.aggregate([
    {
      $match: {
        liveClass: { $in: classIds },
      },
    },
    {
      $group: {
        _id: "$liveClass",
        totalAttendees: { $sum: 1 },
        presentCount: {
          $sum: {
            $cond: [{ $eq: ["$attendanceStatus", "present"] }, 1, 0],
          },
        },
        partialCount: {
          $sum: {
            $cond: [{ $eq: ["$attendanceStatus", "partial"] }, 1, 0],
          },
        },
      },
    },
  ]);

  const attendanceMap = new Map(
    attendanceAgg.map((item) => [String(item._id), item])
  );

  return list.map((item) => {
    const stats = attendanceMap.get(String(item._id));

    return {
      ...item.toObject(),
      attendanceSummary: {
        totalAttendees: stats?.totalAttendees || 0,
        presentCount: stats?.presentCount || 0,
        partialCount: stats?.partialCount || 0,
      },
    };
  });
};

// -----------------------------
// CREATE LIVE CLASS
// -----------------------------
exports.createLiveClass = async (req, res) => {
  try {
    const {
      courseId,
      title,
      description,
      provider,
      startAt,
      durationMin,
      meetingLink,
      meetingId,
      meetingPassword,
      roomName,
      recordingMode,
      autoCreateMeeting,
    } = req.body;

    if (!courseId || !title || !startAt) {
      return res.status(400).json({
        success: false,
        message: "courseId, title, startAt are required",
      });
    }

    if (!isValidDate(startAt)) {
      return res.status(400).json({
        success: false,
        message: "startAt is invalid",
      });
    }

    const selectedProvider = ALLOWED_PROVIDERS.includes(provider)
      ? provider
      : "zoom";

    const wantsAutoCreateMeeting =
      Boolean(autoCreateMeeting) && selectedProvider === "zoom";

    if (!wantsAutoCreateMeeting) {
      if (!meetingLink) {
        return res.status(400).json({
          success: false,
          message: "meetingLink is required when autoCreateMeeting is false",
        });
      }

      if (!isValidHttpUrl(meetingLink)) {
        return res.status(400).json({
          success: false,
          message: "meetingLink must be a valid URL",
        });
      }
    }

    const startDate = new Date(startAt);

    if (startDate.getTime() <= Date.now()) {
      return res.status(400).json({
        success: false,
        message: "startAt must be in the future",
      });
    }

    const duration = Number(durationMin || 60);

    if (Number.isNaN(duration) || duration < 10 || duration > 600) {
      return res.status(400).json({
        success: false,
        message: "durationMin must be between 10 and 600",
      });
    }

    const course = await courseModel
      .findById(courseId)
      .select("_id title instructor status");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const role = normalizeRole(req.user.role);
    const isOwner = String(course.instructor) === String(req.user._id);
    const isAdmin = role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to create live class for this course",
      });
    }

    let finalMeetingLink = meetingLink ? String(meetingLink).trim() : "";
    let finalMeetingId = meetingId || "";
    let finalMeetingPassword = meetingPassword || "";
    let finalRoomName = roomName || "";

    if (wantsAutoCreateMeeting) {
      const zoomMeeting = await createZoomMeeting({
        topic: String(title).trim(),
        agenda: description || "",
        startAt: startDate,
        durationMin: duration,
        password: meetingPassword || undefined,
      });

      finalMeetingLink = zoomMeeting.join_url || "";
      finalMeetingId = String(zoomMeeting.id || "");
      finalMeetingPassword = zoomMeeting.password || "";
      finalRoomName = zoomMeeting.topic || "";
    }

    const newLive = await liveClassModel.create({
      course: courseId,
      instructor: course.instructor,
      title: String(title).trim(),
      description: description || "",
      provider: selectedProvider,
      startAt: startDate,
      durationMin: duration,
      meetingLink: finalMeetingLink,
      meetingId: finalMeetingId,
      meetingPassword: finalMeetingPassword,
      roomName: finalRoomName,
      recordingMode: ["manual", "auto"].includes(recordingMode)
        ? recordingMode
        : "manual",
      recordingStatus: "not_available",
      status: "scheduled",
    });

    try {
      const {
        course: fullCourse,
        instructorUser,
        studentEmails,
      } = await getRecipientsForCourse(courseId);

      const timeText = new Date(newLive.startAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });

      const mail = emailLiveCreated({
        courseTitle: fullCourse?.title || "Course",
        topic: newLive.title,
        timeText,
        joinLink: newLive.meetingLink,
      });

      if (studentEmails.length > 0) {
        await sendEmail({
          to: studentEmails,
          subject: mail.subject,
          html: mail.html,
        });
      }

      if (instructorUser?.email) {
        await sendEmail({
          to: instructorUser.email,
          subject: mail.subject,
          html: mail.html,
        });
      }

      newLive.emailCreatedSent = true;
      await newLive.save();
    } catch (e) {
      console.log("Live class create email failed:", e.message);
    }

    return res.status(201).json({ success: true, data: newLive });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// -----------------------------
// COURSE LIVE CLASSES
// -----------------------------
exports.getCourseLiveClasses = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await courseModel.findById(courseId).select("_id instructor");
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const role = normalizeRole(req.user.role);
    const isOwner = String(course.instructor) === String(req.user._id);
    const isAdmin = role === "admin";

    if (!isOwner && !isAdmin) {
      const enrolled = await enrollmentModel.exists(
        activeEnrollmentQuery(req.user._id, courseId, new Date())
      );

      if (!enrolled) {
        return res.status(403).json({
          success: false,
          message: "Not enrolled in this course",
        });
      }
    }

    const classes = await liveClassModel
      .find({ course: courseId })
      .populate("course", "title thumbnail")
      .populate("instructor", "name email")
      .sort({ startAt: 1 })
      .select("-__v");

    for (const lc of classes) {
      await resolveLiveClassStatus(lc);
    }

    const responseData = await buildLiveClassListResponse(classes);

    return res.json({ success: true, data: responseData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// -----------------------------
// MY UPCOMING / ALL RELEVANT LIVE CLASSES
// -----------------------------
exports.getMyUpcomingLiveClasses = async (req, res) => {
  try {
    const now = new Date();
    const role = normalizeRole(req.user.role);

    if (role === "student") {
      const enrollments = await enrollmentModel
        .find({
          student: req.user._id,
          status: { $in: ["active", "completed"] },
          $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }],
        })
        .select("course");

      const courseIds = enrollments.map((e) => e.course);

      const list = await liveClassModel
        .find({
          course: { $in: courseIds },
        })
        .populate("course", "title thumbnail")
        .populate("instructor", "name email")
        .sort({ startAt: -1 });

      for (const lc of list) {
        await resolveLiveClassStatus(lc);
      }

      const responseData = await buildLiveClassListResponse(list);
      return res.json({ success: true, data: responseData });
    }

    if (role === "instructor") {
      const list = await liveClassModel
        .find({
          instructor: req.user._id,
        })
        .populate("course", "title thumbnail")
        .populate("instructor", "name email")
        .sort({ startAt: -1 });

      for (const lc of list) {
        await resolveLiveClassStatus(lc);
      }

      const responseData = await buildLiveClassListResponse(list);
      return res.json({ success: true, data: responseData });
    }

    if (role === "admin") {
      const list = await liveClassModel
        .find({})
        .populate("course", "title thumbnail")
        .populate("instructor", "name email")
        .sort({ startAt: -1 });

      for (const lc of list) {
        await resolveLiveClassStatus(lc);
      }

      const responseData = await buildLiveClassListResponse(list);
      return res.json({ success: true, data: responseData });
    }

    return res.json({ success: true, data: [] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// -----------------------------
// INSTRUCTOR / ADMIN ALL LIVE CLASSES
// -----------------------------
exports.getMyAllLiveClasses = async (req, res) => {
  try {
    const role = normalizeRole(req.user.role);

    if (role !== "instructor" && role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only instructor or admin can view all live classes",
      });
    }

    const query = role === "instructor" ? { instructor: req.user._id } : {};

    const list = await liveClassModel
      .find(query)
      .populate("course", "title thumbnail")
      .populate("instructor", "name email")
      .sort({ startAt: -1 });

    for (const lc of list) {
      await resolveLiveClassStatus(lc);
    }

    const responseData = await buildLiveClassListResponse(list);

    return res.json({ success: true, data: responseData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// -----------------------------
// ADMIN ALL LIVE CLASSES
// -----------------------------
exports.getAllLiveClassesForAdmin = async (req, res) => {
  try {
    const role = normalizeRole(req.user.role);

    if (role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin only" });
    }

    const list = await liveClassModel
      .find({})
      .populate("course", "title thumbnail")
      .populate("instructor", "name email")
      .sort({ startAt: -1 });

    for (const lc of list) {
      await resolveLiveClassStatus(lc);
    }

    const responseData = await buildLiveClassListResponse(list);

    return res.json({ success: true, data: responseData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// -----------------------------
// CANCEL LIVE CLASS
// -----------------------------
exports.cancelLiveClass = async (req, res) => {
  try {
    const { liveClassId } = req.params;

    const liveClass = await liveClassModel
      .findById(liveClassId)
      .populate("course", "title")
      .select("title instructor status startAt meetingLink course");

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: "Live class not found",
      });
    }

    const role = normalizeRole(req.user.role);
    const isOwner = String(liveClass.instructor) === String(req.user._id);
    const isAdmin = role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to cancel this class",
      });
    }

    if (liveClass.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Live class already cancelled",
      });
    }

    if (liveClass.status === "ended") {
      return res.status(400).json({
        success: false,
        message: "Ended live class cannot be cancelled",
      });
    }

    liveClass.status = "cancelled";
    liveClass.cancelledAt = new Date();
    liveClass.cancelledBy = req.user._id;
    await liveClass.save();

    emitToLiveClass(liveClassId, "liveClass:cancelled", {
      liveClassId,
      status: "cancelled",
    });

    try {
      const {
        course,
        instructorUser,
        studentEmails,
      } = await getRecipientsForCourse(liveClass.course._id);

      const timeText = new Date(liveClass.startAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });

      const mail = emailLiveCancelled({
        courseTitle: course?.title || "Course",
        topic: liveClass.title,
        timeText,
      });

      if (studentEmails.length > 0) {
        await sendEmail({
          to: studentEmails,
          subject: mail.subject,
          html: mail.html,
        });
      }

      if (instructorUser?.email) {
        await sendEmail({
          to: instructorUser.email,
          subject: mail.subject,
          html: mail.html,
        });
      }
    } catch (e) {
      console.log("Cancel class email failed:", e.message);
    }

    return res.json({
      success: true,
      message: "Live class cancelled successfully",
      data: liveClass,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// -----------------------------
// JOIN LIVE CLASS
// -----------------------------
exports.joinLiveClass = async (req, res) => {
  try {
    const { liveClassId } = req.params;

    const liveClass = await liveClassModel
      .findById(liveClassId)
      .select(
        "course instructor meetingLink status startAt durationMin provider"
      );

    if (!liveClass) {
      return res.status(404).json({ success: false, message: "Live class not found" });
    }

    await resolveLiveClassStatus(liveClass);

    if (liveClass.status === "cancelled") {
      return res.status(400).json({ success: false, message: "This class is cancelled" });
    }

    if (liveClass.status === "ended") {
      return res.status(400).json({
        success: false,
        message: "This class has already ended",
      });
    }

    if (!canJoinLiveClassNow(liveClass, new Date())) {
      return res.status(400).json({
        success: false,
        message:
          "You can join only when class is live or within 10 minutes of start time",
      });
    }

    const access = await ensureClassAccess({ liveClass, user: req.user });

    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: "Not enrolled in this course",
      });
    }

    if (access.roleType === "admin" || access.roleType === "instructor") {
      emitToLiveClass(liveClassId, "participant:joined", {
        liveClassId,
        userId: req.user._id,
        role: access.roleType,
      });

      return res.json({
        success: true,
        message: "Joined live class",
        data: {
          meetingLink: liveClass.meetingLink,
          provider: liveClass.provider,
          attendance: null,
        },
      });
    }

    let attendance = await liveAttendanceModel.findOne({
      liveClass: liveClassId,
      student: req.user._id,
    });

    if (!attendance) {
      attendance = await liveAttendanceModel.create({
        liveClass: liveClassId,
        student: req.user._id,
        joinAt: new Date(),
        lastJoinedAt: new Date(),
        attendanceStatus: "partial",
        joinSource: "meeting_link",
      });
    } else {
      if (!attendance.joinAt) {
        attendance.joinAt = new Date();
      }

      attendance.lastJoinedAt = new Date();

      if (attendance.leaveAt) {
        attendance.leaveAt = null;
      }

      if (attendance.lastLeftAt) {
        attendance.lastLeftAt = null;
      }

      await attendance.save();
    }

    emitToLiveClass(liveClassId, "participant:joined", {
      liveClassId,
      userId: req.user._id,
      role: access.roleType,
    });

    emitToLiveClass(liveClassId, "attendance:summaryRefresh", {
      liveClassId,
    });

    return res.json({
      success: true,
      message: "Joined live class",
      data: {
        meetingLink: liveClass.meetingLink,
        provider: liveClass.provider,
        attendance,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// -----------------------------
// LEAVE LIVE CLASS
// -----------------------------
exports.leaveLiveClass = async (req, res) => {
  try {
    const { liveClassId } = req.params;

    const liveClass = await liveClassModel
      .findById(liveClassId)
      .select("_id durationMin startAt status");

    if (!liveClass) {
      return res.status(404).json({ success: false, message: "Live class not found" });
    }

    const attendance = await liveAttendanceModel.findOne({
      liveClass: liveClassId,
      student: req.user._id,
    });

    if (!attendance || !attendance.joinAt) {
      return res.status(400).json({ success: false, message: "No join record found" });
    }

    if (attendance.leaveAt) {
      return res.json({
        success: true,
        message: "Leave already recorded",
        data: attendance,
      });
    }

    const leaveAt = new Date();
    const diffMs = leaveAt.getTime() - new Date(attendance.joinAt).getTime();
    const minutes = Math.max(0, Math.round(diffMs / 60000));

    attendance.leaveAt = leaveAt;
    attendance.lastLeftAt = leaveAt;
    attendance.minutesAttended = Math.max(
      Number(attendance.minutesAttended || 0),
      minutes
    );
    attendance.attendanceStatus = getAttendanceStatus(
      attendance.minutesAttended,
      liveClass.durationMin
    );

    await attendance.save();

    emitToLiveClass(liveClassId, "participant:left", {
      liveClassId,
      userId: req.user._id,
      role: "student",
    });

    emitToLiveClass(liveClassId, "attendance:summaryRefresh", {
      liveClassId,
    });

    return res.json({
      success: true,
      message: "Left live class",
      data: attendance,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// -----------------------------
// SAVE RECORDING LINK
// -----------------------------
exports.saveRecordingLink = async (req, res) => {
  try {
    const { liveClassId } = req.params;
    const { recordingLink, recordingDurationMin, recordingStatus } = req.body;

    if (!recordingLink || !isValidHttpUrl(recordingLink)) {
      return res.status(400).json({
        success: false,
        message: "Valid recordingLink is required",
      });
    }

    const liveClass = await liveClassModel.findById(liveClassId).select(
      "instructor status recordingStatus recordingMode recordingLink course title recordingReadyEmailSent"
    );

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: "Live class not found",
      });
    }

    const role = normalizeRole(req.user.role);
    const isOwner = String(liveClass.instructor) === String(req.user._id);
    const isAdmin = role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not allowed",
      });
    }

    if (liveClass.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled class cannot have recording",
      });
    }

    liveClass.recordingLink = String(recordingLink).trim();
    liveClass.recordingStatus = ["processing", "ready"].includes(recordingStatus)
      ? recordingStatus
      : "ready";
    liveClass.recordingAvailableAt = new Date();

    if (
      recordingDurationMin !== undefined &&
      !Number.isNaN(Number(recordingDurationMin))
    ) {
      liveClass.recordingDurationMin = Math.max(0, Number(recordingDurationMin));
    }

    if (liveClass.status !== "cancelled") {
      liveClass.status = "ended";
    }

    await liveClass.save();
    await syncAttendanceForEndedClass(liveClassId);

    emitToLiveClass(liveClassId, "recording:ready", {
      liveClassId,
      recordingLink: liveClass.recordingLink,
      recordingStatus: liveClass.recordingStatus,
    });

    try {
      if (!liveClass.recordingReadyEmailSent && liveClass.recordingStatus === "ready") {
        const { course, instructorUser, studentEmails } = await getRecipientsForCourse(
          liveClass.course
        );

        const mail = emailLiveRecordingReady({
          courseTitle: course?.title || "Course",
          topic: liveClass.title,
          recordingLink: liveClass.recordingLink,
        });

        if (studentEmails.length > 0) {
          await sendEmail({
            to: studentEmails,
            subject: mail.subject,
            html: mail.html,
          });
        }

        if (instructorUser?.email) {
          await sendEmail({
            to: instructorUser.email,
            subject: mail.subject,
            html: mail.html,
          });
        }

        liveClass.recordingReadyEmailSent = true;
        await liveClass.save();
      }
    } catch (e) {
      console.log("Recording ready email failed:", e.message);
    }

    return res.json({
      success: true,
      message: "Recording saved",
      data: liveClass,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// -----------------------------
// VIEW ATTENDANCE
// -----------------------------
exports.getLiveClassAttendance = async (req, res) => {
  try {
    const { liveClassId } = req.params;

    const liveClass = await liveClassModel
      .findById(liveClassId)
      .select("title course startAt durationMin instructor status recordingLink")
      .populate("course", "title");

    if (!liveClass) {
      return res.status(404).json({ success: false, message: "Live class not found" });
    }

    const role = normalizeRole(req.user.role);
    const isOwner = String(liveClass.instructor) === String(req.user._id);
    const isAdmin = role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    await resolveLiveClassStatus(liveClass);

    if (liveClass.status === "ended") {
      await syncAttendanceForEndedClass(liveClassId);
    }

    const attendance = await liveAttendanceModel
      .find({ liveClass: liveClassId })
      .populate("student", "name email")
      .sort({ joinAt: 1 });

    const summary = {
      total: attendance.length,
      present: attendance.filter((a) => a.attendanceStatus === "present").length,
      partial: attendance.filter((a) => a.attendanceStatus === "partial").length,
      absent: attendance.filter((a) => a.attendanceStatus === "absent").length,
    };

    return res.json({
      success: true,
      data: {
        liveClass,
        attendance,
        total: attendance.length,
        summary,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// -----------------------------
// RESCHEDULE LIVE CLASS
// -----------------------------
exports.rescheduleLiveClass = async (req, res) => {
  try {
    const { liveClassId } = req.params;
    const { startAt, durationMin } = req.body;

    if (!startAt) {
      return res.status(400).json({
        success: false,
        message: "startAt is required",
      });
    }

    if (!isValidDate(startAt)) {
      return res.status(400).json({
        success: false,
        message: "startAt is invalid",
      });
    }

    const newStartDate = new Date(startAt);

    if (newStartDate.getTime() <= Date.now()) {
      return res.status(400).json({
        success: false,
        message: "New start time must be in the future",
      });
    }

    const newDuration = Number(durationMin || 60);

    if (Number.isNaN(newDuration) || newDuration < 10 || newDuration > 600) {
      return res.status(400).json({
        success: false,
        message: "durationMin must be between 10 and 600",
      });
    }

    const liveClass = await liveClassModel.findById(liveClassId).select(
      "title instructor status startAt durationMin reminder10Sent meetingLink course rescheduledAt cancelledAt cancelledBy"
    );

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: "Live class not found",
      });
    }

    const role = normalizeRole(req.user.role);
    const isOwner = String(liveClass.instructor) === String(req.user._id);
    const isAdmin = role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to reschedule this class",
      });
    }

    if (liveClass.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled class cannot be rescheduled",
      });
    }

    if (liveClass.status === "ended") {
      return res.status(400).json({
        success: false,
        message: "Ended class cannot be rescheduled",
      });
    }

    if (liveClass.status !== "scheduled") {
      return res.status(400).json({
        success: false,
        message: "Only scheduled classes can be rescheduled",
      });
    }

    const oldStartAt = liveClass.startAt;

    liveClass.startAt = newStartDate;
    liveClass.durationMin = newDuration;
    liveClass.status = "scheduled";
    liveClass.reminder10Sent = false;
    liveClass.rescheduledAt = new Date();

    await liveClass.save();

    emitToLiveClass(liveClassId, "liveClass:rescheduled", {
      liveClassId,
      startAt: liveClass.startAt,
      durationMin: liveClass.durationMin,
      status: liveClass.status,
    });

    try {
      const {
        course,
        instructorUser,
        studentEmails,
      } = await getRecipientsForCourse(liveClass.course);

      const oldTimeText = new Date(oldStartAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });

      const newTimeText = new Date(liveClass.startAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });

      const mail = emailLiveRescheduled({
        courseTitle: course?.title || "Course",
        topic: liveClass.title,
        oldTimeText,
        newTimeText,
        joinLink: liveClass.meetingLink,
      });

      if (studentEmails.length > 0) {
        await sendEmail({
          to: studentEmails,
          subject: mail.subject,
          html: mail.html,
        });
      }

      if (instructorUser?.email) {
        await sendEmail({
          to: instructorUser.email,
          subject: mail.subject,
          html: mail.html,
        });
      }
    } catch (e) {
      console.log("Live class reschedule email failed:", e.message);
    }

    return res.json({
      success: true,
      message: "Live class rescheduled successfully",
      data: liveClass,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// -----------------------------
// REMINDER EMAIL SENDER
// -----------------------------
exports.sendReminder10Min = async () => {
  const now = new Date();
  const in10 = new Date(now.getTime() + 10 * 60 * 1000);

  const list = await liveClassModel
    .find({
      status: "scheduled",
      reminder10Sent: false,
      startAt: { $gte: now, $lte: in10 },
    })
    .select("course instructor title startAt meetingLink");

  for (const lc of list) {
    try {
      const {
        course,
        instructorUser,
        studentEmails,
      } = await getRecipientsForCourse(lc.course);

      const timeText = new Date(lc.startAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });

      const mail = emailLiveReminder10Min({
        courseTitle: course?.title || "Course",
        topic: lc.title,
        timeText,
        joinLink: lc.meetingLink,
      });

      if (studentEmails.length > 0) {
        await sendEmail({
          to: studentEmails,
          subject: mail.subject,
          html: mail.html,
        });
      }

      if (instructorUser?.email) {
        await sendEmail({
          to: instructorUser.email,
          subject: mail.subject,
          html: mail.html,
        });
      }

      lc.reminder10Sent = true;
      await lc.save();
    } catch (e) {
      console.log("Reminder email failed:", e.message);
    }
  }
};