const pool = require("../config/db");

// ================= BANK ACCOUNTS =================
const getAccounts = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM bank_accounts WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json({ accounts: result.rows });
  } catch (err) {
    console.error("GET ACCOUNTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const createAccount = async (req, res) => {
  const { account_name, bank_name, account_number, ifsc_code, opening_balance } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO bank_accounts (user_id, account_name, bank_name, account_number, ifsc_code, opening_balance, current_balance)
       VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING *`,
      [req.user.id, account_name, bank_name, account_number, ifsc_code, opening_balance || 0]
    );
    res.json({ message: "Account created", account: result.rows[0] });
  } catch (err) {
    console.error("CREATE ACCOUNT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteAccount = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM bank_accounts WHERE id = $1 AND user_id = $2", [id, req.user.id]);
    res.json({ message: "Account deleted" });
  } catch (err) {
    console.error("DELETE ACCOUNT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= BANK TRANSACTIONS =================
const getTransactions = async (req, res) => {
  const { accountId } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM bank_transactions WHERE bank_account_id = $1 AND user_id = $2 ORDER BY transaction_date DESC",
      [accountId, req.user.id]
    );
    res.json({ transactions: result.rows });
  } catch (err) {
    console.error("GET TRANSACTIONS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const addTransaction = async (req, res) => {
  const { accountId } = req.params;
  const { transaction_date, description, transaction_type, amount, reference } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert transaction
    const txResult = await client.query(
      `INSERT INTO bank_transactions (bank_account_id, user_id, transaction_date, description, transaction_type, amount, reference)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [accountId, req.user.id, transaction_date, description, transaction_type, amount, reference]
    );

    // Update current balance
    const balanceChange = transaction_type === "deposit" ? amount : -amount;
    await client.query(
      `UPDATE bank_accounts SET current_balance = current_balance + $1 WHERE id = $2`,
      [balanceChange, accountId]
    );

    await client.query("COMMIT");
    res.json({ message: "Transaction recorded", transaction: txResult.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ADD TRANSACTION ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

module.exports = { getAccounts, createAccount, deleteAccount, getTransactions, addTransaction };