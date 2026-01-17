const Razorpay = require("razorpay");
const crypto = require("crypto");
const Enrollment = require("../models/enrollmentModel");
const Course = require("../models/courseModel");
const Payment = require("../models/paymentModel");
const Student = require("../models/studentModel"); 

//initialize Razorpay instance
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

    const amount = course.price;

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: crypto.randomBytes(10).toString("hex"),
      notes: {
        courseId: courseId,
        studentId: studentId,
      },
    };

    const order = await razorpay.orders.create(options);
    if (!order) return res.status(500).json({ success: false, message: "Order creation failed" });

    res.status(200).json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: amount,
      currency: "INR",
      courseName: course.title,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      studentId, // Yeh user ki ID hai
      courseId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing payment details" });
    }

    // 1. Verify Razorpay signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    const course = await Course.findById(courseId).populate("instructor");
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const amount = course.price || 0;
    const instructorId = course.instructor?._id;
    const platformCommissionPercent = 20;
    const instructorEarning = amount - (amount * platformCommissionPercent) / 100;
    const newExpiry = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000); 

    let existing = await Enrollment.findOne({ student: studentId, course: courseId });

    // 2. LOGIC TO UPDATE STUDENT TABLE (Common for both new and existing)
    const updateStudentEnrolledList = async () => {
      await Student.findOneAndUpdate(
        { user: studentId }, // Agar aapka model direct _id use karta hai toh { _id: studentId } likhein
        { $addToSet: { enrolledCourses: courseId } }
      );
    };

    if (existing) {
      const now = new Date();
      if (existing.status === "cancelled" || existing.expiryDate < now) {
        existing.status = "active";
        existing.paymentId = razorpay_payment_id;
        existing.orderId = razorpay_order_id;
        existing.paymentStatus = "complete";
        existing.amount = amount;
        existing.expiryDate = newExpiry;
        await existing.save();

        // Update Student Array
        await updateStudentEnrolledList();

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

        return res.status(200).json({ success: true, message: "Re-enrolled successfully", enrollment: existing });
      }
      return res.status(200).json({ success: true, message: "Already enrolled", enrollment: existing });
    }

    // 3. New Enrollment
    const newEnrollment = await Enrollment.create({
      student: studentId,
      course: courseId,
      amount,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      paymentStatus: "complete",
      status: "active",
      expiryDate: newExpiry,
    });

    // CRITICAL FIX: Add course to Student's enrolledCourses list
    await updateStudentEnrolledList();

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

    res.status(200).json({
      success: true,
      message: "Payment verified & Student profile updated",
      enrollment: newEnrollment,
    });

  } catch (error) {
    console.error("verifyPayment error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      studentId,
      courseId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Missing payment details" });
    }

    //verify Razorpay signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment signature" });
    }

    const course = await Course.findById(courseId).populate("instructor");
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    const amount = course.price || 0;
    const instructorId = course.instructor?._id;
    const platformCommissionPercent = 20;
    const instructorEarning = amount - (amount * platformCommissionPercent) / 100;

    let existing = await Enrollment.findOne({
      student: studentId,
      course: courseId,
    });

    const newExpiry = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000); 

    if (existing) {
      const now = new Date();
      if (existing.status === "cancelled" || existing.expiryDate < now) {
        existing.status = "active";
        existing.paymentId = razorpay_payment_id;
        existing.orderId = razorpay_order_id;
        existing.paymentStatus = "complete";
        existing.amount = amount;
        existing.expiryDate = newExpiry;
        await existing.save();

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

        return res.status(200).json({
          success: true,
          message: "Re-enrolled successfully after payment",
          enrollment: existing,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Already enrolled and active",
        enrollment: existing,
      });
    }

    const newEnrollment = await Enrollment.create({
      student: studentId,
      course: courseId,
      amount,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      paymentStatus: "complete",
      status: "active",
      expiryDate: newExpiry,
    });

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

    res.status(200).json({
      success: true,
      message: "Payment verified & new enrollment created successfully",
      enrollment: newEnrollment,
    });
  } catch (error) {
    console.error("verifyPayment error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}; */