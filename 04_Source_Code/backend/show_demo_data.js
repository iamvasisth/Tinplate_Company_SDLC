require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const userId = 128;
  try {
    const items = await pool.query("SELECT id, name, selling_price FROM items WHERE user_id = $1 ORDER BY id", [userId]);
    console.log('\n=== EXISTING ITEMS ===');
    items.rows.forEach(i => console.log(`ID:${i.id} | ${i.name} | ₹${i.selling_price}`));

    const invoices = await pool.query("SELECT id, invoice_number, total_amount, status, quote_id FROM invoices WHERE user_id = $1 ORDER BY id", [userId]);
    console.log('\n=== EXISTING INVOICES (prior test data) ===');
    invoices.rows.forEach(i => console.log(`ID:${i.id} | ${i.invoice_number} | ₹${i.total_amount} | ${i.status} | quote_id:${i.quote_id||'DIRECT'}`));

    const expenses = await pool.query("SELECT id, description, amount FROM expenses WHERE user_id = $1 ORDER BY id", [userId]);
    console.log('\n=== EXISTING EXPENSES ===');
    expenses.rows.forEach(e => console.log(`ID:${e.id} | ${e.description} | ₹${e.amount}`));

    const payments = await pool.query("SELECT id, amount, payment_mode FROM payments WHERE user_id = $1 ORDER BY id", [userId]);
    console.log('\n=== EXISTING PAYMENTS ===');
    payments.rows.forEach(p => console.log(`ID:${p.id} | ₹${p.amount} | ${p.payment_mode}`));
    
  } catch(err) {
    console.error('ERROR:', err.message);
  } finally {
    await pool.end();
  }
}
main();
