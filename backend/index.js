require("dotenv").config();

const express = require("express");
const conn = require("./config/db");
const cors = require("cors");
const path = require("path");

require("./utils/autoUnenroll");
require("./cron/liveClassReminderCron");
require("./cron/liveClassLifecycleCron");
const startAutoExpireSubscriptions = require("./utils/autoExpireSubscriptions");

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

const { razorpayWebhookHandler } = require("./controller/razorpayWebhookController");

const app = express();

// 1) WEBHOOK FIRST (RAW BODY)
// Must be before express.json() otherwise signature verify fails.
app.post("/webhooks/razorpay", express.raw({ type: "application/json" }), razorpayWebhookHandler);

// 2) Normal parsers for rest of app
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3) CORS + Static
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 4) DB connect
conn();
startAutoExpireSubscriptions();

// 5) Routes
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

app.use("/system-settings", sysSetting );

app.use("/live-classes", liveClassRoutes);

// 6) Start server
app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});;