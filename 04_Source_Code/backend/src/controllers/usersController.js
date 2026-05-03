const pool = require("../config/db");

const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email FROM users ORDER BY email"
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getUsers };