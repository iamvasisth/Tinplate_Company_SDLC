const pool = require("../config/db");

// Get invoices for a specific customer (used by the expanded view)
const getInvoicesByCustomer = async (req, res) => {
  const { customerId } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM invoices WHERE customer_id = $1 AND user_id = $2 ORDER BY invoice_date DESC`,
      [customerId, req.user.id]
    );
    res.json({ invoices: result.rows });
  } catch (err) {
    console.error("GET INVOICES ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// (We'll add create/update later)

module.exports = { getInvoicesByCustomer };