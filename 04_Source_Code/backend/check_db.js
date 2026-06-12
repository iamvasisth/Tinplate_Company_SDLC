require('dotenv').config();
const pool = require('./src/config/db');

async function checkDatabase() {
  const tablesToCheck = [
    'users', 'customers', 'vendors', 'items', 'quotes', 'quote_items',
    'invoices', 'invoice_items', 'payments', 'bills', 'bill_items',
    'payments_made', 'expenses', 'taxes', 'chart_of_accounts',
    'journal_entries', 'journal_entry_lines', 'bank_accounts',
    'bank_transactions', 'bank_reconciliations', 'inventory_movements',
    'documents', 'organizations'
  ];

  for (let table of tablesToCheck) {
    try {
      const res = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1;
      `, [table]);
      
      if (res.rows.length === 0) {
        console.log(`[MISSING TABLE] ${table}`);
      } else {
        console.log(`[OK] ${table} exists with ${res.rows.length} columns`);
      }
    } catch (err) {
      console.error(`Error checking ${table}:`, err);
    }
  }
  process.exit(0);
}
checkDatabase();
