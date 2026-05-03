const pool = require("../config/db");

// GET activity log for a customer
const getActivityLog = async (req, res) => {
  const { customerId } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM customer_activity_log
       WHERE customer_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [customerId]
    );
    res.json({ activities: result.rows });
  } catch (err) {
    console.error("GET ACTIVITY LOG ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Helper to insert a log entry (used internally by other controllers)
const addActivityLog = async (customerId, userId, actorName, eventType, description) => {
  try {
    await pool.query(
      `INSERT INTO customer_activity_log (customer_id, user_id, actor_name, event_type, event_description)
       VALUES ($1, $2, $3, $4, $5)`,
      [customerId, userId, actorName, eventType, description]
    );
  } catch (err) {
    console.error("ADD ACTIVITY LOG ERROR:", err);
  }
};

module.exports = { getActivityLog, addActivityLog };