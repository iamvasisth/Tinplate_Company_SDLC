const express = require("express");
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');
const { MODULES, ACTIONS } = require('../config/permissions');
const {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
} = require("../controllers/vendorController");

router.get("/vendors",     authMiddleware, requirePermission(MODULES.VENDORS, ACTIONS.VIEW), getVendors);
router.get("/vendors/:id", authMiddleware, requirePermission(MODULES.VENDORS, ACTIONS.VIEW), getVendorById);
router.post("/vendors",    authMiddleware, requirePermission(MODULES.VENDORS, ACTIONS.CREATE), createVendor);
router.put("/vendors/:id", authMiddleware, requirePermission(MODULES.VENDORS, ACTIONS.EDIT), updateVendor);
router.delete("/vendors/:id", authMiddleware, requirePermission(MODULES.VENDORS, ACTIONS.DELETE), deleteVendor);

module.exports = router;
