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
  getCreditNotes,
  getCreditNoteById,
  createCreditNote,
  updateCreditNote,
  deleteCreditNote,
  cancelCreditNote,
  applyCreditToInvoice,
} = require("../controllers/creditNoteController");

// ================= CRUD routes =================
router.get("/credit-notes", authMiddleware, getCreditNotes);
router.get("/credit-notes/:id", authMiddleware, getCreditNoteById);
router.post("/credit-notes", authMiddleware, createCreditNote);
router.put("/credit-notes/:id", authMiddleware, updateCreditNote);
router.delete("/credit-notes/:id", authMiddleware, deleteCreditNote);

// ================= Actions =================
router.patch("/credit-notes/:id/cancel", authMiddleware, cancelCreditNote);
router.post("/credit-notes/:id/apply-to-invoice", authMiddleware, applyCreditToInvoice);

// ================= Send Credit Note via Email (Brevo SMTP) =================
router.post("/credit-notes/:id/send", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { to, subject, body, cc, bcc } = req.body;

  try {
    // ---------- fetch data ----------
    const cnRes = await pool.query(
      "SELECT * FROM credit_notes WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    if (cnRes.rows.length === 0) {
      return res.status(404).json({ message: "Credit Note not found" });
    }
    const cn = cnRes.rows[0];

    const custRes = await pool.query(
      "SELECT * FROM customers WHERE id = $1 AND user_id = $2",
      [cn.customer_id, req.user.id]
    );
    const customer = custRes.rows[0];

    const emailTo = to || customer?.email;
    if (!emailTo) {
      return res.status(400).json({ message: "Recipient email required" });
    }

    const itemsRes = await pool.query(
      "SELECT * FROM credit_note_items WHERE credit_note_id = $1",
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
    doc.fontSize(20).font("Helvetica-Bold").text("CREDIT NOTE", 50, y);
    y += 25;

    // ----- Meta -----
    const cnNumber = cn.credit_note_number || "DRAFT";
    const cnDate = new Date(cn.credit_note_date).toLocaleDateString("en-IN", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
    doc.fontSize(10).font("Helvetica-Bold").text("# : ", 50, y, { continued: true });
    doc.font("Helvetica").text(cnNumber);
    y += 15;
    doc.font("Helvetica-Bold").text("Date : ", 50, y, { continued: true });
    doc.font("Helvetica").text(cnDate);
    y += 20;
    drawLine(y);
    y += 10;

    // ----- Customer -----
    const customerName = customer?.display_name || customer?.company_name || "Customer";
    doc.fontSize(11).font("Helvetica-Bold").text("Customer", 50, y);
    y += 15;
    doc.fontSize(10).font("Helvetica").text(customerName, 50, y);
    if (customer?.billing_address) {
      y += 15;
      doc.font("Helvetica").text(customer.billing_address, 50, y, { width: 250 });
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
    doc.font("Helvetica").text(parseFloat(cn.subtotal || 0).toFixed(2), 450, y, { width: 70, align: "right" });
    y += 15;
    if (parseFloat(cn.discount_total || 0) > 0) {
        doc.font("Helvetica-Bold").text("Discount:", 350, y);
        doc.font("Helvetica").text(parseFloat(cn.discount_total || 0).toFixed(2), 450, y, { width: 70, align: "right" });
        y += 15;
    }
    if (parseFloat(cn.tax_total || 0) > 0) {
        doc.font("Helvetica-Bold").text("Tax:", 350, y);
        doc.font("Helvetica").text(parseFloat(cn.tax_total || 0).toFixed(2), 450, y, { width: 70, align: "right" });
        y += 15;
    }
    doc.font("Helvetica-Bold").fontSize(12).text("Total:", 350, y);
    doc.font("Helvetica-Bold").fontSize(12).text(parseFloat(cn.total || 0).toFixed(2), 450, y, { width: 70, align: "right" });
    y += 25;

    // ----- Notes & Reason -----
    doc.font("Helvetica-Bold").fontSize(10);
    if (cn.reason) {
      doc.text("Reason :", 50, y);
      y += 15;
      doc.font("Helvetica").fontSize(9).text(cn.reason, 50, y, { width: 500 });
      y += 20;
    }
    if (cn.notes) {
      doc.font("Helvetica-Bold").fontSize(10).text("Notes :", 50, y);
      y += 15;
      doc.font("Helvetica").fontSize(9).text(cn.notes, 50, y, { width: 500 });
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
          filename: `CreditNote_${cnNumber}.pdf`,
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
