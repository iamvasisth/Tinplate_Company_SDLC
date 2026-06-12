const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const authMiddleware = require("../middleware/authMiddleware");

// All routes are mounted under /api/dashboard in index.js, so authMiddleware is usually applied there.
// But we can apply it again or just rely on index.js.
router.get("/finance-summary", authMiddleware, dashboardController.getFinanceSummary);
router.get("/monthly-finance-summary", authMiddleware, dashboardController.getMonthlyFinanceSummary);

module.exports = router;
