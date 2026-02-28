// utils/receiptGenerator.js
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

/**
 * generateReceiptPDF({ enrollment, course, student, payment })
 * Returns: { receiptNo, fileName, absPath, receiptUrl }
 */
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
};

const formatINR = (amount) => {
  const n = Number(amount || 0);
  return n.toLocaleString("en-IN");
};

const formatDateTimeIST = (date) => {
  const d = date ? new Date(date) : new Date();
  // basic readable format (no external libs)
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const safeText = (v) => (v === null || v === undefined ? "" : String(v));

const drawHR = (doc, x, y, w, color = "#E6EAF2") => {
  doc.save();
  doc.lineWidth(1);
  doc.strokeColor(color);
  doc.moveTo(x, y).lineTo(x + w, y).stroke();
  doc.restore();
};

const drawPill = (doc, x, y, text, opts = {}) => {
  const {
    bg = "#16A34A",
    color = "white",
    paddingX = 10,
    paddingY = 6,
    fontSize = 10,
    radius = 14,
  } = opts;

  doc.save();
  doc.font("Helvetica-Bold").fontSize(fontSize);
  const textW = doc.widthOfString(text);
  const w = textW + paddingX * 2;
  const h = fontSize + paddingY * 2;

  doc.roundedRect(x, y, w, h, radius).fill(bg);
  doc.fillColor(color).text(text, x + paddingX, y + paddingY, { lineBreak: false });
  doc.restore();

  return { w, h };
};

const drawKeyValue = (doc, x, y, key, value, keyColor = "#64748B", valColor = "#0F172A") => {
  doc.save();
  doc.font("Helvetica").fontSize(9).fillColor(keyColor).text(key, x, y);
  doc.font("Helvetica-Bold").fontSize(11).fillColor(valColor).text(value, x, y + 14);
  doc.restore();
};

const drawBox = (doc, x, y, w, h, opts = {}) => {
  const { fill = "#FFFFFF", stroke = "#E6EAF2", radius = 12 } = opts;
  doc.save();
  doc.roundedRect(x, y, w, h, radius).fill(fill);
  doc.roundedRect(x, y, w, h, radius).stroke(stroke);
  doc.restore();
};

const generateReceiptPDF = async ({ enrollment, course, student, payment }) => {
  // store receipts
  const receiptsDir = path.join(__dirname, "..", "uploads", "receipts");
  ensureDir(receiptsDir);

  const receiptNo = `RX-${Date.now()}-${String(enrollment?._id || "").slice(-6) || "000000"}`;
  const fileName = `${receiptNo}.pdf`;
  const absPath = path.join(receiptsDir, fileName);

  // where logo should exist in backend
  // copy your lms1.png into backend/public/lms1.png
  const logoPath = path.join(__dirname, "..", "public", "lms1.png");
  const hasLogo = fs.existsSync(logoPath);

  // build URL for frontend open
  const receiptUrl = `/uploads/receipts/${fileName}`;

  // values
  const createdAt = enrollment?.createdAt || payment?.createdAt || new Date();
  const amount = Number(enrollment?.amount ?? payment?.amount ?? course?.price ?? 0);

  const studentName = safeText(student?.name || student?.user?.name || student?.fullName || "Student");
  const studentEmail = safeText(student?.email || student?.user?.email || "");
  const courseTitle = safeText(course?.title || "Course Enrollment");
  const courseId = safeText(course?._id || "");
  const paymentId = safeText(enrollment?.paymentId || payment?.paymentId || "");
  const orderId = safeText(enrollment?.orderId || payment?.orderId || "");

  // PDF doc
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
  });

  const stream = fs.createWriteStream(absPath);
  doc.pipe(stream);

  // page constants
  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const margin = 40;
  const contentW = pageW - margin * 2;

  // palette
  const navy = "#0B1220";
  const slate = "#334155";
  const muted = "#64748B";
  const border = "#E6EAF2";
  const bgSoft = "#F7F9FC";
  const green = "#16A34A";

  // ---------- HEADER CARD ----------
  const headerH = 110;
  drawBox(doc, margin, margin, contentW, headerH, { fill: navy, stroke: navy, radius: 16 });

  // logo area
  const logoBoxX = margin + 18;
  const logoBoxY = margin + 18;
  const logoBoxSize = 54;

  drawBox(doc, logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, { fill: "#FFFFFF", stroke: "#FFFFFF", radius: 12 });

  if (hasLogo) {
    // fit logo inside
    doc.image(logoPath, logoBoxX + 8, logoBoxY + 8, { fit: [logoBoxSize - 16, logoBoxSize - 16] });
  } else {
    // fallback if logo missing
    doc.save();
    doc.fillColor("#111827").font("Helvetica-Bold").fontSize(14).text("LX", logoBoxX + 16, logoBoxY + 16);
    doc.restore();
  }

  // brand text
  doc.save();
  doc.fillColor("white").font("Helvetica-Bold").fontSize(24).text("LearnX", logoBoxX + logoBoxSize + 14, margin + 22);
  doc.fillColor("#B8C1D9").font("Helvetica").fontSize(10).text("Online Learning Platform", logoBoxX + logoBoxSize + 14, margin + 50);
  doc.restore();

  // title on right
  doc.save();
  doc.fillColor("white").font("Helvetica-Bold").fontSize(20).text("Payment Receipt", margin, margin + 26, {
    width: contentW - 18,
    align: "right",
  });
  doc.restore();

  // status pill
  const pillText = "COMPLETE";
  const pill = drawPill(doc, margin + contentW - 150, margin + 60, pillText, { bg: green, fontSize: 10 });

  // ---------- BODY ----------
  let y = margin + headerH + 18;

  // top info row (Receipt No / Date / Amount) -> 3 columns
  const colW = (contentW - 20 * 2) / 3;
  drawBox(doc, margin, y, contentW, 74, { fill: "#FFFFFF", stroke: border, radius: 14 });

  const x1 = margin + 18;
  const x2 = margin + 18 + colW + 20;
  const x3 = margin + 18 + (colW + 20) * 2;

  drawKeyValue(doc, x1, y + 16, "Receipt No", receiptNo);
  drawKeyValue(doc, x2, y + 16, "Date", formatDateTimeIST(createdAt));
  doc.save();
  doc.font("Helvetica").fontSize(9).fillColor(muted).text("Amount", x3, y + 16);
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#0F172A").text(`₹ ${formatINR(amount)}`, x3, y + 30);
  doc.restore();

  y += 74 + 18;

  // two column blocks: Billed To / Course
  const blockH = 92;
  const gap = 16;
  const halfW = (contentW - gap) / 2;

  drawBox(doc, margin, y, halfW, blockH, { fill: "#FFFFFF", stroke: border, radius: 14 });
  drawBox(doc, margin + halfW + gap, y, halfW, blockH, { fill: "#FFFFFF", stroke: border, radius: 14 });

  // billed to
  doc.save();
  doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(12).text("Billed To", margin + 16, y + 14);
  doc.fillColor(slate).font("Helvetica-Bold").fontSize(11).text(studentName, margin + 16, y + 36);
  doc.fillColor(muted).font("Helvetica").fontSize(10).text(studentEmail, margin + 16, y + 54);
  doc.restore();

  // course
  doc.save();
  doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(12).text("Course", margin + halfW + gap + 16, y + 14);
  doc.fillColor(slate).font("Helvetica-Bold").fontSize(11).text(courseTitle, margin + halfW + gap + 16, y + 36, {
    width: halfW - 32,
  });
  doc.fillColor(muted).font("Helvetica").fontSize(9).text(`Course ID: ${courseId}`, margin + halfW + gap + 16, y + 58, {
    width: halfW - 32,
  });
  doc.restore();

  y += blockH + 18;

  // Payment reference box
  const refH = 110;
  drawBox(doc, margin, y, contentW, refH, { fill: "#FFFFFF", stroke: border, radius: 14 });

  doc.save();
  doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(12).text("Payment Reference", margin + 16, y + 14);
  doc.restore();

  const refLeftX = margin + 16;
  const refMidX = margin + contentW / 2 + 8;

  // left: payment id + enrollment id
  doc.save();
  doc.fillColor(muted).font("Helvetica").fontSize(9).text("Payment ID", refLeftX, y + 40);
  doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(11).text(paymentId || "-", refLeftX, y + 55, { width: contentW / 2 - 30 });

  doc.fillColor(muted).font("Helvetica").fontSize(9).text("Enrollment ID", refLeftX, y + 78);
  doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(11).text(safeText(enrollment?._id || "-"), refLeftX, y + 93, {
    width: contentW / 2 - 30,
  });
  doc.restore();

  // right: order id
  doc.save();
  doc.fillColor(muted).font("Helvetica").fontSize(9).text("Order ID", refMidX, y + 40);
  doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(11).text(orderId || "-", refMidX, y + 55, {
    width: contentW / 2 - 30,
  });
  doc.restore();

  y += refH + 18;

  // Summary table
  const summaryH = 140;
  drawBox(doc, margin, y, contentW, summaryH, { fill: "#FFFFFF", stroke: border, radius: 14 });

  doc.save();
  doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(12).text("Summary", margin + 16, y + 14);
  doc.restore();

  // table header
  const tableX = margin + 16;
  const tableY = y + 42;
  const tableW = contentW - 32;

  // header row background
  doc.save();
  doc.roundedRect(tableX, tableY, tableW, 30, 10).fill(bgSoft);
  doc.restore();

  doc.save();
  doc.fillColor(muted).font("Helvetica-Bold").fontSize(10).text("Description", tableX + 12, tableY + 9);
  doc.fillColor(muted).font("Helvetica-Bold").fontSize(10).text("Amount", tableX, tableY + 9, {
    width: tableW - 12,
    align: "right",
  });
  doc.restore();

  // row
  const rowY = tableY + 38;
  doc.save();
  doc.fillColor("#0F172A").font("Helvetica").fontSize(11).text("Course Enrollment", tableX + 12, rowY);
  doc.fillColor("#0F172A").font("Helvetica").fontSize(11).text(`₹ ${formatINR(amount)}`, tableX, rowY, {
    width: tableW - 12,
    align: "right",
  });
  doc.restore();

  // divider
  drawHR(doc, tableX, rowY + 26, tableW, border);

  // total
  doc.save();
  doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(12).text("Total Paid", tableX + 12, rowY + 38);
  doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(14).text(`₹ ${formatINR(amount)}`, tableX, rowY + 34, {
    width: tableW - 12,
    align: "right",
  });
  doc.restore();

  // ---------- FOOTER ----------
  const footerY = pageH - margin - 40;
  drawHR(doc, margin, footerY, contentW, border);

  doc.save();
  doc.fillColor(muted).font("Helvetica").fontSize(9).text(
    "This is a system-generated receipt. If you have any issues, contact support at support@learnx.com",
    margin,
    footerY + 10,
    { width: contentW }
  );
  doc.restore();

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return { receiptNo, fileName, absPath, receiptUrl };
};

module.exports = { generateReceiptPDF };