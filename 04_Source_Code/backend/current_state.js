require('dotenv').config();
const pool = require('./src/config/db');

async function run() {
  try {
    // Get user
    const userRes = await pool.query(`SELECT id, email, full_name FROM users WHERE email = 'demo@tinplate.com' LIMIT 1`);
    if (userRes.rows.length === 0) { console.log('USER NOT FOUND'); process.exit(1); }
    const user = userRes.rows[0];
    const userId = user.id;
    console.log(`\n=== USER ===`);
    console.log(`ID: ${userId} | Email: ${user.email} | Name: ${user.full_name}`);

    // Customers
    const cust = await pool.query(`SELECT id, display_name, email, first_name, last_name FROM customers WHERE user_id = $1 ORDER BY id`, [userId]);
    console.log(`\n=== CUSTOMERS (${cust.rows.length}) ===`);
    cust.rows.forEach(c => console.log(`  ${c.id}: ${c.display_name || c.first_name + ' ' + c.last_name || c.email}`));

    // Items
    const items = await pool.query(`SELECT id, name, selling_price FROM items WHERE user_id = $1 ORDER BY id`, [userId]);
    console.log(`\n=== ITEMS (${items.rows.length}) ===`);
    items.rows.forEach(i => console.log(`  ${i.id}: ${i.name} - ₹${i.selling_price}`));

    // Quotes
    const quotes = await pool.query(`
      SELECT q.id, q.quote_number, q.status, q.total_amount, c.display_name as customer_name
      FROM quotes q LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.user_id = $1 ORDER BY q.id`, [userId]);
    console.log(`\n=== QUOTES (${quotes.rows.length}) ===`);
    quotes.rows.forEach(q => console.log(`  ${q.id}: ${q.quote_number} | ${q.customer_name} | ₹${q.total_amount} | ${q.status}`));

    // Invoices
    const invoices = await pool.query(`
      SELECT i.id, i.invoice_number, i.status, i.total_amount, i.balance_due, c.display_name as customer_name
      FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.user_id = $1 ORDER BY i.id`, [userId]);
    console.log(`\n=== INVOICES (${invoices.rows.length}) ===`);
    invoices.rows.forEach(i => console.log(`  ${i.id}: ${i.invoice_number} | ${i.customer_name} | ₹${i.total_amount} | Due: ₹${i.balance_due} | ${i.status}`));

    // Payments
    const pay = await pool.query(`
      SELECT p.id, p.amount, p.payment_date, i.invoice_number
      FROM payments p LEFT JOIN invoices i ON p.invoice_id = i.id
      WHERE p.user_id = $1 ORDER BY p.id`, [userId]);
    console.log(`\n=== PAYMENTS (${pay.rows.length}) ===`);
    pay.rows.forEach(p => console.log(`  ${p.id}: ₹${p.amount} on ${p.payment_date} for ${p.invoice_number}`));

    // Expenses
    const exp = await pool.query(`SELECT id, category, amount, expense_date FROM expenses WHERE user_id = $1 ORDER BY id`, [userId]);
    console.log(`\n=== EXPENSES (${exp.rows.length}) ===`);
    exp.rows.forEach(e => console.log(`  ${e.id}: ${e.category} - ₹${e.amount} on ${e.expense_date}`));
    const totalExp = exp.rows.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    console.log(`  TOTAL EXPENSES: ₹${totalExp}`);

    // Summary
    console.log(`\n=== SUMMARY ===`);
    console.log(`Customers: ${cust.rows.length}`);
    console.log(`Items: ${items.rows.length}`);
    console.log(`Quotes: ${quotes.rows.length}`);
    console.log(`Invoices: ${invoices.rows.length}`);
    console.log(`Payments: ${pay.rows.length}`);
    console.log(`Expenses: ${exp.rows.length}`);

  } catch(e) {
    console.error('ERROR:', e.message, e.stack);
  }
  process.exit(0);
}
run();
