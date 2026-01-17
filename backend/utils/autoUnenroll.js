const cron = require("node-cron");
const Enrollment = require("../models/enrollmentModel");

cron.schedule("0 0 * * *", async () => { 
  const now = new Date();
  await Enrollment.updateMany(
    { expiryDate: { $lt: now }, status: "active" },
    { $set: { status: "cancelled" } }
  );
  console.log("Auto Unenroll: expired enrollments updated");
});
