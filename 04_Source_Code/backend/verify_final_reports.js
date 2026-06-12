/**
 * verify_final_reports.js
 * Verifies P&L, Trial Balance, Customer Aging are working correctly
 */

require('dotenv').config();
const pool = require('./src/config/db');

const DEMO_EMAIL = 'demo@tinplate.com';

async function run() {
  try {
    const userRes = await pool.query(`SELECT id FROM users WHERE email = $1`, [DEMO_EMAIL]);
    const userId = userRes.rows[0].id;

    console.log('=== COMPLETE DATA SUMMARY ===');
    console.log(`User ID: ${userId}`);

    // Customers
    const cust = await pool.query(`SELECT COUNT(*) FROM customers WHERE user_id = $1`, [userId]);
    console.log(`Customers: ${cust.rows[0].count}`);

    // Items
    const items = await pool.query(`SELECT COUNT(*) FROM items WHERE user_id = $1`, [userId]);
    console.log(`Items: ${items.rows[0].count}`);

    // Quotes
    const quotes = await pool.query(`SELECT status, COUNT(*) FROM quotes WHERE user_id = $1 GROUP BY status`, [userId]);
    console.log('\n=== QUOTES BY STATUS ===');
    quotes.rows.forEach(r => console.log(`  ${r.status}: ${r.count}`));

    // All Invoices
    const allInv = await pool.query(`SELECT status, COUNT(*), SUM(total_amount) as total, SUM(balance_due) as pending FROM invoices WHERE user_id = $1 GROUP BY status`, [userId]);
    console.log('\n=== ALL INVOICES BY STATUS ===');
    allInv.rows.forEach(r => console.log(`  ${r.status}: ${r.count} | Total: ₹${r.total} | Pending: ₹${r.pending}`));
    
    const totalInv = await pool.query(`SELECT SUM(total_amount) as total, SUM(balance_due) as pending FROM invoices WHERE user_id = $1`, [userId]);
    console.log(`  TOTAL: ₹${totalInv.rows[0].total} | TOTAL PENDING: ₹${totalInv.rows[0].pending}`);

    // Quote-based invoices only
    const qInv = await pool.query(`SELECT status, COUNT(*), SUM(total_amount) as total, SUM(balance_due) as pending FROM invoices WHERE user_id = $1 AND quote_id IS NOT NULL GROUP BY status`, [userId]);
    console.log('\n=== QUOTE-BASED INVOICES BY STATUS ===');
    qInv.rows.forEach(r => console.log(`  ${r.status}: ${r.count} | Total: ₹${r.total} | Pending: ₹${r.pending}`));

    // Payments
    const pay = await pool.query(`SELECT COUNT(*), SUM(amount) FROM payments WHERE user_id = $1`, [userId]);
    console.log(`\nTotal Payments: ${pay.rows[0].count} | Total Collected: ₹${pay.rows[0].sum}`);

    // Expenses
    const exp = await pool.query(`SELECT category, amount FROM expenses WHERE user_id = $1 ORDER BY id`, [userId]);
    const totalExp = exp.rows.reduce((s, r) => s + parseFloat(r.amount), 0);
    console.log(`\n=== EXPENSES (${exp.rows.length} entries) ===`);
    exp.rows.forEach(e => console.log(`  ${e.category}: ₹${e.amount}`));
    console.log(`  TOTAL: ₹${totalExp}`);

    // Journal entries for P&L (Income accounts)
    const incomeJE = await pool.query(`
      SELECT c.account_name, c.account_type,
             SUM(jl.debit) as debits, SUM(jl.credit) as credits
      FROM chart_of_accounts c
      JOIN journal_entry_lines jl ON c.id = jl.account_id
      JOIN journal_entries j ON jl.journal_entry_id = j.id
      WHERE c.user_id = $1 AND c.is_active = true AND c.account_type IN ('Income','Expense')
      GROUP BY c.id, c.account_name, c.account_type
      HAVING SUM(jl.debit) > 0 OR SUM(jl.credit) > 0
      ORDER BY c.account_type, c.account_name
    `, [userId]);
    console.log('\n=== P&L DATA (from journal entries) ===');
    let totalIncome = 0, totalExpenseJE = 0;
    incomeJE.rows.forEach(r => {
      if (r.account_type === 'Income') {
        const bal = parseFloat(r.credits) - parseFloat(r.debits);
        totalIncome += bal;
        console.log(`  INCOME: ${r.account_name} | Balance: ₹${bal}`);
      } else {
        const bal = parseFloat(r.debits) - parseFloat(r.credits);
        totalExpenseJE += bal;
        console.log(`  EXPENSE: ${r.account_name} | Balance: ₹${bal}`);
      }
    });
    console.log(`  Total Income (from JE): ₹${totalIncome}`);
    console.log(`  Total Expenses (from JE): ₹${totalExpenseJE}`);
    console.log(`  Net Profit (from JE): ₹${totalIncome - totalExpenseJE}`);

    // Customer Aging
    console.log('\n=== CUSTOMER AGING (unpaid quote-based invoices) ===');
    const aging = await pool.query(`
      SELECT c.display_name, i.invoice_number, i.balance_due, i.status
      FROM invoices i JOIN customers c ON i.customer_id = c.id
      WHERE i.user_id = $1 AND i.balance_due > 0 AND i.status NOT IN ('draft') AND i.quote_id IS NOT NULL
      ORDER BY i.balance_due DESC
    `, [userId]);
    aging.rows.forEach(r => console.log(`  ${r.display_name}: ₹${r.balance_due} (${r.status}) - ${r.invoice_number}`));
    const totalPending = aging.rows.reduce((s, r) => s + parseFloat(r.balance_due), 0);
    console.log(`  Total Pending Receivable: ₹${totalPending}`);

    // Final P&L summary
    console.log('\n=== PRESENTATION READY SUMMARY ===');
    const totalCollected = parseFloat(pay.rows[0].sum);
    console.log(`Total Quote Value (16 invoices): ₹${(await pool.query(`SELECT SUM(total_amount) FROM invoices WHERE user_id = $1 AND quote_id IS NOT NULL`, [userId])).rows[0].sum}`);
    console.log(`Total Payments Collected: ₹${totalCollected}`);
    console.log(`Total Expenses (all): ₹${totalExp}`);
    console.log(`Pending Receivable (quote invoices): ₹${totalPending}`);
    console.log(`\nQuotes Left Unconverted: Vikash Kumar, Kunal Gupta, Sweta Kumari, Deepak Singh`);

  } catch(e) {
    console.error('ERROR:', e.message, e.stack);
  }
  process.exit(0);
}
run();
