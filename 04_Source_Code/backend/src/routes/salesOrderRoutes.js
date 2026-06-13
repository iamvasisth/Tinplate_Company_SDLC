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
const numberToWords = require("number-to-words");

const {
  getSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  convertQuoteToSalesOrder,
  convertSalesOrderToInvoice,
} = require("../controllers/salesOrderController");

// ================= CRUD routes =================
router.get("/sales-orders", authMiddleware, getSalesOrders);
router.get("/sales-orders/:id", authMiddleware, getSalesOrderById);
router.post("/sales-orders", authMiddleware, createSalesOrder);
router.put("/sales-orders/:id", authMiddleware, updateSalesOrder);
router.delete("/sales-orders/:id", authMiddleware, deleteSalesOrder);

// ================= Conversions =================
router.post("/sales-orders/from-quote/:quoteId", authMiddleware, convertQuoteToSalesOrder);
router.post("/sales-orders/:id/convert-to-invoice", authMiddleware, convertSalesOrderToInvoice);

// ================= Send Sales Order via Email (Brevo SMTP) =================
router.post("/sales-orders/:id/send", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { to, subject, body, cc, bcc } = req.body;

  try {
    // ---------- fetch data ----------
    const soRes = await pool.query(
      "SELECT * FROM sales_orders WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    if (soRes.rows.length === 0) {
      return res.status(404).json({ message: "Sales Order not found" });
    }
    const so = soRes.rows[0];

    const custRes = await pool.query(
      "SELECT * FROM customers WHERE id = $1 AND user_id = $2",
      [so.customer_id, req.user.id]
    );
    const customer = custRes.rows[0];

    const emailTo = to || customer?.email;
    if (!emailTo) {
      return res.status(400).json({ message: "Recipient email required" });
    }

    const itemsRes = await pool.query(
      "SELECT * FROM sales_order_items WHERE sales_order_id = $1",
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
    doc.fontSize(20).font("Helvetica-Bold").text("SALES ORDER", 50, y);
    y += 25;

    // ----- Meta -----
    const soNumber = so.sales_order_number || "DRAFT";
    const soDate = new Date(so.sales_order_date).toLocaleDateString("en-IN", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
    doc.fontSize(10).font("Helvetica-Bold").text("# : ", 50, y, { continued: true });
    doc.font("Helvetica").text(soNumber);
    y += 15;
    doc.font("Helvetica-Bold").text("Date : ", 50, y, { continued: true });
    doc.font("Helvetica").text(soDate);
    y += 20;
    drawLine(y);
    y += 10;

    // ----- Bill To -----
    const customerName = customer?.display_name || "Customer";
    doc.fontSize(11).font("Helvetica-Bold").text("Bill To", 50, y);
    y += 15;
    doc.fontSize(10).font("Helvetica").text(customerName, 50, y);
    y += 20;
    drawLine(y);
    y += 10;

    // ----- Items Table -----
    const tableTop = y;
    const col1 = 50;       // #
    const col2 = 80;       // Item & Description
    const col3 = 320;      // Qty
    const col4 = 370;      // Rate
    const col5 = 440;      // Amount
    const rowHeight = 20;

    // Table header
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text("Item & Description", col2, tableTop, { width: 200 });
    doc.text("Qty", col3, tableTop, { width: 50, align: "right" });
    doc.text("Rate", col4, tableTop, { width: 60, align: "right" });
    doc.text("Amount", col5, tableTop, { width: 60, align: "right" });
    y = tableTop + 15;
    drawLine(y);
    y += 5;

    let subTotal = 0;
    doc.font("Helvetica").fontSize(10);

    items.forEach((item, idx) => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.unit_price) || 0;
      const amount = qty * rate;
      subTotal += amount;

      if (y + rowHeight > 750) {
        doc.addPage();
        y = 60;
      }

      if (idx % 2 === 0) {
        doc.rect(50, y - 2, 500, rowHeight).fill("#f9f9f9");
        doc.fillColor("#000");
      }

      doc.text(`${idx + 1}. ${item.description || "—"}`, col2, y, { width: 200 });
      doc.text(qty.toFixed(2), col3, y, { width: 50, align: "right" });
      doc.text(rate.toFixed(2), col4, y, { width: 60, align: "right" });
      doc.text(amount.toFixed(2), col5, y, { width: 60, align: "right" });
      y += rowHeight;
    });

    drawLine(y);
    y += 10;

    // ----- Totals -----
    const total = parseFloat(so.total_amount) || subTotal;
    doc.font("Helvetica-Bold");
    doc.text("Sub Total :", col4 - 30, y, { width: 80, align: "right" });
    doc.text(subTotal.toFixed(2), col5, y, { width: 60, align: "right" });
    y += 20;
    doc.text("Total :", col4 - 30, y, { width: 80, align: "right" });
    doc.text(total.toFixed(2), col5, y, { width: 60, align: "right" });
    y += 30;

    // ----- Total in Words -----
    let totalWords = "";
    try {
      totalWords = numberToWords.toWords(Math.floor(total));
      totalWords = totalWords.charAt(0).toUpperCase() + totalWords.slice(1) + " Only";
    } catch (e) {
      totalWords = "Indian Rupee " + total.toFixed(0) + " Only";
    }
    doc.font("Helvetica").fontSize(10);
    doc.text(`Total In Words : ${totalWords}`, 50, y);
    y += 25;

    // ----- Notes -----
    if (so.notes) {
      doc.font("Helvetica-Bold").text("Notes :", 50, y);
      y += 15;
      doc.font("Helvetica").fontSize(9).text(so.notes, 50, y, { width: 500 });
      y += 30;
    }

    // ----- Terms & Conditions -----
    if (so.terms) {
      doc.font("Helvetica-Bold").text("Terms & Conditions :", 50, y);
      y += 15;
      doc.font("Helvetica").fontSize(9).text(so.terms, 50, y, { width: 500 });
      y += 30;
    }

    // ----- Authorized Signature -----
    y += 20;
    doc.font("Helvetica").fontSize(10);
    doc.text("Authorized Signature", 350, y);
    y += 20;
    doc.moveTo(350, y).lineTo(500, y).stroke();
    y += 10;
    doc.text("__________________________", 350, y);

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
          filename: `SalesOrder_${soNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    // Mark as sent if it was draft
    if (so.status === 'draft') {
        await pool.query(
          "UPDATE sales_orders SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [id]
        );
    }

    res.json({ message: "Email sent with PDF attached" });
  } catch (err) {
    console.error("SEND EMAIL ERROR:", err);
    res.status(500).json({ message: "Failed to send email" });
  }
});

module.exports = router;
