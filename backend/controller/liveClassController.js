const courseModel = require("../models/courseModel");
const enrollmentModel = require("../models/enrollmentModel");
const liveClassModel = require("../models/liveClassModel");
const liveAttendanceModel = require("../models/liveAttendanceModel");

const sendEmail = require("../utils/sendEmail");
const { emailLiveCreated, emailLiveReminder10Min, emailLiveRescheduled, emailLiveCancelled} = require("../utils/liveClassEmails");

// URL validator
const isValidHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

// date validator
const isValidDate = (value) => {
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
};

// active enrollment helper
const activeEnrollmentQuery = (userId, courseId, now = new Date()) => ({
  student: userId,
  course: courseId,
  status: { $in: ["active", "completed"] },
  $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }],
});

const getLiveClassEndAt = (liveClass) => {
  return new Date(
    new Date(liveClass.startAt).getTime() + Number(liveClass.durationMin || 60) * 60000
  );
};

// sync status based on time
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
    await liveClass.save();
  }

  return liveClass;
};

// join rule helper
const canJoinLiveClassNow = (liveClass, now = new Date()) => {
  if (!liveClass) return false;
  if (liveClass.status === "cancelled" || liveClass.status === "ended") return false;
  if (liveClass.status === "live") return true;

  if (liveClass.status === "scheduled" && liveClass.startAt) {
    const diffMs = new Date(liveClass.startAt).getTime() - now.getTime();
    return diffMs <= 10 * 60 * 1000;
  }

  return false;
};

// recipients helper
const getRecipientsForCourse = async (courseId) => {
  const now = new Date();

  const course = await courseModel
    .findById(courseId)
    .select("_id title instructor status")
    .populate("instructor", "email name");

  if (!course) return { course: null, instructorUser: null, studentEmails: [] };

  const enrollments = await enrollmentModel
    .find({
      course: courseId,
      status: { $in: ["active", "completed"] },
      $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }],
    })
    .populate("student", "email name");

  const studentEmails = enrollments.map((e) => e.student?.email).filter(Boolean);
  const instructorUser = course.instructor && course.instructor.email ? course.instructor : null;

  return { course, instructorUser, studentEmails };
};

