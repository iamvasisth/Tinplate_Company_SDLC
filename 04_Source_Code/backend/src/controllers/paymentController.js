const pool = require("../config/db");

// ---- Ensure payments table exists (safe to re-run) ----
const ensurePaymentsTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        customer_id INTEGER,
        amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        payment_date DATE DEFAULT CURRENT_DATE,
        payment_mode VARCHAR(50),
        reference VARCHAR(100),
        notes TEXT,
        status VARCHAR(50) DEFAULT 'received',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // In case the table already exists, try to add customer_id if missing
    try {
      await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_id INTEGER`);
      await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'received'`);
    } catch (_) {}
  } catch (err) {
    console.error("ensurePaymentsTable error:", err);
  }
};
ensurePaymentsTable();

const recordPayment = async (req, res) => {
  const { id: invoiceId } = req.params;
  const { amount, payment_date, payment_mode, reference, notes, customer_id } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // We can infer customer_id from invoice if not provided, but frontend will provide it.
    let finalCustomerId = customer_id;
    const invCheck = await client.query("SELECT customer_id, balance_due FROM invoices WHERE id = $1 AND user_id = $2", [invoiceId, req.user.id]);
    
    if (invCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (!finalCustomerId) {
      finalCustomerId = invCheck.rows[0].customer_id;
    }

    const currentBalance = parseFloat(invCheck.rows[0].balance_due);
    if (parseFloat(amount) > currentBalance) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: `Payment amount (₹${amount}) exceeds remaining balance (₹${currentBalance})` });
    }

    // Insert payment record
    const paymentResult = await client.query(
      `INSERT INTO payments (invoice_id, user_id, customer_id, amount, payment_date, payment_mode, reference, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [invoiceId, req.user.id, finalCustomerId, amount, payment_date || new Date(), payment_mode || "cash", reference, notes]
    );

    // Update invoice balance_due
    const invResult = await client.query(
      `UPDATE invoices
       SET balance_due = balance_due - $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING balance_due, total_amount`,
      [amount, invoiceId, req.user.id]
    );

    if (invResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Invoice not found" });
    }

    const newBalanceDue = parseFloat(invResult.rows[0].balance_due);
    const totalAmount = parseFloat(invResult.rows[0].total_amount);

    // Auto-update status
    let newStatus = 'partially_paid';
    if (newBalanceDue <= 0) {
      newStatus = 'paid';
    }
    
    // In case overpayment (should be prevented by frontend, but safeguard here)
    const finalBalance = newBalanceDue <= 0 ? 0 : newBalanceDue;

    await client.query(
      `UPDATE invoices SET status = $1, balance_due = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [newStatus, finalBalance, invoiceId]
    );

    await client.query("COMMIT");
    res.json({ payment: paymentResult.rows[0], newBalanceDue: finalBalance });
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

// GET all payments
const getAllPayments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.display_name AS customer_name, i.invoice_number 
       FROM payments p
       LEFT JOIN customers c ON p.customer_id = c.id
       LEFT JOIN invoices i ON p.invoice_id = i.id
       WHERE p.user_id = $1
       ORDER BY p.payment_date DESC`,
      [req.user.id]
    );
    res.json({ payments: result.rows });
  } catch (err) {
    console.error("GET ALL PAYMENTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { recordPayment, getPayments, getAllPayments };