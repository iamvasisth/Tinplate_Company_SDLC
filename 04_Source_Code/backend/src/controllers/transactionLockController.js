const pool = require("../config/db");

// ---- Ensure table exists ----
const initializeTransactionLocks = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transaction_locks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        lock_name VARCHAR(255) NOT NULL,
        lock_date DATE NOT NULL,
        reason TEXT,
        locked_modules JSONB NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.error("Transaction Locks DB Init Error:", err);
  }
};
initializeTransactionLocks();

const getTransactionLocks = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM transaction_locks WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ locks: result.rows });
  } catch (err) {
    console.error("GET TRANSACTION LOCKS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getActiveLock = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM transaction_locks WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
            [req.user.id]
        );
        res.json({ lock: result.rows[0] || null });
    } catch (err) {
        console.error("GET ACTIVE LOCK ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
}

const createTransactionLock = async (req, res) => {
  const { lock_name, lock_date, reason, locked_modules } = req.body;

  if (!lock_date || !locked_modules || !Array.isArray(locked_modules) || locked_modules.length === 0) {
    return res.status(400).json({ message: "Lock date and at least one module are required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Deactivate previous locks to keep only one active
    await client.query(`UPDATE transaction_locks SET is_active = false WHERE user_id = $1`, [req.user.id]);

    const result = await client.query(
      `INSERT INTO transaction_locks (user_id, lock_name, lock_date, reason, locked_modules, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, true, $6) RETURNING *`,
      [req.user.id, lock_name || `Lock to ${lock_date}`, lock_date, reason, JSON.stringify(locked_modules), req.user.id]
    );

    await client.query("COMMIT");
    res.json({ message: "Transaction lock applied", lock: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CREATE TRANSACTION LOCK ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

const deactivateLock = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `UPDATE transaction_locks SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *`,
            [id, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: "Lock not found" });
        res.json({ message: "Lock deactivated" });
    } catch (err) {
        console.error("DEACTIVATE LOCK ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
}

module.exports = {
  getTransactionLocks,
  getActiveLock,
  createTransactionLock,
  deactivateLock
};
