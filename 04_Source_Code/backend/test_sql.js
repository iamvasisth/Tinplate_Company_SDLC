require('dotenv').config();
const pool = require('./src/config/db');

async function checkTestUsers() {
  try {
    const res = await pool.query("SELECT email, role, business_type FROM users WHERE email IN ('admin@test.com', 'accountant@test.com', 'staff@test.com', 'viewer@test.com', 'pritishakumari@gmail.com')");
    console.log(res.rows);
  } catch (err) {
    console.error("SQL Error:", err);
  } finally {
    process.exit(0);
  }
}
checkTestUsers();
