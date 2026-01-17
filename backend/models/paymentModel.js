const { default: mongoose } = require("mongoose");

const paymentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "course", required: true },
  amount: { type: Number, required: true },
  platformCommission: { type: Number, default: 30 }, // percentage
  instructorEarning: { type: Number, required: true },
  status: { type: String, enum: ["pending", "completed", "failed"], default: "completed" },
  paymentId: String,
  paymentDate: { type: Date, default: Date.now },
  paymentMethod: { type: String, enum: ["Razorpay", "PayPal", "Bank Transfer"], default: "Razorpay" }
});

module.exports = mongoose.model("Payment", paymentSchema);
