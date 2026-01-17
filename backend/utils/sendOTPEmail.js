require("dotenv").config();
const nodemailer = require("nodemailer");

/**
 * 🔐 Send OTP Email (Professional Design)
 * @param {string} email - Recipient's email address
 * @param {string} otp - OTP code to send
 */
async function sendOTPEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"LearnX Security Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "LearnX Password Reset OTP",
      html: `
        <div style=" font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 10px; max-width: 500px; margin: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.05); ">
          <div style="text-align: center; padding-bottom: 10px;">
            <h2 style="color: #2E2B5F; margin-bottom: 5px;">LearnX</h2>
            <p style="color: #555; font-size: 14px; margin: 0;">Password Reset Verification</p>
          </div>
          
          <div style=" background-color: #fff; padding: 20px; border-radius: 8px; margin-top: 15px; ">
            <p style="color: #333; font-size: 15px;">Dear User,</p>
            <p style="color: #333; font-size: 15px;">
              You recently requested to reset your LearnX account password. Use the following OTP to complete the process:
            </p>

            <div style=" text-align: center; background-color: #f2f2f2; padding: 12px; border-radius: 6px; margin: 20px 0; font-size: 22px; letter-spacing: 3px; font-weight: bold; color: #2E2B5F; ">
              ${otp}
            </div>

            <p style="color: #555; font-size: 14px; margin-bottom: 10px;">
              ⚠️ This OTP is valid for <strong>5 minutes</strong>. Please do not share it with anyone.
            </p>

            <p style="color: #555; font-size: 14px;">
              If you didn’t request this password reset, you can safely ignore this email.
            </p>
          </div>

          <div style="text-align: center; margin-top: 25px;">
            <p style="color: #888; font-size: 13px;">
              © ${new Date().getFullYear()} LearnX. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending OTP email:", error);
  }
}

module.exports = sendOTPEmail;
