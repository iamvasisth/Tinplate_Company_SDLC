const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  getModules,
  getLogs,
  previewBulkUpdate,
  applyBulkUpdate
} = require("../controllers/bulkUpdateController");

router.get("/bulk-updates/modules", authMiddleware, getModules);
router.get("/bulk-updates/logs", authMiddleware, getLogs);
router.post("/bulk-updates/preview", authMiddleware, previewBulkUpdate);
router.post("/bulk-updates/apply", authMiddleware, applyBulkUpdate);

module.exports = router;
