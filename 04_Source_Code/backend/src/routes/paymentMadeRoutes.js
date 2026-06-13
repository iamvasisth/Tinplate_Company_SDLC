const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getAllPaymentsMade, getPaymentMadeById, createPaymentMade, deletePaymentMade } = require("../controllers/paymentMadeController");

router.get("/payments-made", authMiddleware, getAllPaymentsMade);
router.get("/payments-made/:id", authMiddleware, getPaymentMadeById);
router.post("/payments-made", authMiddleware, createPaymentMade);
router.delete("/payments-made/:id", authMiddleware, deletePaymentMade);

module.exports = router;
