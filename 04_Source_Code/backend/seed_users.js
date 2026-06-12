require('dotenv').config();
const pool = require('./src/config/db');
const bcrypt = require('bcrypt');

async function seedUsers() {
  const users = [
    { email: 'admin@test.com', role: 'Admin' },
    { email: 'accountant@test.com', role: 'Accountant' },
    { email: 'staff@test.com', role: 'Staff' },
    { email: 'viewer@test.com', role: 'Viewer' }
  ];

  try {
    const hashedPassword = await bcrypt.hash('Password123', 10);
    for (const u of users) {
      const res = await pool.query('SELECT * FROM users WHERE email = $1', [u.email]);
      if (res.rows.length === 0) {
        await pool.query(
          `INSERT INTO users (email, password, business_type, organization_name, role) 
           VALUES ($1, $2, $3, $4, $5)`,
          [u.email, hashedPassword, 'Other', 'Test Org', u.role]
        );
        console.log(`Created ${u.email} as ${u.role}`);
      } else {
        await pool.query('UPDATE users SET role = $1, password = $2 WHERE email = $3', [u.role, hashedPassword, u.email]);
        console.log(`Updated ${u.email} to ${u.role}`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

seedUsers();
