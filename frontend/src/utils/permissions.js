// src/utils/permissions.js

// Define available roles
export const ROLES = {
  ADMIN: 'Admin',
  ACCOUNTANT: 'Accountant',
  STAFF: 'Staff',
  VIEWER: 'Viewer',
};

// Define modules
export const MODULES = {
  CUSTOMERS: 'customers',
  VENDORS: 'vendors',
  ITEMS: 'items',
  QUOTES: 'quotes',
  INVOICES: 'invoices',
  BILLS: 'bills',
  EXPENSES: 'expenses',
  BANKING: 'banking',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  USERS: 'users',
  DASHBOARD: 'dashboard'
};

// Define actions
export const ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  SEND: 'send',
  EXPORT: 'export',
  IMPORT: 'import',
  MANAGE: 'manage',
};

// Map roles to their allowed permissions
export const PERMISSIONS = {
  [ROLES.ADMIN]: {
    _all: true
  },
  [ROLES.ACCOUNTANT]: {
    [MODULES.DASHBOARD]: [ACTIONS.VIEW],
    [MODULES.CUSTOMERS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE],
    [MODULES.VENDORS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE],
    [MODULES.ITEMS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE],
    [MODULES.QUOTES]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.SEND, ACTIONS.EXPORT],
    [MODULES.INVOICES]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.SEND, ACTIONS.EXPORT],
    [MODULES.BILLS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE],
    [MODULES.EXPENSES]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE],
    [MODULES.BANKING]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE, ACTIONS.IMPORT, ACTIONS.MANAGE],
    [MODULES.REPORTS]: [ACTIONS.VIEW, ACTIONS.EXPORT],
    [MODULES.SETTINGS]: [ACTIONS.VIEW], 
    [MODULES.USERS]: [ACTIONS.VIEW] 
  },
  [ROLES.STAFF]: {
    [MODULES.DASHBOARD]: [ACTIONS.VIEW],
    [MODULES.CUSTOMERS]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT],
    [MODULES.QUOTES]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.SEND],
    [MODULES.INVOICES]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.SEND],
    [MODULES.EXPENSES]: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT],
    [MODULES.ITEMS]: [ACTIONS.VIEW],
    [MODULES.REPORTS]: [ACTIONS.VIEW],
  },
  [ROLES.VIEWER]: {
    [MODULES.DASHBOARD]: [ACTIONS.VIEW],
    [MODULES.CUSTOMERS]: [ACTIONS.VIEW],
    [MODULES.VENDORS]: [ACTIONS.VIEW],
    [MODULES.ITEMS]: [ACTIONS.VIEW],
    [MODULES.QUOTES]: [ACTIONS.VIEW],
    [MODULES.INVOICES]: [ACTIONS.VIEW],
    [MODULES.BILLS]: [ACTIONS.VIEW],
    [MODULES.EXPENSES]: [ACTIONS.VIEW],
    [MODULES.BANKING]: [ACTIONS.VIEW],
    [MODULES.REPORTS]: [ACTIONS.VIEW],
    [MODULES.SETTINGS]: [],
    [MODULES.USERS]: []
  }
};

/**
 * Check if a role has access to a specific module and action
 * @param {string} role - User role (e.g., 'Admin')
 * @param {string} module - Module name (e.g., 'invoices')
 * @param {string} action - Action name (e.g., 'create')
 * @returns {boolean} True if allowed, false otherwise
 */
export const canAccess = (role, module, action) => {
  if (!role) return false;
  
  // Convert role to standard case (capitalized first letter)
  const normalizedRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

  // Admin has access to everything
  if (normalizedRole === ROLES.ADMIN) return true;

  const rolePermissions = PERMISSIONS[normalizedRole];
  if (!rolePermissions) return false;

  const modulePermissions = rolePermissions[module];
  if (!modulePermissions) return false;

  return modulePermissions.includes(action);
};
