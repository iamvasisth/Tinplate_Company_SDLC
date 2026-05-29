const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET all tasks
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM public.tasks WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Tasks GET error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST new task
router.post('/', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: 'Title required' });

    const result = await pool.query(
      'INSERT INTO public.tasks (title, user_id) VALUES ($1, $2) RETURNING *',
      [title, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Tasks POST error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE task
router.delete('/:id', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM public.tasks WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('Tasks DELETE error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title } = req.body;
    const result = await pool.query(
      'UPDATE public.tasks SET title = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [title, req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Tasks PUT error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;