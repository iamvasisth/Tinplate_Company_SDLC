const express = require("express");
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');
const { MODULES, ACTIONS } = require('../config/permissions');
const {
  getAccounts, createAccount, deleteAccount,
  getTransactions, addTransaction,
  getReconciliations, createReconciliation, reconcileBulkTransactions
} = require("../controllers/bankController");

router.get("/bank/accounts", authMiddleware, requirePermission(MODULES.BANKING, ACTIONS.VIEW), getAccounts);
router.post("/bank/accounts", authMiddleware, requirePermission(MODULES.BANKING, ACTIONS.CREATE), createAccount);
router.delete("/bank/accounts/:id", authMiddleware, requirePermission(MODULES.BANKING, ACTIONS.DELETE), deleteAccount);

router.get("/bank/accounts/:accountId/transactions", authMiddleware, requirePermission(MODULES.BANKING, ACTIONS.VIEW), getTransactions);
router.post("/bank/accounts/:accountId/transactions", authMiddleware, requirePermission(MODULES.BANKING, ACTIONS.CREATE), addTransaction);

// Reconciliation Routes
router.get("/bank/reconciliation/:bankAccountId", authMiddleware, requirePermission(MODULES.BANKING, ACTIONS.VIEW), getReconciliations);
router.post("/bank/reconciliation", authMiddleware, requirePermission(MODULES.BANKING, ACTIONS.CREATE), createReconciliation);
router.put("/bank/transactions/reconcile-bulk", authMiddleware, requirePermission(MODULES.BANKING, ACTIONS.EDIT), reconcileBulkTransactions);

module.exports = router;