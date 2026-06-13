const pool = require("../config/db");
const { checkTransactionLock } = require("../utils/lockHelper");

// ---- ensure extra columns exist (safe to re-run) ----
const ensureColumns = async () => {
  const alterStatements = [
    `ALTER TABLE invoices     ADD COLUMN IF NOT EXISTS salesperson_id INTEGER`,
    `ALTER TABLE invoices     ADD COLUMN IF NOT EXISTS project_id INTEGER`,
    `ALTER TABLE invoices     ADD COLUMN IF NOT EXISTS balance_due NUMERIC(12,2) DEFAULT 0`,
    `ALTER TABLE invoices     ADD COLUMN IF NOT EXISTS quote_id INTEGER`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS discount_type VARCHAR(10) DEFAULT 'flat'`,
    // Snapshot columns – preserve item data even if the item is later edited/deleted
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS item_name VARCHAR(255)`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS hsn_code  VARCHAR(50)`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS unit      VARCHAR(50)`,
    // GST Specific Columns
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS supplier_state VARCHAR(100)`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS place_of_supply VARCHAR(100)`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_gstin VARCHAR(20)`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_type VARCHAR(30)`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS taxable_value NUMERIC(12,2) DEFAULT 0`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS cgst_rate NUMERIC(5,2) DEFAULT 0`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(12,2) DEFAULT 0`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS sgst_rate NUMERIC(5,2) DEFAULT 0`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(12,2) DEFAULT 0`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS igst_rate NUMERIC(5,2) DEFAULT 0`,
    `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(12,2) DEFAULT 0`,
  ];
  for (const sql of alterStatements) {
    try { await pool.query(sql); } catch (_) { /* column may already exist */ }
  }
};
ensureColumns();

