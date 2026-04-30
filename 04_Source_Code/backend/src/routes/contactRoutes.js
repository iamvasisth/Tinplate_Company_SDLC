const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  getContacts,
  addContact,
  deleteContact,
} = require("../controllers/contactController");

// GET all contacts
router.get("/contacts", authMiddleware, getContacts);

// ADD contact
router.post("/contacts", authMiddleware, addContact);

// DELETE contact
router.delete("/contacts/:id", authMiddleware, deleteContact);

module.exports = router;