const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getUsers } = require("../controllers/usersController");

router.get("/users", authMiddleware, getUsers);

module.exports = router;