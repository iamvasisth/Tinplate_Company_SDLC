const pool = require("../config/db");

// ---- Ensure chart_of_accounts table exists (safe to re-run) ----
const ensureCOATable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chart_of_accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        account_name VARCHAR(255) NOT NULL,
        account_code VARCHAR(50),
        account_type VARCHAR(100) NOT NULL,
        parent_account_id INTEGER,
        opening_balance NUMERIC(12,2) DEFAULT 0,
        current_balance NUMERIC(12,2) DEFAULT 0,
        description TEXT,
        status VARCHAR(20) DEFAULT 'active',
        is_deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.error("ensureCOATable error:", err);
  }
};
ensureCOATable();

// GET all accounts
const getAccounts = async (req, res) => {
  try {
    let result = await pool.query(
      "SELECT * FROM chart_of_accounts WHERE user_id = $1 AND is_deleted = false ORDER BY account_type, account_name",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      // Create safe default accounts
      const defaultAccounts = [
        { name: 'Cash', code: '1001', type: 'Asset' },
        { name: 'Bank', code: '1002', type: 'Asset' },
        { name: 'Accounts Receivable', code: '1200', type: 'Asset' },
        { name: 'GST Receivable', code: '1300', type: 'Asset' },
        { name: 'Accounts Payable', code: '2000', type: 'Liability' },
        { name: 'GST Payable', code: '2200', type: 'Liability' },
        { name: 'Owner Equity', code: '3000', type: 'Equity' },
        { name: 'Sales Income', code: '4000', type: 'Income' },
        { name: 'Purchase Expense', code: '5000', type: 'Expense' }
      ];

      const insertPromises = defaultAccounts.map(acc => 
        pool.query(
          `INSERT INTO chart_of_accounts (user_id, account_name, account_code, account_type, status)
           VALUES ($1, $2, $3, $4, 'active')`,
          [req.user.id, acc.name, acc.code, acc.type]
        )
      );
      await Promise.all(insertPromises);

      // Re-fetch
      result = await pool.query(
        "SELECT * FROM chart_of_accounts WHERE user_id = $1 AND is_deleted = false ORDER BY account_type, account_name",
        [req.user.id]
      );
    }

    res.json({ accounts: result.rows });
  } catch (err) {
    console.error("GET ACCOUNTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET single account
const getAccountById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM chart_of_accounts WHERE id = $1 AND user_id = $2 AND is_deleted = false",
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Account not found" });
    }
    res.json({ account: result.rows[0] });
  } catch (err) {
    console.error("GET ACCOUNT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// CREATE account
const createAccount = async (req, res) => {
  const { account_name, account_code, account_type, parent_account_id, opening_balance, description, status } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO chart_of_accounts (user_id, account_name, account_code, account_type, parent_account_id, opening_balance, current_balance, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8) RETURNING *`,
      [req.user.id, account_name, account_code, account_type, parent_account_id || null, opening_balance || 0, description, status || 'active']
    );
    res.json({ account: result.rows[0] });
  } catch (err) {
    console.error("CREATE ACCOUNT ERROR:", err);
    res.status(500).json({ message: "Failed to create account" });
  }
};

// UPDATE account
const updateAccount = async (req, res) => {
  const { id } = req.params;
  const { account_name, account_code, account_type, parent_account_id, description, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE chart_of_accounts
       SET account_name = $1, account_code = $2, account_type = $3, parent_account_id = $4, description = $5, status = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND user_id = $8 AND is_deleted = false
       RETURNING *`,
      [account_name, account_code, account_type, parent_account_id || null, description, status || 'active', id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Account not found" });
    }
    res.json({ account: result.rows[0] });
  } catch (err) {
    console.error("UPDATE ACCOUNT ERROR:", err);
    res.status(500).json({ message: "Failed to update account" });
  }
};

// DELETE account (soft)
const deleteAccount = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE chart_of_accounts SET is_deleted = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Account not found" });
    }
    res.json({ message: "Account deleted" });
  } catch (err) {
    console.error("DELETE ACCOUNT ERROR:", err);
    res.status(500).json({ message: "Failed to delete account" });
  }
};

// ---- Ensure journal tables exist (safe to re-run) ----
const ensureJournalTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        journal_number VARCHAR(50) NOT NULL,
        journal_date DATE NOT NULL,
        reference_number VARCHAR(100),
        notes TEXT,
        total_debit NUMERIC(12,2) NOT NULL DEFAULT 0,
        total_credit NUMERIC(12,2) NOT NULL DEFAULT 0,
        status VARCHAR(20) DEFAULT 'published',
        is_deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS journal_entry_lines (
        id SERIAL PRIMARY KEY,
        journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
        account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id),
        description TEXT,
        debit NUMERIC(12,2) DEFAULT 0,
        credit NUMERIC(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.error("ensureJournalTables error:", err);
  }
};
ensureJournalTables();

