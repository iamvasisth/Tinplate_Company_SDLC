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
    // First verify the bank account belongs to this user
    const accountCheck = await pool.query(
      "SELECT id FROM bank_accounts WHERE id = $1 AND user_id = $2",
      [accountId, req.user.id]
    );
    if (accountCheck.rows.length === 0) {
      return res.status(404).json({ message: "Bank account not found" });
    }

    const result = await pool.query(
      "SELECT * FROM bank_transactions WHERE bank_account_id = $1 ORDER BY transaction_date DESC",
      [accountId]
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

// ---- Ensure reconciliation tables & columns ----
const ensureReconciliationTables = async () => {
  try {
    await pool.query(`ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS is_reconciled BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP`);
    await pool.query(`ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100)`);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bank_reconciliations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        bank_account_id INTEGER NOT NULL,
        statement_start_date DATE,
        statement_end_date DATE,
        opening_balance NUMERIC(12,2) DEFAULT 0,
        closing_balance NUMERIC(12,2) DEFAULT 0,
        total_deposits NUMERIC(12,2) DEFAULT 0,
        total_withdrawals NUMERIC(12,2) DEFAULT 0,
        difference NUMERIC(12,2) DEFAULT 0,
        status VARCHAR(30) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.error("ensureReconciliationTables error:", err);
  }
};
ensureReconciliationTables();

// ================= BANK RECONCILIATION =================
const getReconciliations = async (req, res) => {
  const { bankAccountId } = req.params;
  try {
    const accountCheck = await pool.query("SELECT id FROM bank_accounts WHERE id = $1 AND user_id = $2", [bankAccountId, req.user.id]);
    if (accountCheck.rows.length === 0) return res.status(404).json({ message: "Bank account not found" });

    const result = await pool.query(
      "SELECT * FROM bank_reconciliations WHERE bank_account_id = $1 ORDER BY created_at DESC",
      [bankAccountId]
    );
    res.json({ reconciliations: result.rows });
  } catch (err) {
    console.error("GET RECONCILIATIONS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const createReconciliation = async (req, res) => {
  const { bank_account_id, statement_start_date, statement_end_date, opening_balance, closing_balance, total_deposits, total_withdrawals, difference, status } = req.body;
  
  try {
    const accountCheck = await pool.query("SELECT id FROM bank_accounts WHERE id = $1 AND user_id = $2", [bank_account_id, req.user.id]);
    if (accountCheck.rows.length === 0) return res.status(404).json({ message: "Bank account not found" });

    const result = await pool.query(
      `INSERT INTO bank_reconciliations (user_id, bank_account_id, statement_start_date, statement_end_date, opening_balance, closing_balance, total_deposits, total_withdrawals, difference, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [req.user.id, bank_account_id, statement_start_date, statement_end_date, opening_balance, closing_balance, total_deposits, total_withdrawals, difference, status]
    );
    res.json({ message: "Reconciliation saved", reconciliation: result.rows[0] });
  } catch (err) {
    console.error("CREATE RECONCILIATION ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const reconcileBulkTransactions = async (req, res) => {
  const { transaction_ids, is_reconciled } = req.body;
  if (!Array.isArray(transaction_ids) || transaction_ids.length === 0) return res.status(400).json({ message: "No transactions provided" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Only allow updating transactions that belong to the logged-in user
    // We can do this by joining with bank_accounts
    const query = `
      UPDATE bank_transactions 
      SET is_reconciled = $1, reconciled_at = CASE WHEN $1 = true THEN CURRENT_TIMESTAMP ELSE NULL END
      FROM bank_accounts
      WHERE bank_transactions.bank_account_id = bank_accounts.id
      AND bank_accounts.user_id = $2
      AND bank_transactions.id = ANY($3::int[])
    `;
    
    await client.query(query, [is_reconciled, req.user.id, transaction_ids]);

    await client.query("COMMIT");
    res.json({ message: "Transactions updated successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("BULK RECONCILE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

module.exports = { getAccounts, createAccount, deleteAccount, getTransactions, addTransaction, getReconciliations, createReconciliation, reconcileBulkTransactions };