const Enrollment = require("../models/enrollmentModel");
const Course = require("../models/courseModel");
const Student = require("../models/studentModel");
const UserSubscription = require("../models/userSubscriptionModel");
const { checkSubscriptionForCourse } = require("../utils/subscriptionAccess");

const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");

// ---------- helpers ----------
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
};

// NOTE: Your generateReceiptPDF is kept as-is
const generateReceiptPDF = async ({ enrollment, course, student }) => {
  const receiptsDir = path.join(__dirname, "..", "uploads", "receipts");
  ensureDir(receiptsDir);

  const receiptNo = `RX-${Date.now()}-${String(enrollment._id).slice(-6)}`;
  const fileName = `${receiptNo}.pdf`;
  const absPath = path.join(receiptsDir, fileName);
  const publicPath = `/uploads/receipts/${fileName}`;

  const formatINR = (n) => {
    const val = Number(n || 0);
    return val.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  };
  const safe = (v) => (v ? String(v) : "—");

  const drawLine = (doc, y, color = "#E5E7EB") => {
    doc.save();
    doc.strokeColor(color).lineWidth(1).moveTo(50, y).lineTo(545, y).stroke();
    doc.restore();
  };

  const drawKeyValue = (doc, x, y, key, value, keyW = 110, valW = 170) => {
    doc.font("Helvetica").fontSize(9).fillColor("#6B7280").text(key, x, y, { width: keyW });

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#111827")
      .text(value, x + keyW, y - 1, { width: valW });
  };

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = fs.createWriteStream(absPath);
  doc.pipe(stream);

  // Header
  doc.save();
  doc.rect(0, 0, 595.28, 95).fill("#111827");
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(22).fillColor("#FFFFFF").text("LearnX", 50, 30);
  doc.font("Helvetica").fontSize(10).fillColor("#D1D5DB").text("Online Learning Platform", 50, 58);
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor("#FFFFFF")
    .text("PAYMENT RECEIPT", 350, 38, { align: "right", width: 195 });

  const metaTop = 110;
  doc.save();
  doc.roundedRect(50, metaTop, 495, 70, 10).fill("#F9FAFB");
  doc.restore();

  const receiptDate = new Date(enrollment.paymentDate || Date.now()).toLocaleString("en-IN");
  drawKeyValue(doc, 65, metaTop + 18, "Receipt No", receiptNo, 85, 160);
  drawKeyValue(doc, 320, metaTop + 18, "Date", receiptDate, 45, 170);

  drawKeyValue(doc, 65, metaTop + 42, "Payment Status", safe(enrollment.paymentStatus), 105, 140);
  drawKeyValue(doc, 320, metaTop + 42, "Amount Paid", `₹ ${formatINR(enrollment.amount)}`, 75, 170);

  const blockTop = metaTop + 90;

  // Student block
  doc.save();
  doc.roundedRect(50, blockTop, 240, 120, 10).fill("#FFFFFF");
  doc.roundedRect(50, blockTop, 240, 120, 10).strokeColor("#E5E7EB").stroke();
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text("Billed To", 65, blockTop + 12);
  drawLine(doc, blockTop + 30);

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827").text(safe(student?.name), 65, blockTop + 42);
  doc.font("Helvetica").fontSize(9).fillColor("#374151").text(safe(student?.email), 65, blockTop + 60);

  // Course block
  doc.save();
  doc.roundedRect(305, blockTop, 240, 120, 10).fill("#FFFFFF");
  doc.roundedRect(305, blockTop, 240, 120, 10).strokeColor("#E5E7EB").stroke();
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text("Course Details", 320, blockTop + 12);
  drawLine(doc, blockTop + 30);

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827").text(safe(course?.title), 320, blockTop + 42, {
    width: 210,
  });

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#374151")
    .text(`Course ID: ${safe(course?._id)}`, 320, blockTop + 75);

  // Payment reference
  const refTop = blockTop + 140;
  doc.save();
  doc.roundedRect(50, refTop, 495, 95, 10).fill("#FFFFFF");
  doc.roundedRect(50, refTop, 495, 95, 10).strokeColor("#E5E7EB").stroke();
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text("Payment Reference", 65, refTop + 12);

  const safeEnrollId = safe(enrollment._id);
  drawKeyValue(doc, 65, refTop + 38, "Payment ID", safe(enrollment.paymentId), 80, 170);
  drawKeyValue(doc, 320, refTop + 38, "Order ID", safe(enrollment.orderId), 55, 170);
  drawKeyValue(doc, 65, refTop + 62, "Enrollment ID", safeEnrollId, 85, 410);

  // Summary
  const sumTop = refTop + 115;
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827").text("Summary", 50, sumTop);

  const tableTop = sumTop + 18;
  doc.save();
  doc.roundedRect(50, tableTop, 495, 90, 10).fill("#F9FAFB");
  doc.restore();

  doc.save();
  doc.rect(50, tableTop, 495, 28).fill("#111827");
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#FFFFFF").text("Description", 65, tableTop + 8);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#FFFFFF").text("Amount", 450, tableTop + 8, {
    width: 80,
    align: "right",
  });

  doc.font("Helvetica").fontSize(10).fillColor("#111827").text("Course Enrollment", 65, tableTop + 40);
  doc.font("Helvetica").fontSize(10).fillColor("#111827").text(`₹ ${formatINR(enrollment.amount)}`, 450, tableTop + 40, {
    width: 80,
    align: "right",
  });

  drawLine(doc, tableTop + 62, "#E5E7EB");
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text("Total Paid", 65, tableTop + 70);
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text(`₹ ${formatINR(enrollment.amount)}`, 450, tableTop + 70, {
    width: 80,
    align: "right",
  });

  const footerY = 753;
  drawLine(doc, footerY, "#E5E7EB");

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#6B7280")
    .text("This is a system-generated receipt. No signature required.", 50, footerY + 12, {
      align: "center",
      width: 495,
    });

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#6B7280")
    .text("For support: support@learnx.com", 50, footerY + 28, {
      align: "center",
      width: 495,
    });

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return { publicPath, receiptNo };
};

