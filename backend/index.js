require("dotenv").config();

const express = require("express");
const conn = require("./config/db");
const cors = require("cors");
const helmet = require("helmet"); // NAYA: Helmet import kiya
const rateLimit = require("express-rate-limit"); // NAYA: Rate Limit import kiya
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

require("./utils/autoUnenroll");
require("./cron/liveClassReminderCron");
require("./cron/liveClassLifecycleCron");
const startAutoExpireSubscriptions = require("./utils/autoExpireSubscriptions");
const { initLiveClassSocket } = require("./socket/liveClassSocket");

const initEngagementCron = require("./cron/engagementCron");

// --- Route Imports ---
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
const aiRoute = require("./routes/aiRoute");
const companyRoutes = require('./routes/companyRoute');
const hrRoutes = require('./routes/hrRoute');
const notificationRoutes = require('./routes/notificationRoutes');

const { razorpayWebhookHandler } = require("./controller/razorpayWebhookController");

const app = express();
const server = http.createServer(app);

// SOCKET.IO SETUP
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

initLiveClassSocket(io);

// EXTERNAL WEBHOOKS (Bypass rate limits & standard parsing)
// Razorpay webhook first (requires raw body)
app.post("/webhooks/razorpay", express.raw({ type: "application/json" }), razorpayWebhookHandler);

// Zoom webhook route
app.use("/webhooks/zoom", express.json(), zoomWebhookRoutes);

// SECURITY MIDDLEWARES
// 1. Helmet: Secure HTTP headers (crossOriginResourcePolicy false to allow serving images from /uploads)
app.use(helmet({ crossOriginResourcePolicy: false }));

// 2. CORS: Restrict API access to your allowed frontend URL
app.use(
  cors({
    origin: process.env.CLIENT_URL, 
    credentials: true,
  })
);

// 3. Rate Limiting: Prevent DDoS and API Spamming
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1500, // Limit each IP to 1500 requests per `window` (15 minutes). High enough for video streaming/LMS needs.
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes."
  },
  standardHeaders: true, 
  legacyHeaders: false, 
});

// Apply rate limiter to all routes below this line
app.use(apiLimiter);

// STANDARD MIDDLEWARES & STATIC FILES
// Normal parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// INITIALIZATION & CRON JOBS
conn();
startAutoExpireSubscriptions();
initEngagementCron();

// API ROUTES
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
app.use("/ai", aiRoute);
app.use('/companies', companyRoutes); 
app.use('/hr', hrRoutes);             
app.use('/notifications', notificationRoutes);             

// SERVER START
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});