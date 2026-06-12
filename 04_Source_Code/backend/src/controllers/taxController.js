const pool = require("../config/db");

// ---- Ensure taxes table exists (safe to re-run) ----
const ensureTaxesTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS taxes (
        id               SERIAL PRIMARY KEY,
        user_id          INTEGER NOT NULL,
        tax_name         VARCHAR(255) NOT NULL,
        tax_type         VARCHAR(50), -- e.g., GST, CGST, SGST, IGST, Other
        rate             NUMERIC(5,2) NOT NULL DEFAULT 0,
        description      TEXT,
        status           VARCHAR(20) DEFAULT 'active',
        is_deleted       BOOLEAN DEFAULT false,
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.error("ensureTaxesTable error:", err);
  }
};
ensureTaxesTable();

// ===== GET ALL TAXES =====
const getTaxes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM taxes
       WHERE user_id = $1 AND is_deleted = false
       ORDER BY rate ASC, tax_name ASC`,
      [req.user.id]
    );
    res.json({ taxes: result.rows });
  } catch (err) {
    console.error("GET TAXES ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===== GET TAX BY ID =====
const getTaxById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM taxes WHERE id = $1 AND user_id = $2 AND is_deleted = false`,
      [id, req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Tax not found" });
    res.json({ tax: result.rows[0] });
  } catch (err) {
    console.error("GET TAX BY ID ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===== CREATE TAX =====
const createTax = async (req, res) => {
  const { tax_name, tax_type, rate, description, status } = req.body;

  if (!tax_name || tax_name.trim() === "") {
    return res.status(400).json({ message: "Tax name is required" });
  }
  
  if (rate === undefined || isNaN(rate)) {
    return res.status(400).json({ message: "Valid tax rate is required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO taxes
         (user_id, tax_name, tax_type, rate, description, status)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        req.user.id,
        tax_name.trim(),
        tax_type || 'Other',
        parseFloat(rate) || 0,
        description || null,
        status || 'active'
      ]
    );
    res.status(201).json({ tax: result.rows[0], message: "Tax created successfully" });
  } catch (err) {
    console.error("CREATE TAX ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===== UPDATE TAX =====
const updateTax = async (req, res) => {
  const { id } = req.params;
  const { tax_name, tax_type, rate, description, status } = req.body;

  try {
    const result = await pool.query(
      `UPDATE taxes SET
         tax_name    = COALESCE($1, tax_name),
         tax_type    = COALESCE($2, tax_type),
         rate        = COALESCE($3, rate),
         description = COALESCE($4, description),
         status      = COALESCE($5, status),
         updated_at  = CURRENT_TIMESTAMP
       WHERE id = $6 AND user_id = $7 AND is_deleted = false
       RETURNING *`,
      [
        tax_name || null,
        tax_type || null,
        rate !== undefined ? parseFloat(rate) : null,
        description !== undefined ? description : null,
        status || null,
        id,
        req.user.id
      ]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Tax not found" });
    res.json({ tax: result.rows[0], message: "Tax updated successfully" });
  } catch (err) {
    console.error("UPDATE TAX ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===== DELETE TAX (soft delete) =====
const deleteTax = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE taxes SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND is_deleted = false
       RETURNING id`,
      [id, req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Tax not found" });
    res.json({ message: "Tax deleted successfully" });
  } catch (err) {
    console.error("DELETE TAX ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getTaxes, getTaxById, createTax, updateTax, deleteTax };
