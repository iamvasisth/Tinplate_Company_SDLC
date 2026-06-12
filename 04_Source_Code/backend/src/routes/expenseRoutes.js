const express = require("express");
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');
const { MODULES, ACTIONS } = require('../config/permissions');
const {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
} = require("../controllers/expenseController");

router.get("/expenses", authMiddleware, requirePermission(MODULES.EXPENSES, ACTIONS.VIEW), getExpenses);
router.get("/expenses/:id", authMiddleware, requirePermission(MODULES.EXPENSES, ACTIONS.VIEW), getExpenseById);
router.post("/expenses", authMiddleware, requirePermission(MODULES.EXPENSES, ACTIONS.CREATE), createExpense);
router.put("/expenses/:id", authMiddleware, requirePermission(MODULES.EXPENSES, ACTIONS.EDIT), updateExpense);
router.delete("/expenses/:id", authMiddleware, requirePermission(MODULES.EXPENSES, ACTIONS.DELETE), deleteExpense);

module.exports = router;