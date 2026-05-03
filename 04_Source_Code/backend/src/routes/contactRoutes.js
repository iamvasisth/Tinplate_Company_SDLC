const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  getContacts,
  addContact,
  deleteContact,
  updateContact,
} = require("../controllers/contactController");

// GET all contacts
router.get("/contacts", authMiddleware, getContacts);

// ADD contact
router.post("/contacts", authMiddleware, addContact);

// DELETE contact
router.delete("/contacts/:id", authMiddleware, deleteContact);

// UPDATE contact
router.put("/contacts/:id", authMiddleware, updateContact);


module.exports = router;