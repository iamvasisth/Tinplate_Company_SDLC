/**
 * businessModules.js – Business-specific dashboard modules
 * Each key is a business_type; value is an array of modules.
 */
const businessModules = {
  School: [
    { name: 'Students', path: '/students' },
    { name: 'Classes', path: '/classes' },
    { name: 'Fees', path: '/fees' },
  ],
  Hospital: [
    { name: 'Patients', path: '/patients' },
    { name: 'Appointments', path: '/appointments' },
    { name: 'Billing', path: '/billing' },
  ],
  Retail: [
    { name: 'Products', path: '/products' },
    { name: 'Orders', path: '/orders' },
    { name: 'POS', path: '/pos' },
  ],
  Manufacturing: [
    { name: 'Production', path: '/production' },
    { name: 'Inventory', path: '/inventory' },
    { name: 'Vendors', path: '/vendors' },
  ],
  Other: [
    { name: 'Contacts', path: '/contacts' },
    { name: 'Tasks', path: '/dashboard' },
  ],
};

export default businessModules;