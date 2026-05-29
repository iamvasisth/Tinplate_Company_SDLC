const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getAccounts, createAccount, deleteAccount,
  getTransactions, addTransaction,
} = require("../controllers/bankController");

router.get("/bank/accounts", authMiddleware, getAccounts);
router.post("/bank/accounts", authMiddleware, createAccount);
router.delete("/bank/accounts/:id", authMiddleware, deleteAccount);

router.get("/bank/accounts/:accountId/transactions", authMiddleware, getTransactions);
router.post("/bank/accounts/:accountId/transactions", authMiddleware, addTransaction);

module.exports = router;