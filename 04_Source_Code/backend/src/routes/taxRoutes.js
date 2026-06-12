const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getTaxes,
  getTaxById,
  createTax,
  updateTax,
  deleteTax,
} = require("../controllers/taxController");

router.get("/taxes",     authMiddleware, getTaxes);
router.get("/taxes/:id", authMiddleware, getTaxById);
router.post("/taxes",    authMiddleware, createTax);
router.put("/taxes/:id", authMiddleware, updateTax);
router.delete("/taxes/:id", authMiddleware, deleteTax);

module.exports = router;
