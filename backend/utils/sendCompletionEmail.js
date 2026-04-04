const { jsPDF } = require("jspdf");
const fs = require("fs");
const path = require("path");
const axios = require("axios"); 
const nodemailer = require("nodemailer");
const volsteadFont = require("./Volstead-Regular"); 

// Helper function to fetch image from URL and convert to Base64
async function fetchImageAsBase64(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        
        // Detect image type
        let extension = 'PNG';
        if(url.toLowerCase().endsWith('.jpg') || url.toLowerCase().endsWith('.jpeg')) extension = 'JPEG';
        if(url.toLowerCase().endsWith('.webp')) extension = 'WEBP';

        return { base64, extension };
    } catch (err) {
        console.error(`Failed to fetch image from ${url}:`, err.message);
        return null;
    }
}

function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 46, g: 43, b: 95 }; // Default LearnX Purple
}

async function generateCertificate(studentName, courseTitle, instructorName, certificateId, branding = null) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  pdf.addFileToVFS("Volstead.ttf", volsteadFont);
  pdf.addFont("Volstead.ttf", "Volstead", "normal");

  // 1. Setup Colors based on Branding
  const primaryColorHex = branding?.themeColor || "#2E2B5F";
  const rgb = hexToRgb(primaryColorHex);
  const darkGray = "#444444";

  // Draw background triangles with theme color
  pdf.setFillColor(rgb.r, rgb.g, rgb.b);
  pdf.triangle(0, 0, 297, 0, 0, 40, "F");
  pdf.triangle(297, 210, 297, 170, 0, 210, "F");

  // 2. Fetch Logos
  let defaultLogoBase64 = null;
  const defaultLogoPath = path.resolve(__dirname, "../../frontend/public/lms.webp");
  if (fs.existsSync(defaultLogoPath)) {
      defaultLogoBase64 = fs.readFileSync(defaultLogoPath).toString("base64");
  }

  let companyLogoBase64 = null;
  let companyLogoExt = "PNG";
  if (branding?.logoUrl) {
      const fetched = await fetchImageAsBase64(branding.logoUrl);
      if (fetched) {
          companyLogoBase64 = fetched.base64;
          companyLogoExt = fetched.extension;
      }
  }

  // Draw Watermark
  const watermarkPath = path.resolve(__dirname, "../../frontend/public/lms1.png");
  if (fs.existsSync(watermarkPath)) {
    const watermarkBase64 = fs.readFileSync(watermarkPath).toString("base64");
    pdf.setGState(new pdf.GState({ opacity: 0.05 }));
    pdf.addImage(`data:image/png;base64,${watermarkBase64}`, "PNG", 90, 55, 120, 80);
    pdf.setGState(new pdf.GState({ opacity: 1 }));
  }

  // 3. CO-BRANDING LOGIC (LearnX + Company)
  if (companyLogoBase64) {
      // Co-Branded Layout (Meta + Coursera Style)
      
      // LearnX Logo on Left
      if (defaultLogoBase64) {
          pdf.addImage(`data:image/webp;base64,${defaultLogoBase64}`, "WEBP", 20, 15, 35, 18);
      } else {
          pdf.setFont("helvetica", "bold").setFontSize(18).setTextColor(rgb.r, rgb.g, rgb.b);
          pdf.text("LEARNX", 25, 25);
      }

      // Company Logo on Right
      pdf.addImage(`data:image/${companyLogoExt.toLowerCase()};base64,${companyLogoBase64}`, companyLogoExt, 242, 12, 35, 20);
      
      // Center Title
      pdf.setFont("helvetica", "bold").setFontSize(10).setTextColor(rgb.r, rgb.g, rgb.b);
      pdf.text("JOINT CERTIFICATION PROGRAM", 148.5, 40, { align: "center" });
  } else {
      // Solo Brand Layout (Only LearnX)
      if (defaultLogoBase64) {
          pdf.addImage(`data:image/webp;base64,${defaultLogoBase64}`, "WEBP", 131, 12, 35, 18);
      } else {
          pdf.setFont("helvetica", "bold").setFontSize(20).setTextColor(rgb.r, rgb.g, rgb.b);
          pdf.text("LEARNX ACADEMY", 148.5, 25, { align: "center" });
      }
      
      pdf.setFont("helvetica", "bold").setFontSize(10).setTextColor(rgb.r, rgb.g, rgb.b);
      pdf.text("PROFESSIONAL CERTIFICATE", 148.5, 40, { align: "center" });
  }

  // 4. Main Certificate Text
  pdf.setFontSize(28);
  pdf.setTextColor(0, 0, 0);
  pdf.text("CERTIFICATE OF COMPLETION", 148.5, 65, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.setTextColor(darkGray);
  pdf.text("This certificate is proudly presented to", 148.5, 80, { align: "center" });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(rgb.r, rgb.g, rgb.b); // Student Name in Theme Color
  pdf.text(studentName, 148.5, 95, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.setTextColor(darkGray);
  pdf.text(
    `for successfully completing the "${courseTitle}" program.`,
    148.5, 110, { align: "center", maxWidth: 220 }
  );
  pdf.text(
    "In recognition of your dedication and achievement in professional upskilling.",
    148.5, 120, { align: "center", maxWidth: 220 }
  );

  // 5. Footer Data
  const date = new Date().toLocaleDateString("en-GB");
  pdf.setFontSize(10);
  pdf.setTextColor("#666666");
  pdf.text(`Date: ${date}`, 30, 185);
  pdf.text(`Certificate ID: ${certificateId}`, 230, 185);

  // Instructor Signature
  pdf.setFont("Volstead", "normal");
  pdf.setFontSize(26);
  pdf.setTextColor(rgb.r, rgb.g, rgb.b);
  pdf.text(instructorName || "Instructor", 220, 168, { align: "center" });

  pdf.setDrawColor(rgb.r, rgb.g, rgb.b);
  pdf.line(180, 172, 260, 172);

  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(10);
  pdf.setTextColor(darkGray);
  pdf.text("Training Instructor", 220, 180, { align: "center" });

  // Save to disk
  const dir = path.resolve(__dirname, "../uploads/certificates");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const outputPath = path.join(dir, `${certificateId}.pdf`);
  const pdfData = pdf.output("arraybuffer");
  fs.writeFileSync(outputPath, Buffer.from(pdfData));

  return outputPath;
}

// ✅ Email Function Updated for Co-Branding
async function sendCompletionEmail(student, course, certificatePath, branding = null) {
  try {
    if (!student?.email) return console.error("❌ No email found for:", student);

    const primaryColor = branding?.themeColor || "#2E2B5F";

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Create Email Header (Co-branded if logo exists)
    let emailHeaderHTML = `<h2 style="color: ${primaryColor}; margin-top:0;">LearnX Academy</h2>`;
    
    if (branding?.logoUrl) {
      emailHeaderHTML = `
        <table style="width: 100%; margin-bottom: 20px;">
          <tr>
            <td style="width: 45%; text-align: left;"><h2 style="color: #2E2B5F; margin: 0;">LearnX</h2></td>
            <td style="width: 10%; text-align: center; color: #999; font-size: 20px; font-weight: bold;">&times;</td>
            <td style="width: 45%; text-align: right;"><img src="${branding.logoUrl}" style="max-height: 40px;" alt="Partner Logo"/></td>
          </tr>
        </table>
      `;
    }

    const mailOptions = {
      from: `"LearnX Certification" <${process.env.EMAIL_USER}>`,
      to: student.email,
      subject: `🎓 Certificate of Completion: ${course.title || ""}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-top: 5px solid ${primaryColor}; padding: 20px;">
          ${emailHeaderHTML}
          
          <h2 style="color: #1a1a1a;">Congratulations, ${student.name || "Student"}! 🎉</h2>
          <p style="font-size: 16px; line-height: 1.5;">You’ve successfully completed the program <strong>${course.title || ""}</strong>.</p>
          <p style="font-size: 16px; line-height: 1.5;">Your official verifiable certificate is attached to this email as a PDF document.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 13px; color: #666;">
            Keep learning and achieving,<br/>
            <strong>The LearnX Partnership Team</strong>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `${course.title?.replace(/\s+/g, "_") || "Certificate"}.pdf`,
          path: certificatePath,
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    console.log("Co-Branded Certificate email sent!");
  } catch (error) {
    console.error("Error sending certificate email:", error);
  }
}

module.exports = { generateCertificate, sendCompletionEmail };