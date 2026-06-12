const pool = require("../config/db");
const { checkTransactionLock } = require("../utils/lockHelper");

// GET all expenses for logged‑in user
const getExpenses = async (req, res) => {
  try {
    const { category, status } = req.query;
    let query = `SELECT e.*, v.display_name AS vendor_name
                 FROM expenses e
                 LEFT JOIN vendors v ON e.vendor_id = v.id
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
      `SELECT e.*, v.display_name AS vendor_name
       FROM expenses e
       LEFT JOIN vendors v ON e.vendor_id = v.id
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
    await pool.query('BEGIN');

    const result = await pool.query(
      `INSERT INTO expenses
       (user_id, vendor_id, category, amount, expense_date, description, reference, attachment_url, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [req.user.id, vendor_id || null, category || "Other Expenses", amount, expense_date || new Date(), description, reference, attachment_url || null, status || "unpaid"]
    );
    const expense = result.rows[0];

    // Double-entry accounting: Find or create the Expense account
    let expAccount = await pool.query(`SELECT id FROM chart_of_accounts WHERE user_id = $1 AND account_name = $2 LIMIT 1`, [req.user.id, expense.category]);
    let expAccountId;
    if (expAccount.rows.length === 0) {
      const newAcc = await pool.query(
        `INSERT INTO chart_of_accounts (user_id, account_name, account_type, is_active) VALUES ($1, $2, 'Expense', true) RETURNING id`,
        [req.user.id, expense.category]
      );
      expAccountId = newAcc.rows[0].id;
    } else {
      expAccountId = expAccount.rows[0].id;
    }

    // Find Cash account (fallback to first bank/asset if cash doesn't exist)
    let cashAccount = await pool.query(`SELECT id FROM chart_of_accounts WHERE user_id = $1 AND (account_name ILIKE '%cash%' OR account_type = 'Asset') ORDER BY id ASC LIMIT 1`, [req.user.id]);
    let cashAccountId;
    if (cashAccount.rows.length === 0) {
       const newCash = await pool.query(`INSERT INTO chart_of_accounts (user_id, account_name, account_type, is_active) VALUES ($1, 'Cash', 'Asset', true) RETURNING id`, [req.user.id]);
       cashAccountId = newCash.rows[0].id;
    } else {
       cashAccountId = cashAccount.rows[0].id;
    }

    // Insert journal entry
    const je = await pool.query(
      `INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_number, reference_id)
       VALUES ($1, $2, $3, 'EXPENSE', $4, $5) RETURNING id`,
      [req.user.id, expense.expense_date, expense.description || `Expense: ${expense.category}`, `EXP-${expense.id}`, expense.id]
    );
    
    // Insert journal lines: Debit Expense, Credit Cash
    await pool.query(
      `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit) VALUES ($1, $2, $3, 0), ($1, $4, 0, $3)`,
      [je.rows[0].id, expAccountId, expense.amount, cashAccountId]
    );

    await pool.query('COMMIT');
    res.json({ message: "Expense created", expense });
  } catch (err) {
    await pool.query('ROLLBACK');
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
    const existing = await pool.query(`SELECT expense_date FROM expenses WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
    if (existing.rows.length === 0) return res.status(404).json({ message: "Expense not found" });
    await checkTransactionLock(req.user.id, "Expenses", existing.rows[0].expense_date);
    if (fields.expense_date) await checkTransactionLock(req.user.id, "Expenses", fields.expense_date);

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }
    res.json({ message: "Expense updated", expense: result.rows[0] });
  } catch (err) {
    console.error("UPDATE EXPENSE ERROR:", err);
    res.status(err.message.includes("locked") ? 403 : 500).json({ message: err.message || "Server error" });
  }
};

// DELETE expense
const deleteExpense = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await pool.query(`SELECT expense_date FROM expenses WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
    if (existing.rows.length === 0) return res.status(404).json({ message: "Expense not found" });
    await checkTransactionLock(req.user.id, "Expenses", existing.rows[0].expense_date);

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
    res.status(err.message.includes("locked") ? 403 : 500).json({ message: err.message || "Server error" });
  }
};

module.exports = { getExpenses, getExpenseById, createExpense, updateExpense, deleteExpense };