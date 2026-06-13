const pool = require("../config/db");

// GET /api/reports/trial-balance
const getTrialBalance = async (req, res) => {
  const { start_date, end_date } = req.query;
  const user_id = req.user.id;
  try {
    let dateFilter = "";
    const params = [user_id];
    if (start_date && end_date) {
      dateFilter = " AND j.entry_date BETWEEN $2 AND $3";
      params.push(start_date + " 00:00:00", end_date + " 23:59:59");
    }

    const sql = `
      SELECT c.account_number AS account_code, c.account_name, c.account_type, 
             COALESCE(SUM(jl.debit), 0) as total_debit, COALESCE(SUM(jl.credit), 0) as total_credit
      FROM chart_of_accounts c
      LEFT JOIN journal_entry_lines jl ON c.id = jl.account_id
      LEFT JOIN journal_entries j ON jl.journal_entry_id = j.id ${dateFilter}
      WHERE c.user_id = $1 AND c.is_active = true
      GROUP BY c.id, c.account_number, c.account_name, c.account_type
      HAVING COALESCE(SUM(jl.debit), 0) > 0 OR COALESCE(SUM(jl.credit), 0) > 0
      ORDER BY c.account_number, c.account_name
    `;
    
    const result = await pool.query(sql, params);
    res.json({ accounts: result.rows });
  } catch (err) {
    console.error("TRIAL BALANCE ERROR:", err);
    res.status(500).json({ message: "Failed to generate Trial Balance" });
  }
};

// GET /api/reports/pnl
const getProfitAndLoss = async (req, res) => {
  const { start_date, end_date } = req.query;
  const user_id = req.user.id;
  try {
    let dateFilter = "";
    const params = [user_id];
    if (start_date && end_date) {
      dateFilter = " AND j.entry_date BETWEEN $2 AND $3";
      params.push(start_date + " 00:00:00", end_date + " 23:59:59");
    }

    const sql = `
      SELECT c.account_number AS account_code, c.account_name, c.account_type, 
             COALESCE(SUM(jl.debit), 0) as total_debit, COALESCE(SUM(jl.credit), 0) as total_credit
      FROM chart_of_accounts c
      JOIN journal_entry_lines jl ON c.id = jl.account_id
      JOIN journal_entries j ON jl.journal_entry_id = j.id ${dateFilter}
      WHERE c.user_id = $1 AND c.is_active = true AND c.account_type IN ('Income', 'Expense')
      GROUP BY c.id, c.account_number, c.account_name, c.account_type
      HAVING COALESCE(SUM(jl.debit), 0) > 0 OR COALESCE(SUM(jl.credit), 0) > 0
    `;
    
    const result = await pool.query(sql, params);
    
    // Process Income and Expense
    const incomeAccounts = [];
    const expenseAccounts = [];
    let totalIncome = 0;
    let totalExpense = 0;

    result.rows.forEach(row => {
      const balance = parseFloat(row.total_credit) - parseFloat(row.total_debit); // Income is credit normal, Expense is debit normal
      if (row.account_type === 'Income') {
        incomeAccounts.push({ ...row, balance });
        totalIncome += balance;
      } else if (row.account_type === 'Expense') {
        const expBalance = parseFloat(row.total_debit) - parseFloat(row.total_credit);
        expenseAccounts.push({ ...row, balance: expBalance });
        totalExpense += expBalance;
      }
    });

    res.json({
      income: { accounts: incomeAccounts, total: totalIncome },
      expense: { accounts: expenseAccounts, total: totalExpense },
      net_profit: totalIncome - totalExpense
    });
  } catch (err) {
    console.error("PNL ERROR:", err);
    res.status(500).json({ message: "Failed to generate Profit & Loss" });
  }
};

