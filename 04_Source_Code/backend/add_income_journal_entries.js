/**
 * add_income_journal_entries.js
 * Creates journal entries for all quote-based invoices so P&L shows Income.
 * This mirrors what a proper double-entry system would do:
 *   Debit: Accounts Receivable (Asset)
 *   Credit: Course Fee Income (Income)
 * 
 * Then for payments received:
 *   Debit: Cash/Bank (Asset)
 *   Credit: Accounts Receivable (Asset)
 */

require('dotenv').config();
const pool = require('./src/config/db');

const DEMO_EMAIL = 'demo@tinplate.com';

async function getOrCreateAccount(client, userId, name, type) {
  const res = await client.query(
    `SELECT id FROM chart_of_accounts WHERE user_id = $1 AND account_name = $2 LIMIT 1`,
    [userId, name]
  );
  if (res.rows.length) return res.rows[0].id;
  const ins = await client.query(
    `INSERT INTO chart_of_accounts (user_id, account_name, account_type, is_active) VALUES ($1, $2, $3, true) RETURNING id`,
    [userId, name, type]
  );
  return ins.rows[0].id;
}

async function run() {
  try {
    const userRes = await pool.query(`SELECT id FROM users WHERE email = $1`, [DEMO_EMAIL]);
    const userId = userRes.rows[0].id;
    console.log(`User ID: ${userId}`);

    // Check if income journal entries already exist for these invoices
    const existingJE = await pool.query(
      `SELECT reference_id FROM journal_entries WHERE user_id = $1 AND reference_type = 'INVOICE'`,
      [userId]
    );
    const alreadyDone = new Set(existingJE.rows.map(r => r.reference_id));
    console.log(`Already have JEs for ${alreadyDone.size} invoices`);

    // Load all quote-based invoices with their items
    const invoices = await pool.query(`
      SELECT i.id, i.invoice_number, i.total_amount, i.customer_id, i.invoice_date
      FROM invoices i
      WHERE i.user_id = $1 AND i.quote_id IS NOT NULL
      ORDER BY i.id
    `, [userId]);

    // Load all payments for quote-based invoices
    const payments = await pool.query(`
      SELECT p.id, p.invoice_id, p.amount, p.payment_date
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      WHERE p.user_id = $1 AND i.quote_id IS NOT NULL
      ORDER BY p.id
    `, [userId]);

    let incomeJECreated = 0;
    let paymentJECreated = 0;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get/create standard accounts
      const arAccountId = await getOrCreateAccount(client, userId, 'Accounts Receivable', 'Asset');
      const incomeAccountId = await getOrCreateAccount(client, userId, 'Course Fee Income', 'Income');
      const cashAccountId = await getOrCreateAccount(client, userId, 'Cash', 'Asset');

      console.log(`\nAccount IDs:`);
      console.log(`  Accounts Receivable: ${arAccountId}`);
      console.log(`  Course Fee Income: ${incomeAccountId}`);
      console.log(`  Cash: ${cashAccountId}`);

      // Create journal entries for each invoice (INVOICE type)
      console.log('\n=== CREATING INVOICE JOURNAL ENTRIES ===');
      for (const inv of invoices.rows) {
        if (alreadyDone.has(inv.id)) {
          console.log(`⏭️  Invoice ${inv.invoice_number}: JE already exists`);
          continue;
        }

        const jeRes = await client.query(
          `INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_number, reference_id)
           VALUES ($1, $2, $3, 'INVOICE', $4, $5) RETURNING id`,
          [userId, inv.invoice_date || new Date().toISOString().slice(0, 10),
           `Course Fee Invoice: ${inv.invoice_number}`,
           inv.invoice_number, inv.id]
        );
        const jeId = jeRes.rows[0].id;

        // Debit AR, Credit Income
        await client.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
           VALUES ($1, $2, $3, 0), ($1, $4, 0, $3)`,
          [jeId, arAccountId, inv.total_amount, incomeAccountId]
        );
        console.log(`✅ Invoice JE: ${inv.invoice_number} | DR Accounts Receivable ₹${inv.total_amount} | CR Course Fee Income ₹${inv.total_amount}`);
        incomeJECreated++;
      }

      // Check if payment journal entries already exist
      const existingPayJE = await pool.query(
        `SELECT reference_id FROM journal_entries WHERE user_id = $1 AND reference_type = 'PAYMENT'`,
        [userId]
      );
      const payAlreadyDone = new Set(existingPayJE.rows.map(r => r.reference_id));

      // Create journal entries for each payment (PAYMENT type)
      console.log('\n=== CREATING PAYMENT JOURNAL ENTRIES ===');
      for (const pay of payments.rows) {
        if (payAlreadyDone.has(pay.id)) {
          console.log(`⏭️  Payment ${pay.id}: JE already exists`);
          continue;
        }

        const jeRes = await client.query(
          `INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_number, reference_id)
           VALUES ($1, $2, $3, 'PAYMENT', $4, $5) RETURNING id`,
          [userId, pay.payment_date || new Date().toISOString().slice(0, 10),
           `Payment received for Invoice ID ${pay.invoice_id}`,
           `PAY-${pay.id}`, pay.id]
        );
        const jeId = jeRes.rows[0].id;

        // Debit Cash, Credit AR
        await client.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
           VALUES ($1, $2, $3, 0), ($1, $4, 0, $3)`,
          [jeId, cashAccountId, pay.amount, arAccountId]
        );
        console.log(`✅ Payment JE: PAY-${pay.id} | ₹${pay.amount} | DR Cash | CR Accounts Receivable`);
        paymentJECreated++;
      }

      await client.query('COMMIT');
      console.log(`\n✅ Created ${incomeJECreated} invoice JEs and ${paymentJECreated} payment JEs`);

    } catch(e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    // Verify P&L now
    console.log('\n=== VERIFYING P&L DATA ===');
    const pnlData = await pool.query(`
      SELECT c.account_name, c.account_type,
             SUM(jl.debit) as debits, SUM(jl.credit) as credits
      FROM chart_of_accounts c
      JOIN journal_entry_lines jl ON c.id = jl.account_id
      JOIN journal_entries j ON jl.journal_entry_id = j.id
      WHERE c.user_id = $1 AND c.is_active = true AND c.account_type IN ('Income', 'Expense')
      GROUP BY c.id, c.account_name, c.account_type
      HAVING SUM(jl.debit) > 0 OR SUM(jl.credit) > 0
      ORDER BY c.account_type, c.account_name
    `, [userId]);

    let totalIncome = 0, totalExpense = 0;
    pnlData.rows.forEach(r => {
      if (r.account_type === 'Income') {
        const bal = parseFloat(r.credits) - parseFloat(r.debits);
        totalIncome += bal;
        console.log(`  INCOME: ${r.account_name} | ₹${bal}`);
      } else {
        const bal = parseFloat(r.debits) - parseFloat(r.credits);
        totalExpense += bal;
        console.log(`  EXPENSE: ${r.account_name} | ₹${bal}`);
      }
    });
    console.log(`\n  Total Income: ₹${totalIncome}`);
    console.log(`  Total Expenses: ₹${totalExpense}`);
    console.log(`  NET PROFIT: ₹${totalIncome - totalExpense}`);

    if (totalIncome - totalExpense > 0) {
      console.log(`\n✅ PROFITABLE! Net Profit = ₹${totalIncome - totalExpense}`);
    } else {
      console.log(`\n⚠️  Net Loss = ₹${Math.abs(totalIncome - totalExpense)}`);
    }

  } catch(e) {
    console.error('FATAL:', e.message, e.stack);
  }
  process.exit(0);
}
run();
