const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  getTimesheets,
  getTimesheetById,
  createTimesheet,
  updateTimesheet,
  cancelTimesheet,
  approveTimesheet,
  convertToInvoice
} = require("../controllers/timesheetController");

router.get("/timesheets", authMiddleware, getTimesheets);
router.post("/timesheets", authMiddleware, createTimesheet);
router.get("/timesheets/:id", authMiddleware, getTimesheetById);
router.put("/timesheets/:id", authMiddleware, updateTimesheet);
router.patch("/timesheets/:id/cancel", authMiddleware, cancelTimesheet);
router.patch("/timesheets/:id/approve", authMiddleware, approveTimesheet);
router.post("/timesheets/:id/convert-to-invoice", authMiddleware, convertToInvoice);

module.exports = router;