// GET /api/reports/balance-sheet
const getBalanceSheet = async (req, res) => {
  const { end_date } = req.query;
  const user_id = req.user.id;
  try {
    let dateFilter = "";
    const params = [user_id];
    if (end_date) {
      dateFilter = " AND j.entry_date <= $2";
      params.push(end_date + " 23:59:59");
    }

    const sql = `
      SELECT c.account_number AS account_code, c.account_name, c.account_type, 
             COALESCE(SUM(jl.debit), 0) as total_debit, COALESCE(SUM(jl.credit), 0) as total_credit
      FROM chart_of_accounts c
      JOIN journal_entry_lines jl ON c.id = jl.account_id
      JOIN journal_entries j ON jl.journal_entry_id = j.id ${dateFilter}
      WHERE c.user_id = $1 AND c.is_active = true AND c.account_type IN ('Asset', 'Liability', 'Equity')
      GROUP BY c.id, c.account_number, c.account_name, c.account_type
      HAVING COALESCE(SUM(jl.debit), 0) > 0 OR COALESCE(SUM(jl.credit), 0) > 0
    `;
    
    const result = await pool.query(sql, params);
    
    const assets = [];
    const liabilities = [];
    const equity = [];
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    result.rows.forEach(row => {
      if (row.account_type === 'Asset') {
        const bal = parseFloat(row.total_debit) - parseFloat(row.total_credit);
        assets.push({ ...row, balance: bal });
        totalAssets += bal;
      } else if (row.account_type === 'Liability') {
        const bal = parseFloat(row.total_credit) - parseFloat(row.total_debit);
        liabilities.push({ ...row, balance: bal });
        totalLiabilities += bal;
      } else if (row.account_type === 'Equity') {
        const bal = parseFloat(row.total_credit) - parseFloat(row.total_debit);
        equity.push({ ...row, balance: bal });
        totalEquity += bal;
      }
    });

    res.json({
      assets: { accounts: assets, total: totalAssets },
      liabilities: { accounts: liabilities, total: totalLiabilities },
      equity: { accounts: equity, total: totalEquity }
    });
  } catch (err) {
    console.error("BALANCE SHEET ERROR:", err);
    res.status(500).json({ message: "Failed to generate Balance Sheet" });
  }
};

// GET /api/reports/cash-flow
const getCashFlow = async (req, res) => {
  // Simple cash flow approximation using Cash and Bank accounts
  const { start_date, end_date } = req.query;
  const user_id = req.user.id;
  try {
    let dateFilter = "";
    const params = [user_id];
    if (start_date && end_date) {
      dateFilter = " AND j.entry_date BETWEEN $2 AND $3";
      params.push(start_date + " 00:00:00", end_date + " 23:59:59");
    }

    const sql = `
      SELECT jl.description, SUM(jl.debit) as inflow, SUM(jl.credit) as outflow
      FROM chart_of_accounts c
      JOIN journal_entry_lines jl ON c.id = jl.account_id
      JOIN journal_entries j ON jl.journal_entry_id = j.id ${dateFilter}
      WHERE c.user_id = $1 AND c.is_active = true AND (c.account_name ILIKE '%cash%' OR c.account_name ILIKE '%bank%')
      GROUP BY jl.description
    `;
    
    const result = await pool.query(sql, params);
    
    const operatingActivities = [];
    let netCashFlow = 0;

    result.rows.forEach(row => {
      const flow = parseFloat(row.inflow) - parseFloat(row.outflow);
      operatingActivities.push({ description: row.description || "Uncategorized Transaction", amount: flow });
      netCashFlow += flow;
    });

    res.json({
      operating_activities: operatingActivities,
      net_cash_flow: netCashFlow
    });
  } catch (err) {
    console.error("CASH FLOW ERROR:", err);
    res.status(500).json({ message: "Failed to generate Cash Flow" });
  }
};