// CREATE LIVE CLASS
exports.createLiveClass = async (req, res) => {
  try {
    const { courseId, title, description, provider, startAt, durationMin, meetingLink } = req.body;

    if (!courseId || !title || !startAt || !meetingLink) {
      return res.status(400).json({
        success: false,
        message: "courseId, title, startAt, meetingLink are required",
      });
    }

    if (!isValidHttpUrl(meetingLink)) {
      return res.status(400).json({
        success: false,
        message: "meetingLink must be a valid URL",
      });
    }

    if (!isValidDate(startAt)) {
      return res.status(400).json({
        success: false,
        message: "startAt is invalid",
      });
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

    const course = await courseModel.findById(courseId).select("_id title instructor status");
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const isOwner = String(course.instructor) === String(req.user._id);
    const isAdmin = String(req.user.role).toLowerCase() === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to create live class for this course",
      });
    }

    const newLive = await liveClassModel.create({
      course: courseId,
      instructor: course.instructor,
      title: String(title).trim(),
      description: description || "",
      provider: provider || "zoom",
      startAt: startDate,
      durationMin: duration,
      meetingLink,
      status: "scheduled",
    });

    try {
      const { course: fullCourse, instructorUser, studentEmails } = await getRecipientsForCourse(courseId);

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
        await sendEmail({ to: studentEmails, subject: mail.subject, html: mail.html });
      }

      if (instructorUser?.email) {
        await sendEmail({ to: instructorUser.email, subject: mail.subject, html: mail.html });
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

// COURSE LIVE CLASSES
exports.getCourseLiveClasses = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await courseModel.findById(courseId).select("_id instructor");
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const role = String(req.user.role).toLowerCase();
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

    const classes = await liveClassModel.find({ course: courseId }).sort({ startAt: 1 }).select("-__v");

    for (const lc of classes) {
      await resolveLiveClassStatus(lc);
    }

    return res.json({ success: true, data: classes });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// MY UPCOMING LIVE CLASSES
exports.getMyUpcomingLiveClasses = async (req, res) => {
  try {
    const now = new Date();
    const role = String(req.user.role).toLowerCase();

    if (role === "student") {
      const enrollments = await enrollmentModel
        .find({
          student: req.user._id,
          status: { $in: ["active", "completed"] },
          $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }],
        })
        .select("course");

      const courseIds = enrollments.map((e) => e.course);

      // UPDATED: Removed status filters to fetch all classes (scheduled, live, ended, cancelled)
      // This allows students to view past sessions and watch recordings.
      const list = await liveClassModel
        .find({
          course: { $in: courseIds },
        })
        .populate("course", "title thumbnail")
        .populate("instructor", "name email")
        .sort({ startAt: -1 }); // Shows newest/upcoming classes first

      for (const lc of list) {
        await resolveLiveClassStatus(lc);
      }

      return res.json({ success: true, data: list });
    }

    if (role === "instructor") {
      const list = await liveClassModel
        .find({
          instructor: req.user._id,
          status: { $in: ["scheduled", "live"] },
          $or: [{ status: "live" }, { startAt: { $gte: now } }],
        })
        .populate("course", "title thumbnail")
        .sort({ startAt: 1 });

      for (const lc of list) {
        await resolveLiveClassStatus(lc);
      }

      return res.json({ success: true, data: list });
    }

    if (role === "admin") {
      const list = await liveClassModel
        .find({
          status: { $in: ["scheduled", "live"] },
          $or: [{ status: "live" }, { startAt: { $gte: now } }],
        })
        .populate("course", "title thumbnail")
        .populate("instructor", "name email")
        .sort({ startAt: 1 });

      for (const lc of list) {
        await resolveLiveClassStatus(lc);
      }

      return res.json({ success: true, data: list });
    }

    return res.json({ success: true, data: [] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// INSTRUCTOR/ADMIN: All live classes (not just upcoming)
exports.getMyAllLiveClasses = async (req, res) => {
  try {
    const role = String(req.user.role).toLowerCase();

    if (role !== "instructor" && role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only instructor or admin can view all live classes",
      });
    }

    let query = {};

    if (role === "instructor") {
      query.instructor = req.user._id;
    }

    const list = await liveClassModel
      .find(query)
      .populate("course", "title thumbnail")
      .populate("instructor", "name email")
      .sort({ startAt: 1 });

    // optional: keep status synced
    for (const lc of list) {
      await resolveLiveClassStatus(lc);
    }

    return res.json({ success: true, data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ADMIN ALL LIVE CLASSES
exports.getAllLiveClassesForAdmin = async (req, res) => {
  try {
    const role = String(req.user.role).toLowerCase();
    if (role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin only" });
    }

    const list = await liveClassModel
      .find({})
      .populate("course", "title thumbnail")
      .populate("instructor", "name email")
      .sort({ startAt: 1 });

    for (const lc of list) {
      await resolveLiveClassStatus(lc);
    }

    return res.json({ success: true, data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// CANCEL LIVE CLASS
exports.cancelLiveClass = async (req, res) => {
  try {

    const { liveClassId } = req.params;

    const liveClass = await liveClassModel.findById(liveClassId)
      .populate("course", "title")
      .select("title instructor status startAt meetingLink course");

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: "Live class not found",
      });
    }

    const role = String(req.user.role).toLowerCase();
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

    liveClass.status = "cancelled";
    await liveClass.save();

    // Send cancellation email
    try {

      const { course, instructorUser, studentEmails } =
        await getRecipientsForCourse(liveClass.course._id);

      const timeText = new Date(liveClass.startAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });

      const mail = emailLiveCancelled({
        courseTitle: course?.title || "Course",
        topic: liveClass.title,
        timeText
      });

      if (studentEmails.length > 0) {
        await sendEmail({
          to: studentEmails,
          subject: mail.subject,
          html: mail.html
        });
      }

      if (instructorUser?.email) {
        await sendEmail({
          to: instructorUser.email,
          subject: mail.subject,
          html: mail.html
        });
      }

    } catch (e) {
      console.log("Cancel class email failed:", e.message);
    }

    return res.json({
      success: true,
      message: "Live class cancelled successfully",
      data: liveClass
    });

  } catch (err) {

    return res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

// JOIN LIVE CLASS
exports.joinLiveClass = async (req, res) => {
  try {
    const { liveClassId } = req.params;

    const liveClass = await liveClassModel
      .findById(liveClassId)
      .select("course instructor meetingLink status startAt durationMin");

    if (!liveClass) {
      return res.status(404).json({ success: false, message: "Live class not found" });
    }

    await resolveLiveClassStatus(liveClass);

    if (liveClass.status === "cancelled") {
      return res.status(400).json({ success: false, message: "This class is cancelled" });
    }

    if (liveClass.status === "ended") {
      return res.status(400).json({ success: false, message: "This class has already ended" });
    }

    if (!canJoinLiveClassNow(liveClass, new Date())) {
      return res.status(400).json({
        success: false,
        message: "You can join only when class is live or within 10 minutes of start time",
      });
    }

    const role = String(req.user.role).toLowerCase();
    const isAdmin = role === "admin";
    const isInstructorOwner = String(liveClass.instructor) === String(req.user._id);

    if (isAdmin || isInstructorOwner) {
      return res.json({
        success: true,
        message: "Joined live class",
        data: { meetingLink: liveClass.meetingLink, attendance: null },
      });
    }

    const enrolled = await enrollmentModel.exists(
      activeEnrollmentQuery(req.user._id, liveClass.course, new Date())
    );

    if (!enrolled) {
      return res.status(403).json({ success: false, message: "Not enrolled in this course" });
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
      });
    } else {
      if (!attendance.joinAt) {
        attendance.joinAt = new Date();
      }

      if (attendance.leaveAt) {
        attendance.leaveAt = null;
      }

      await attendance.save();
    }

    return res.json({
      success: true,
      message: "Joined live class",
      data: { meetingLink: liveClass.meetingLink, attendance },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// LEAVE LIVE CLASS
exports.leaveLiveClass = async (req, res) => {
  try {
    const { liveClassId } = req.params;

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
    attendance.minutesAttended = minutes;
    await attendance.save();

    return res.json({ success: true, message: "Left live class", data: attendance });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// SAVE RECORDING LINK
exports.saveRecordingLink = async (req, res) => {
  try {
    const { liveClassId } = req.params;
    const { recordingLink } = req.body;

    if (!recordingLink || !isValidHttpUrl(recordingLink)) {
      return res.status(400).json({
        success: false,
        message: "Valid recordingLink is required",
      });
    }

    const liveClass = await liveClassModel.findById(liveClassId).select("instructor status");
    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: "Live class not found",
      });
    }

    const role = String(req.user.role).toLowerCase();
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

    liveClass.recordingLink = recordingLink;
    liveClass.status = "ended";
    await liveClass.save();

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

// INSTRUCTOR/ADMIN: View attendance list
exports.getLiveClassAttendance = async (req, res) => {
  try {
    const { liveClassId } = req.params;

    const liveClass = await liveClassModel
      .findById(liveClassId)
      .select("title course startAt durationMin instructor")
      .populate("course", "title");

    if (!liveClass) {
      return res.status(404).json({ success: false, message: "Live class not found" });
    }

    const role = String(req.user.role).toLowerCase();
    const isOwner = String(liveClass.instructor) === String(req.user._id);
    const isAdmin = role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const attendance = await liveAttendanceModel
      .find({ liveClass: liveClassId })
      .populate("student", "name email")
      .sort({ joinAt: 1 });

    return res.json({
      success: true,
      data: {
        liveClass,
        attendance,
        total: attendance.length,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// INSTRUCTOR/ADMIN: Reschedule live class
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
      "title instructor status startAt durationMin reminder10Sent meetingLink course"
    );

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: "Live class not found",
      });
    }

    const role = String(req.user.role).toLowerCase();
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

    await liveClass.save();

    // Send reschedule email to students + instructor
    try {
      const { course, instructorUser, studentEmails } = await getRecipientsForCourse(liveClass.course);

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

// reminder email sender
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
      const { course, instructorUser, studentEmails } = await getRecipientsForCourse(lc.course);

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
        await sendEmail({ to: studentEmails, subject: mail.subject, html: mail.html });
      }

      if (instructorUser?.email) {
        await sendEmail({ to: instructorUser.email, subject: mail.subject, html: mail.html });
      }

      lc.reminder10Sent = true;
      await lc.save();
    } catch (e) {
      console.log("Reminder email failed:", e.message);
    }
  }
};