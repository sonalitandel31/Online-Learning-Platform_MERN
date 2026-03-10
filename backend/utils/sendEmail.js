const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmail({ to, subject, html }) {
  if (!to) return;

  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to];
  if (recipients.length === 0) return;

  return transporter.sendMail({
    from: `"LearnX" <${process.env.EMAIL_USER}>`,
    to: recipients.join(","),
    subject,
    html,
  });
}

module.exports = sendEmail;