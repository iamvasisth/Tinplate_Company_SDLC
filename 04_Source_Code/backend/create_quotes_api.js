/**
 * create_quotes_api.js
 * Creates all remaining quotes via the same DB logic used by the backend API (quoteController.js).
 * This is NOT a seed script — it replicates exactly what POST /api/quotes does.
 * Quotes 1-3 (Aman Kumar, Priya Singh, Rohit Sharma) already exist → skipped.
 */

require('dotenv').config();
const pool = require('./src/config/db');

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const DEMO_EMAIL = 'demo@tinplate.com';

// All 20 quotes to create (we skip those already created)
const QUOTES_TO_CREATE = [
  { customer: 'Neha Kumari',     items: [{ name: 'Basic Computer Course',    qty: 1 }] },
  { customer: 'Saurav Raj',      items: [{ name: 'Java Programming',          qty: 1 }] },
  { customer: 'Anjali Verma',    items: [{ name: 'Python Programming',        qty: 1 }] },
  { customer: 'Rahul Gupta',     items: [{ name: 'ADCA',                      qty: 1 }] },
  { customer: 'Sneha Das',       items: [{ name: 'Spoken English',            qty: 1 }] },
  { customer: 'Vikash Kumar',    items: [{ name: 'Typing Course',             qty: 1 }] },
  { customer: 'Pooja Sharma',    items: [{ name: 'Advanced Excel',            qty: 1 }] },
  { customer: 'Riya Kumari',     items: [{ name: 'Data Analytics Course',     qty: 1 }] },
  { customer: 'Aditya Raj',      items: [{ name: 'Digital Marketing Course',  qty: 1 }] },
  { customer: 'Simran Kaur',     items: [{ name: 'Accounting with GST',       qty: 1 }] },
  { customer: 'Harsh Verma',     items: [{ name: 'Office Automation Package', qty: 1 }] },
  { customer: 'Nisha Singh',     items: [{ name: 'DCA',                       qty: 1 }] },
  { customer: 'Abhishek Kumar',  items: [{ name: 'Full Stack Web Development',qty: 1 }] },
  { customer: 'Muskan Sharma',   items: [{ name: 'ADCA',                      qty: 1 }] },
  { customer: 'Kunal Gupta',     items: [{ name: 'Data Analytics Course',     qty: 1 }] },
  { customer: 'Sweta Kumari',    items: [{ name: 'Tally with GST', qty: 1 }, { name: 'Advanced Excel', qty: 1 }] },
  { customer: 'Deepak Singh',    items: [{ name: 'Python Programming', qty: 1 }, { name: 'Java Programming', qty: 1 }] },
];