// ---------- UPDATED: enrollCourse ----------
const enrollCourse = async (req, res) => {
  try {
    const courseId = req.body.courseId || req.body.course;
    const userId = req.user?._id || req.body.studentId;
    const amount = Number(req.body.amount || 0);
    const source = String(req.body.source || "purchase").toLowerCase();

    if (!userId || !courseId) {
      return res.status(400).json({ success: false, message: "Missing student or course" });
    }

    // 1. Safe Student Fetch
    const studentUser = await Student.findOne({ user: userId })
      .populate("user", "name email")
      .lean();

    const studentInfo = {
      name: studentUser?.user?.name || "Student",
      email: studentUser?.user?.email || "N/A",
    };

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    // ===== B2B PAYMENT BYPASS =====
    let finalAmount = amount;
    let finalSource = source;
    let finalPaymentStatus = source === "subscription" ? "subscription" : "complete";

    if (course.isGlobal === false) {
      const userCompanyId = req.user?.companyId?.toString() || studentUser?.companyId?.toString();
      const allowedCompanies = course.allowedCompanies?.map(c => c.toString()) || [];

      if (userCompanyId && allowedCompanies.includes(userCompanyId)) {
        finalAmount = 0;
        finalSource = "corporate_b2b";
        finalPaymentStatus = "bypassed_corporate";
      } else {
        return res.status(403).json({ success: false, message: "Access Denied: This is a private corporate course." });
      }
    }

    // 3. Check for existing active enrollment
    let existing = await Enrollment.findOne({ student: userId, course: courseId });
    if (existing && existing.status !== "cancelled") {
      return res.status(200).json({ success: true, message: "Already enrolled", enrollment: existing });
    }

    const now = new Date();
    const isExistingActive =
      existing &&
      existing.status !== "cancelled" &&
      (!existing.expiryDate || new Date(existing.expiryDate) >= now);

    if (isExistingActive) {
      return res.status(200).json({
        success: true,
        message: "Already enrolled",
        enrollment: existing,
      });
    }

    // Decide expiry
    let expiryDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

    if (finalSource === "subscription") {
      const sub = await UserSubscription.findOne({ userId })
        .sort({ createdAt: -1 })
        .lean();

      const paidEnd = sub?.currentPeriodEnd || sub?.endDate;
      const trialEnd = sub?.trialEndDate;

      const pick =
        (trialEnd && new Date(trialEnd) > now ? new Date(trialEnd) : null) ||
        (paidEnd && new Date(paidEnd) > now ? new Date(paidEnd) : null);

      if (pick) expiryDate = pick;
    }

    // ✅ re-activate if exists but cancelled/expired
    if (existing) {
      existing.status = "active";
      existing.paymentStatus = finalPaymentStatus;
      // Force amount to 0 if it's a subscription enrollment
      existing.amount = finalSource === "subscription" ? 0 : finalAmount;
      existing.paymentDate = new Date();
      existing.expiryDate = expiryDate;
      existing.source = finalSource;

      // BYPASS RECEIPT IF SUBSCRIPTION
      if (finalSource !== "subscription") {
        const { publicPath, receiptNo } = await generateReceiptPDF({
          enrollment: existing,
          course,
          student: studentInfo,
        });
        existing.receiptUrl = publicPath;
        existing.receiptNo = receiptNo;
      } else {
        existing.receiptUrl = null;
        existing.receiptNo = null;
      }

      await existing.save();

      await Student.findOneAndUpdate(
        { user: userId },
        { $addToSet: { enrolledCourses: courseId } },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: "Re-enrolled successfully",
        enrollment: existing,
      });
    }

    // ✅ create new enrollment
    const enrollment = await Enrollment.create({
      student: userId,
      course: courseId,
      // Force amount to 0 if it's a subscription enrollment
      amount: finalSource === "subscription" ? 0 : finalAmount,
      paymentStatus: finalPaymentStatus,
      status: "active",
      paymentDate: new Date(),
      expiryDate,
      source: finalSource,
    });

    // BYPASS RECEIPT IF SUBSCRIPTION
    if (finalSource !== "subscription") {
      const { publicPath, receiptNo } = await generateReceiptPDF({
        enrollment,
        course,
        student: studentInfo,
      });
      enrollment.receiptUrl = publicPath;
      enrollment.receiptNo = receiptNo;
      await enrollment.save();
    }

    await Student.findOneAndUpdate(
      { user: userId },
      { $addToSet: { enrolledCourses: courseId } },
      { new: true }
    );

    return res.status(201).json({
      success: true,
      message: "Enrollment successful",
      enrollment,
    });
  } catch (err) {
    console.error("EnrollCourse Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const unenrollCourse = async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId } = req.params;

    const enrollment = await Enrollment.findOne({ student: userId, course: courseId });
    if (!enrollment) {
      return res.status(404).json({ success: false, message: "Enrollment not found" });
    }

    enrollment.status = "cancelled";
    await enrollment.save();

    await Student.findOneAndUpdate({ user: userId }, { $pull: { enrolledCourses: courseId } });

    return res.json({ success: true, message: "Unenrolled successfully" });
  } catch (err) {
    console.error("UnenrollCourse Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getStudentEnrollments = async (req, res) => {
  try {
    const userId = req.user._id;

    const enrollments = await Enrollment.find({ student: userId })
      .populate({
        path: "course",
        select: "title description price instructor status thumbnail lessons",
        populate: { path: "instructor", select: "name" },
      })
      .lean();

    const sub = await UserSubscription.findOne({ userId }).sort({ createdAt: -1 }).populate("planId").lean();

    let subscription = { active: false, status: null, accessType: null, courseIds: [] };
    if (sub) {
      const now = new Date();
      const paidEnd = sub.currentPeriodEnd || sub.endDate;
      const trialOk = sub.status === "trial" && sub.trialEndDate && new Date(sub.trialEndDate) > now;
      const paidOk =
        (sub.status === "active" || sub.status === "cancelled") && paidEnd && new Date(paidEnd) > now;

      subscription = {
        active: Boolean(trialOk || paidOk),
        status: sub.status,
        accessType: sub.planId?.accessType || null,
        courseIds: sub.planId?.courseIds || [],
      };
    }

    const student = await Student.findOne({ user: userId })
      .populate({ path: "enrolledCourses", select: "title _id" })
      .lean();

    return res.json({ success: true, enrollments, student, subscription });
  } catch (err) {
    console.error("GetStudentEnrollments Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const enrolledStudent = async (req, res) => {
  try {
    const { studentId, courseId } = req.params;

    if (String(req.user?._id) !== String(studentId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const enrollment = await Enrollment.findOne({ student: studentId, course: courseId })
      .populate("student", "name email")
      .populate("course", "title lessons");

    const now = new Date();
    const enrollmentAccess =
      enrollment &&
      enrollment.status !== "cancelled" &&
      (!enrollment.expiryDate || enrollment.expiryDate >= now);

    if (enrollmentAccess) {
      return res.json({
        ...enrollment.toObject(),
        access: true,
        accessType: "purchase",
      });
    }

    const subCheck = await checkSubscriptionForCourse({ userId: studentId, courseId });
    if (subCheck.ok) {
      return res.json({
        message: "Access granted via subscription",
        access: true,
        accessType: "subscription",
      });
    }

    if (!enrollment) {
      return res.status(200).json({ message: "Enrollment not found", access: false, accessType: "none" });
    }

    return res.json({
      ...enrollment.toObject(),
      access: false,
      accessType: "none",
    });
  } catch (err) {
    console.error("Enrollment fetch error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

const downloadReceipt = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const enrollment = await Enrollment.findById(id).populate("course", "title").lean();
    if (!enrollment) return res.status(404).json({ success: false, message: "Enrollment not found" });

    if (String(enrollment.student) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (enrollment.paymentStatus !== "complete" && enrollment.paymentStatus !== "subscription") {
      return res.status(400).json({ success: false, message: "Payment not completed" });
    }

    if (!enrollment.receiptUrl) {
      return res.status(404).json({ success: false, message: "Receipt not available" });
    }

    const rel = String(enrollment.receiptUrl || "").replace(/^\//, "");
    const absPath = path.join(__dirname, "..", rel);

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ success: false, message: "Receipt file missing" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="receipt-${enrollment.receiptNo || enrollment._id}.pdf"`
    );

    return fs.createReadStream(absPath).pipe(res);
  } catch (err) {
    console.error("DownloadReceipt Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getEnrollmentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Certificate ke liye humein Student ka naam aur Course (with Instructor) ka naam chahiye
    const enrollment = await Enrollment.findById(id)
      .populate("student", "name email")
      .populate({
        path: "course",
        select: "title instructor",
        populate: { path: "instructor", select: "name" }
      })
      .lean();

    if (!enrollment) {
      return res.status(404).json({ success: false, message: "Enrollment not found" });
    }

    // Security check: Sirf wo student apna certificate dekh sake (ya admin/hr)
    if (String(enrollment.student._id) !== String(req.user._id) && !["admin", "hr_manager"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Unauthorized to view this certificate" });
    }

    return res.status(200).json({ success: true, enrollment });
  } catch (err) {
    console.error("GetEnrollmentById Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { enrollCourse, unenrollCourse, getStudentEnrollments, enrolledStudent, downloadReceipt, getEnrollmentById };