const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getInvoicesByCustomer } = require("../controllers/invoiceController");

router.get("/customers/:customerId/invoices", authMiddleware, getInvoicesByCustomer);

module.exports = router;