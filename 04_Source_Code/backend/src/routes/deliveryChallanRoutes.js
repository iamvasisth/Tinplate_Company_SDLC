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
  getDeliveryChallans,
  getDeliveryChallanById,
  createDeliveryChallan,
  updateDeliveryChallan,
  deleteDeliveryChallan,
  cancelDeliveryChallan,
  markDelivered,
  convertFromSalesOrder,
  convertDeliveryChallanToInvoice,
} = require("../controllers/deliveryChallanController");

// ================= CRUD routes =================
router.get("/delivery-challans", authMiddleware, getDeliveryChallans);
router.get("/delivery-challans/:id", authMiddleware, getDeliveryChallanById);
router.post("/delivery-challans", authMiddleware, createDeliveryChallan);
router.put("/delivery-challans/:id", authMiddleware, updateDeliveryChallan);
router.delete("/delivery-challans/:id", authMiddleware, deleteDeliveryChallan);
router.patch("/delivery-challans/:id/cancel", authMiddleware, cancelDeliveryChallan);

// ================= Conversions & State =================
router.patch("/delivery-challans/:id/mark-delivered", authMiddleware, markDelivered);
router.post("/delivery-challans/from-sales-order/:salesOrderId", authMiddleware, convertFromSalesOrder);
router.post("/delivery-challans/:id/convert-to-invoice", authMiddleware, convertDeliveryChallanToInvoice);

// ================= Send Delivery Challan via Email (Brevo SMTP) =================
router.post("/delivery-challans/:id/send", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { to, subject, body, cc, bcc } = req.body;

  try {
    // ---------- fetch data ----------
    const dcRes = await pool.query(
      "SELECT * FROM delivery_challans WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    if (dcRes.rows.length === 0) {
      return res.status(404).json({ message: "Delivery Challan not found" });
    }
    const dc = dcRes.rows[0];

    const custRes = await pool.query(
      "SELECT * FROM customers WHERE id = $1 AND user_id = $2",
      [dc.customer_id, req.user.id]
    );
    const customer = custRes.rows[0];

    const emailTo = to || customer?.email;
    if (!emailTo) {
      return res.status(400).json({ message: "Recipient email required" });
    }

    const itemsRes = await pool.query(
      "SELECT * FROM delivery_challan_items WHERE delivery_challan_id = $1",
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
    doc.fontSize(20).font("Helvetica-Bold").text("DELIVERY CHALLAN", 50, y);
    y += 25;

    // ----- Meta -----
    const dcNumber = dc.delivery_challan_number || "DRAFT";
    const dcDate = new Date(dc.challan_date).toLocaleDateString("en-IN", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
    doc.fontSize(10).font("Helvetica-Bold").text("# : ", 50, y, { continued: true });
    doc.font("Helvetica").text(dcNumber);
    y += 15;
    doc.font("Helvetica-Bold").text("Date : ", 50, y, { continued: true });
    doc.font("Helvetica").text(dcDate);
    y += 20;
    drawLine(y);
    y += 10;

    // ----- Ship To (Customer) -----
    const customerName = customer?.display_name || customer?.company_name || "Customer";
    doc.fontSize(11).font("Helvetica-Bold").text("Ship To", 50, y);
    y += 15;
    doc.fontSize(10).font("Helvetica").text(customerName, 50, y);
    if (dc.delivery_address) {
      y += 15;
      doc.font("Helvetica").text(dc.delivery_address, 50, y, { width: 250 });
      y += 15;
    }
    y += 20;
    drawLine(y);
    y += 10;

    // ----- Items Table -----
    const tableTop = y;
    const col1 = 50;       // #
    const col2 = 80;       // Item & Description
    const col3 = 450;      // Qty
    const rowHeight = 20;

    // Table header
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text("Item & Description", col2, tableTop, { width: 300 });
    doc.text("Quantity", col3, tableTop, { width: 50, align: "right" });
    y = tableTop + 15;
    drawLine(y);
    y += 5;

    doc.font("Helvetica").fontSize(10);

    items.forEach((item, idx) => {
      const qty = parseFloat(item.quantity) || 0;

      if (y + rowHeight > 750) {
        doc.addPage();
        y = 60;
      }

      if (idx % 2 === 0) {
        doc.rect(50, y - 2, 500, rowHeight).fill("#f9f9f9");
        doc.fillColor("#000");
      }

      doc.text(`${idx + 1}. ${item.description || item.item_name || "—"}`, col2, y, { width: 300 });
      doc.text(`${qty.toFixed(2)} ${item.unit || ''}`.trim(), col3, y, { width: 50, align: "right" });
      y += rowHeight;
    });

    drawLine(y);
    y += 20;

    // ----- Notes -----
    if (dc.notes) {
      doc.font("Helvetica-Bold").text("Notes :", 50, y);
      y += 15;
      doc.font("Helvetica").fontSize(9).text(dc.notes, 50, y, { width: 500 });
      y += 30;
    }

    // ----- Authorized Signature -----
    y += 40;
    if (y > 700) { doc.addPage(); y = 60; }
    doc.font("Helvetica").fontSize(10);
    doc.text("Received By", 50, y);
    doc.text("Authorized Signature", 350, y);
    y += 30;
    doc.moveTo(50, y).lineTo(200, y).stroke();
    doc.moveTo(350, y).lineTo(500, y).stroke();
    y += 10;
    doc.text("__________________________", 50, y);
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
          filename: `DeliveryChallan_${dcNumber}.pdf`,
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
