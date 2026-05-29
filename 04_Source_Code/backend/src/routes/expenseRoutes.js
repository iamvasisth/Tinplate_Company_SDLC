const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
} = require("../controllers/expenseController");

router.get("/expenses", authMiddleware, getExpenses);
router.get("/expenses/:id", authMiddleware, getExpenseById);
router.post("/expenses", authMiddleware, createExpense);
router.put("/expenses/:id", authMiddleware, updateExpense);
router.delete("/expenses/:id", authMiddleware, deleteExpense);

module.exports = router;