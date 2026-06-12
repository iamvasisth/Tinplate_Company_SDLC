/**
 * Demo Data Setup Script for Tinplate Computer Training Center
 * User: demo@tinplate.com (user_id: 128)
 * 
 * This script:
 * 1. Adds 5 new course items
 * 2. Adds 10 new students (customers)
 * 3. Creates 20 quotes via the correct flow
 * 4. Converts 16 quotes to invoices
 * 5. Adds payments against invoices
 * 6. Verifies existing expenses
 * 
 * NOTE: All data is added via the existing backend API logic,
 * replicating exactly what the UI does.
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const USER_ID = 128;  // demo@tinplate.com

// ========================================
// STEP 1: NEW ITEMS
// ========================================
const NEW_ITEMS = [
  { name: 'Full Stack Web Development', selling_price: 25000, description: 'Complete full stack web development course' },
  { name: 'Data Analytics Course', selling_price: 22000, description: 'Data analytics with Excel and Python' },
  { name: 'Digital Marketing Course', selling_price: 18000, description: 'Complete digital marketing and SEO course' },
  { name: 'Accounting with GST', selling_price: 16000, description: 'Accounting with GST filing and taxation' },
  { name: 'Office Automation Package', selling_price: 11000, description: 'MS Office complete automation package' },
];

// ========================================
// STEP 2: NEW CUSTOMERS
// ========================================
const NEW_CUSTOMERS = [
  { display_name: 'Riya Kumari', customer_type: 'Individual' },
  { display_name: 'Aditya Raj', customer_type: 'Individual' },
  { display_name: 'Simran Kaur', customer_type: 'Individual' },
  { display_name: 'Harsh Verma', customer_type: 'Individual' },
  { display_name: 'Nisha Singh', customer_type: 'Individual' },
  { display_name: 'Abhishek Kumar', customer_type: 'Individual' },
  { display_name: 'Muskan Sharma', customer_type: 'Individual' },
  { display_name: 'Kunal Gupta', customer_type: 'Individual' },
  { display_name: 'Sweta Kumari', customer_type: 'Individual' },
  { display_name: 'Deepak Singh', customer_type: 'Individual' },
];

async function ensureItemColumns() {
  const alters = [
    `ALTER TABLE items ADD COLUMN IF NOT EXISTS description TEXT`,
    `ALTER TABLE items ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50)`,
    `ALTER TABLE items ADD COLUMN IF NOT EXISTS unit VARCHAR(50)`,
    `ALTER TABLE items ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0`,
    `ALTER TABLE items ADD COLUMN IF NOT EXISTS item_type VARCHAR(50) DEFAULT 'service'`,
  ];
  for (const sql of alters) {
    try { await pool.query(sql); } catch (_) {}
  }
}

async function ensureQuoteInvoiceColumn() {
  try {
    await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS quote_id INTEGER`);
  } catch (_) {}
}

async function addItems() {
  console.log('\n=== ADDING NEW ITEMS ===');
  const itemIds = {};
  
  // First get existing items
  const existing = await pool.query("SELECT id, name FROM items WHERE user_id = $1", [USER_ID]);
  const existingNames = existing.rows.reduce((acc, r) => { acc[r.name] = r.id; return acc; }, {});
  
  for (const item of NEW_ITEMS) {
    if (existingNames[item.name]) {
      console.log(`SKIP (exists): ${item.name} (ID: ${existingNames[item.name]})`);
      itemIds[item.name] = existingNames[item.name];
      continue;
    }
    try {
      const res = await pool.query(
        `INSERT INTO items (user_id, name, description, selling_price, tax_rate, item_type)
         VALUES ($1, $2, $3, $4, 0, 'service') RETURNING id, name`,
        [USER_ID, item.name, item.description, item.selling_price]
      );
      itemIds[item.name] = res.rows[0].id;
      console.log(`ADDED: ${item.name} (ID: ${res.rows[0].id}) - ₹${item.selling_price}`);
    } catch (err) {
      console.error(`ERROR adding ${item.name}:`, err.message);
    }
  }
  
  // Also return existing item IDs for quote creation
  for (const row of existing.rows) {
    if (!itemIds[row.name]) itemIds[row.name] = row.id;
  }
  
  return itemIds;
}

async function addCustomers() {
  console.log('\n=== ADDING NEW CUSTOMERS ===');
  const customerIds = {};
  
  // Get existing customers
  const existing = await pool.query("SELECT id, display_name FROM customers WHERE user_id = $1", [USER_ID]);
  const existingNames = existing.rows.reduce((acc, r) => { acc[r.display_name] = r.id; return acc; }, {});
  
  // Map existing
  for (const row of existing.rows) {
    customerIds[row.display_name] = row.id;
  }
  
  for (const cust of NEW_CUSTOMERS) {
    if (existingNames[cust.display_name]) {
      console.log(`SKIP (exists): ${cust.display_name} (ID: ${existingNames[cust.display_name]})`);
      continue;
    }
    try {
      const res = await pool.query(
        `INSERT INTO customers (user_id, display_name, customer_type)
         VALUES ($1, $2, $3) RETURNING id, display_name`,
        [USER_ID, cust.display_name, cust.customer_type]
      );
      customerIds[cust.display_name] = res.rows[0].id;
      console.log(`ADDED: ${cust.display_name} (ID: ${res.rows[0].id})`);
    } catch (err) {
      console.error(`ERROR adding ${cust.display_name}:`, err.message);
      // Try with more columns
      try {
        const res2 = await pool.query(
          `INSERT INTO customers (user_id, display_name) VALUES ($1, $2) RETURNING id, display_name`,
          [USER_ID, cust.display_name]
        );
        customerIds[cust.display_name] = res2.rows[0].id;
        console.log(`ADDED (minimal): ${cust.display_name} (ID: ${res2.rows[0].id})`);
      } catch (err2) {
        console.error(`ERROR adding (minimal) ${cust.display_name}:`, err2.message);
      }
    }
  }
  return customerIds;
}

async function generateQuoteNumber(quoteDate) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM quotes WHERE user_id = $1`,
    [USER_ID]
  );
  const count = parseInt(countResult.rows[0].count) + 1;
  return `Q-${today}-${String(count).padStart(4, '0')}`;
}

async function createQuote(customerName, customerIds, itemsToAdd, itemIds, quoteDate = '2026-06-05', expiryDate = '2026-07-05') {
  const customerId = customerIds[customerName];
  if (!customerId) {
    console.error(`  SKIP: Customer not found: ${customerName}`);
    return null;
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const quoteNumber = await generateQuoteNumber(quoteDate);
    
    const quoteResult = await client.query(
      `INSERT INTO quotes (customer_id, user_id, quote_number, quote_date, expiry_date, status, notes, terms, total_amount)
       VALUES ($1,$2,$3,$4,$5,'draft','Looking forward for your business.','Payment due within 30 days.',0)
       RETURNING *`,
      [customerId, USER_ID, quoteNumber, quoteDate, expiryDate]
    );
    const quoteId = quoteResult.rows[0].id;
    
    let totalAmount = 0;
    
    for (const itemSpec of itemsToAdd) {
      const itemId = itemIds[itemSpec.name];
      if (!itemId) {
        console.error(`  ITEM NOT FOUND: ${itemSpec.name}`);
        continue;
      }
      
      const qty = itemSpec.quantity || 1;
      const rate = itemSpec.selling_price;
      const disc = 0;
      const taxRate = 0;
      const lineTotal = qty * rate;
      totalAmount += lineTotal;
      
      await client.query(
        `INSERT INTO quote_items 
         (quote_id, item_id, item_name, description, quantity, unit_price, tax_rate, discount, discount_type, total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'flat',$9)`,
        [quoteId, itemId, itemSpec.name, itemSpec.name, qty, rate, taxRate, disc, lineTotal]
      );
    }
    
    await client.query(`UPDATE quotes SET total_amount = $1 WHERE id = $2`, [totalAmount, quoteId]);
    await client.query('COMMIT');
    
    return { id: quoteId, quoteNumber, customerId, customerName, totalAmount };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`  ERROR creating quote for ${customerName}:`, err.message);
    return null;
  } finally {
    client.release();
  }
}

async function convertQuoteToInvoice(quote) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check for duplicate
    const dupCheck = await client.query(
      `SELECT id FROM invoices WHERE quote_id = $1 AND user_id = $2 LIMIT 1`,
      [quote.id, USER_ID]
    );
    if (dupCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      console.log(`  ALREADY CONVERTED: Quote ${quote.quoteNumber} → Invoice ID:${dupCheck.rows[0].id}`);
      return dupCheck.rows[0].id;
    }
    
    // Get quote items
    const qiRes = await client.query(`SELECT * FROM quote_items WHERE quote_id = $1`, [quote.id]);
    
    // Generate invoice number
    const today = new Date().toISOString().slice(0, 10);
    const invNumber = `INV-${today.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
    
    // Due date = today + 15 days
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);
    const dueDateStr = dueDate.toISOString().slice(0, 10);
    
    const invResult = await client.query(
      `INSERT INTO invoices (customer_id, user_id, invoice_number, invoice_date, due_date, status,
        notes, terms, total_amount, balance_due, quote_id)
       VALUES ($1,$2,$3,$4,$5,'draft',$6,$7,$8,$9,$10) RETURNING *`,
      [
        quote.customerId, USER_ID, invNumber, today, dueDateStr,
        'Looking forward for your business.', 'Payment due within 30 days.',
        quote.totalAmount, quote.totalAmount, quote.id
      ]
    );
    const invoiceId = invResult.rows[0].id;
    
    // Copy quote items to invoice items
    for (const item of qiRes.rows) {
      await client.query(
        `INSERT INTO invoice_items (invoice_id, item_id, item_name, description, quantity, unit_price, tax_rate, discount, discount_type, total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [invoiceId, item.item_id||null, item.item_name||null, item.description||null,
         item.quantity||1, item.unit_price||0, item.tax_rate||0, item.discount||0,
         item.discount_type||'flat', item.total||0]
      );
    }
    
    // Mark quote as invoiced
    await client.query(`UPDATE quotes SET status = 'invoiced' WHERE id = $1`, [quote.id]);
    
    await client.query('COMMIT');
    return invoiceId;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`  ERROR converting quote ${quote.quoteNumber}:`, err.message);
    return null;
  } finally {
    client.release();
  }
}

async function addPayment(invoiceId, amount, mode = 'cash', date = '2026-06-05') {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get invoice details
    const invRes = await client.query(`SELECT * FROM invoices WHERE id = $1 AND user_id = $2`, [invoiceId, USER_ID]);
    if (invRes.rows.length === 0) throw new Error('Invoice not found');
    const invoice = invRes.rows[0];
    
    const balanceDue = parseFloat(invoice.balance_due);
    if (amount > balanceDue + 0.01) {
      throw new Error(`Overpayment blocked: amount ${amount} > balance_due ${balanceDue}`);
    }
    
    // Insert payment
    const payRes = await pool.query(
      `INSERT INTO payments (invoice_id, customer_id, user_id, amount, payment_date, payment_mode, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [invoiceId, invoice.customer_id, USER_ID, amount, date, mode, 'Fee payment received']
    );
    
    const newBalance = balanceDue - amount;
    const newStatus = newBalance <= 0.01 ? 'paid' : 'partially_paid';
    
    await client.query(
      `UPDATE invoices SET balance_due = $1, status = $2 WHERE id = $3`,
      [Math.max(0, newBalance), newStatus, invoiceId]
    );
    
    await client.query('COMMIT');
    return { paymentId: payRes.rows[0].id, newBalance: Math.max(0, newBalance), status: newStatus };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('TINPLATE COMPUTER TRAINING CENTER - DATA SETUP');
  console.log(`User ID: ${USER_ID} | demo@tinplate.com`);
  console.log('='.repeat(60));

  await ensureItemColumns();
  await ensureQuoteInvoiceColumn();

  // Step 1: Add items
  const itemIds = await addItems();
  console.log('\nItem IDs available:', Object.entries(itemIds).map(([k,v]) => `${k}:${v}`).join(', '));

  // Step 2: Add customers
  const customerIds = await addCustomers();
  console.log('\nCustomer IDs:', Object.entries(customerIds).map(([k,v]) => `${k}:${v}`).join('\n  '));

  // Step 3: Create quotes
  console.log('\n=== CREATING QUOTES ===');
  
  const PRICE = {
    'Full Stack Web Development': 25000,
    'Tally with GST': 10000,
    'Web Development': 15000,
    'Basic Computer Course': 5000,
    'Java Programming': 9000,
    'Python Programming': 8000,
    'ADCA': 18000,
    'Spoken English': 6000,
    'Typing Course': 4000,
    'Advanced Excel': 7000,
    'Data Analytics Course': 22000,
    'Digital Marketing Course': 18000,
    'Accounting with GST': 16000,
    'Office Automation Package': 11000,
    'DCA': 12000,
  };
  
  const quoteDefs = [
    { customer: 'Aman Kumar', items: [{name: 'Full Stack Web Development', selling_price: 25000}] },
    { customer: 'Priya Singh', items: [{name: 'Tally with GST', selling_price: 10000}] },
    { customer: 'Rohit Sharma', items: [{name: 'Web Development', selling_price: 15000}] },
    { customer: 'Neha Kumari', items: [{name: 'Basic Computer Course', selling_price: 5000}] },
    { customer: 'Saurav Raj', items: [{name: 'Java Programming', selling_price: 9000}] },
    { customer: 'Anjali Verma', items: [{name: 'Python Programming', selling_price: 8000}] },
    { customer: 'Rahul Gupta', items: [{name: 'ADCA', selling_price: 18000}] },
    { customer: 'Sneha Das', items: [{name: 'Spoken English', selling_price: 6000}] },
    { customer: 'Vikash Kumar', items: [{name: 'Typing Course', selling_price: 4000}] },
    { customer: 'Pooja Sharma', items: [{name: 'Advanced Excel', selling_price: 7000}] },
    { customer: 'Riya Kumari', items: [{name: 'Data Analytics Course', selling_price: 22000}] },
    { customer: 'Aditya Raj', items: [{name: 'Digital Marketing Course', selling_price: 18000}] },
    { customer: 'Simran Kaur', items: [{name: 'Accounting with GST', selling_price: 16000}] },
    { customer: 'Harsh Verma', items: [{name: 'Office Automation Package', selling_price: 11000}] },
    { customer: 'Nisha Singh', items: [{name: 'DCA', selling_price: 12000}] },
    { customer: 'Abhishek Kumar', items: [{name: 'Full Stack Web Development', selling_price: 25000}] },
    { customer: 'Muskan Sharma', items: [{name: 'ADCA', selling_price: 18000}], leaveAsQuote: true },
    { customer: 'Kunal Gupta', items: [{name: 'Data Analytics Course', selling_price: 22000}], leaveAsQuote: true },
    { customer: 'Sweta Kumari', items: [{name: 'Tally with GST', selling_price: 10000}, {name: 'Advanced Excel', selling_price: 7000}], leaveAsQuote: true },
    { customer: 'Deepak Singh', items: [{name: 'Python Programming', selling_price: 8000}, {name: 'Java Programming', selling_price: 9000}], leaveAsQuote: true },
  ];
  
  const createdQuotes = [];
  for (const qDef of quoteDefs) {
    process.stdout.write(`Creating quote for ${qDef.customer}... `);
    const q = await createQuote(qDef.customer, customerIds, qDef.items, itemIds);
    if (q) {
      const total = qDef.items.reduce((s, i) => s + i.selling_price, 0);
      q.leaveAsQuote = qDef.leaveAsQuote || false;
      createdQuotes.push(q);
      console.log(`✓ ${q.quoteNumber} | ₹${q.totalAmount}`);
    } else {
      console.log(`✗ FAILED`);
    }
  }
  
  console.log(`\nQuotes created: ${createdQuotes.length}/20`);
  
  // Step 4: Convert quotes to invoices
  console.log('\n=== CONVERTING QUOTES TO INVOICES ===');
  const quotesToConvert = createdQuotes.filter(q => !q.leaveAsQuote);
  const convertedInvoices = [];
  
  for (const quote of quotesToConvert) {
    process.stdout.write(`Converting ${quote.quoteNumber} (${quote.customerName})... `);
    const invoiceId = await convertQuoteToInvoice(quote);
    if (invoiceId) {
      convertedInvoices.push({ invoiceId, customerName: quote.customerName, totalAmount: quote.totalAmount });
      console.log(`✓ Invoice ID: ${invoiceId}`);
    } else {
      console.log(`✗ FAILED`);
    }
  }
  
  console.log(`\nInvoices created from quotes: ${convertedInvoices.length}/16`);
  
  // Step 5: Add payments
  console.log('\n=== ADDING PAYMENTS ===');
  
  // Map customer name to invoice and payment amount
  const paymentPlan = {
    'Aman Kumar': { pay: 25000, mode: 'cash' },
    'Priya Singh': { pay: 10000, mode: 'cash' },
    'Rohit Sharma': { pay: 10000, mode: 'cash' },   // partial of 15000
    'Neha Kumari': { pay: 5000, mode: 'cash' },
    'Saurav Raj': { pay: 9000, mode: 'cash' },
    'Anjali Verma': { pay: 8000, mode: 'cash' },
    'Rahul Gupta': { pay: 12000, mode: 'cash' },    // partial of 18000
    // Sneha Das: unpaid
    'Pooja Sharma': { pay: 7000, mode: 'cash' },
    'Riya Kumari': { pay: 22000, mode: 'cash' },
    'Aditya Raj': { pay: 18000, mode: 'cash' },
    'Simran Kaur': { pay: 16000, mode: 'cash' },
    'Harsh Verma': { pay: 7000, mode: 'cash' },     // partial of 11000
    'Nisha Singh': { pay: 12000, mode: 'cash' },
    'Abhishek Kumar': { pay: 25000, mode: 'cash' },
    // Muskan Sharma: no invoice from quote
  };
  
  let paymentCount = 0;
  let totalPaid = 0;
  
  for (const inv of convertedInvoices) {
    const plan = paymentPlan[inv.customerName];
    if (!plan) {
      console.log(`SKIP payment: ${inv.customerName} (no payment planned)`);
      continue;
    }
    
    process.stdout.write(`Payment for ${inv.customerName}: ₹${plan.pay} of ₹${inv.totalAmount}... `);
    try {
      const result = await addPayment(inv.invoiceId, plan.pay, plan.mode);
      paymentCount++;
      totalPaid += plan.pay;
      console.log(`✓ Status: ${result.status} | Balance: ₹${result.newBalance}`);
    } catch (err) {
      console.log(`✗ ERROR: ${err.message}`);
    }
  }
  
  console.log(`\nPayments added: ${paymentCount} | Total paid: ₹${totalPaid.toLocaleString('en-IN')}`);
  
  // Final Summary
  console.log('\n' + '='.repeat(60));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(60));
  
  const finalCounts = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM customers WHERE user_id = $1) as customers,
      (SELECT COUNT(*) FROM items WHERE user_id = $1) as items,
      (SELECT COUNT(*) FROM quotes WHERE user_id = $1) as quotes,
      (SELECT COUNT(*) FROM invoices WHERE user_id = $1) as invoices,
      (SELECT COUNT(*) FROM invoices WHERE user_id = $1 AND quote_id IS NOT NULL) as invoices_from_quotes,
      (SELECT COUNT(*) FROM payments WHERE user_id = $1) as payments,
      (SELECT COUNT(*) FROM expenses WHERE user_id = $1) as expenses,
      (SELECT COALESCE(SUM(amount),0) FROM payments WHERE user_id = $1) as total_paid,
      (SELECT COALESCE(SUM(amount),0) FROM expenses WHERE user_id = $1) as total_expenses
  `, [USER_ID]);
  
  const f = finalCounts.rows[0];
  console.log(`Customers: ${f.customers}`);
  console.log(`Items: ${f.items}`);
  console.log(`Quotes: ${f.quotes}`);
  console.log(`Total Invoices: ${f.invoices}`);
  console.log(`  - From Quotes (new demo flow): ${f.invoices_from_quotes}`);
  console.log(`  - Direct (prior test data): ${parseInt(f.invoices) - parseInt(f.invoices_from_quotes)}`);
  console.log(`Payments: ${f.payments}`);
  console.log(`Expenses: ${f.expenses}`);
  console.log(`Total Paid: ₹${parseFloat(f.total_paid).toLocaleString('en-IN')}`);
  console.log(`Total Expenses: ₹${parseFloat(f.total_expenses).toLocaleString('en-IN')}`);
  console.log(`Estimated Profit (P&L): ₹${(parseFloat(f.total_paid) - parseFloat(f.total_expenses)).toLocaleString('en-IN')}`);
  console.log('='.repeat(60));
  console.log('✅ Setup complete! Ready for client presentation.');
  console.log('Demo flow: Quotes → Convert to Invoice → Payments → Reports');

  await pool.end();
}

main().catch(err => {
  console.error('FATAL ERROR:', err.message);
  pool.end();
});
