require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    // Check if demo user exists
    const res = await pool.query("SELECT id, email, role, business_type, organization_name FROM users WHERE email = $1", ['demo@tinplate.com']);
    
    if (res.rows.length === 0) {
      console.log('demo@tinplate.com does NOT exist. Creating now...');
      const hash = await bcrypt.hash('Demo@123', 10);
      const insert = await pool.query(
        `INSERT INTO users (email, password, role, business_type, organization_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role`,
        ['demo@tinplate.com', hash, 'Admin', 'Coaching / Training Center', 'Tinplate Computer Training Center']
      );
      console.log('Created user:', JSON.stringify(insert.rows[0]));
    } else {
      console.log('demo@tinplate.com EXISTS:');
      console.log(JSON.stringify(res.rows[0], null, 2));
      
      // Count data for this user
      const userId = res.rows[0].id;
      const [customers, items, quotes, invoices, payments, expenses] = await Promise.all([
        pool.query("SELECT COUNT(*) FROM customers WHERE user_id = $1", [userId]),
        pool.query("SELECT COUNT(*) FROM items WHERE user_id = $1", [userId]),
        pool.query("SELECT COUNT(*) FROM quotes WHERE user_id = $1", [userId]),
        pool.query("SELECT COUNT(*) FROM invoices WHERE user_id = $1", [userId]),
        pool.query("SELECT COUNT(*) FROM payments WHERE user_id = $1", [userId]),
        pool.query("SELECT COUNT(*) FROM expenses WHERE user_id = $1", [userId]),
      ]);
      console.log('\nData counts for user_id:', userId);
      console.log('Customers:', customers.rows[0].count);
      console.log('Items:', items.rows[0].count);
      console.log('Quotes:', quotes.rows[0].count);
      console.log('Invoices:', invoices.rows[0].count);
      console.log('Payments:', payments.rows[0].count);
      console.log('Expenses:', expenses.rows[0].count);
    }
  } catch(err) {
    console.error('ERROR:', err.message);
  } finally {
    await pool.end();
  }
}
main();
