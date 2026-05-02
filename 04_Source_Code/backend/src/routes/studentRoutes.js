/**
 * studentRoutes.js – Routes for student CRUD
 * Dependencies: express, authMiddleware, studentController
 */
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  getStudents,
  addStudent,
  updateStudent,
  deleteStudent,
} = require("../controllers/studentController");

// GET all students for logged-in user
router.get("/students", authMiddleware, getStudents);

// ADD student
router.post("/students", authMiddleware, addStudent);

// EDIT student
router.put("/students/:id", authMiddleware, updateStudent);

// DELETE student
router.delete("/students/:id", authMiddleware, deleteStudent);

module.exports = router;