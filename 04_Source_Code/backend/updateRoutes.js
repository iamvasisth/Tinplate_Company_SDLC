const fs = require('fs');
const path = require('path');
const routesDir = path.join(__dirname, 'src', 'routes');
const files = ['customerRoutes.js', 'vendorRoutes.js', 'itemRoutes.js', 'quoteRoutes.js', 'invoiceRoutes.js', 'billRoutes.js', 'expenseRoutes.js', 'bankRoutes.js', 'reportsRoutes.js'];

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add imports
    if (!content.includes('requirePermission')) {
      content = content.replace(
        /const authMiddleware = require\([^)]+\);/,
        "const authMiddleware = require('../middleware/authMiddleware');\nconst { requirePermission } = require('../middleware/roleMiddleware');\nconst { MODULES, ACTIONS } = require('../config/permissions');"
      );
    }

    // Determine module name
    let moduleName = 'MODULES.DASHBOARD'; // Default
    if (file.includes('customer')) moduleName = 'MODULES.CUSTOMERS';
    if (file.includes('vendor')) moduleName = 'MODULES.VENDORS';
    if (file.includes('item')) moduleName = 'MODULES.ITEMS';
    if (file.includes('quote')) moduleName = 'MODULES.QUOTES';
    if (file.includes('invoice')) moduleName = 'MODULES.INVOICES';
    if (file.includes('bill')) moduleName = 'MODULES.BILLS';
    if (file.includes('expense')) moduleName = 'MODULES.EXPENSES';
    if (file.includes('bank')) moduleName = 'MODULES.BANKING';
    if (file.includes('reports')) moduleName = 'MODULES.REPORTS';

    // Replace authMiddleware with authMiddleware + requirePermission
    // E.g., router.get('/path', authMiddleware, getSomething); -> router.get('/path', authMiddleware, requirePermission(...), getSomething);
    content = content.replace(/authMiddleware,\s*([^,)]+)/g, (match, controllerFn, offset, string) => {
      // Find the HTTP method for this route by looking backwards from the match
      let pre = string.substring(0, offset);
      let method = 'VIEW';
      if (pre.match(/router\.post\([^)]*$/)) method = 'ACTIONS.CREATE';
      else if (pre.match(/router\.(put|patch)\([^)]*$/)) method = 'ACTIONS.EDIT';
      else if (pre.match(/router\.delete\([^)]*$/)) method = 'ACTIONS.DELETE';
      else method = 'ACTIONS.VIEW';
      
      // Special actions like SEND, EXPORT
      if (pre.match(/\/send['"]/)) method = 'ACTIONS.SEND';
      if (pre.match(/\/pdf['"]/)) method = 'ACTIONS.EXPORT';
      if (pre.match(/\/export['"]/)) method = 'ACTIONS.EXPORT';
      if (pre.match(/\/import['"]/)) method = 'ACTIONS.IMPORT';

      // Avoid double replace
      if (match.includes('requirePermission')) return match;
      if (controllerFn.includes('requirePermission')) return match;
      if (match.includes('async (req, res)')) return `authMiddleware, requirePermission(${moduleName}, ${method}), async (req, res)`;
      
      return `authMiddleware, requirePermission(${moduleName}, ${method}), ${controllerFn}`;
    });

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + file);
  } else {
    console.log('File not found: ' + file);
  }
});
