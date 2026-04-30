const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");



// ✅ GET all tasks (dynamic, DB based — no hardcoding)
router.get("/tasks", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, user_id, created_at FROM tasks WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );

    res.json({
      message: "Tasks fetched",
      tasks: result.rows
    });

  } catch (err) {
    console.error("GET TASKS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ CREATE task (no hardcoded values)
router.post("/tasks", authMiddleware, async (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ message: "Task title required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *",
      [title, req.user.id]
    );

    res.json({
      message: "Task created",
      task: result.rows[0]
    });

  } catch (err) {
    console.error("CREATE TASK ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Tasks
router.put("/tasks/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;

  try {
    const result = await pool.query(
      "UPDATE tasks SET title = $1 WHERE id = $2 AND user_id = $3 RETURNING *",
      [title, id, req.user.id]
    );

    res.json({
      message: "Task updated",
      task: result.rows[0]
    });

  } catch (err) {
    console.error("UPDATE TASK ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ DELETE task
router.delete("/tasks/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(
      "DELETE FROM tasks WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    res.json({ message: "Task deleted" });

  } catch (err) {
    console.error("DELETE TASK ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;