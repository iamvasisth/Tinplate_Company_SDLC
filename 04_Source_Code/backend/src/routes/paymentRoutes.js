const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { recordPayment, getPayments, getAllPayments } = require("../controllers/paymentController");

router.post("/invoices/:id/payments", authMiddleware, recordPayment);
router.get("/invoices/:id/payments", authMiddleware, getPayments);
router.get("/payments", authMiddleware, getAllPayments);

module.exports = router;