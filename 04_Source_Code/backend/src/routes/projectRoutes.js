const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectInvoices,
  getProjectExpenses,
  getProjectProfitability,
  getProjectTimesheets
} = require("../controllers/projectController");

router.get("/projects", authMiddleware, getProjects);
router.post("/projects", authMiddleware, createProject);
router.get("/projects/:id", authMiddleware, getProjectById);
router.put("/projects/:id", authMiddleware, updateProject);
router.delete("/projects/:id", authMiddleware, deleteProject);
router.patch("/projects/:id/cancel", authMiddleware, deleteProject); // same logic cancels if linked

// Sub-resources
router.get("/projects/:id/invoices", authMiddleware, getProjectInvoices);
router.get("/projects/:id/expenses", authMiddleware, getProjectExpenses);
router.get("/projects/:id/profitability", authMiddleware, getProjectProfitability);
router.get("/projects/:id/timesheets", authMiddleware, getProjectTimesheets);

module.exports = router;
