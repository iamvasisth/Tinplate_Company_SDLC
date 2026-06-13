const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const pool = require("../config/db");

// ----- Organisation details (used in PDF & email) -----
const ORG_NAME = "Tinplate Computer Training Center";
const ORG_ADDRESS = "2nd Floor, Thakur Pyara Singh Road, Jamshedpur – 831001";
const ORG_EMAIL = "kumarrahulraj468@gmail.com";
const ORG_COUNTRY = "India";

// ----- PDF & email libraries -----
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");

const {
  getVendorCredits,
  getVendorCreditById,
  createVendorCredit,
  updateVendorCredit,
  deleteVendorCredit,
  cancelVendorCredit,
  applyCreditToBill,
} = require("../controllers/vendorCreditController");

// ================= CRUD routes =================
router.get("/vendor-credits", authMiddleware, getVendorCredits);
router.get("/vendor-credits/:id", authMiddleware, getVendorCreditById);
router.post("/vendor-credits", authMiddleware, createVendorCredit);
router.put("/vendor-credits/:id", authMiddleware, updateVendorCredit);
router.delete("/vendor-credits/:id", authMiddleware, deleteVendorCredit);

// ================= Actions =================
router.patch("/vendor-credits/:id/cancel", authMiddleware, cancelVendorCredit);
router.post("/vendor-credits/:id/apply-to-bill", authMiddleware, applyCreditToBill);

