const Enrollment = require("../models/enrollmentModel");
const Course = require("../models/courseModel");
const Student = require("../models/studentModel");

const path = require("path");

const fs = require("fs");
const PDFDocument = require("pdfkit");

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
};

const generateReceiptPDF = async ({ enrollment, course, student }) => {
  const fs = require("fs");
  const PDFDocument = require("pdfkit");
  const path = require("path");

  const ensureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  };

  const receiptsDir = path.join(__dirname, "..", "uploads", "receipts");
  ensureDir(receiptsDir);

  const receiptNo = `RX-${Date.now()}-${String(enrollment._id).slice(-6)}`;
  const fileName = `${receiptNo}.pdf`;
  const absPath = path.join(receiptsDir, fileName);
  const publicPath = `/uploads/receipts/${fileName}`;

  // ---------- helpers ----------
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
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#6B7280")
      .text(key, x, y, { width: keyW });

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#111827")
      .text(value, x + keyW, y - 1, { width: valW });
  };

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = fs.createWriteStream(absPath);
  doc.pipe(stream);

  // ---------- Header Bar ----------
  doc.save();
  doc.rect(0, 0, 595.28, 95).fill("#111827"); // dark header
  doc.restore();

  // Brand (change to your company name)
  doc
    .font("Helvetica-Bold")
    .fontSize(22)
    .fillColor("#FFFFFF")
    .text("LearnX", 50, 30);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#D1D5DB")
    .text("Online Learning Platform", 50, 58);

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor("#FFFFFF")
    .text("PAYMENT RECEIPT", 350, 38, { align: "right", width: 195 });

  // ---------- Receipt Meta Box ----------
  const metaTop = 110;
  doc.save();
  doc.roundedRect(50, metaTop, 495, 70, 10).fill("#F9FAFB");
  doc.restore();

  const receiptDate = new Date(enrollment.paymentDate || Date.now()).toLocaleString("en-IN");
  drawKeyValue(doc, 65, metaTop + 18, "Receipt No", receiptNo, 85, 160);
  drawKeyValue(doc, 320, metaTop + 18, "Date", receiptDate, 45, 170);

  drawKeyValue(doc, 65, metaTop + 42, "Payment Status", safe(enrollment.paymentStatus), 105, 140);
  drawKeyValue(doc, 320, metaTop + 42, "Amount Paid", `₹ ${formatINR(enrollment.amount)}`, 75, 170);

  // ---------- Customer + Course Blocks ----------
  const blockTop = metaTop + 90;

  // Left block: Student
  doc.save();
  doc.roundedRect(50, blockTop, 240, 120, 10).fill("#FFFFFF");
  doc.roundedRect(50, blockTop, 240, 120, 10).strokeColor("#E5E7EB").stroke();
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text("Billed To", 65, blockTop + 12);
  drawLine(doc, blockTop + 30);

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827").text(safe(student?.name), 65, blockTop + 42);
  doc.font("Helvetica").fontSize(9).fillColor("#374151").text(safe(student?.email), 65, blockTop + 60);

  // Right block: Course
  doc.save();
  doc.roundedRect(305, blockTop, 240, 120, 10).fill("#FFFFFF");
  doc.roundedRect(305, blockTop, 240, 120, 10).strokeColor("#E5E7EB").stroke();
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text("Course Details", 320, blockTop + 12);
  drawLine(doc, blockTop + 30);

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827").text(safe(course?.title), 320, blockTop + 42, {
    width: 210,
  });

  // optional IDs
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#374151")
    .text(`Course ID: ${safe(course?._id)}`, 320, blockTop + 75);

  // ---------- Payment Reference ----------
  const refTop = blockTop + 140;

  doc.save();
  doc.roundedRect(50, refTop, 495, 95, 10).fill("#FFFFFF");
  doc.roundedRect(50, refTop, 495, 95, 10).strokeColor("#E5E7EB").stroke();
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text("Payment Reference", 65, refTop + 12);

  drawKeyValue(doc, 65, refTop + 38, "Payment ID", safe(enrollment.paymentId), 80, 170);
  drawKeyValue(doc, 320, refTop + 38, "Order ID", safe(enrollment.orderId), 55, 170);

  drawKeyValue(doc, 65, refTop + 62, "Enrollment ID", safe(enrollment._id), 85, 410);

  // ---------- Amount Summary (table-like) ----------
  const sumTop = refTop + 115;

  doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827").text("Summary", 50, sumTop);

  const tableTop = sumTop + 18;
  doc.save();
  doc.roundedRect(50, tableTop, 495, 90, 10).fill("#F9FAFB");
  doc.restore();

  // header row
  doc.save();
  doc.rect(50, tableTop, 495, 28).fill("#111827");
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#FFFFFF").text("Description", 65, tableTop + 8);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#FFFFFF").text("Amount", 450, tableTop + 8, {
    width: 80,
    align: "right",
  });

  // row
  doc.font("Helvetica").fontSize(10).fillColor("#111827").text("Course Enrollment", 65, tableTop + 40);
  doc.font("Helvetica").fontSize(10).fillColor("#111827").text(`₹ ${formatINR(enrollment.amount)}`, 450, tableTop + 40, {
    width: 80,
    align: "right",
  });

  // total
  drawLine(doc, tableTop + 62, "#E5E7EB");
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text("Total Paid", 65, tableTop + 70);
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text(`₹ ${formatINR(enrollment.amount)}`, 450, tableTop + 70, {
    width: 80,
    align: "right",
  });

  // ---------- Footer ----------
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

