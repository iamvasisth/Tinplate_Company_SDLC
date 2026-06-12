const express = require("express");
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');
const { MODULES, ACTIONS } = require('../config/permissions');
const { getTrialBalance, getProfitAndLoss, getBalanceSheet, getCashFlow, getCustomerAging, getVendorAging } = require("../controllers/reportsController");

router.get("/reports/trial-balance", authMiddleware, requirePermission(MODULES.REPORTS, ACTIONS.VIEW), getTrialBalance);
router.get("/reports/pnl", authMiddleware, requirePermission(MODULES.REPORTS, ACTIONS.VIEW), getProfitAndLoss);
router.get("/reports/balance-sheet", authMiddleware, requirePermission(MODULES.REPORTS, ACTIONS.VIEW), getBalanceSheet);
router.get("/reports/cash-flow", authMiddleware, requirePermission(MODULES.REPORTS, ACTIONS.VIEW), getCashFlow);
router.get("/reports/customer-aging", authMiddleware, requirePermission(MODULES.REPORTS, ACTIONS.VIEW), getCustomerAging);
router.get("/reports/vendor-aging", authMiddleware, requirePermission(MODULES.REPORTS, ACTIONS.VIEW), getVendorAging);

module.exports = router;
