const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getComments, addComment } = require("../controllers/commentController");

router.get("/customers/:customerId/comments", authMiddleware, getComments);
router.post("/customers/:customerId/comments", authMiddleware, addComment);

module.exports = router;