/* const enrollCourse = async (req, res) => {
  try {
    const userId = req.user?._id || req.body.studentId;
    const { courseId, amount } = req.body;

    if (!userId || !courseId) {
      return res.status(400).json({ success: false, message: "Missing student or course" });
    }

    const course = await Course.findById(courseId);
    if (!course || course.status !== "approved") {
      return res.status(400).json({ success: false, message: "Course not available" });
    }

    let existing = await Enrollment.findOne({ student: userId, course: courseId });

    if (existing) {
      const now = new Date();
      if (existing.status === "cancelled" || existing.expiryDate < now) {
        existing.status = "active";
        existing.paymentStatus = "complete";
        existing.amount = amount;
        existing.expiryDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000); 
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

      return res.status(400).json({ success: false, message: "Already enrolled and active" });
    }

    const enrollment = await Enrollment.create({
      student: userId,
      course: courseId,
      amount,
      paymentStatus: "complete",
      status: "active",
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    });

    await Student.findOneAndUpdate(
      { user: userId },
      { $addToSet: { enrolledCourses: courseId } },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: "Enrollment successful",
      enrollment,
    });
  } catch (err) {
    console.error("EnrollCourse Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}; */

const enrollCourse = async (req, res) => {
  try {
    const userId = req.user?._id || req.body.studentId;
    const { courseId, amount } = req.body;

    if (!userId || !courseId) {
      return res.status(400).json({ success: false, message: "Missing student or course" });
    }

    const course = await Course.findById(courseId);
    if (!course || course.status !== "approved") {
      return res.status(400).json({ success: false, message: "Course not available" });
    }

    let existing = await Enrollment.findOne({ student: userId, course: courseId });

    // ✅ get student profile user info (name/email)
    const studentUser = await Student.findOne({ user: userId }).populate("user", "name email").lean();
    const studentInfo = {
      name: studentUser?.user?.name,
      email: studentUser?.user?.email,
    };

    if (existing) {
      const now = new Date();
      if (existing.status === "cancelled" || existing.expiryDate < now) {
        existing.status = "active";
        existing.paymentStatus = "complete";
        existing.amount = amount;
        existing.paymentDate = new Date();
        existing.expiryDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

        // ✅ generate new receipt
        const { publicPath, receiptNo } = await generateReceiptPDF({
          enrollment: existing,
          course,
          student: studentInfo,
        });
        existing.receiptUrl = publicPath;
        existing.receiptNo = receiptNo;

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

      return res.status(400).json({ success: false, message: "Already enrolled and active" });
    }

    const enrollment = await Enrollment.create({
      student: userId,
      course: courseId,
      amount,
      paymentStatus: "complete",
      status: "active",
      paymentDate: new Date(),
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    });

    // ✅ generate receipt after create (needs _id)
    const { publicPath, receiptNo } = await generateReceiptPDF({
      enrollment,
      course,
      student: studentInfo,
    });

    enrollment.receiptUrl = publicPath;
    enrollment.receiptNo = receiptNo;
    await enrollment.save();

    await Student.findOneAndUpdate(
      { user: userId },
      { $addToSet: { enrolledCourses: courseId } },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: "Enrollment successful",
      enrollment,
    });
  } catch (err) {
    console.error("EnrollCourse Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
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

    await Student.findOneAndUpdate(
      { user: userId },
      { $pull: { enrolledCourses: courseId } }
    );

    res.json({ success: true, message: "Unenrolled successfully" });
  } catch (err) {
    console.error("UnenrollCourse Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
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

    const student = await Student.findOne({ user: userId })
      .populate({
        path: "enrolledCourses",
        select: "title _id",
      })
      .lean();

    res.json({ success: true, enrollments, student });
  } catch (err) {
    console.error("GetStudentEnrollments Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const enrolledStudent = async (req, res) => {
  try {
    const { studentId, courseId } = req.params;

    let enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
    })
      .populate("student", "name email")
      .populate("course", "title");

    if (!enrollment) {
      return res.status(200).json({ message: "Enrollment not found" });
    }

    if (enrollment.progress === 100 && !enrollment.certificate) {
      const fileName = `${studentId}_${courseId}_Certificate.pdf`;
      const filePath = `/uploads/certificates/${fileName}`;

      enrollment.certificate = filePath;
      await enrollment.save();
    }

    res.json(enrollment);
  } catch (err) {
    console.error("Enrollment fetch error:", err);
    res.status(500).json({ message: "Server error" });
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

    if (enrollment.paymentStatus !== "complete") {
      return res.status(400).json({ success: false, message: "Payment not completed" });
    }

    if (!enrollment.receiptUrl) {
      return res.status(404).json({ success: false, message: "Receipt not available" });
    }

    const absPath = path.join(__dirname, "..", enrollment.receiptUrl);
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
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { enrollCourse, unenrollCourse, getStudentEnrollments, enrolledStudent, downloadReceipt };
