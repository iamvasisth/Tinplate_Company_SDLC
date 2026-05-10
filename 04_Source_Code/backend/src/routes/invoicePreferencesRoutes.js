const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getPreferences, savePreferences } = require("../controllers/invoicePreferencesController");

router.get("/invoice-preferences", authMiddleware, getPreferences);
router.post("/invoice-preferences", authMiddleware, savePreferences);

module.exports = router;