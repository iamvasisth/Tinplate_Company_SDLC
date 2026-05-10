const pool = require("../config/db");

const getPreferences = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM invoice_preferences WHERE user_id = $1",
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.json({ preferences: {} });
    }
    res.json({ preferences: result.rows[0] });
  } catch (err) {
    console.error("GET PREFERENCES ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const savePreferences = async (req, res) => {
  const {
    show_gstin, show_pan, show_hsn, show_payment_mode,
    show_due_date, show_terms, show_signature, show_cgst_sgst
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO invoice_preferences
        (user_id, show_gstin, show_pan, show_hsn, show_payment_mode,
         show_due_date, show_terms, show_signature, show_cgst_sgst)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (user_id)
       DO UPDATE SET
         show_gstin = $2, show_pan = $3, show_hsn = $4,
         show_payment_mode = $5, show_due_date = $6,
         show_terms = $7, show_signature = $8, show_cgst_sgst = $9,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user.id, show_gstin, show_pan, show_hsn, show_payment_mode,
       show_due_date, show_terms, show_signature, show_cgst_sgst]
    );
    res.json({ preferences: result.rows[0] });
  } catch (err) {
    console.error("SAVE PREFERENCES ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getPreferences, savePreferences };