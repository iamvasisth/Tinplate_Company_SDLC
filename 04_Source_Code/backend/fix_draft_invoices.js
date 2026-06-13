require('dotenv').config();
const pool = require('./src/config/db');

async function fixDraftInvoices() {
  try {
    // Get the demo user
    const userRes = await pool.query(`SELECT id FROM users WHERE email = 'demo@tinplate.com' LIMIT 1`);
    if (userRes.rows.length === 0) {
      console.log('User demo@tinplate.com not found');
      process.exit(1);
    }
    const userId = userRes.rows[0].id;
    console.log('Found user ID:', userId);

    // Count draft invoices
    const countRes = await pool.query(`SELECT count(*) FROM invoices WHERE user_id = $1 AND status = 'draft'`, [userId]);
    console.log('Draft invoices count:', countRes.rows[0].count);

    // Show draft invoices
    const draftRes = await pool.query(
      `SELECT i.id, i.invoice_number, i.total_amount, c.display_name as customer_name 
       FROM invoices i 
       JOIN customers c ON i.customer_id = c.id
       WHERE i.user_id = $1 AND i.status = 'draft'
       ORDER BY i.created_at DESC`,
      [userId]
    );
    console.log('\nDraft invoices to be updated:');
    draftRes.rows.forEach(r => console.log(`  ${r.invoice_number} | ${r.customer_name} | ₹${r.total_amount}`));

    // Update all draft invoices to 'sent'
    const updateRes = await pool.query(
      `UPDATE invoices SET status = 'sent', updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $1 AND status = 'draft' 
       RETURNING invoice_number`,
      [userId]
    );
    console.log(`\nUpdated ${updateRes.rows.length} invoices from draft to sent`);

    // Verify
    const verifyRes = await pool.query(`SELECT status, count(*) FROM invoices WHERE user_id = $1 GROUP BY status`, [userId]);
    console.log('\nInvoice status counts after update:');
    verifyRes.rows.forEach(r => console.log(`  ${r.status}: ${r.count}`));

    // Also check that the 12 demo invoices exist (for our test data)
    const testRes = await pool.query(
      `SELECT i.id, i.invoice_number, i.status, i.total_amount, i.balance_due, c.display_name as customer_name 
       FROM invoices i 
       JOIN customers c ON i.customer_id = c.id
       WHERE i.user_id = $1 
       AND c.display_name IN ('Aman Kumar', 'Priya Singh', 'Rohit Sharma', 'Neha Kumari', 'Saurav Raj', 'Anjali Verma', 'Rahul Gupta', 'Sneha Das', 'Vikash Kumar', 'Pooja Sharma')
       ORDER BY i.created_at DESC`,
      [userId]
    );
    console.log('\n=== Demo invoices status ===');
    testRes.rows.forEach(r => console.log(`  ${r.customer_name} | ${r.invoice_number} | ${r.status} | Total: ${r.total_amount} | Due: ${r.balance_due}`));

  } catch(e) {
    console.error('ERROR:', e.message);
  }
  process.exit(0);
}
fixDraftInvoices();
