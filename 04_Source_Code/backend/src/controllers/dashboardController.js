const pool = require("../config/db");

// Keeps the old endpoint just in case it is still hit
exports.getFinanceSummary = async (req, res) => {
  try {
    res.json({});
  } catch(err) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.getMonthlyFinanceSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Fallback to current month/year if not provided
    const month = parseInt(req.query.month) || (now.getMonth() + 1); // 1-12
    const year = parseInt(req.query.year) || now.getFullYear();

    // Calculate next month/year
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear = year + 1;
    }

    const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const label = `${monthNames[month]} ${year}`;
    const nextLabel = `${monthNames[nextMonth]} ${nextYear}`;

    // 1. TOP SUMMARY (All-Time Unpaid & Aggregates)
    const topRecRes = await pool.query(
      `SELECT COALESCE(SUM(balance_due), 0) AS total FROM invoices WHERE user_id = $1 AND status != 'Paid'`,
      [userId]
    );
    const total_receivables = parseFloat(topRecRes.rows[0].total);

    const topPayRes = await pool.query(
      `SELECT COALESCE(SUM(balance_due), 0) AS total FROM bills WHERE user_id = $1 AND status != 'Paid' AND is_deleted = false`,
      [userId]
    );
    const total_payables = parseFloat(topPayRes.rows[0].total);

    const topIncRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE user_id = $1`,
      [userId]
    );
    const total_income = parseFloat(topIncRes.rows[0].total);

    const topExpRes = await pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = $1`, [userId]);
    const topPmtMadeRes = await pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM payments_made WHERE user_id = $1`, [userId]);
    const total_expenses = parseFloat(topExpRes.rows[0].total) + parseFloat(topPmtMadeRes.rows[0].total);

    const net_profit = total_income - total_expenses;
    const cash_bank_balance = 0;

    // 2. SELECTED MONTH
    const selIncRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM payments 
       WHERE user_id = $1 AND EXTRACT(MONTH FROM payment_date) = $2 AND EXTRACT(YEAR FROM payment_date) = $3`,
      [userId, month, year]
    );
    const income_received = parseFloat(selIncRes.rows[0].total);

    const selExpRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses 
       WHERE user_id = $1 AND EXTRACT(MONTH FROM expense_date) = $2 AND EXTRACT(YEAR FROM expense_date) = $3`,
      [userId, month, year]
    );
    const selPmtMadeRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM payments_made 
       WHERE user_id = $1 AND EXTRACT(MONTH FROM payment_date) = $2 AND EXTRACT(YEAR FROM payment_date) = $3`,
      [userId, month, year]
    );
    const expenses = parseFloat(selExpRes.rows[0].total) + parseFloat(selPmtMadeRes.rows[0].total);

    const selProjPmtRes = await pool.query(
      `SELECT COALESCE(SUM(balance_due), 0) AS total FROM invoices 
       WHERE user_id = $1 AND status != 'Paid' AND EXTRACT(MONTH FROM due_date) = $2 AND EXTRACT(YEAR FROM due_date) = $3`,
      [userId, month, year]
    );
    const projected_payments = parseFloat(selProjPmtRes.rows[0].total);

    const selExpPayRes = await pool.query(
      `SELECT COALESCE(SUM(balance_due), 0) AS total FROM bills 
       WHERE user_id = $1 AND status != 'Paid' AND is_deleted = false AND EXTRACT(MONTH FROM due_date) = $2 AND EXTRACT(YEAR FROM due_date) = $3`,
      [userId, month, year]
    );
    let expected_payables = parseFloat(selExpPayRes.rows[0].total);

    // Add recurring expenses projected for this month
    const activeRecurringRes = await pool.query(
      `SELECT amount, frequency, due_day, start_date FROM recurring_expenses 
       WHERE created_by = $1 AND status = 'Active' 
       AND start_date <= $2 
       AND (end_date IS NULL OR end_date >= $3)`,
      [userId, new Date(year, month, 0), new Date(year, month - 1, 1)]
    );
    
    activeRecurringRes.rows.forEach(exp => {
      const start = new Date(exp.start_date);
      const targetDate = new Date(year, month - 1, exp.due_day);
      let hits = false;
      if (exp.frequency === 'Monthly') {
        hits = true;
      } else if (exp.frequency === 'Quarterly') {
        const diffMonths = (year - start.getFullYear()) * 12 + ((month - 1) - start.getMonth());
        if (diffMonths >= 0 && diffMonths % 3 === 0) hits = true;
      } else if (exp.frequency === 'Yearly') {
        if (start.getMonth() === (month - 1)) hits = true;
      }
      if (hits) expected_payables += parseFloat(exp.amount);
    });

    const staff_salary = 0;
    const writeoff = 0;

    const profit = income_received - expenses - staff_salary - writeoff;
    const net_cash_position = income_received + projected_payments - expenses - expected_payables;

    // 3. NEXT MONTH
    const nextProjIncRes = await pool.query(
      `SELECT COALESCE(SUM(balance_due), 0) AS total FROM invoices 
       WHERE user_id = $1 AND EXTRACT(MONTH FROM due_date) = $2 AND EXTRACT(YEAR FROM due_date) = $3 AND status != 'Paid'`,
      [userId, nextMonth, nextYear]
    );
    const next_projected_income = parseFloat(nextProjIncRes.rows[0].total);

    const nextProjExpRes = await pool.query(
      `SELECT COALESCE(SUM(balance_due), 0) AS total FROM bills 
       WHERE user_id = $1 AND is_deleted = false AND EXTRACT(MONTH FROM due_date) = $2 AND EXTRACT(YEAR FROM due_date) = $3 AND status != 'Paid'`,
      [userId, nextMonth, nextYear]
    );
    let next_projected_expenses = parseFloat(nextProjExpRes.rows[0].total);

    // Add recurring expenses projected for next month
    const nextActiveRecurringRes = await pool.query(
      `SELECT amount, frequency, due_day, start_date FROM recurring_expenses 
       WHERE created_by = $1 AND status = 'Active' 
       AND start_date <= $2 
       AND (end_date IS NULL OR end_date >= $3)`,
      [userId, new Date(nextYear, nextMonth, 0), new Date(nextYear, nextMonth - 1, 1)]
    );
    
    nextActiveRecurringRes.rows.forEach(exp => {
      const start = new Date(exp.start_date);
      let hits = false;
      if (exp.frequency === 'Monthly') {
        hits = true;
      } else if (exp.frequency === 'Quarterly') {
        const diffMonths = (nextYear - start.getFullYear()) * 12 + ((nextMonth - 1) - start.getMonth());
        if (diffMonths >= 0 && diffMonths % 3 === 0) hits = true;
      } else if (exp.frequency === 'Yearly') {
        if (start.getMonth() === (nextMonth - 1)) hits = true;
      }
      if (hits) next_projected_expenses += parseFloat(exp.amount);
    });

    const next_projected_profit = next_projected_income - next_projected_expenses;

    // 4. DETAILS
    const detRec = await pool.query(
      `SELECT i.invoice_number, c.display_name AS customer_name, i.due_date, i.balance_due, i.status 
       FROM invoices i 
       LEFT JOIN customers c ON i.customer_id = c.id 
       WHERE i.user_id = $1 AND i.status != 'Paid' AND EXTRACT(MONTH FROM i.due_date) = $2 AND EXTRACT(YEAR FROM i.due_date) = $3
       ORDER BY i.due_date ASC`,
      [userId, month, year]
    );

    const detPmtRec = await pool.query(
      `SELECT p.payment_date, c.display_name AS customer_name, i.invoice_number, p.amount, p.payment_mode 
       FROM payments p 
       LEFT JOIN customers c ON p.customer_id = c.id 
       LEFT JOIN invoices i ON p.invoice_id = i.id 
       WHERE p.user_id = $1 AND EXTRACT(MONTH FROM p.payment_date) = $2 AND EXTRACT(YEAR FROM p.payment_date) = $3
       ORDER BY p.payment_date DESC`,
      [userId, month, year]
    );

    const detExp = await pool.query(
      `SELECT e.expense_date, e.category, v.display_name AS vendor_name, e.amount 
       FROM expenses e 
       LEFT JOIN vendors v ON e.vendor_id = v.id 
       WHERE e.user_id = $1 AND EXTRACT(MONTH FROM e.expense_date) = $2 AND EXTRACT(YEAR FROM e.expense_date) = $3
       ORDER BY e.expense_date DESC`,
      [userId, month, year]
    );

    const detPay = await pool.query(
      `SELECT b.bill_number, v.display_name AS vendor_name, b.due_date, b.balance_due, b.status 
       FROM bills b 
       LEFT JOIN vendors v ON b.vendor_id = v.id 
       WHERE b.user_id = $1 AND b.status != 'Paid' AND b.is_deleted = false AND EXTRACT(MONTH FROM b.due_date) = $2 AND EXTRACT(YEAR FROM b.due_date) = $3
       ORDER BY b.due_date ASC`,
      [userId, month, year]
    );

    // 5. CHART DATA

    // 5a. Cash Flow – Last 12 months of income vs expenses
    const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const cashFlowYearly = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();

      const incR = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE user_id = $1 AND EXTRACT(MONTH FROM payment_date) = $2 AND EXTRACT(YEAR FROM payment_date) = $3`,
        [userId, m, y]
      );
      const expR = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = $1 AND EXTRACT(MONTH FROM expense_date) = $2 AND EXTRACT(YEAR FROM expense_date) = $3`,
        [userId, m, y]
      );
      const pmtMadeR = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM payments_made WHERE user_id = $1 AND EXTRACT(MONTH FROM payment_date) = $2 AND EXTRACT(YEAR FROM payment_date) = $3`,
        [userId, m, y]
      );

      cashFlowYearly.push({
        name: `${shortMonths[m - 1]} '${String(y).slice(2)}`,
        income: parseFloat(incR.rows[0].total),
        expense: parseFloat(expR.rows[0].total) + parseFloat(pmtMadeR.rows[0].total),
      });
    }

    // 5b. Income vs Expenses – Last 6 months
    const incomeExpense6Months = cashFlowYearly.slice(-6);

    // 5c. Top Expenses by Category (all time)
    let topExpenses = [];
    try {
      const topExpCatRes = await pool.query(
        `SELECT COALESCE(category, 'Other') AS name, COALESCE(SUM(amount), 0) AS value 
         FROM expenses WHERE user_id = $1 
         GROUP BY category ORDER BY value DESC LIMIT 6`,
        [userId]
      );
      topExpenses = topExpCatRes.rows.map(r => ({ name: r.name, value: parseFloat(r.value) }));
    } catch (e) {
      topExpenses = [];
    }

    // 5d. Bank Accounts
    let banks = [];
    try {
      const bankRes = await pool.query(
        `SELECT account_name AS name, account_number, current_balance AS balance 
         FROM bank_accounts WHERE user_id = $1 AND is_active = true ORDER BY current_balance DESC`,
        [userId]
      );
      banks = bankRes.rows.map(b => ({
        name: b.name,
        account_number: b.account_number ? `...${String(b.account_number).slice(-4)}` : '—',
        balance: parseFloat(b.balance || 0),
      }));
    } catch (e) {
      banks = [];
    }

    res.json({
      top_summary: {
        total_receivables,
        total_payables,
        total_income,
        total_expenses,
        net_profit,
        cash_bank_balance
      },
      selected_month: {
        month,
        year,
        label,
        income_received,
        expenses,
        staff_salary,
        writeoff,
        projected_payments,
        expected_payables,
        profit,
        net_cash_position
      },
      next_month: {
        month: nextMonth,
        year: nextYear,
        label: nextLabel,
        projected_income: next_projected_income,
        projected_payments: next_projected_income,
        projected_expenses: next_projected_expenses,
        expected_payables: next_projected_expenses,
        staff_salary: 0,
        writeoff: 0,
        projected_profit: next_projected_profit
      },
      details: {
        receivables: detRec.rows,
        payments_received: detPmtRec.rows,
        expenses: detExp.rows,
        payables: detPay.rows,
        staff_salary: [],
        writeoffs: []
      },
      chartData: {
        cashFlowYearly,
        incomeExpense6Months,
        topExpenses,
        banks,
      }
    });

  } catch (error) {
    console.error("Error fetching monthly finance summary:", error);
    res.status(500).json({ error: "Server error while fetching monthly finance summary" });
  }
};
