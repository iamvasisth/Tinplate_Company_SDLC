require('dotenv').config();
const pool = require('./src/config/db');

async function checkReports() {
  try {
    const userRes = await pool.query(`SELECT id FROM users WHERE email = 'demo@tinplate.com' LIMIT 1`);
    const userId = userRes.rows[0].id;
    console.log('User ID:', userId);

    // Test P&L query (the fixed one without alias in GROUP BY)
    const pnlSql = `
      SELECT c.account_number AS account_code, c.account_name, c.account_type, 
             COALESCE(SUM(jl.debit), 0) as total_debit, COALESCE(SUM(jl.credit), 0) as total_credit
      FROM chart_of_accounts c
      JOIN journal_entry_lines jl ON c.id = jl.account_id
      JOIN journal_entries j ON jl.journal_entry_id = j.id
      WHERE c.user_id = $1 AND c.is_active = true AND c.account_type IN ('Income', 'Expense')
      GROUP BY c.id, c.account_number, c.account_name, c.account_type
      HAVING COALESCE(SUM(jl.debit), 0) > 0 OR COALESCE(SUM(jl.credit), 0) > 0
    `;
    const pnlRes = await pool.query(pnlSql, [userId]);
    console.log('\n=== P&L Data ===');
    pnlRes.rows.forEach(r => console.log(`${r.account_type} | ${r.account_name} | Debit: ${r.total_debit} | Credit: ${r.total_credit}`));

    // Trial balance (fixed)
    const tbSql = `
      SELECT c.account_number AS account_code, c.account_name, c.account_type, 
             COALESCE(SUM(jl.debit), 0) as total_debit, COALESCE(SUM(jl.credit), 0) as total_credit
      FROM chart_of_accounts c
      LEFT JOIN journal_entry_lines jl ON c.id = jl.account_id
      LEFT JOIN journal_entries j ON jl.journal_entry_id = j.id
      WHERE c.user_id = $1 AND c.is_active = true
      GROUP BY c.id, c.account_number, c.account_name, c.account_type
      HAVING COALESCE(SUM(jl.debit), 0) > 0 OR COALESCE(SUM(jl.credit), 0) > 0
      ORDER BY c.account_number, c.account_name
    `;
    const tbRes = await pool.query(tbSql, [userId]);
    console.log('\n=== Trial Balance Data ===');
    tbRes.rows.forEach(r => console.log(`${r.account_type} | ${r.account_name} | Debit: ${r.total_debit} | Credit: ${r.total_credit}`));

    // Customer aging (should now show all 10 customers)
    const caSql = `
      SELECT c.id, c.display_name, i.invoice_number, i.balance_due, i.due_date, i.status
      FROM customers c
      JOIN invoices i ON c.id = i.customer_id
      WHERE c.user_id = $1 
        AND i.balance_due > 0 
        AND i.status NOT IN ('draft')
      ORDER BY c.display_name
    `;
    const caRes = await pool.query(caSql, [userId]);
    console.log('\n=== Customer Aging Data ===');
    caRes.rows.forEach(r => console.log(`${r.display_name} | ${r.invoice_number} | Due: ${r.balance_due} | Status: ${r.status}`));

    // Total receivables
    const totalDue = await pool.query(
      `SELECT SUM(balance_due) as total FROM invoices WHERE user_id = $1 AND status NOT IN ('draft', 'paid')`,
      [userId]
    );
    console.log('\nTotal Receivable:', totalDue.rows[0].total);

    // Total expenses (from expenses table)
    const totalExp = await pool.query(
      `SELECT SUM(amount) as total FROM expenses WHERE user_id = $1`,
      [userId]
    );
    console.log('Total Expenses (from expenses table):', totalExp.rows[0].total);

    // Total income from payments received  
    const totalIncome = await pool.query(
      `SELECT SUM(amount_received) as total FROM payments WHERE user_id = $1`,
      [userId]
    );
    console.log('Total Income (from payments):', totalIncome.rows[0].total);

  } catch(e) {
    console.error('ERROR:', e.message);
  }
  process.exit(0);
}
checkReports();
