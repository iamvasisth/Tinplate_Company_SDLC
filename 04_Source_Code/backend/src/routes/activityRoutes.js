const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getActivityLog } = require("../controllers/activityController");

router.get("/customers/:customerId/activities", authMiddleware, getActivityLog);

module.exports = router;