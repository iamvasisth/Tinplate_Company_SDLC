require('dotenv').config();
const pool = require('./src/config/db');

async function fixUsersTable() {
  try {
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    console.log("created_at added");
  } catch (err) {
    console.error("SQL Error:", err);
  } finally {
    process.exit(0);
  }
}
fixUsersTable();
