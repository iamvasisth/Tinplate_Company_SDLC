/**
 * add_payments.js
 * Adds payments against the 16 quote-based invoices using correct schema.
 * payments table columns: invoice_id, user_id, customer_id, amount, payment_date, payment_mode, reference, notes
 */

require('dotenv').config();
const pool = require('./src/config/db');

const DEMO_EMAIL = 'demo@tinplate.com';

const PAYMENTS = [
  // Fully paid
  { customer: 'Aman Kumar',     amount: 25000 },
  { customer: 'Priya Singh',    amount: 10000 },
  { customer: 'Neha Kumari',    amount: 5000  },
  { customer: 'Saurav Raj',     amount: 9000  },
  { customer: 'Anjali Verma',   amount: 8000  },
  { customer: 'Pooja Sharma',   amount: 7000  },
  { customer: 'Riya Kumari',    amount: 22000 },
  { customer: 'Aditya Raj',     amount: 18000 },
  { customer: 'Simran Kaur',    amount: 16000 },
  { customer: 'Nisha Singh',    amount: 12000 },
  { customer: 'Abhishek Kumar', amount: 25000 },
  // Partially paid
  { customer: 'Rohit Sharma',   amount: 10000 }, // out of 15000
  { customer: 'Rahul Gupta',    amount: 12000 }, // out of 18000
  { customer: 'Harsh Verma',    amount: 7000  }, // out of 11000
  { customer: 'Muskan Sharma',  amount: 10000 }, // out of 18000
  // Sneha Das: unpaid (no entry)
];

async function run() {
  try {
    const userRes = await pool.query(`SELECT id FROM users WHERE email = $1`, [DEMO_EMAIL]);
    const userId = userRes.rows[0].id;
    const today = new Date().toISOString().slice(0, 10);

    // Load all quote-based invoices with customer info
    const invoicesRes = await pool.query(`
      SELECT i.id, i.invoice_number, i.customer_id, i.total_amount, i.balance_due, i.status, c.display_name
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.user_id = $1 AND i.quote_id IS NOT NULL
      ORDER BY i.id
    `, [userId]);
    
    console.log(`Found ${invoicesRes.rows.length} quote-based invoices`);
    const invoiceByCustomer = {};
    invoicesRes.rows.forEach(i => { invoiceByCustomer[i.display_name] = i; });

    const results = [];

    for (const payment of PAYMENTS) {
      const invoice = invoiceByCustomer[payment.customer];
      if (!invoice) {
        console.log(`❌ No quote-invoice found for: ${payment.customer}`);
        results.push({ customer: payment.customer, status: 'FAILED - no invoice' });
        continue;
      }

      const currentBalance = parseFloat(invoice.balance_due);
      if (payment.amount > currentBalance) {
        console.log(`⚠️  ${payment.customer}: Overpayment blocked (₹${payment.amount} > balance ₹${currentBalance})`);
        results.push({ customer: payment.customer, status: `SKIPPED - overpayment (balance: ₹${currentBalance})` });
        continue;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Insert payment using correct schema
        await client.query(
          `INSERT INTO payments (invoice_id, user_id, customer_id, amount, payment_date, payment_mode, reference, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [invoice.id, userId, invoice.customer_id, payment.amount, today, 'bank_transfer', `PAY-${Date.now()}`, 'Quote-based payment']
        );

        // Update invoice balance
        const newBalance = currentBalance - payment.amount;
        const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid';
        await client.query(
          `UPDATE invoices SET balance_due = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
          [newBalance, newStatus, invoice.id]
        );

        await client.query('COMMIT');
        console.log(`✅ ${payment.customer}: ₹${payment.amount} paid | Balance: ₹${newBalance} | Status: ${newStatus}`);
        results.push({ customer: payment.customer, paid: payment.amount, remaining: newBalance, status: newStatus });
        // Update local cache
        invoice.balance_due = newBalance;
      } catch(err) {
        await client.query('ROLLBACK');
        console.error(`❌ FAILED: ${payment.customer} - ${err.message}`);
        results.push({ customer: payment.customer, status: `FAILED - ${err.message}` });
      } finally {
        client.release();
      }
    }

    // Final summary
    console.log('\n=== PAYMENT SUMMARY ===');
    results.forEach(r => console.log(`  ${r.customer}: ${r.status || r.status} ${r.paid ? '₹' + r.paid + ' paid, ₹' + r.remaining + ' remaining' : ''}`));

    const totals = await pool.query(`
      SELECT 
        COUNT(*) as count,
        SUM(amount) as total
      FROM payments WHERE user_id = $1
    `, [userId]);
    
    const invSummary = await pool.query(`
      SELECT status, COUNT(*) as count, SUM(total_amount) as total, SUM(balance_due) as pending
      FROM invoices WHERE user_id = $1 AND quote_id IS NOT NULL
      GROUP BY status ORDER BY status
    `, [userId]);

    console.log(`\nTotal payments: ${totals.rows[0].count} | Total collected: ₹${totals.rows[0].total}`);
    console.log('\n=== QUOTE-BASED INVOICE STATUS ===');
    invSummary.rows.forEach(r => console.log(`  ${r.status}: ${r.count} invoices | Total: ₹${r.total} | Pending: ₹${r.pending}`));

  } catch(e) {
    console.error('FATAL:', e.message);
  }
  process.exit(0);
}
run();
