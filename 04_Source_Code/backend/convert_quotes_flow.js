/**
 * convert_quotes_flow.js
 * Step 2: Convert 16 quotes to invoices (same logic as quoteController.js convertQuoteToInvoice)
 * Step 3: Add payments against the new invoices
 * Step 4: Add correct expenses
 * 
 * Leaves these 4 quotes unconverted:
 *   Vikash Kumar, Kunal Gupta, Sweta Kumari, Deepak Singh
 */

require('dotenv').config();
const pool = require('./src/config/db');

const DEMO_EMAIL = 'demo@tinplate.com';

// 16 quotes to convert to invoices
const TO_CONVERT = [
  'Aman Kumar', 'Priya Singh', 'Rohit Sharma', 'Neha Kumari',
  'Saurav Raj', 'Anjali Verma', 'Rahul Gupta', 'Sneha Das',
  'Pooja Sharma', 'Riya Kumari', 'Aditya Raj', 'Simran Kaur',
  'Harsh Verma', 'Nisha Singh', 'Abhishek Kumar', 'Muskan Sharma'
];

// Payments: { customerName, amount } — will match against newly created invoices
const PAYMENTS = [
  { customer: 'Aman Kumar',     amount: 25000 },  // full
  { customer: 'Priya Singh',    amount: 10000 },  // full
  { customer: 'Neha Kumari',    amount: 5000  },  // full
  { customer: 'Saurav Raj',     amount: 9000  },  // full
  { customer: 'Anjali Verma',   amount: 8000  },  // full
  { customer: 'Pooja Sharma',   amount: 7000  },  // full
  { customer: 'Riya Kumari',    amount: 22000 },  // full
  { customer: 'Aditya Raj',     amount: 18000 },  // full
  { customer: 'Simran Kaur',    amount: 16000 },  // full
  { customer: 'Nisha Singh',    amount: 12000 },  // full
  { customer: 'Abhishek Kumar', amount: 25000 },  // full
  { customer: 'Rohit Sharma',   amount: 10000 },  // partial (15000 total)
  { customer: 'Rahul Gupta',    amount: 12000 },  // partial (18000 total)
  { customer: 'Harsh Verma',    amount: 7000  },  // partial (11000 total)
  { customer: 'Muskan Sharma',  amount: 10000 },  // partial (18000 total)
  // Sneha Das: unpaid (0)
];

// Correct expenses as per the requirement
const EXPENSES = [
  { category: 'Coaching Center Rent', amount: 18000, description: 'Monthly coaching center rent' },
  { category: 'Electricity Bill',     amount: 3500,  description: 'Monthly electricity bill' },
  { category: 'Internet Bill',        amount: 1000,  description: 'Monthly internet bill' },
  { category: 'Trainer Salary',       amount: 22000, description: 'Trainer salary for the month' },
  { category: 'Staff Salary',         amount: 12000, description: 'Staff salary for the month' },
  { category: 'Marketing Expense',    amount: 4000,  description: 'Digital marketing and promotion' },
  { category: 'Office Stationery',    amount: 1500,  description: 'Stationery and supplies' },
  { category: 'Computer Maintenance', amount: 2500,  description: 'Computer repair and maintenance' },
  { category: 'Software Subscription',amount: 1500,  description: 'Monthly software subscription' },
  { category: 'Cleaning Charges',     amount: 1000,  description: 'Office cleaning charges' },
];