// GET all manual journals
const getJournals = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM journal_entries WHERE user_id = $1 AND is_deleted = false ORDER BY journal_date DESC, created_at DESC",
      [req.user.id]
    );
    res.json({ journals: result.rows });
  } catch (err) {
    console.error("GET JOURNALS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET single manual journal
const getJournalById = async (req, res) => {
  const { id } = req.params;
  try {
    const journalResult = await pool.query(
      "SELECT * FROM journal_entries WHERE id = $1 AND user_id = $2 AND is_deleted = false",
      [id, req.user.id]
    );
    if (journalResult.rows.length === 0) {
      return res.status(404).json({ message: "Journal not found" });
    }
    const linesResult = await pool.query(
      `SELECT jl.*, ca.account_name, ca.account_code 
       FROM journal_entry_lines jl
       JOIN chart_of_accounts ca ON jl.account_id = ca.id
       WHERE jl.journal_entry_id = $1`,
      [id]
    );
    res.json({ journal: journalResult.rows[0], lines: linesResult.rows });
  } catch (err) {
    console.error("GET JOURNAL BY ID ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// CREATE manual journal
const createJournal = async (req, res) => {
  const { journal_date, journal_number, reference_number, notes, lines } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Validations
    if (!lines || lines.length < 2) throw new Error("At least 2 lines required.");
    let totalDebit = 0;
    let totalCredit = 0;
    
    for (const line of lines) {
      const debit = parseFloat(line.debit) || 0;
      const credit = parseFloat(line.credit) || 0;
      if (debit > 0 && credit > 0) throw new Error("A single line cannot have both debit and credit.");
      if (debit <= 0 && credit <= 0) throw new Error("Amount must be greater than 0.");
      totalDebit += debit;
      totalCredit += credit;
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error("Total debit must equal total credit.");
    }

    // Insert journal
    const journalRes = await client.query(
      `INSERT INTO journal_entries (user_id, journal_number, journal_date, reference_number, notes, total_debit, total_credit)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, journal_number, journal_date, reference_number, notes, totalDebit, totalCredit]
    );
    const journalId = journalRes.rows[0].id;

    // Insert lines
    for (const line of lines) {
      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
         VALUES ($1, $2, $3, $4, $5)`,
        [journalId, line.account_id, line.description, parseFloat(line.debit) || 0, parseFloat(line.credit) || 0]
      );
    }

    await client.query("COMMIT");
    res.json({ journal: journalRes.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CREATE JOURNAL ERROR:", err);
    res.status(400).json({ message: err.message || "Failed to create journal" });
  } finally {
    client.release();
  }
};

// UPDATE manual journal
const updateJournal = async (req, res) => {
  const { id } = req.params;
  const { journal_date, journal_number, reference_number, notes, lines } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check ownership
    const checkRes = await client.query("SELECT id FROM journal_entries WHERE id = $1 AND user_id = $2 AND is_deleted = false", [id, req.user.id]);
    if (checkRes.rows.length === 0) throw new Error("Journal not found.");

    // Validations
    if (!lines || lines.length < 2) throw new Error("At least 2 lines required.");
    let totalDebit = 0;
    let totalCredit = 0;
    
    for (const line of lines) {
      const debit = parseFloat(line.debit) || 0;
      const credit = parseFloat(line.credit) || 0;
      if (debit > 0 && credit > 0) throw new Error("A single line cannot have both debit and credit.");
      if (debit <= 0 && credit <= 0) throw new Error("Amount must be greater than 0.");
      totalDebit += debit;
      totalCredit += credit;
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error("Total debit must equal total credit.");
    }

    // Update journal
    const journalRes = await client.query(
      `UPDATE journal_entries
       SET journal_number = $1, journal_date = $2, reference_number = $3, notes = $4, total_debit = $5, total_credit = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [journal_number, journal_date, reference_number, notes, totalDebit, totalCredit, id, req.user.id]
    );

    // Delete old lines and re-insert
    await client.query("DELETE FROM journal_entry_lines WHERE journal_entry_id = $1", [id]);
    for (const line of lines) {
      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, line.account_id, line.description, parseFloat(line.debit) || 0, parseFloat(line.credit) || 0]
      );
    }

    await client.query("COMMIT");
    res.json({ journal: journalRes.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("UPDATE JOURNAL ERROR:", err);
    res.status(400).json({ message: err.message || "Failed to update journal" });
  } finally {
    client.release();
  }
};

// DELETE manual journal (soft)
const deleteJournal = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE journal_entries SET is_deleted = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Journal not found" });
    }
    res.json({ message: "Journal deleted" });
  } catch (err) {
    console.error("DELETE JOURNAL ERROR:", err);
    res.status(500).json({ message: "Failed to delete journal" });
  }
};

// GET Projected Payments (Pending Bills)
const getProjectedPayments = async (req, res) => {
  try {
    const today = new Date();
    let projMonth = today.getMonth() + 2; // Next month (0-indexed, so +2)
    let projYear = today.getFullYear();
    if (projMonth > 12) {
      projMonth = 1;
      projYear += 1;
    }

    const result = await pool.query(`
      SELECT b.id as bill_id, b.invoice_number as bill_number, v.display_name as vendor_name, b.invoice_date as bill_date, b.due_date, 
             b.total_amount, (b.total_amount - b.balance_due) as paid_amount, b.balance_due as pending_amount, 
             b.status
      FROM invoices b
      LEFT JOIN customers v ON b.customer_id = v.id
      WHERE b.user_id = $1 
        AND b.balance_due > 0
        AND LOWER(b.status) NOT IN ('paid', 'cancelled', 'void', 'written off', 'write off', 'written_off')
      ORDER BY b.due_date ASC
    `, [req.user.id]);

    let total_projected_payment = 0;
    const bills = result.rows.map(bill => {
      const pending = parseFloat(bill.pending_amount) || 0;
      total_projected_payment += pending;
      return {
        ...bill,
        projected_for_month: projMonth,
        projected_for_year: projYear,
        write_off_status: null // Assuming write off is fully handled by status
      };
    });

    res.json({
      total_projected_payment,
      projected_month: projMonth,
      projected_year: projYear,
      bills
    });

  } catch (err) {
    console.error("GET PROJECTED PAYMENTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET Projected Expenses (Upcoming Bills and Recurring)
const getProjectedExpenses = async (req, res) => {
  try {
    const today = new Date();
    let projMonth = today.getMonth() + 2; 
    let projYear = today.getFullYear();
    if (projMonth > 12) {
      projMonth = 1;
      projYear += 1;
    }

    // 1. Fetch pending bills
    const billsResult = await pool.query(`
      SELECT b.id as expense_id, b.bill_number as reference_number, v.display_name as vendor_name, 
             b.bill_date as date, b.due_date, 
             b.total_amount, b.balance_due as pending_amount, 
             b.status, 'Bill' as type
      FROM bills b
      LEFT JOIN vendors v ON b.vendor_id = v.id
      WHERE b.user_id = $1 
        AND b.balance_due > 0
        AND b.is_deleted = false
        AND LOWER(b.status) NOT IN ('paid', 'cancelled', 'void')
      ORDER BY b.due_date ASC
    `, [req.user.id]);

    // 2. Fetch recurring expenses hitting next month
    const recurringResult = await pool.query(`
      SELECT id as expense_id, expense_name as reference_number, category as vendor_name, 
             start_date as date, due_day, 
             amount as total_amount, amount as pending_amount, 
             status, 'Recurring' as type, frequency
      FROM recurring_expenses
      WHERE created_by = $1 AND status = 'Active' 
        AND start_date <= $2 
        AND (end_date IS NULL OR end_date >= $3)
    `, [req.user.id, new Date(projYear, projMonth, 0), new Date(projYear, projMonth - 1, 1)]);

    let total_projected_expense = 0;
    
    // Map bills
    let items = billsResult.rows.map(bill => {
      total_projected_expense += parseFloat(bill.pending_amount) || 0;
      return bill;
    });

    // Map and filter recurring expenses
    recurringResult.rows.forEach(exp => {
      const start = new Date(exp.date);
      let hits = false;
      if (exp.frequency === 'Monthly') {
        hits = true;
      } else if (exp.frequency === 'Quarterly') {
        const diffMonths = (projYear - start.getFullYear()) * 12 + ((projMonth - 1) - start.getMonth());
        if (diffMonths >= 0 && diffMonths % 3 === 0) hits = true;
      } else if (exp.frequency === 'Yearly') {
        if (start.getMonth() === (projMonth - 1)) hits = true;
      }
      
      if (hits) {
        // Create a fake due_date for sorting
        const dueDate = new Date(projYear, projMonth - 1, exp.due_day);
        total_projected_expense += parseFloat(exp.pending_amount) || 0;
        items.push({
          ...exp,
          due_date: dueDate.toISOString(),
          vendor_name: exp.vendor_name || 'System'
        });
      }
    });

    // Sort combined items by due_date
    items.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    res.json({
      total_projected_expense,
      projected_month: projMonth,
      projected_year: projYear,
      expenses: items
    });

  } catch (err) {
    console.error("GET PROJECTED EXPENSES ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getAccounts, getAccountById, createAccount, updateAccount, deleteAccount, getJournals, getJournalById, createJournal, updateJournal, deleteJournal, getProjectedPayments, getProjectedExpenses };
