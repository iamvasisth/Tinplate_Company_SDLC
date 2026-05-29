const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getSalespersons, createSalesperson } = require("../controllers/salespersonController");

router.get("/salespersons", authMiddleware, getSalespersons);
router.post("/salespersons", authMiddleware, createSalesperson);

module.exports = router;
