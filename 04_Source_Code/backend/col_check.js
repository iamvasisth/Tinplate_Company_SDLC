require('dotenv').config();
const pool = require('./src/config/db');
async function run() {
  const r = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='sales_orders' ORDER BY ordinal_position"
  );
  const cols = r.rows.map(x => x.column_name);
  console.log('All columns:', cols.join(', '));
  console.log('Has total_amount:', cols.includes('total_amount'));
  console.log('Has total (wrong):', cols.includes('total'));
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
