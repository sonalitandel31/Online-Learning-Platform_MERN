const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "course", required: true },
  amount: { type: Number, required: true },
  platformCommission: { type: Number, default: 30 }, 
  instructorEarning: { type: Number, required: true },
  
  // Student ne platform ko pay kiya ya nahi
  status: { type: String, enum: ["pending", "completed", "failed"], default: "completed" },
  
  // NEW: Platform ne Instructor ko pay kiya ya nahi!
  payoutStatus: { type: String, enum: ["pending", "processed"], default: "pending" }, 
  
  paymentId: String,
  paymentDate: { type: Date, default: Date.now },
  paymentMethod: { type: String, enum: ["Razorpay", "PayPal", "Bank Transfer"], default: "Razorpay" }
});

module.exports = mongoose.model("Payment", paymentSchema);