require("dotenv").config();

const express = require("express");
const conn = require("./config/db");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

require("./utils/autoUnenroll");
require("./cron/liveClassReminderCron");
require("./cron/liveClassLifecycleCron");
const startAutoExpireSubscriptions = require("./utils/autoExpireSubscriptions");
const { initLiveClassSocket } = require("./socket/liveClassSocket");

const user = require("./routes/userRoute");
const course = require("./routes/courseRoute");
const category = require("./routes/categoryRoute");
const profile = require("./routes/profileRoute");
const lesson = require("./routes/lessonRoute");
const enroll = require("./routes/enrollmentRoute");
const instructor = require("./routes/instructorRoute");
const exam = require("./routes/examRoute");
const result = require("./routes/resultRoute");
const admin = require("./routes/adminRoute");
const auth = require("./routes/authRoute");
const payment = require("./routes/enrollmentPaymentRoute");
const contact = require("./routes/contactusRoute");
const forum = require("./routes/forumRoute");
const gamification = require("./routes/gamificationRoutes");
const analytics = require("./routes/analyticsRoute");
const subscriptionPlanRoute = require("./routes/subscriptionPlanRoute");
const subscriptionRoute = require("./routes/subscriptionRoute");
const razorpaySubRoute = require("./routes/razorpaySubscriptionRoute");
const revenueRoute = require("./routes/revenueRoute");
const sysSetting = require("./routes/systemSettingsRoutes");
const liveClassRoutes = require("./routes/liveClassRoutes");
const liveClassChatRoutes = require("./routes/liveClassChatRoutes");
const liveClassQuestionRoutes = require("./routes/liveClassQuestionRoutes");
const zoomWebhookRoutes = require("./routes/zoomWebhookRoutes");

const { razorpayWebhookHandler } = require("./controller/razorpayWebhookController");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

initLiveClassSocket(io);

// Razorpay webhook first
app.post("/webhooks/razorpay", express.raw({ type: "application/json" }), razorpayWebhookHandler);

// Zoom webhook route
app.use("/webhooks/zoom", express.json(), zoomWebhookRoutes);

// Normal parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

conn();
startAutoExpireSubscriptions();

app.use("/", user);
app.use("/courses", course);
app.use("/categories", category);
app.use("/profile", profile);
app.use("/", lesson);
app.use("/enrollments", enroll);
app.use("/instructor", instructor);
app.use("/exams", exam);
app.use("/result", result);
app.use("/admin", admin);
app.use("/auth", auth);
app.use("/payment", payment);
app.use("/contact", contact);
app.use("/forum", forum);
app.use("/gamification", gamification);
app.use("/analytics", analytics);
app.use("/subscription-plans", subscriptionPlanRoute);
app.use("/subscriptions", subscriptionRoute);
app.use("/razorpay", razorpaySubRoute);
app.use("/admin/revenue", revenueRoute);
app.use("/system-settings", sysSetting);
app.use("/live-classes", liveClassRoutes);
app.use("/live-class-chat", liveClassChatRoutes);
app.use("/live-class-questions", liveClassQuestionRoutes);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});