// ─── HELPER: Convert one quote to invoice ─────────────────────────────────────
async function convertQuote(client, quoteId, userId) {
  const quoteRes = await client.query(`SELECT * FROM quotes WHERE id = $1 AND user_id = $2`, [quoteId, userId]);
  if (!quoteRes.rows.length) throw new Error(`Quote ${quoteId} not found`);
  const quote = quoteRes.rows[0];

  // Check if already converted
  const dupCheck = await client.query(`SELECT id FROM invoices WHERE quote_id = $1 AND user_id = $2 LIMIT 1`, [quoteId, userId]);
  if (dupCheck.rows.length > 0) {
    return { invoiceId: dupCheck.rows[0].id, alreadyConverted: true };
  }

  // Generate invoice number
  const today = new Date().toISOString().slice(0, 10);
  const invNumber = `INV-Q-${today.replace(/-/g, '')}-${Date.now().toString().slice(-6)}`;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  const dueDateStr = dueDate.toISOString().slice(0, 10);

  // Create invoice
  const invResult = await client.query(
    `INSERT INTO invoices
       (customer_id, user_id, invoice_number, invoice_date, due_date, status,
        notes, terms, total_amount, balance_due, salesperson_id, project_id, quote_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [
      quote.customer_id, userId, invNumber, today, dueDateStr, 'sent',
      quote.notes || null, quote.terms || null,
      quote.total_amount, quote.total_amount,
      quote.salesperson_id || null, quote.project_id || null, quoteId
    ]
  );
  const invoiceId = invResult.rows[0].id;

  // Copy quote items → invoice items
  const qiRes = await client.query(`SELECT * FROM quote_items WHERE quote_id = $1`, [quoteId]);
  for (const item of qiRes.rows) {
    await client.query(
      `INSERT INTO invoice_items
         (invoice_id, item_id, item_name, hsn_code, unit, description, quantity, unit_price, tax_rate, discount, discount_type, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        invoiceId, item.item_id || null, item.item_name || null, item.hsn_code || null, item.unit || null,
        item.description || null, item.quantity || 1, item.unit_price || 0,
        item.tax_rate || 0, item.discount || 0, item.discount_type || 'flat', item.total || 0
      ]
    );
  }

  // Mark quote as invoiced
  await client.query(`UPDATE quotes SET status = 'invoiced', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [quoteId]);
  return { invoiceId, alreadyConverted: false };
}

// ─── HELPER: Add payment ─────────────────────────────────────────────────────
async function addPayment(pool, invoiceId, userId, amount, paymentDate) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify invoice
    const invRes = await client.query(`SELECT * FROM invoices WHERE id = $1 AND user_id = $2`, [invoiceId, userId]);
    if (!invRes.rows.length) throw new Error('Invoice not found');
    const invoice = invRes.rows[0];

    if (amount > parseFloat(invoice.balance_due)) {
      throw new Error(`Overpayment blocked: amount ${amount} > balance_due ${invoice.balance_due}`);
    }

    // Insert payment
    await client.query(
      `INSERT INTO payments (invoice_id, user_id, amount, payment_date, payment_method, reference_number)
       VALUES ($1,$2,$3,$4,'Bank Transfer','PAY-' || $3)`,
      [invoiceId, userId, amount, paymentDate]
    );

    // Update invoice balance
    const newBalance = parseFloat(invoice.balance_due) - amount;
    const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid';
    await client.query(
      `UPDATE invoices SET balance_due = $1, status = $2 WHERE id = $3`,
      [newBalance, newStatus, invoiceId]
    );

    await client.query('COMMIT');
    return { success: true, newBalance, newStatus };
  } catch(e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ─── HELPER: Add expense with journal entry ───────────────────────────────────
async function addExpense(pool, userId, expenseSpec, expenseDate) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert expense
    const expResult = await client.query(
      `INSERT INTO expenses (user_id, vendor_id, category, amount, expense_date, description, status)
       VALUES ($1, NULL, $2, $3, $4, $5, 'paid') RETURNING *`,
      [userId, expenseSpec.category, expenseSpec.amount, expenseDate, expenseSpec.description]
    );
    const expense = expResult.rows[0];

    // Find or create Expense account in chart_of_accounts
    let expAccRes = await client.query(
      `SELECT id FROM chart_of_accounts WHERE user_id = $1 AND account_name = $2 LIMIT 1`,
      [userId, expenseSpec.category]
    );
    let expAccountId;
    if (!expAccRes.rows.length) {
      const newAcc = await client.query(
        `INSERT INTO chart_of_accounts (user_id, account_name, account_type, is_active) VALUES ($1, $2, 'Expense', true) RETURNING id`,
        [userId, expenseSpec.category]
      );
      expAccountId = newAcc.rows[0].id;
    } else {
      expAccountId = expAccRes.rows[0].id;
    }

    // Find or create Cash account
    let cashRes = await client.query(
      `SELECT id FROM chart_of_accounts WHERE user_id = $1 AND (account_name ILIKE '%cash%' OR account_type = 'Asset') ORDER BY id ASC LIMIT 1`,
      [userId]
    );
    let cashAccountId;
    if (!cashRes.rows.length) {
      const newCash = await client.query(
        `INSERT INTO chart_of_accounts (user_id, account_name, account_type, is_active) VALUES ($1, 'Cash', 'Asset', true) RETURNING id`,
        [userId]
      );
      cashAccountId = newCash.rows[0].id;
    } else {
      cashAccountId = cashRes.rows[0].id;
    }

    // Create journal entry
    const je = await client.query(
      `INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_number, reference_id)
       VALUES ($1, $2, $3, 'EXPENSE', $4, $5) RETURNING id`,
      [userId, expenseDate, expenseSpec.description, `EXP-${expense.id}`, expense.id]
    );

    await client.query(
      `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit) VALUES ($1, $2, $3, 0), ($1, $4, 0, $3)`,
      [je.rows[0].id, expAccountId, expense.amount, cashAccountId]
    );

    await client.query('COMMIT');
    return expense;
  } catch(e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function run() {
  try {
    const userRes = await pool.query(`SELECT id FROM users WHERE email = $1`, [DEMO_EMAIL]);
    const userId = userRes.rows[0].id;
    console.log(`✅ User ID: ${userId}\n`);

    // Load customers
    const custRes = await pool.query(`SELECT id, display_name FROM customers WHERE user_id = $1`, [userId]);
    const custMap = {};
    custRes.rows.forEach(c => { custMap[c.display_name] = c.id; });

    // Load all quotes
    const quotesRes = await pool.query(
      `SELECT q.id, q.quote_number, q.status, q.total_amount, c.display_name as cname
       FROM quotes q LEFT JOIN customers c ON q.customer_id = c.id
       WHERE q.user_id = $1`, [userId]
    );
    const quoteByCustomer = {};
    quotesRes.rows.forEach(q => { quoteByCustomer[q.cname] = q; });

    // ─── STEP 1: Convert quotes to invoices ───────────────────────────────
    console.log('=== STEP 1: CONVERTING QUOTES TO INVOICES ===');
    const invoiceByCustomer = {};
    const conversionResults = [];

    for (const customerName of TO_CONVERT) {
      const quote = quoteByCustomer[customerName];
      if (!quote) {
        console.log(`❌ No quote found for: ${customerName}`);
        conversionResults.push({ customer: customerName, status: 'FAILED - no quote' });
        continue;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await convertQuote(client, quote.id, userId);
        await client.query('COMMIT');

        if (result.alreadyConverted) {
          console.log(`⏭️  ${customerName}: Already converted → Invoice ID: ${result.invoiceId}`);
          conversionResults.push({ customer: customerName, quoteNum: quote.quote_number, status: 'ALREADY_CONVERTED', invoiceId: result.invoiceId });
        } else {
          console.log(`✅ ${customerName}: Quote ${quote.quote_number} → Invoice ID: ${result.invoiceId} | ₹${quote.total_amount}`);
          conversionResults.push({ customer: customerName, quoteNum: quote.quote_number, quoteAmount: quote.total_amount, status: 'CONVERTED', invoiceId: result.invoiceId });
        }
        invoiceByCustomer[customerName] = result.invoiceId;
      } catch(err) {
        await client.query('ROLLBACK');
        console.error(`❌ FAILED: ${customerName} - ${err.message}`);
        conversionResults.push({ customer: customerName, status: `FAILED - ${err.message}` });
      } finally {
        client.release();
      }
    }

    // ─── STEP 2: Add payments ─────────────────────────────────────────────
    console.log('\n=== STEP 2: ADDING PAYMENTS ===');
    const today = new Date().toISOString().slice(0, 10);
    const paymentResults = [];

    for (const payment of PAYMENTS) {
      const invoiceId = invoiceByCustomer[payment.customer];
      if (!invoiceId) {
        // Try to find from DB
        const invRes = await pool.query(
          `SELECT i.id, i.balance_due, i.invoice_number FROM invoices i
           JOIN customers c ON i.customer_id = c.id
           WHERE i.user_id = $1 AND c.display_name = $2 AND i.quote_id IS NOT NULL
           ORDER BY i.id DESC LIMIT 1`, [userId, payment.customer]
        );
        if (!invRes.rows.length) {
          console.log(`❌ No invoice found for payment: ${payment.customer}`);
          paymentResults.push({ customer: payment.customer, status: 'FAILED - no invoice' });
          continue;
        }
        invoiceByCustomer[payment.customer] = invRes.rows[0].id;
      }
      
      const invId = invoiceByCustomer[payment.customer];
      try {
        const result = await addPayment(pool, invId, userId, payment.amount, today);
        console.log(`✅ ${payment.customer}: ₹${payment.amount} paid → Balance: ₹${result.newBalance} | Status: ${result.newStatus}`);
        paymentResults.push({ customer: payment.customer, amount: payment.amount, newBalance: result.newBalance, status: result.newStatus });
      } catch(err) {
        console.error(`❌ Payment FAILED: ${payment.customer} - ${err.message}`);
        paymentResults.push({ customer: payment.customer, status: `FAILED - ${err.message}` });
      }
    }

    // ─── STEP 3: Add expenses ─────────────────────────────────────────────
    console.log('\n=== STEP 3: ADDING EXPENSES ===');
    let totalExpenses = 0;
    const expenseResults = [];

    for (const exp of EXPENSES) {
      try {
        const expense = await addExpense(pool, userId, exp, today);
        console.log(`✅ ${exp.category}: ₹${exp.amount}`);
        totalExpenses += exp.amount;
        expenseResults.push({ category: exp.category, amount: exp.amount, status: 'CREATED' });
      } catch(err) {
        console.error(`❌ Expense FAILED: ${exp.category} - ${err.message}`);
        expenseResults.push({ category: exp.category, status: `FAILED - ${err.message}` });
      }
    }
    console.log(`\nTotal New Expenses Added: ₹${totalExpenses}`);

    // ─── FINAL SUMMARY ────────────────────────────────────────────────────
    console.log('\n=== FINAL VERIFICATION ===');
    const finalQuotes = await pool.query(`SELECT COUNT(*) FROM quotes WHERE user_id = $1`, [userId]);
    const finalInvoices = await pool.query(`SELECT COUNT(*), SUM(total_amount) FROM invoices WHERE user_id = $1`, [userId]);
    const quoteInvoices = await pool.query(`SELECT COUNT(*), SUM(total_amount) FROM invoices WHERE user_id = $1 AND quote_id IS NOT NULL`, [userId]);
    const finalPayments = await pool.query(`SELECT COUNT(*), SUM(amount) FROM payments WHERE user_id = $1`, [userId]);
    const finalExpenses = await pool.query(`SELECT COUNT(*), SUM(amount) FROM expenses WHERE user_id = $1`, [userId]);
    const unpaidInv = await pool.query(`SELECT SUM(balance_due) FROM invoices WHERE user_id = $1 AND status NOT IN ('paid')`, [userId]);
    
    console.log(`Total Quotes:    ${finalQuotes.rows[0].count}`);
    console.log(`Total Invoices:  ${finalInvoices.rows[0].count} (₹${finalInvoices.rows[0].sum})`);
    console.log(`Quote-Invoices:  ${quoteInvoices.rows[0].count} (₹${quoteInvoices.rows[0].sum})`);
    console.log(`Total Payments:  ${finalPayments.rows[0].count} (₹${finalPayments.rows[0].sum})`);
    console.log(`Total Expenses:  ${finalExpenses.rows[0].count} (₹${finalExpenses.rows[0].sum})`);
    console.log(`Pending Receivable: ₹${unpaidInv.rows[0].sum}`);
    
    // Show invoice statuses for quote-based invoices
    const invStatuses = await pool.query(
      `SELECT i.invoice_number, c.display_name, i.total_amount, i.balance_due, i.status
       FROM invoices i JOIN customers c ON i.customer_id = c.id
       WHERE i.user_id = $1 AND i.quote_id IS NOT NULL ORDER BY i.id`, [userId]
    );
    console.log('\n=== QUOTE-BASED INVOICES ===');
    invStatuses.rows.forEach(i => 
      console.log(`  ${i.invoice_number} | ${i.display_name} | ₹${i.total_amount} | Due: ₹${i.balance_due} | ${i.status}`)
    );

  } catch(e) {
    console.error('FATAL ERROR:', e.message, e.stack);
  }
  process.exit(0);
}

run();
