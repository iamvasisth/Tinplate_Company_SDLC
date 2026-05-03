const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
} = require("../controllers/itemController");

// All routes require authentication
router.get("/items", authMiddleware, getItems);
router.get("/items/:id", authMiddleware, getItemById);
router.post("/items", authMiddleware, createItem);
router.put("/items/:id", authMiddleware, updateItem);
router.delete("/items/:id", authMiddleware, deleteItem);

module.exports = router;