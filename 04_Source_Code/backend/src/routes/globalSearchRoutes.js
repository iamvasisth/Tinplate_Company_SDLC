const express = require("express");
const router = express.Router();
const globalSearchController = require("../controllers/globalSearchController");

// Global search route
// GET /api/search?q=query
router.get("/", globalSearchController.globalSearch);

module.exports = router;
