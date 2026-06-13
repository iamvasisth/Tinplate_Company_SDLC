const pool = require("../config/db");

// ---- Ensure payments_made table exists (safe to re-run) ----
const ensurePaymentsMadeTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments_made (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
        vendor_id INTEGER,
        amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        payment_date DATE DEFAULT CURRENT_DATE,
        payment_mode VARCHAR(50),
        reference_number VARCHAR(100),
        notes TEXT,
        status VARCHAR(50) DEFAULT 'paid',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.error("ensurePaymentsMadeTable error:", err);
  }
};
ensurePaymentsMadeTable();

const getAllPaymentsMade = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pm.*, v.display_name as vendor_name, b.bill_number 
       FROM payments_made pm
       LEFT JOIN vendors v ON pm.vendor_id = v.id
       LEFT JOIN bills b ON pm.bill_id = b.id
       WHERE pm.user_id = $1
       ORDER BY pm.payment_date DESC, pm.created_at DESC`,
      [req.user.id]
    );
    res.json({ payments: result.rows });
  } catch (err) {
    console.error("GET PAYMENTS MADE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getPaymentMadeById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT pm.*, v.display_name as vendor_name, b.bill_number 
       FROM payments_made pm
       LEFT JOIN vendors v ON pm.vendor_id = v.id
       LEFT JOIN bills b ON pm.bill_id = b.id
       WHERE pm.id = $1 AND pm.user_id = $2`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Payment not found" });
    res.json({ payment: result.rows[0] });
  } catch (err) {
    console.error("GET PAYMENT MADE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const createPaymentMade = async (req, res) => {
  const { vendor_id, bill_id, amount, payment_date, payment_mode, reference_number, notes } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    
    // Check bill and balance
    const billCheck = await client.query("SELECT id, balance_due FROM bills WHERE id = $1 AND user_id = $2", [bill_id, req.user.id]);
    if (billCheck.rows.length === 0) {
      throw new Error("Bill not found.");
    }
    
    const balanceDue = parseFloat(billCheck.rows[0].balance_due);
    const payAmount = parseFloat(amount);
    
    if (payAmount <= 0) throw new Error("Payment amount must be greater than zero.");
    if (payAmount > balanceDue) throw new Error(`Payment cannot exceed current balance due (₹${balanceDue}).`);

    // Insert payment
    const payRes = await client.query(
      `INSERT INTO payments_made (user_id, vendor_id, bill_id, amount, payment_date, payment_mode, reference_number, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, vendor_id, bill_id, payAmount, payment_date, payment_mode, reference_number, notes]
    );

    // Update bill
    const newBalance = balanceDue - payAmount;
    const newStatus = newBalance <= 0.01 ? "paid" : "partially_paid";
    
    await client.query(
      `UPDATE bills SET balance_due = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [newBalance, newStatus, bill_id]
    );
    
    await client.query("COMMIT");
    res.json({ payment: payRes.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CREATE PAYMENT MADE ERROR:", err);
    res.status(400).json({ message: err.message || "Failed to record payment" });
  } finally {
    client.release();
  }
};

const deletePaymentMade = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    const payCheck = await client.query("SELECT * FROM payments_made WHERE id = $1 AND user_id = $2", [id, req.user.id]);
    if (payCheck.rows.length === 0) throw new Error("Payment not found");
    
    const payment = payCheck.rows[0];
    
    // Reverse bill balance
    const billRes = await client.query("SELECT balance_due, total FROM bills WHERE id = $1", [payment.bill_id]);
    if (billRes.rows.length > 0) {
      const bill = billRes.rows[0];
      const newBalance = parseFloat(bill.balance_due) + parseFloat(payment.amount);
      let newStatus = "partially_paid";
      if (newBalance >= parseFloat(bill.total)) newStatus = "open"; // or drafted depending on logic
      
      await client.query("UPDATE bills SET balance_due = $1, status = $2 WHERE id = $3", [newBalance, newStatus, payment.bill_id]);
    }
    
    await client.query("DELETE FROM payments_made WHERE id = $1", [id]);
    
    await client.query("COMMIT");
    res.json({ message: "Payment deleted" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("DELETE PAYMENT MADE ERROR:", err);
    res.status(400).json({ message: err.message || "Failed to delete payment" });
  } finally {
    client.release();
  }
};

module.exports = { getAllPaymentsMade, getPaymentMadeById, createPaymentMade, deletePaymentMade };
