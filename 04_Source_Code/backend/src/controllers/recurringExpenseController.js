const pool = require("../config/db");

const getRecurringExpenses = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM recurring_expenses WHERE created_by = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ recurringExpenses: result.rows });
  } catch (err) {
    console.error("GET RECURRING EXPENSES ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getRecurringExpenseById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM recurring_expenses WHERE id = $1 AND created_by = $2`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Recurring expense not found" });
    }
    res.json({ recurringExpense: result.rows[0] });
  } catch (err) {
    console.error("GET RECURRING EXPENSE BY ID ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const createRecurringExpense = async (req, res) => {
  const { expense_name, category, amount, frequency, due_day, start_date, end_date, status, notes } = req.body;

  if (!expense_name || !category || !amount || !frequency || !due_day || !start_date) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO recurring_expenses 
       (expense_name, category, amount, frequency, due_day, start_date, end_date, status, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [expense_name, category, amount, frequency, due_day, start_date, end_date || null, status || 'Active', notes || null, req.user.id]
    );
    res.status(201).json({ message: "Recurring expense created", recurringExpense: result.rows[0] });
  } catch (err) {
    console.error("CREATE RECURRING EXPENSE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const updateRecurringExpense = async (req, res) => {
  const { id } = req.params;
  const { expense_name, category, amount, frequency, due_day, start_date, end_date, status, notes } = req.body;

  if (!expense_name || !category || !amount || !frequency || !due_day || !start_date) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const result = await pool.query(
      `UPDATE recurring_expenses
       SET expense_name = $1, category = $2, amount = $3, frequency = $4, due_day = $5, start_date = $6, end_date = $7, status = $8, notes = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND created_by = $11
       RETURNING *`,
      [expense_name, category, amount, frequency, due_day, start_date, end_date || null, status || 'Active', notes || null, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Recurring expense not found" });
    }

    res.json({ message: "Recurring expense updated", recurringExpense: result.rows[0] });
  } catch (err) {
    console.error("UPDATE RECURRING EXPENSE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteRecurringExpense = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM recurring_expenses WHERE id = $1 AND created_by = $2 RETURNING *`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Recurring expense not found" });
    }
    res.json({ message: "Recurring expense deleted successfully" });
  } catch (err) {
    console.error("DELETE RECURRING EXPENSE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // Expects 'Active', 'Paused', or 'Stopped'

  if (!['Active', 'Paused', 'Stopped'].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const result = await pool.query(
      `UPDATE recurring_expenses SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND created_by = $3 RETURNING *`,
      [status, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Recurring expense not found" });
    }

    res.json({ message: `Recurring expense ${status.toLowerCase()}`, recurringExpense: result.rows[0] });
  } catch (err) {
    console.error("UPDATE STATUS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getRecurringExpenses,
  getRecurringExpenseById,
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
  updateStatus
};
