const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/roleMiddleware");
const { MODULES, ACTIONS } = require("../config/permissions");

const {
  getRecurringExpenses,
  getRecurringExpenseById,
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
  updateStatus
} = require("../controllers/recurringExpenseController");

// Recurring expenses will fall under EXPENSES permissions for now
router.get("/recurring-expenses", authMiddleware, requirePermission(MODULES.EXPENSES, ACTIONS.VIEW), getRecurringExpenses);
router.get("/recurring-expenses/:id", authMiddleware, requirePermission(MODULES.EXPENSES, ACTIONS.VIEW), getRecurringExpenseById);
router.post("/recurring-expenses", authMiddleware, requirePermission(MODULES.EXPENSES, ACTIONS.CREATE), createRecurringExpense);
router.put("/recurring-expenses/:id", authMiddleware, requirePermission(MODULES.EXPENSES, ACTIONS.EDIT), updateRecurringExpense);
router.delete("/recurring-expenses/:id", authMiddleware, requirePermission(MODULES.EXPENSES, ACTIONS.DELETE), deleteRecurringExpense);
router.patch("/recurring-expenses/:id/status", authMiddleware, requirePermission(MODULES.EXPENSES, ACTIONS.EDIT), updateStatus);

// Convenience routes for pause, resume, stop
router.patch("/recurring-expenses/:id/pause", authMiddleware, requirePermission(MODULES.EXPENSES, ACTIONS.EDIT), (req, res) => {
  req.body.status = "Paused";
  return updateStatus(req, res);
});

router.patch("/recurring-expenses/:id/resume", authMiddleware, requirePermission(MODULES.EXPENSES, ACTIONS.EDIT), (req, res) => {
  req.body.status = "Active";
  return updateStatus(req, res);
});

router.patch("/recurring-expenses/:id/stop", authMiddleware, requirePermission(MODULES.EXPENSES, ACTIONS.EDIT), (req, res) => {
  req.body.status = "Stopped";
  return updateStatus(req, res);
});

module.exports = router;
