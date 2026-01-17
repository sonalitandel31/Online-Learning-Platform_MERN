require("dotenv").config();
require("./utils/autoUnenroll");

const express = require("express");
const conn = require("./config/db");
const cors = require("cors");
const path = require("path");

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

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}));

conn();

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/", user);
app.use("/courses", course);
app.use("/categories", category)
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

app.listen(process.env.PORT, () => {
    console.log("Server is running on port 3000");
});