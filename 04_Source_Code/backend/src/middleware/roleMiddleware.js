const { canAccess } = require('../config/permissions');

/**
 * Middleware to require a specific set of roles
 * @param  {...string} roles - Allowed roles (e.g., 'Admin', 'Accountant')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: "Access denied. No role assigned." });
    }

    const normalizedRole = req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1).toLowerCase();

    if (!roles.includes(normalizedRole)) {
      return res.status(403).json({ message: "Access denied. You do not have permission to perform this action." });
    }

    next();
  };
};

/**
 * Middleware to require specific permission based on module and action
 * @param {string} module - Module name (e.g., 'invoices')
 * @param {string} action - Action name (e.g., 'create')
 */
const requirePermission = (module, action) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: "Access denied. No role assigned." });
    }

    if (canAccess(req.user.role, module, action)) {
      next();
    } else {
      res.status(403).json({ message: "Access denied. You do not have permission to perform this action." });
    }
  };
};

module.exports = {
  requireRole,
  requirePermission
};
