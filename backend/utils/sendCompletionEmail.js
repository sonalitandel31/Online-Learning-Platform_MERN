require("dotenv").config();
const { jsPDF } = require("jspdf");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const volsteadFont = require("./Volstead-Regular"); 

async function generateCertificate(studentName, courseTitle, instructorName, certificateId) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  pdf.addFileToVFS("Volstead.ttf", volsteadFont);
  pdf.addFont("Volstead.ttf", "Volstead", "normal");

  const learnxPurple = "#2E2B5F";
  const darkGray = "#444444";

  pdf.setFillColor(46, 43, 95);
  pdf.triangle(0, 0, 297, 0, 0, 40, "F");
  pdf.triangle(297, 210, 297, 170, 0, 210, "F");

  const logoPath = path.resolve(__dirname, "../../frontend/public/lms.webp");
  const watermarkPath = path.resolve(__dirname, "../../frontend/public/lms1.png");

  let logoBase64 = null;
  let watermarkBase64 = null;

  try {
    if (fs.existsSync(logoPath))
      logoBase64 = fs.readFileSync(logoPath).toString("base64");
    if (fs.existsSync(watermarkPath))
      watermarkBase64 = fs.readFileSync(watermarkPath).toString("base64");
  } catch (err) {
    console.error("Error loading logo images:", err);
  }

  if (watermarkBase64) {
    pdf.setGState(new pdf.GState({ opacity: 0.08 }));
    pdf.addImage(`data:image/png;base64,${watermarkBase64}`, "PNG", 90, 55, 120, 80);
    pdf.setGState(new pdf.GState({ opacity: 1 }));
  }

  if (logoBase64) {
    pdf.addImage(`data:image/png;base64,${logoBase64}`, "PNG", 130, 12, 35, 18);
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(learnxPurple);
  pdf.text("LEARNX ACADEMY", 148.5, 40, { align: "center" });

  pdf.setFontSize(28);
  pdf.setTextColor(0, 0, 0);
  pdf.text("CERTIFICATE OF COMPLETION", 148.5, 65, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.setTextColor(darkGray);
  pdf.text("This certificate is proudly presented to", 148.5, 80, { align: "center" });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(learnxPurple);
  pdf.text(studentName, 148.5, 95, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.setTextColor(darkGray);
  pdf.text(
    `for successfully completing the "${courseTitle}" course conducted by LearnX Academy.`,
    148.5,
    110,
    { align: "center", maxWidth: 220 }
  );
  pdf.text(
    "In recognition of your dedication and achievement in professional upskilling.",
    148.5,
    120,
    { align: "center", maxWidth: 220 }
  );

  const date = new Date().toLocaleDateString("en-GB");
  pdf.setFontSize(10);
  pdf.setTextColor("#666666");
  pdf.text(`Date: ${date}`, 30, 185);
  pdf.text(`Certificate ID: ${certificateId}`, 230, 185);

  pdf.setFont("Volstead", "normal");
  pdf.setFontSize(26);
  pdf.setTextColor(learnxPurple);
  pdf.text(instructorName || "Instructor", 220, 168, { align: "center" });

  pdf.setDrawColor(46, 43, 95);
  pdf.line(180, 172, 260, 172);

  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(10);
  pdf.setTextColor(darkGray);
  pdf.text("Training Instructor", 220, 180, { align: "center" });

  const dir = path.resolve(__dirname, "../uploads/certificates");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const outputPath = path.join(dir, `${certificateId}.pdf`);
  const pdfData = pdf.output("arraybuffer");
  fs.writeFileSync(outputPath, Buffer.from(pdfData));

  return outputPath;
}
async function sendCompletionEmail(student, course, certificatePath) {
  try {
    if (!student?.email)
      return console.error("❌ No email found for:", student);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"LearnX Academy" <${process.env.EMAIL_USER}>`,
      to: student.email,
      subject: `🎓 Certificate of Completion for ${course.title || "your course"}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #2E2B5F;">Congratulations, ${student.name || "Student"}!</h2>
          <p>You’ve successfully completed the course <strong>${course.title || ""}</strong>.</p>
          <p>Your official LearnX certificate is attached below.</p>
          <p style="font-size: 14px; color: #666;">Keep learning and achieving,<br/>The LearnX Team</p>
        </div>
      `,
      attachments: [
        {
          filename: `${course.title || "LearnX"}_Certificate.pdf`,
          path: certificatePath,
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    console.log("Certificate email sent!");
  } catch (error) {
    console.error("Error sending certificate email:", error);
  }
}

module.exports = { generateCertificate, sendCompletionEmail };
