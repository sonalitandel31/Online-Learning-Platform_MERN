const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const sendOTPEmail = require("../utils/sendOTPEmail");

const JWT_SECRET = process.env.JWT_SECRET;

const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);

    const token = jwt.sign(
      { email, hashedOtp },
      JWT_SECRET,
      { expiresIn: "5m" }
    );

    await sendOTPEmail(email, `Your OTP is ${otp}`);

    res.json({ message: "OTP sent to email", token });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp, token } = req.body;
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.email !== email)
      return res.status(400).json({ message: "Email mismatch" });

    const valid = await bcrypt.compare(otp, decoded.hashedOtp);
    if (!valid) return res.status(400).json({ message: "Invalid OTP" });

    const resetToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: "10m" });

    res.json({ message: "OTP verified", resetToken });
  } catch (err) {
    res.status(400).json({ message: "Invalid or expired OTP token" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    const decoded = jwt.verify(resetToken, JWT_SECRET);

    const user = await User.findOne({ email: decoded.email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(400).json({ message: "Invalid or expired token" });
  }
};

module.exports = { sendOtp, verifyOtp, resetPassword };