// ================= Send Vendor Credit via Email (Brevo SMTP) =================
router.post("/vendor-credits/:id/send", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { to, subject, body, cc, bcc } = req.body;

  try {
    // ---------- fetch data ----------
    const vcRes = await pool.query(
      "SELECT * FROM vendor_credits WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    if (vcRes.rows.length === 0) {
      return res.status(404).json({ message: "Vendor Credit not found" });
    }
    const vc = vcRes.rows[0];

    const vendorRes = await pool.query(
      "SELECT * FROM vendors WHERE id = $1 AND user_id = $2",
      [vc.vendor_id, req.user.id]
    );
    const vendor = vendorRes.rows[0];

    const emailTo = to || vendor?.email;
    if (!emailTo) {
      return res.status(400).json({ message: "Recipient email required" });
    }

    const itemsRes = await pool.query(
      "SELECT * FROM vendor_credit_items WHERE vendor_credit_id = $1",
      [id]
    );
    const items = itemsRes.rows;

    // ---------- GENERATE PDF ----------
    const doc = new PDFDocument({
      margin: 50,
      size: "A4",
      bufferPages: true,
    });
    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    const pdfPromise = new Promise((resolve) => {
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
    });

    const drawLine = (y) => {
      doc.moveTo(50, y).lineTo(545, y).stroke();
    };

    let y = 60;

    // ----- Company info (right aligned) -----
    doc.fontSize(14).font("Helvetica-Bold").text(ORG_NAME, 50, y, { align: "right" });
    y += 18;
    doc.fontSize(10).font("Helvetica").text(ORG_ADDRESS, 50, y, { align: "right" });
    y += 14;
    doc.text(`${ORG_COUNTRY}, ${ORG_EMAIL}`, 50, y, { align: "right" });
    y += 20;
    drawLine(y);
    y += 10;

    // ----- Title -----
    doc.fontSize(20).font("Helvetica-Bold").text("VENDOR CREDIT", 50, y);
    y += 25;

    // ----- Meta -----
    const vcNumber = vc.vendor_credit_number || "DRAFT";
    const vcDate = new Date(vc.vendor_credit_date).toLocaleDateString("en-IN", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
    doc.fontSize(10).font("Helvetica-Bold").text("# : ", 50, y, { continued: true });
    doc.font("Helvetica").text(vcNumber);
    y += 15;
    doc.font("Helvetica-Bold").text("Date : ", 50, y, { continued: true });
    doc.font("Helvetica").text(vcDate);
    y += 20;
    drawLine(y);
    y += 10;

    // ----- Vendor -----
    const vendorName = vendor?.display_name || vendor?.company_name || "Vendor";
    doc.fontSize(11).font("Helvetica-Bold").text("Vendor", 50, y);
    y += 15;
    doc.fontSize(10).font("Helvetica").text(vendorName, 50, y);
    if (vendor?.billing_address) {
      y += 15;
      doc.font("Helvetica").text(vendor.billing_address, 50, y, { width: 250 });
      y += 15;
    }
    y += 20;
    drawLine(y);
    y += 10;

    // ----- Items Table -----
    const tableTop = y;
    const col1 = 50;       // #
    const col2 = 80;       // Item & Description
    const col3 = 300;      // Qty
    const col4 = 360;      // Rate
    const col5 = 450;      // Amount
    const rowHeight = 20;

    // Table header
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text("Item & Description", col2, tableTop, { width: 200 });
    doc.text("Qty", col3, tableTop, { width: 40, align: "right" });
    doc.text("Rate", col4, tableTop, { width: 70, align: "right" });
    doc.text("Amount", col5, tableTop, { width: 70, align: "right" });
    y = tableTop + 15;
    drawLine(y);
    y += 5;

    doc.font("Helvetica").fontSize(10);

    items.forEach((item, idx) => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const lineTotal = parseFloat(item.line_total) || 0;

      if (y + rowHeight > 650) {
        doc.addPage();
        y = 60;
      }

      if (idx % 2 === 0) {
        doc.rect(50, y - 2, 500, rowHeight).fill("#f9f9f9");
        doc.fillColor("#000");
      }

      doc.text(`${idx + 1}. ${item.description || item.item_name || "—"}`, col2, y, { width: 200 });
      doc.text(`${qty.toFixed(2)}`, col3, y, { width: 40, align: "right" });
      doc.text(rate.toFixed(2), col4, y, { width: 70, align: "right" });
      doc.text(lineTotal.toFixed(2), col5, y, { width: 70, align: "right" });
      y += rowHeight;
    });

    drawLine(y);
    y += 10;

    // ----- Totals -----
    doc.font("Helvetica-Bold").text("SubTotal:", 350, y);
    doc.font("Helvetica").text(parseFloat(vc.subtotal || 0).toFixed(2), 450, y, { width: 70, align: "right" });
    y += 15;
    if (parseFloat(vc.discount_total || 0) > 0) {
        doc.font("Helvetica-Bold").text("Discount:", 350, y);
        doc.font("Helvetica").text(parseFloat(vc.discount_total || 0).toFixed(2), 450, y, { width: 70, align: "right" });
        y += 15;
    }
    if (parseFloat(vc.tax_total || 0) > 0) {
        doc.font("Helvetica-Bold").text("Tax:", 350, y);
        doc.font("Helvetica").text(parseFloat(vc.tax_total || 0).toFixed(2), 450, y, { width: 70, align: "right" });
        y += 15;
    }
    doc.font("Helvetica-Bold").fontSize(12).text("Total:", 350, y);
    doc.font("Helvetica-Bold").fontSize(12).text(parseFloat(vc.total || 0).toFixed(2), 450, y, { width: 70, align: "right" });
    y += 25;

    // ----- Notes & Reason -----
    doc.font("Helvetica-Bold").fontSize(10);
    if (vc.reason) {
      doc.text("Reason :", 50, y);
      y += 15;
      doc.font("Helvetica").fontSize(9).text(vc.reason, 50, y, { width: 500 });
      y += 20;
    }
    if (vc.notes) {
      doc.font("Helvetica-Bold").fontSize(10).text("Notes :", 50, y);
      y += 15;
      doc.font("Helvetica").fontSize(9).text(vc.notes, 50, y, { width: 500 });
      y += 30;
    }

    // ----- Footer -----
    y = doc.page.height - 60;
    drawLine(y);
    y += 10;
    doc.fontSize(9).text("POWERED BY TINPLATE COMPUTER TRAINING CENTER", 50, y, { align: "center" });

    doc.end();
    const pdfBuffer = await pdfPromise;

    // ---------- SEND EMAIL ----------
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp-relay.sendinblue.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const textBody = body;

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || "noreply@tinplate.com",
      to: emailTo,
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject: subject,
      text: textBody,
      attachments: [
        {
          filename: `VendorCredit_${vcNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    res.json({ message: "Email sent with PDF attached" });
  } catch (err) {
    console.error("SEND EMAIL ERROR:", err);
    res.status(500).json({ message: "Failed to send email" });
  }
});

module.exports = router;
