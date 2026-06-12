const { Pool } = require('pg');

// Use SSL only when DATABASE_URL indicates it (e.g. Neon cloud uses sslmode=require)
const sslConfig = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require')
  ? { rejectUnauthorized: false }
  : false;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
});

module.exports = pool;