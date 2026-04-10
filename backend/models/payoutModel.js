const mongoose = require("mongoose");

const payoutSchema = new mongoose.Schema({
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  amount: { type: Number, required: true }, // Kitna paisa bheja
  month: { type: Number, required: true }, // e.g., 4 (April)
  year: { type: Number, required: true }, // e.g., 2026
  transactionId: { type: String, required: true }, // Bank IMPS/NEFT ref number
  status: { type: String, enum: ["processing", "completed"], default: "completed" },
  paidAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Payout", payoutSchema);