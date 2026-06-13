require('dotenv').config();
const pool = require('./src/config/db');

async function run() {
  try {
    // Check chart_of_accounts columns
    const cols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='chart_of_accounts' 
      ORDER BY ordinal_position
    `);
    console.log('=== chart_of_accounts columns ===');
    cols.rows.forEach(r => console.log(r.column_name, ':', r.data_type));

    // Count records 
    const cnt = await pool.query(`SELECT count(*) FROM chart_of_accounts`);
    console.log('\nTotal chart_of_accounts rows:', cnt.rows[0].count);

    // Check journal_entries
    const je = await pool.query(`SELECT count(*) FROM journal_entries`);
    console.log('Total journal_entries rows:', je.rows[0].count);

    // Check expenses
    const exp = await pool.query(`SELECT count(*) FROM expenses`);
    console.log('Total expenses rows:', exp.rows[0].count);

    // Show a few journal entries with their lines
    const jeData = await pool.query(`
      SELECT j.id, j.description, j.entry_date, j.reference_type,
             jl.account_id, jl.debit, jl.credit, c.account_name, c.account_type
      FROM journal_entries j
      JOIN journal_entry_lines jl ON j.id = jl.journal_entry_id
      JOIN chart_of_accounts c ON jl.account_id = c.id
      LIMIT 10
    `);
    console.log('\n=== Sample journal entries with lines ===');
    jeData.rows.forEach(r => console.log(JSON.stringify(r)));

    // Check invoices status
    const inv = await pool.query(`SELECT status, count(*) FROM invoices GROUP BY status`);
    console.log('\n=== Invoice statuses ===');
    inv.rows.forEach(r => console.log(r.status, ':', r.count));

  } catch(e) {
    console.error('ERROR:', e.message);
  }
  process.exit(0);
}
run();
