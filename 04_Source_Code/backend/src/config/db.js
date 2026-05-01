/**
 * db.js – Database connection pool (Neon DB)
 * Dependencies: pg, dotenv
 */
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // required for Neon
});

pool.on("error", (err) => {
  console.error("Unexpected DB pool error:", err);
  process.exit(-1);
});

module.exports = pool;