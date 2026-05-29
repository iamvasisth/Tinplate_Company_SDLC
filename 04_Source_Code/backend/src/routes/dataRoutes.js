const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

// sample protected data
router.get("/stats", authMiddleware, async (req, res) => {
  res.json({
    message: "Dashboard data",
    data: {
      users: 10,
      revenue: 5000,
      tasks: 7
    }
  });
});

module.exports = router;