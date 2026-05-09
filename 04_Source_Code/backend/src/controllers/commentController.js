const pool = require("../config/db"); // ensure pool is imported

// Get comments for a customer
const getComments = async (req, res) => {
  const { customerId } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM customer_comments WHERE customer_id = $1 ORDER BY created_at DESC`,
      [customerId],
    );
    res.json({ comments: result.rows });
  } catch (err) {
    console.error("GET COMMENTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Add a comment
const addComment = async (req, res) => {
  const { addActivityLog } = require("./activityController");

  const { customerId } = req.params;
  const { comment_text } = req.body;
  const author_name = req.user.email; // or a display name if you have one
  try {
    const result = await pool.query(
      `INSERT INTO customer_comments (customer_id, user_id, comment_text, author_name)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [customerId, req.user.id, comment_text, author_name],
    );
    await addActivityLog(
      customerId,
      req.user.id,
      req.user.email,
      "comment_added",
      `Comment: "${comment_text}"`,
    );
    res.json({ comment: result.rows[0] });
    await pool.query(
      `INSERT INTO customer_activity_log (customer_id, user_id, action_type, description)
   VALUES ($1, $2, 'comment_added', $3)`,
      [req.params.customerId, req.user.id, `Commented: ${comment_text}`],
    );
  } catch (err) {
    console.error("ADD COMMENT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getComments, addComment };
