const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ["Pending", "Resolved"], default: "Pending" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("contactRequest", contactSchema);
