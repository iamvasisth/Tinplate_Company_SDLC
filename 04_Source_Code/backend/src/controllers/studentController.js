/**
 * studentController.js – CRUD operations for students
 * Dependencies: pool (db connection)
 */
const pool = require("../config/db");

// ================= GET ALL STUDENTS (for logged-in user) =================
const getStudents = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM students WHERE user_id = $1 ORDER BY id DESC",
      [req.user.id]
    );

    res.json({ students: result.rows });
  } catch (err) {
    console.error("GET STUDENTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= ADD STUDENT =================
const addStudent = async (req, res) => {
  const { name, class: className, section, parent_contact } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Student name is required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO students (name, class, section, parent_contact, user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, className, section, parent_contact, req.user.id]
    );

    res.json({
      message: "Student added",
      student: result.rows[0],
    });
  } catch (err) {
    console.error("ADD STUDENT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= EDIT STUDENT =================
const updateStudent = async (req, res) => {
  const { id } = req.params;
  const { name, class: className, section, parent_contact } = req.body;

  try {
    const result = await pool.query(
      `UPDATE students
       SET name = $1, class = $2, section = $3, parent_contact = $4
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [name, className, section, parent_contact, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({
      message: "Student updated",
      student: result.rows[0],
    });
  } catch (err) {
    console.error("UPDATE STUDENT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= DELETE STUDENT =================
const deleteStudent = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM students WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({ message: "Student deleted" });
  } catch (err) {
    console.error("DELETE STUDENT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getStudents,
  addStudent,
  updateStudent,
  deleteStudent,
};