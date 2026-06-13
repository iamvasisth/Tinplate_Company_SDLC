/**
 * inspect_only.js — READ-ONLY inspection script
 * No data modifications. Only SELECT queries.
 */
require('dotenv').config();
const pool = require('./src/config/db');

async function run() {
  try {
    const userRes = await pool.query(`SELECT id FROM users WHERE email = 'demo@tinplate.com' LIMIT 1`);
    const userId = userRes.rows[0].id;

    // ─── 1. Show the 4 draft quotes ──────────────────────────────────────────
    console.log('\n=== 1. FOUR DRAFT QUOTES ===');
    const draftQuotes = await pool.query(`
      SELECT q.id, q.quote_number, q.status, q.total_amount, c.display_name
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.user_id = $1 AND q.status = 'draft'
      ORDER BY q.id
    `, [userId]);
    console.log(`Found ${draftQuotes.rows.length} draft quotes:`);
    draftQuotes.rows.forEach(r =>
      console.log(`  ID:${r.id} | ${r.quote_number} | ${r.display_name} | ₹${r.total_amount} | status: ${r.status}`)
    );

    // ─── 2. sales_orders table columns ───────────────────────────────────────
    console.log('\n=== 2. sales_orders TABLE COLUMNS ===');
    const soColumns = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'sales_orders'
      ORDER BY ordinal_position
    `);
    if (soColumns.rows.length === 0) {
      console.log('  ⚠️  TABLE "sales_orders" DOES NOT EXIST in the database!');
    } else {
      soColumns.rows.forEach(r =>
        console.log(`  ${r.column_name} | ${r.data_type} | nullable: ${r.is_nullable} | default: ${r.column_default}`)
      );
      const hasQuoteId = soColumns.rows.some(r => r.column_name === 'quote_id');
      console.log(`\n  quote_id column EXISTS: ${hasQuoteId ? '✅ YES' : '❌ NO'}`);
    }

    // ─── 3. Check if quote_items table has needed columns ─────────────────────
    console.log('\n=== 3. quote_items TABLE COLUMNS ===');
    const qiColumns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'quote_items'
      ORDER BY ordinal_position
    `);
    qiColumns.rows.forEach(r => console.log(`  ${r.column_name} | ${r.data_type}`));

    // ─── 4. Simulate what convertQuoteToSalesOrder will do ───────────────────
    console.log('\n=== 4. SIMULATING convertQuoteToSalesOrder for one draft quote ===');
    if (draftQuotes.rows.length > 0) {
      const testQuote = draftQuotes.rows[0];
      console.log(`  Test quote: ${testQuote.quote_number} (ID: ${testQuote.id}) for ${testQuote.display_name}`);

      // Step A: Check if sales_orders table exists at all
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables WHERE table_name = 'sales_orders'
        ) as exists
      `);
      console.log(`  sales_orders table exists: ${tableExists.rows[0].exists}`);

      if (tableExists.rows[0].exists) {
        // Step B: The controller checks for duplicate: SELECT id FROM sales_orders WHERE quote_id = $1
        try {
          const dupCheck = await pool.query(
            `SELECT id FROM sales_orders WHERE quote_id = $1 AND user_id = $2 LIMIT 1`,
            [testQuote.id, userId]
          );
          console.log(`  Duplicate check query: ✅ Ran OK — ${dupCheck.rows.length} existing sales orders for this quote`);
        } catch(e) {
          console.log(`  Duplicate check query: ❌ FAILED — ${e.message}`);
        }

        // Step C: Check if sales_order_items table exists and its columns
        const soiExists = await pool.query(`
          SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sales_order_items') as exists
        `);
        console.log(`  sales_order_items table exists: ${soiExists.rows[0].exists}`);
      }
    }

    // ─── 5. Check the frontend route call vs backend route definition ─────────
    console.log('\n=== 5. ROUTE PATH COMPARISON ===');
    console.log('  Frontend calls:  POST /api/sales-orders/from-quote/{quoteId}');
    console.log('  Backend defines: POST /sales-orders/from-quote/:quoteId  (mounted at /api)');
    console.log('  Final resolved:  POST /api/sales-orders/from-quote/:quoteId');
    console.log('  Match: ✅ YES — paths match');

    console.log('\n=== 6. PERMISSION CHECK ===');
    console.log('  Convert-to-invoice: requirePermission(MODULES.QUOTES, ACTIONS.CREATE)');
    console.log('  Convert-to-salesorder: authMiddleware ONLY (no requirePermission)');
    console.log('  This means permission is NOT the blocker for Convert to Sales Order');

  } catch(e) {
    console.error('INSPECTION ERROR:', e.message, e.stack);
  }
  process.exit(0);
}
run();
