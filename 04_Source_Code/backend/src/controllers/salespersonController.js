/**
 * salespersonController.js – CRUD for salespersons
 * Dependencies: pool
 */
const pool = require("../config/db");

// Auto-create table if not exists
const ensureTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS salespersons (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      employee_id VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// GET all salespersons for logged-in user
const getSalespersons = async (req, res) => {
  try {
    await ensureTable();
    const result = await pool.query(
      `SELECT * FROM salespersons WHERE user_id = $1 ORDER BY name ASC`,
      [req.user.id]
    );
    res.json({ salespersons: result.rows });
  } catch (err) {
    console.error("GET SALESPERSONS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// CREATE salesperson
const createSalesperson = async (req, res) => {
  const { name, email, phone, employee_id } = req.body;
  if (!name) {
    return res.status(400).json({ message: "Name is required" });
  }
  try {
    await ensureTable();
    const result = await pool.query(
      `INSERT INTO salespersons (user_id, name, email, phone, employee_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, name, email || null, phone || null, employee_id || null]
    );
    res.json({ message: "Salesperson created", salesperson: result.rows[0] });
  } catch (err) {
    console.error("CREATE SALESPERSON ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getSalespersons, createSalesperson };
