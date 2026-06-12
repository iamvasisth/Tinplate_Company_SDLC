const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  getTransactionLocks,
  getActiveLock,
  createTransactionLock,
  deactivateLock
} = require("../controllers/transactionLockController");

router.get("/transaction-locks", authMiddleware, getTransactionLocks);
router.get("/transaction-locks/active", authMiddleware, getActiveLock);
router.post("/transaction-locks", authMiddleware, createTransactionLock);
router.patch("/transaction-locks/:id/deactivate", authMiddleware, deactivateLock);

module.exports = router;
