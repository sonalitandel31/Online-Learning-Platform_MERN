const cron = require("node-cron");
const liveClassController = require("../controller/liveClassController");

// Every minute check 10-minute reminder window
cron.schedule("* * * * *", async () => {
  try {
    await liveClassController.sendReminder10Min();
  } catch (err) {
    console.log("Live class reminder cron error:", err.message);
  }
});