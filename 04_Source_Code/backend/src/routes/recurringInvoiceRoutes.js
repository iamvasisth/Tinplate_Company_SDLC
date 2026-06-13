const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  getRecurringInvoices,
  getRecurringInvoiceById,
  createRecurringInvoice,
  updateRecurringInvoice,
  pauseRecurringInvoice,
  resumeRecurringInvoice,
  stopRecurringInvoice,
  getGeneratedInvoices,
  generateNow
} = require("../controllers/recurringInvoiceController");

router.get("/recurring-invoices", authMiddleware, getRecurringInvoices);
router.post("/recurring-invoices", authMiddleware, createRecurringInvoice);
router.get("/recurring-invoices/:id", authMiddleware, getRecurringInvoiceById);
router.put("/recurring-invoices/:id", authMiddleware, updateRecurringInvoice);

router.patch("/recurring-invoices/:id/pause", authMiddleware, pauseRecurringInvoice);
router.patch("/recurring-invoices/:id/resume", authMiddleware, resumeRecurringInvoice);
router.patch("/recurring-invoices/:id/stop", authMiddleware, stopRecurringInvoice);

router.post("/recurring-invoices/:id/generate-now", authMiddleware, generateNow);
router.get("/recurring-invoices/:id/generated-invoices", authMiddleware, getGeneratedInvoices);

module.exports = router;