// GET /api/reports/customer-aging
const getCustomerAging = async (req, res) => {
  const { as_of_date } = req.query;
  const user_id = req.user.id;
  const targetDate = as_of_date || new Date().toISOString().split('T')[0];

  try {
    const sql = `
      SELECT c.id, c.display_name, c.first_name, c.last_name, c.email,
             i.id as invoice_id, i.invoice_number, i.balance_due, i.due_date
      FROM customers c
      JOIN invoices i ON c.id = i.customer_id
      WHERE c.user_id = $1 
        AND i.balance_due > 0 
        AND i.status NOT IN ('draft')
    `;
    
    const result = await pool.query(sql, [user_id]);
    const targetTime = new Date(targetDate).getTime();
    
    const customerMap = {};

    result.rows.forEach(row => {
      if (!customerMap[row.id]) {
        customerMap[row.id] = {
          customer_id: row.id,
          customer_name: row.display_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
          current: 0,
          days_1_30: 0,
          days_31_60: 0,
          days_61_90: 0,
          days_90_plus: 0,
          total_due: 0
        };
      }

      const dueTime = new Date(row.due_date || row.invoice_date || targetDate).getTime();
      const diffTime = targetTime - dueTime;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      const balance = parseFloat(row.balance_due);

      if (diffDays <= 0) {
        customerMap[row.id].current += balance;
      } else if (diffDays >= 1 && diffDays <= 30) {
        customerMap[row.id].days_1_30 += balance;
      } else if (diffDays >= 31 && diffDays <= 60) {
        customerMap[row.id].days_31_60 += balance;
      } else if (diffDays >= 61 && diffDays <= 90) {
        customerMap[row.id].days_61_90 += balance;
      } else {
        customerMap[row.id].days_90_plus += balance;
      }
      
      customerMap[row.id].total_due += balance;
    });

    const agingData = Object.values(customerMap).filter(c => c.total_due > 0);
    // Sort by total due desc
    agingData.sort((a, b) => b.total_due - a.total_due);

    res.json({ customer_aging: agingData });
  } catch (err) {
    console.error("CUSTOMER AGING ERROR:", err);
    res.status(500).json({ message: "Failed to generate Customer Aging Report" });
  }
};

// GET /api/reports/vendor-aging
const getVendorAging = async (req, res) => {
  const { as_of_date } = req.query;
  const user_id = req.user.id;
  const targetDate = as_of_date || new Date().toISOString().split('T')[0];

  try {
    const sql = `
      SELECT v.id, v.display_name, v.first_name, v.last_name, v.email,
             b.id as bill_id, b.bill_number, b.balance_due, b.due_date
      FROM vendors v
      JOIN bills b ON v.id = b.vendor_id
      WHERE v.user_id = $1 
        AND b.balance_due > 0 
        AND b.status NOT IN ('draft', 'drafted')
    `;
    
    const result = await pool.query(sql, [user_id]);
    const targetTime = new Date(targetDate).getTime();
    
    const vendorMap = {};

    result.rows.forEach(row => {
      if (!vendorMap[row.id]) {
        vendorMap[row.id] = {
          vendor_id: row.id,
          vendor_name: row.display_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
          current: 0,
          days_1_30: 0,
          days_31_60: 0,
          days_61_90: 0,
          days_90_plus: 0,
          total_due: 0
        };
      }

      const dueTime = new Date(row.due_date || row.bill_date || targetDate).getTime();
      const diffTime = targetTime - dueTime;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      const balance = parseFloat(row.balance_due);

      if (diffDays <= 0) {
        vendorMap[row.id].current += balance;
      } else if (diffDays >= 1 && diffDays <= 30) {
        vendorMap[row.id].days_1_30 += balance;
      } else if (diffDays >= 31 && diffDays <= 60) {
        vendorMap[row.id].days_31_60 += balance;
      } else if (diffDays >= 61 && diffDays <= 90) {
        vendorMap[row.id].days_61_90 += balance;
      } else {
        vendorMap[row.id].days_90_plus += balance;
      }
      
      vendorMap[row.id].total_due += balance;
    });

    const agingData = Object.values(vendorMap).filter(v => v.total_due > 0);
    agingData.sort((a, b) => b.total_due - a.total_due);

    res.json({ vendor_aging: agingData });
  } catch (err) {
    console.error("VENDOR AGING ERROR:", err);
    res.status(500).json({ message: "Failed to generate Vendor Aging Report" });
  }
};

module.exports = { getTrialBalance, getProfitAndLoss, getBalanceSheet, getCashFlow, getCustomerAging, getVendorAging };
