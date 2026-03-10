const cron = require("node-cron");
const liveClassController = require("../controller/liveClassController");

// Every minute check reminder window
cron.schedule("* * * * *", async () => {
  try {
    await liveClassController.sendReminder10Min();
  } catch (err) {
    console.log("Reminder cron error:", err.message);
  }
});