const pool = require("../config/db");

const recordPayment = async (req, res) => {
  const { id: invoiceId } = req.params;
  const { amount, payment_date, payment_mode, reference, notes } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert payment record
    const paymentResult = await client.query(
      `INSERT INTO payments (invoice_id, user_id, amount, payment_date, payment_mode, reference, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [invoiceId, req.user.id, amount, payment_date || new Date(), payment_mode || "cash", reference, notes]
    );

    // Update invoice balance_due
    const invResult = await client.query(
      `UPDATE invoices
       SET balance_due = balance_due - $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING balance_due`,
      [amount, invoiceId, req.user.id]
    );

    if (invResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Invoice not found" });
    }

    const newBalanceDue = parseFloat(invResult.rows[0].balance_due);

    // Auto-update status if fully paid
    if (newBalanceDue <= 0) {
      await client.query(
        `UPDATE invoices SET status = 'paid', balance_due = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [invoiceId]
      );
    }

    await client.query("COMMIT");
    res.json({ payment: paymentResult.rows[0], newBalanceDue: newBalanceDue <= 0 ? 0 : newBalanceDue });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("RECORD PAYMENT ERROR:", err);
    res.status(500).json({ message: "Failed to record payment" });
  } finally {
    client.release();
  }
};

// GET payments for an invoice
const getPayments = async (req, res) => {
  const { id: invoiceId } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM payments WHERE invoice_id = $1 AND user_id = $2 ORDER BY payment_date DESC",
      [invoiceId, req.user.id]
    );
    res.json({ payments: result.rows });
  } catch (err) {
    console.error("GET PAYMENTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { recordPayment, getPayments };