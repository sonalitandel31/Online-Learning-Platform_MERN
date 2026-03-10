const cron = require("node-cron");

const courseModel = require("../models/courseModel");
const enrollmentModel = require("../models/enrollmentModel");
const liveClassModel = require("../models/liveClassModel");
const userModel = require("../models/userModel");

const sendEmail = require("../utils/sendEmail");
const { emailLiveReminder10Min } = require("../utils/liveClassEmails");

cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();

    // window: 9 to 11 minutes from now (safe buffer)
    const from = new Date(now.getTime() + 9 * 60 * 1000);
    const to = new Date(now.getTime() + 11 * 60 * 1000);

    const classes = await liveClassModel.find({
      status: "scheduled",
      reminder10Sent: false,
      startAt: { $gte: from, $lt: to },
    });

    for (const lc of classes) {
      // course + instructor
      const course = await courseModel.findById(lc.course).select("title instructor");
      const instructorUser = await userModel.findById(course.instructor).select("email name");

      // students with active/completed enrollment
      const enrollments = await enrollmentModel
        .find({
          course: lc.course,
          status: { $in: ["active", "completed"] },
          $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }],
        })
        .populate("student", "email name");

      const studentEmails = enrollments.map((e) => e.student?.email).filter(Boolean);

      const timeText = new Date(lc.startAt).toLocaleString("en-IN");

      const mail = emailLiveReminder10Min({
        courseTitle: course?.title || "Course",
        topic: lc.title,
        timeText,
        joinLink: lc.meetingLink,
      });

      // send to students
      await sendEmail({ to: studentEmails, subject: mail.subject, html: mail.html });

      // send to instructor too
      if (instructorUser?.email) {
        await sendEmail({ to: instructorUser.email, subject: mail.subject, html: mail.html });
      }

      // mark sent (prevent duplicate)
      lc.reminder10Sent = true;
      await lc.save();
    }
  } catch (err) {
    console.log("Reminder cron error:", err.message);
  }
});