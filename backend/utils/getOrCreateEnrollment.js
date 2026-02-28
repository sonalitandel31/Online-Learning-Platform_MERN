const Enrollment = require("../models/enrollmentModel");
const { checkSubscriptionForCourse } = require("./subscriptionAccess");

const getOrCreateEnrollmentForAccess = async ({ userId, courseId }) => {
  // 1) Try existing enrollment (purchase or previous)
  let enrollment = await Enrollment.findOne({ student: userId, course: courseId });
  if (enrollment) return { enrollment, created: false, via: "purchase_or_existing" };

  // 2) If not enrolled, but has subscription access => create shadow enrollment
  const subCheck = await checkSubscriptionForCourse({ userId, courseId });
  if (!subCheck.ok) return { enrollment: null, created: false, via: "none" };

  // Create shadow enrollment (subscription-based)
  enrollment = await Enrollment.create({
    student: userId,
    course: courseId,
    amount: 0,
    paymentStatus: "complete",
    status: "active",
    paymentId: "SUBSCRIPTION_ACCESS",
    orderId: null,
    // optional: align with subscription endDate (better than 180 days)
    expiryDate: subCheck.subscription?.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  return { enrollment, created: true, via: "subscription_shadow" };
};

module.exports = { getOrCreateEnrollmentForAccess };
