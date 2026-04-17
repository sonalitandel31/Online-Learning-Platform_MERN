const Razorpay = require("razorpay");
const crypto = require("crypto");
const Enrollment = require("../models/enrollmentModel");
const Course = require("../models/courseModel");
const Payment = require("../models/paymentModel");
const Student = require("../models/studentModel");
const SystemSettings = require("../models/SystemSettings");

const { generateReceiptPDF } = require("../utils/receiptGenerator");
const { getEffectivePlatformCommission } = require("../utils/commissionHelper");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

exports.createOrder = async (req, res) => {
  try {
    const { courseId, studentId } = req.body;

    if (!courseId || !studentId) {
      return res.status(400).json({ success: false, message: "Course ID and Student ID are required" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const amount = Number(course.price || 0);

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: crypto.randomBytes(10).toString("hex"),
      notes: { courseId, studentId },
    };

    const order = await razorpay.orders.create(options);
    if (!order) return res.status(500).json({ success: false, message: "Order creation failed" });

    return res.status(200).json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount,
      currency: "INR",
      courseName: course.title,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      studentId,
      courseId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing payment details" });
    }

    // 1) Verify signature
    const sign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(sign)
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    // 2) Course
    const course = await Course.findById(courseId).populate("instructor");
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    const amount = Number(course.price || 0);
    const instructorId = course.instructor?._id;

    const settings = await SystemSettings.findOne();
    const platformCommissionPercent =settings?.defaultPlatformCommission ?? 30;

    const instructorEarning = amount - (amount * platformCommissionPercent) / 100;

    const now = new Date();
    const newExpiry = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

    // 3) Student info for receipt
    const studentUser = await Student.findOne({ user: studentId })
      .populate("user", "name email")
      .lean();

    const studentInfo = {
      name: studentUser?.user?.name,
      email: studentUser?.user?.email,
    };

    // 4) Find existing enrollment
    let enrollment = await Enrollment.findOne({ student: studentId, course: courseId });

    const updateStudentEnrolledList = async () => {
      await Student.findOneAndUpdate(
        { user: studentId },
        { $addToSet: { enrolledCourses: courseId } }
      );
    };

    // 5) Create / Reactivate enrollment
    if (enrollment) {
      const expired = enrollment.expiryDate && new Date(enrollment.expiryDate) < now;
      const cancelled = enrollment.status === "cancelled";

      if (cancelled || expired) {
        enrollment.status = "active";
        enrollment.paymentId = razorpay_payment_id;
        enrollment.orderId = razorpay_order_id;
        enrollment.paymentStatus = "complete";
        enrollment.amount = amount;
        enrollment.paymentDate = new Date();
        enrollment.expiryDate = newExpiry;

        await enrollment.save();
        await updateStudentEnrolledList();
      } else {
        // already active
        // still ensure enrolledCourses exists
        await updateStudentEnrolledList();
      }
    } else {
      enrollment = await Enrollment.create({
        student: studentId,
        course: courseId,
        amount,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        paymentStatus: "complete",
        status: "active",
        paymentDate: new Date(),
        expiryDate: newExpiry,
      });

      await updateStudentEnrolledList();
    }

    // 6) Payment record
    await Payment.create({
      student: studentId,
      instructor: instructorId,
      course: courseId,
      amount,
      platformCommission: platformCommissionPercent,
      instructorEarning,
      status: "completed",
      paymentId: razorpay_payment_id,
    });

    // 7) Generate receipt + store on enrollment
    const { publicPath, receiptNo } = await generateReceiptPDF({
      enrollment,
      course,
      student: studentInfo,
    });

    enrollment.receiptUrl = publicPath;
    enrollment.receiptNo = receiptNo;
    await enrollment.save();

    // 8) Return receiptUrl to frontend
    return res.status(200).json({
      success: true,
      message: "Payment verified & receipt generated",
      enrollment,
      receiptUrl: enrollment.receiptUrl,
    });

  } catch (error) {
    console.error("verifyPayment error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};