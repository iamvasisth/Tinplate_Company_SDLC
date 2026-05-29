/**
 * projectController.js – CRUD for projects
 * Dependencies: pool
 */
const pool = require("../config/db");

// Auto-create table if not exists
const ensureTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      project_name VARCHAR(255) NOT NULL,
      customer_id INTEGER,
      start_date DATE,
      end_date DATE,
      description TEXT,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// GET all projects for logged-in user
const getProjects = async (req, res) => {
  try {
    await ensureTable();
    const result = await pool.query(
      `SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ projects: result.rows });
  } catch (err) {
    console.error("GET PROJECTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// CREATE project
const createProject = async (req, res) => {
  const { project_name, customer_id, start_date, end_date, description, status } = req.body;
  if (!project_name) {
    return res.status(400).json({ message: "Project name is required" });
  }
  try {
    await ensureTable();
    const result = await pool.query(
      `INSERT INTO projects (user_id, project_name, customer_id, start_date, end_date, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        req.user.id,
        project_name,
        customer_id || null,
        start_date || null,
        end_date || null,
        description || null,
        status || "active",
      ]
    );
    res.json({ message: "Project created", project: result.rows[0] });
  } catch (err) {
    console.error("CREATE PROJECT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getProjects, createProject };
