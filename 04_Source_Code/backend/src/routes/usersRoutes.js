const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getUsers, getOrganizationSettings, updateOrganizationSettings, updateUserRole } = require("../controllers/usersController");

const { requirePermission } = require("../middleware/roleMiddleware");
const { MODULES, ACTIONS } = require("../config/permissions");

router.get("/users", authMiddleware, requirePermission(MODULES.USERS, ACTIONS.VIEW), getUsers);
router.put("/users/:id/role", authMiddleware, requirePermission(MODULES.USERS, ACTIONS.MANAGE), updateUserRole);

router.get("/organization-settings", authMiddleware, requirePermission(MODULES.SETTINGS, ACTIONS.VIEW), getOrganizationSettings);
router.put("/organization-settings", authMiddleware, requirePermission(MODULES.SETTINGS, ACTIONS.MANAGE), updateOrganizationSettings);

module.exports = router;