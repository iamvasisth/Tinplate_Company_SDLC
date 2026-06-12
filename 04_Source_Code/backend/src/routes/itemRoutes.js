const express = require("express");
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');
const { MODULES, ACTIONS } = require('../config/permissions');
const {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
} = require("../controllers/itemController");

// All routes require authentication
router.get("/items", authMiddleware, requirePermission(MODULES.ITEMS, ACTIONS.VIEW), getItems);
router.get("/items/:id", authMiddleware, requirePermission(MODULES.ITEMS, ACTIONS.VIEW), getItemById);
router.post("/items", authMiddleware, requirePermission(MODULES.ITEMS, ACTIONS.CREATE), createItem);
router.put("/items/:id", authMiddleware, requirePermission(MODULES.ITEMS, ACTIONS.EDIT), updateItem);
router.delete("/items/:id", authMiddleware, requirePermission(MODULES.ITEMS, ACTIONS.DELETE), deleteItem);

module.exports = router;