// GET all invoices
const getInvoices = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM invoices WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json({ invoices: result.rows });
  } catch (err) {
    console.error("GET INVOICES ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET single invoice with items
const getInvoiceById = async (req, res) => {
  const { id } = req.params;
  try {
    const invoice = await pool.query(
      "SELECT * FROM invoices WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    if (invoice.rows.length === 0) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    const items = await pool.query(
      `SELECT ii.*,
              COALESCE(ii.item_name, i.name) AS item_name,
              COALESCE(ii.hsn_code,  i.hsn_code)  AS hsn_code,
              COALESCE(ii.unit,      i.unit)       AS unit
       FROM invoice_items ii
       LEFT JOIN items i ON ii.item_id = i.id
       WHERE ii.invoice_id = $1`,
      [id]
    );
    res.json({ invoice: invoice.rows[0], items: items.rows });
  } catch (err) {
    console.error("GET INVOICE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// CREATE invoice
const createInvoice = async (req, res) => {
  const { customer_id, invoice_date, due_date, status, notes, terms, items, salesperson_id, project_id, supplier_state, place_of_supply, customer_gstin, gst_type } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const invNumber = "INV-" + Date.now();
    const invResult = await client.query(
      `INSERT INTO invoices (customer_id, user_id, invoice_number, invoice_date, due_date, status, notes, terms, total_amount, balance_due, salesperson_id, project_id, supplier_state, place_of_supply, customer_gstin, gst_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,0,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [customer_id, req.user.id, invNumber, invoice_date || new Date(), due_date, status || "draft", notes, terms, salesperson_id || null, project_id || null, supplier_state || null, place_of_supply || null, customer_gstin || null, gst_type || null]
    );
    const invoiceId = invResult.rows[0].id;

    let total = 0;
    if (Array.isArray(items)) {
      for (const item of items) {
        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.unit_price) || 0;
        const disc = parseFloat(item.discount) || 0;
        const discType = item.discount_type || "flat";
        const taxRate = parseFloat(item.tax_rate) || 0;

        let taxableValue = qty * rate;
        if (discType === "percent") {
          taxableValue -= taxableValue * (disc / 100);
        } else {
          taxableValue -= disc;
        }

        // Parse frontend calculated amounts or fallback to basic 0
        const cgstRate = parseFloat(item.cgst_rate) || 0;
        const cgstAmount = parseFloat(item.cgst_amount) || 0;
        const sgstRate = parseFloat(item.sgst_rate) || 0;
        const sgstAmount = parseFloat(item.sgst_amount) || 0;
        const igstRate = parseFloat(item.igst_rate) || 0;
        const igstAmount = parseFloat(item.igst_amount) || 0;

        let lineTotal = taxableValue + cgstAmount + sgstAmount + igstAmount;
        
        // Backward compatibility if frontend didn't pass GST specific fields
        if (cgstRate === 0 && igstRate === 0 && taxRate > 0) {
           const taxAmt = taxableValue * (taxRate / 100);
           lineTotal = taxableValue + taxAmt;
        }

        await client.query(
          `INSERT INTO invoice_items (invoice_id, item_id, item_name, hsn_code, unit, description, quantity, unit_price, tax_rate, discount, discount_type, total, taxable_value, cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
          [invoiceId, item.item_id || null, item.item_name || null, item.hsn_code || null, item.unit || null,
           item.description, item.quantity, item.unit_price, item.tax_rate, disc, discType, lineTotal,
           taxableValue, cgstRate, cgstAmount, sgstRate, sgstAmount, igstRate, igstAmount]
        );
        total += lineTotal;
      }
    }
    await client.query("UPDATE invoices SET total_amount = $1, balance_due = $2 WHERE id = $3", [total, total, invoiceId]);

    await client.query("COMMIT");
    res.json({ message: "Invoice created", invoice: { ...invResult.rows[0], total_amount: total, balance_due: total } });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CREATE INVOICE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// UPDATE invoice (partial)
const updateInvoice = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  delete updates.id; delete updates.user_id; delete updates.created_at; delete updates.updated_at;
  const { items, ...fields } = updates;

  const client = await pool.connect();
  try {
    // Lock check on existing date
    const existing = await pool.query(`SELECT invoice_date FROM invoices WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
    if (existing.rows.length === 0) return res.status(404).json({ message: "Invoice not found" });
    await checkTransactionLock(req.user.id, "Invoices", existing.rows[0].invoice_date);
    if (updates.invoice_date) await checkTransactionLock(req.user.id, "Invoices", updates.invoice_date);

    await client.query("BEGIN");

    const setColumns = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        setColumns.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
    }
    if (setColumns.length > 0) {
      setColumns.push("updated_at = CURRENT_TIMESTAMP");
      const query = `UPDATE invoices SET ${setColumns.join(", ")} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`;
      values.push(id, req.user.id);
      const result = await client.query(query, values);
      if (result.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Invoice not found" });
      }
    }

    if (items !== undefined) {
      await client.query("DELETE FROM invoice_items WHERE invoice_id = $1", [id]);
      let total = 0;
      if (Array.isArray(items)) {
        for (const item of items) {
          const qty = parseFloat(item.quantity) || 0;
          const rate = parseFloat(item.unit_price) || 0;
          const disc = parseFloat(item.discount) || 0;
          const discType = item.discount_type || "flat";
          const taxRate = parseFloat(item.tax_rate) || 0;

          let taxableValue = qty * rate;
          if (discType === "percent") {
            taxableValue -= taxableValue * (disc / 100);
          } else {
            taxableValue -= disc;
          }

          const cgstRate = parseFloat(item.cgst_rate) || 0;
          const cgstAmount = parseFloat(item.cgst_amount) || 0;
          const sgstRate = parseFloat(item.sgst_rate) || 0;
          const sgstAmount = parseFloat(item.sgst_amount) || 0;
          const igstRate = parseFloat(item.igst_rate) || 0;
          const igstAmount = parseFloat(item.igst_amount) || 0;

          let lineTotal = taxableValue + cgstAmount + sgstAmount + igstAmount;
          
          if (cgstRate === 0 && igstRate === 0 && taxRate > 0) {
             const taxAmt = taxableValue * (taxRate / 100);
             lineTotal = taxableValue + taxAmt;
          }

          await client.query(
            `INSERT INTO invoice_items (invoice_id, item_id, item_name, hsn_code, unit, description, quantity, unit_price, tax_rate, discount, discount_type, total, taxable_value, cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
            [id, item.item_id || null, item.item_name || null, item.hsn_code || null, item.unit || null,
             item.description, item.quantity, item.unit_price, item.tax_rate, disc, discType, lineTotal,
             taxableValue, cgstRate, cgstAmount, sgstRate, sgstAmount, igstRate, igstAmount]
          );
          total += lineTotal;
        }
      }
      await client.query("UPDATE invoices SET total_amount = $1, balance_due = $2 WHERE id = $3", [total, total, id]);
    }

    await client.query("COMMIT");
    res.json({ message: "Invoice updated" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("UPDATE INVOICE ERROR:", err);
    res.status(err.message.includes("locked") ? 403 : 500).json({ message: err.message || "Server error" });
  } finally {
    client.release();
  }
};

// DELETE invoice
const deleteInvoice = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await pool.query(`SELECT invoice_date FROM invoices WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
    if (existing.rows.length === 0) return res.status(404).json({ message: "Invoice not found" });
    await checkTransactionLock(req.user.id, "Invoices", existing.rows[0].invoice_date);

    const result = await pool.query(
      "DELETE FROM invoices WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Invoice not found" });
    res.json({ message: "Invoice deleted" });
  } catch (err) {
    console.error("DELETE INVOICE ERROR:", err);
    res.status(err.message.includes("locked") ? 403 : 500).json({ message: err.message || "Server error" });
  }
};

module.exports = { getInvoices, getInvoiceById, createInvoice, updateInvoice, deleteInvoice };