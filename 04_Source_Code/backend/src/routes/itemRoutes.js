/**
 * itemRoutes.js – Inventory item endpoints
 * Dependencies: authMiddleware, itemController
 */
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getItems,
  addItem,
  updateItem,
  deleteItem
} = require("../controllers/itemController");

router.get("/items", authMiddleware, getItems);
router.post("/items", authMiddleware, addItem);
router.put("/items/:id", authMiddleware, updateItem);
router.delete("/items/:id", authMiddleware, deleteItem);

module.exports = router;