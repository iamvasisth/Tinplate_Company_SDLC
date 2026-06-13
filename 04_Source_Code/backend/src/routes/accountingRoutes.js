const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getAccounts, getAccountById, createAccount, updateAccount, deleteAccount, getJournals, getJournalById, createJournal, updateJournal, deleteJournal, getProjectedPayments, getProjectedExpenses } = require("../controllers/accountingController");

router.get("/accounting/coa", authMiddleware, getAccounts);
router.get("/accounting/coa/:id", authMiddleware, getAccountById);
router.post("/accounting/coa", authMiddleware, createAccount);
router.put("/accounting/coa/:id", authMiddleware, updateAccount);
router.delete("/accounting/coa/:id", authMiddleware, deleteAccount);

router.get("/accounting/journals", authMiddleware, getJournals);
router.get("/accounting/journals/:id", authMiddleware, getJournalById);
router.post("/accounting/journals", authMiddleware, createJournal);
router.put("/accounting/journals/:id", authMiddleware, updateJournal);
router.delete("/accounting/journals/:id", authMiddleware, deleteJournal);

router.get("/accounts/projected-payments", authMiddleware, getProjectedPayments);
router.get("/accounts/projected-expenses", authMiddleware, getProjectedExpenses);

module.exports = router;
