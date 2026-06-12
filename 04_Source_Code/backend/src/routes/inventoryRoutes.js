const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getInventoryMovements, getMovementById, getItemMovements, createMovement } = require("../controllers/inventoryController");

router.get("/inventory/movements", authMiddleware, getInventoryMovements);
router.get("/inventory/movements/:id", authMiddleware, getMovementById);
router.get("/inventory/items/:itemId/movements", authMiddleware, getItemMovements);
router.post("/inventory/movements", authMiddleware, createMovement);

module.exports = router;