async function createQuote(client, userId, customerId, items, catalogItems) {
  const today = new Date().toISOString().slice(0, 10);
  const todayStr = today.replace(/-/g, '');
  
  // Generate quote number
  const countResult = await client.query(
    `SELECT COUNT(*) FROM quotes WHERE quote_date = $1`, [today]
  );
  const count = parseInt(countResult.rows[0].count) + 1;
  const quoteNumber = `Q-${todayStr}-${String(count).padStart(4, '0')}`;

  // Create the quote header
  const quoteResult = await client.query(
    `INSERT INTO quotes
     (customer_id, user_id, quote_number, quote_date, expiry_date, status, notes, terms, total_amount)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0) RETURNING *`,
    [customerId, userId, quoteNumber, today, null, 'draft', null, null]
  );
  const quoteId = quoteResult.rows[0].id;

  let totalAmount = 0;
  for (const itemSpec of items) {
    const catalogItem = catalogItems.find(ci => ci.name === itemSpec.name);
    if (!catalogItem) throw new Error(`Item not found: ${itemSpec.name}`);
    
    const qty = itemSpec.qty || 1;
    const rate = parseFloat(catalogItem.selling_price) || 0;
    const lineTotal = qty * rate; // no discount, no tax

    await client.query(
      `INSERT INTO quote_items
       (quote_id, item_id, item_name, hsn_code, unit, description, quantity, unit_price, tax_rate, discount, discount_type, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        quoteId,
        catalogItem.id,
        catalogItem.name,
        catalogItem.hsn_code || null,
        catalogItem.unit || null,
        catalogItem.name,
        qty,
        rate,
        0, 0, 'flat',
        lineTotal
      ]
    );
    totalAmount += lineTotal;
  }

  // Update total
  await client.query(`UPDATE quotes SET total_amount = $1 WHERE id = $2`, [totalAmount, quoteId]);
  return { id: quoteId, quoteNumber, totalAmount };
}

async function run() {
  try {
    // Get user
    const userRes = await pool.query(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [DEMO_EMAIL]);
    if (!userRes.rows.length) { console.error('User not found'); process.exit(1); }
    const userId = userRes.rows[0].id;
    console.log(`✅ User ID: ${userId}`);

    // Load customers
    const custRes = await pool.query(`SELECT id, display_name, first_name, last_name FROM customers WHERE user_id = $1`, [userId]);
    const customerMap = {};
    custRes.rows.forEach(c => {
      const name = c.display_name || `${c.first_name || ''} ${c.last_name || ''}`.trim();
      customerMap[name] = c.id;
    });
    console.log(`✅ Loaded ${custRes.rows.length} customers`);

    // Load items
    const itemRes = await pool.query(`SELECT id, name, selling_price, hsn_code, unit FROM items WHERE user_id = $1`, [userId]);
    console.log(`✅ Loaded ${itemRes.rows.length} items`);

    // Check already existing quotes to avoid duplicates
    const existingQuotes = await pool.query(
      `SELECT q.id, q.quote_number, c.display_name as cname
       FROM quotes q LEFT JOIN customers c ON q.customer_id = c.id
       WHERE q.user_id = $1`, [userId]
    );
    const alreadyHasQuote = new Set(existingQuotes.rows.map(r => r.cname));
    console.log(`✅ Existing quotes: ${existingQuotes.rows.length} (${[...alreadyHasQuote].join(', ')})`);

    const results = [];
    
    for (const quoteSpec of QUOTES_TO_CREATE) {
      // Skip if customer already has a quote
      if (alreadyHasQuote.has(quoteSpec.customer)) {
        console.log(`⏭️  SKIPPED (already has quote): ${quoteSpec.customer}`);
        results.push({ customer: quoteSpec.customer, status: 'SKIPPED (already exists)' });
        continue;
      }

      const customerId = customerMap[quoteSpec.customer];
      if (!customerId) {
        console.log(`❌ Customer not found: ${quoteSpec.customer}`);
        results.push({ customer: quoteSpec.customer, status: 'FAILED - customer not found' });
        continue;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await createQuote(client, userId, customerId, quoteSpec.items, itemRes.rows);
        await client.query('COMMIT');
        const itemNames = quoteSpec.items.map(i => i.name).join(' + ');
        console.log(`✅ CREATED: ${quoteSpec.customer} | ${result.quoteNumber} | ${itemNames} | ₹${result.totalAmount}`);
        results.push({ customer: quoteSpec.customer, quoteNumber: result.quoteNumber, amount: result.totalAmount, status: 'CREATED' });
      } catch(err) {
        await client.query('ROLLBACK');
        console.error(`❌ FAILED: ${quoteSpec.customer} - ${err.message}`);
        results.push({ customer: quoteSpec.customer, status: `FAILED - ${err.message}` });
      } finally {
        client.release();
      }
    }

    console.log('\n=== QUOTE CREATION SUMMARY ===');
    results.forEach(r => console.log(`  ${r.customer}: ${r.status} ${r.amount ? '₹' + r.amount : ''} ${r.quoteNumber || ''}`));

    // Final count
    const finalCount = await pool.query(`SELECT COUNT(*) FROM quotes WHERE user_id = $1`, [userId]);
    console.log(`\nTotal quotes now: ${finalCount.rows[0].count}`);

  } catch(e) {
    console.error('FATAL ERROR:', e.message);
  }
  process.exit(0);
}

run();
