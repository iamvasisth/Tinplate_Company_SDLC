const pool = require("../config/db");

// ---- Ensure tables exist ----
const initializeRecurringInvoices = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recurring_invoices (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        recurring_invoice_number VARCHAR(100),
        profile_name VARCHAR(255) NOT NULL,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        frequency VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        next_invoice_date DATE,
        last_invoice_date DATE,
        status VARCHAR(50) DEFAULT 'Active',
        subtotal NUMERIC(12,2) DEFAULT 0,
        discount_total NUMERIC(12,2) DEFAULT 0,
        tax_total NUMERIC(12,2) DEFAULT 0,
        total NUMERIC(12,2) DEFAULT 0,
        notes TEXT,
        terms_conditions TEXT,
        auto_send_email BOOLEAN DEFAULT false,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS recurring_invoice_items (
        id SERIAL PRIMARY KEY,
        recurring_invoice_id INTEGER REFERENCES recurring_invoices(id) ON DELETE CASCADE,
        item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
        item_name VARCHAR(255),
        description TEXT,
        quantity NUMERIC(12,2) DEFAULT 1,
        rate NUMERIC(12,2) DEFAULT 0,
        discount NUMERIC(12,2) DEFAULT 0,
        tax_rate NUMERIC(5,2) DEFAULT 0,
        tax_amount NUMERIC(12,2) DEFAULT 0,
        line_total NUMERIC(12,2) DEFAULT 0
      );
    `);

    // Alter invoices table safely
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='recurring_invoice_id') THEN
          ALTER TABLE invoices ADD COLUMN recurring_invoice_id INTEGER REFERENCES recurring_invoices(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  } catch (err) {
    console.error("Recurring Invoices DB Init Error:", err);
  }
};
initializeRecurringInvoices();

// Helper to calculate next date
const calculateNextDate = (currentDate, frequency) => {
    const d = new Date(currentDate);
    if (frequency === 'Weekly') d.setDate(d.getDate() + 7);
    else if (frequency === 'Monthly') d.setMonth(d.getMonth() + 1);
    else if (frequency === 'Quarterly') d.setMonth(d.getMonth() + 3);
    else if (frequency === 'Yearly') d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
};

// ================= GET ALL =================
const getRecurringInvoices = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, c.display_name as customer_name 
       FROM recurring_invoices r
       LEFT JOIN customers c ON r.customer_id = c.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json({ recurring_invoices: result.rows });
  } catch (err) {
    console.error("GET RECURRING INVOICES ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET BY ID =================
const getRecurringInvoiceById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT r.*, c.display_name as customer_name, c.email as customer_email, c.billing_address
       FROM recurring_invoices r
       LEFT JOIN customers c ON r.customer_id = c.id
       WHERE r.id = $1 AND r.user_id = $2`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Recurring Invoice not found" });

    const itemsRes = await pool.query(`SELECT * FROM recurring_invoice_items WHERE recurring_invoice_id = $1 ORDER BY id`, [id]);
    const recurring_invoice = result.rows[0];
    recurring_invoice.items = itemsRes.rows;

    res.json({ recurring_invoice });
  } catch (err) {
    console.error("GET RECURRING INVOICE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= CREATE =================
const createRecurringInvoice = async (req, res) => {
  const { 
    profile_name, customer_id, frequency, start_date, end_date, 
    items, notes, terms_conditions, auto_send_email,
    subtotal, discount_total, tax_total, total
  } = req.body;

  if (!profile_name || !customer_id || !frequency || !start_date || !items || items.length === 0) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Generate number
    const countRes = await client.query(`SELECT COUNT(*) FROM recurring_invoices WHERE user_id = $1`, [req.user.id]);
    const recNumber = `REC-${String(parseInt(countRes.rows[0].count) + 1).padStart(5, '0')}`;

    // next_invoice_date is usually start_date initially
    const next_invoice_date = start_date;

    const rRes = await client.query(
      `INSERT INTO recurring_invoices 
       (user_id, recurring_invoice_number, profile_name, customer_id, frequency, start_date, end_date, next_invoice_date, 
        subtotal, discount_total, tax_total, total, notes, terms_conditions, auto_send_email, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        req.user.id, recNumber, profile_name, customer_id, frequency, start_date, end_date || null, next_invoice_date,
        subtotal, discount_total, tax_total, total, notes, terms_conditions, auto_send_email, req.user.id
      ]
    );

    const recurring_invoice_id = rRes.rows[0].id;

    for (const item of items) {
      await client.query(
        `INSERT INTO recurring_invoice_items 
         (recurring_invoice_id, item_id, item_name, description, quantity, rate, discount, tax_rate, tax_amount, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          recurring_invoice_id, item.item_id || null, item.item_name, item.description, 
          item.quantity, item.rate, item.discount, item.tax_rate, item.tax_amount, item.line_total
        ]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Recurring invoice created", id: recurring_invoice_id });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CREATE RECURRING INVOICE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ================= UPDATE =================
const updateRecurringInvoice = async (req, res) => {
  const { id } = req.params;
  const { 
    profile_name, frequency, end_date, next_invoice_date,
    items, notes, terms_conditions, auto_send_email,
    subtotal, discount_total, tax_total, total
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Check exists
    const checkRes = await client.query(`SELECT id FROM recurring_invoices WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
    if (checkRes.rows.length === 0) throw new Error("Not found");

    await client.query(
      `UPDATE recurring_invoices SET 
       profile_name = $1, frequency = $2, end_date = $3, next_invoice_date = $4,
       subtotal = $5, discount_total = $6, tax_total = $7, total = $8,
       notes = $9, terms_conditions = $10, auto_send_email = $11, updated_at = CURRENT_TIMESTAMP
       WHERE id = $12 AND user_id = $13`,
      [
        profile_name, frequency, end_date || null, next_invoice_date,
        subtotal, discount_total, tax_total, total, notes, terms_conditions, auto_send_email,
        id, req.user.id
      ]
    );

    // Recreate items
    await client.query(`DELETE FROM recurring_invoice_items WHERE recurring_invoice_id = $1`, [id]);
    for (const item of items) {
      await client.query(
        `INSERT INTO recurring_invoice_items 
         (recurring_invoice_id, item_id, item_name, description, quantity, rate, discount, tax_rate, tax_amount, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          id, item.item_id || null, item.item_name, item.description, 
          item.quantity, item.rate, item.discount, item.tax_rate, item.tax_amount, item.line_total
        ]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Recurring invoice updated" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("UPDATE RECURRING INVOICE ERROR:", err);
    res.status(500).json({ message: err.message || "Server error" });
  } finally {
    client.release();
  }
};

// ================= STATUS TOGGLES =================
const updateStatus = async (req, res, statusMsg) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE recurring_invoices SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *`,
      [statusMsg, id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Not found" });
    res.json({ message: `Recurring invoice ${statusMsg.toLowerCase()}` });
  } catch (err) {
    console.error("UPDATE STATUS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
const pauseRecurringInvoice = (req, res) => updateStatus(req, res, 'Paused');
const resumeRecurringInvoice = (req, res) => updateStatus(req, res, 'Active');
const stopRecurringInvoice = (req, res) => updateStatus(req, res, 'Stopped');

// ================= GENERATED INVOICES =================
const getGeneratedInvoices = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM invoices WHERE recurring_invoice_id = $1 AND user_id = $2 ORDER BY created_at DESC`,
      [id, req.user.id]
    );
    res.json({ invoices: result.rows });
  } catch (err) {
    console.error("GET GENERATED INVOICES ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GENERATE NOW =================
const generateNow = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    
    // 1. Fetch template
    const rRes = await client.query(`SELECT * FROM recurring_invoices WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
    if (rRes.rows.length === 0) throw new Error("Recurring Profile not found");
    const rec = rRes.rows[0];

    if (rec.status === 'Stopped') throw new Error("Cannot generate invoice for a Stopped profile");

    // Check end date
    const today = new Date().toISOString().slice(0,10);
    if (rec.end_date && today > new Date(rec.end_date).toISOString().slice(0,10)) {
        await client.query(`UPDATE recurring_invoices SET status = 'Stopped' WHERE id = $1`, [id]);
        throw new Error("End date passed. Profile stopped automatically.");
    }

    // 2. Fetch items
    const itemsRes = await client.query(`SELECT * FROM recurring_invoice_items WHERE recurring_invoice_id = $1`, [id]);
    const items = itemsRes.rows;
    if (items.length === 0) throw new Error("No items found in template");

    // 3. Generate Invoice Number
    const invCountRes = await client.query(`SELECT COUNT(*) FROM invoices WHERE user_id = $1`, [req.user.id]);
    const nextInvNumber = `INV-${String(parseInt(invCountRes.rows[0].count) + 1).padStart(5, '0')}`;
    const invoiceDate = rec.next_invoice_date || today;
    const dueDate = invoiceDate; // default due same day for now

    // 4. Create Invoice
    const invInsert = await client.query(
      `INSERT INTO invoices 
       (user_id, customer_id, recurring_invoice_id, invoice_number, invoice_date, due_date, status, 
        subtotal, tax_amount, discount_amount, total, balance_due, notes, terms_conditions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
      [
        req.user.id, rec.customer_id, rec.id, nextInvNumber, invoiceDate, dueDate, 'draft',
        rec.subtotal, rec.tax_total, rec.discount_total, rec.total, rec.total, 
        rec.notes, rec.terms_conditions
      ]
    );
    const invoiceId = invInsert.rows[0].id;

    // 5. Create Items
    for (const item of items) {
      await client.query(
        `INSERT INTO invoice_items 
         (invoice_id, item_id, item_name, description, quantity, unit_price, tax_rate, tax_amount, discount, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          invoiceId, item.item_id, item.item_name, item.description, 
          item.quantity, item.rate, item.tax_rate, item.tax_amount, item.discount, item.line_total
        ]
      );
    }

    // 6. Update Profile Dates
    const nextDate = calculateNextDate(invoiceDate, rec.frequency);
    await client.query(
      `UPDATE recurring_invoices 
       SET last_invoice_date = $1, next_invoice_date = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [invoiceDate, nextDate, id]
    );

    // Optional: Could integrate auto_send_email logic here if project has email util

    await client.query("COMMIT");
    res.json({ message: "Invoice generated successfully", invoice_id: invoiceId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("GENERATE INVOICE ERROR:", err);
    res.status(400).json({ message: err.message || "Failed to generate invoice" });
  } finally {
    client.release();
  }
};

module.exports = {
  getRecurringInvoices,
  getRecurringInvoiceById,
  createRecurringInvoice,
  updateRecurringInvoice,
  pauseRecurringInvoice,
  resumeRecurringInvoice,
  stopRecurringInvoice,
  getGeneratedInvoices,
  generateNow
};
