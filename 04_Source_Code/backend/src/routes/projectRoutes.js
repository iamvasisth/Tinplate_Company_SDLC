const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getProjects, createProject } = require("../controllers/projectController");

router.get("/projects", authMiddleware, getProjects);
router.post("/projects", authMiddleware, createProject);

module.exports = router;
