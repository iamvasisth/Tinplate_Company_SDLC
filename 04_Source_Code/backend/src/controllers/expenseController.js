const pool = require("../config/db");

// GET all expenses for logged‑in user
const getExpenses = async (req, res) => {
  try {
    const { category, status } = req.query;
    let query = `SELECT e.*, c.name AS vendor_name
                 FROM expenses e
                 LEFT JOIN contacts c ON e.vendor_id = c.id
                 WHERE e.user_id = $1`;
    const values = [req.user.id];

    if (category) {
      query += ` AND e.category = $2`;
      values.push(category);
    }
    if (status) {
      const idx = values.length + 1;
      query += ` AND e.status = $${idx}`;
      values.push(status);
    }
    query += ` ORDER BY e.expense_date DESC`;

    const result = await pool.query(query, values);
    res.json({ expenses: result.rows });
  } catch (err) {
    console.error("GET EXPENSES ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET single expense
const getExpenseById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT e.*, c.name AS vendor_name
       FROM expenses e
       LEFT JOIN contacts c ON e.vendor_id = c.id
       WHERE e.id = $1 AND e.user_id = $2`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }
    res.json({ expense: result.rows[0] });
  } catch (err) {
    console.error("GET EXPENSE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// CREATE expense
const createExpense = async (req, res) => {
  const { vendor_id, category, amount, expense_date, description, reference, attachment_url, status } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO expenses
       (user_id, vendor_id, category, amount, expense_date, description, reference, attachment_url, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [req.user.id, vendor_id || null, category || "Other Expenses", amount, expense_date || new Date(), description, reference, attachment_url || null, status || "unpaid"]
    );
    res.json({ message: "Expense created", expense: result.rows[0] });
  } catch (err) {
    console.error("CREATE EXPENSE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE expense (partial update)
const updateExpense = async (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  delete fields.id; delete fields.user_id; delete fields.created_at; delete fields.updated_at;

  const setColumns = [];
  const values = [];
  let idx = 1;
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      setColumns.push(`${key} = $${idx}`);
      values.push(value);
      idx++;
    }
  }
  if (setColumns.length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }
  setColumns.push("updated_at = CURRENT_TIMESTAMP");

  const query = `UPDATE expenses SET ${setColumns.join(", ")} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`;
  values.push(id, req.user.id);

  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }
    res.json({ message: "Expense updated", expense: result.rows[0] });
  } catch (err) {
    console.error("UPDATE EXPENSE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE expense
const deleteExpense = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM expenses WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }
    res.json({ message: "Expense deleted" });
  } catch (err) {
    console.error("DELETE EXPENSE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getExpenses, getExpenseById, createExpense, updateExpense, deleteExpense };