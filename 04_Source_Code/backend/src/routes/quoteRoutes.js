const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const pool = require("../config/db");                    // needed for the send route
const { sendEmail } = require("../utils/mailer");         // only ONCE

const {
  getQuotes,
  getQuoteById,
  createQuote,
  updateQuote,
  deleteQuote,
} = require("../controllers/quoteController");

// ================= CRUD routes =================
router.get("/quotes", authMiddleware, getQuotes);
router.get("/quotes/:id", authMiddleware, getQuoteById);
router.post("/quotes", authMiddleware, createQuote);
router.put("/quotes/:id", authMiddleware, updateQuote);
router.delete("/quotes/:id", authMiddleware, deleteQuote);

// ================= Send Quote via Email (Brevo SMTP) =================
router.post("/quotes/:id/send", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { to, subject, body, cc, bcc } = req.body;

  try {
    const quoteRes = await pool.query(
      "SELECT * FROM quotes WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    if (quoteRes.rows.length === 0) {
      return res.status(404).json({ message: "Quote not found" });
    }
    const quote = quoteRes.rows[0];

    const custRes = await pool.query(
      "SELECT * FROM customers WHERE id = $1 AND user_id = $2",
      [quote.customer_id, req.user.id]
    );
    const customer = custRes.rows[0];

    const emailTo = to || customer?.email;
    if (!emailTo) {
      return res.status(400).json({ message: "Recipient email is required" });
    }

    const htmlBody = body.replace(/\n/g, "<br>");

    await sendEmail({
      to: emailTo,
      subject: subject,
      html: htmlBody,
      cc: cc || undefined,
      bcc: bcc || undefined,
    });

    // Mark as sent
    await pool.query(
      "UPDATE quotes SET status = 'sent', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );

    res.json({ message: "Email sent and quote marked as sent" });
  } catch (err) {
    console.error("SEND EMAIL ERROR:", err);
    res.status(500).json({ message: "Failed to send email" });
  }
});

module.exports = router;