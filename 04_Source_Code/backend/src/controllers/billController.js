const pool = require("../config/db");
const { checkTransactionLock } = require("../utils/lockHelper");

// ---- Ensure bills and bill_items tables exist (safe to re-run) ----
const ensureBillsTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id               SERIAL PRIMARY KEY,
        user_id          INTEGER NOT NULL,
        vendor_id        INTEGER NOT NULL,
        bill_number      VARCHAR(100) NOT NULL,
        bill_date        DATE,
        due_date         DATE,
        subtotal         NUMERIC(12,2) DEFAULT 0,
        discount_amount  NUMERIC(10,2) DEFAULT 0,
        tax_amount       NUMERIC(12,2) DEFAULT 0,
        adjustment       NUMERIC(12,2) DEFAULT 0,
        total_amount     NUMERIC(12,2) DEFAULT 0,
        balance_due      NUMERIC(12,2) DEFAULT 0,
        status           VARCHAR(20) DEFAULT 'draft',
        notes            TEXT,
        is_deleted       BOOLEAN DEFAULT false,
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bill_items (
        id             SERIAL PRIMARY KEY,
        bill_id        INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
        item_id        INTEGER,
        item_name      VARCHAR(255),
        description    TEXT,
        hsn_code       VARCHAR(50),
        unit           VARCHAR(50),
        quantity       NUMERIC(10,2) DEFAULT 1,
        unit_price     NUMERIC(12,2) DEFAULT 0,
        discount       NUMERIC(10,2) DEFAULT 0,
        tax_rate       NUMERIC(5,2) DEFAULT 0,
        total          NUMERIC(12,2) DEFAULT 0
      )
    `);
  } catch (err) {
    console.error("ensureBillsTables error:", err);
  }
};
ensureBillsTables();

// ===== GET ALL BILLS =====
const getBills = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM bills
       WHERE user_id = $1 AND is_deleted = false
       ORDER BY bill_date DESC, id DESC`,
      [req.user.id]
    );
    res.json({ bills: result.rows });
  } catch (err) {
    console.error("GET BILLS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===== GET BILL BY ID =====
const getBillById = async (req, res) => {
  const { id } = req.params;
  try {
    const billRes = await pool.query(
      `SELECT * FROM bills WHERE id = $1 AND user_id = $2 AND is_deleted = false`,
      [id, req.user.id]
    );
    if (billRes.rows.length === 0)
      return res.status(404).json({ message: "Bill not found" });

    const itemsRes = await pool.query(
      `SELECT * FROM bill_items WHERE bill_id = $1 ORDER BY id ASC`,
      [id]
    );

    res.json({ bill: billRes.rows[0], items: itemsRes.rows });
  } catch (err) {
    console.error("GET BILL BY ID ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===== CREATE BILL =====
const createBill = async (req, res) => {
  const {
    vendor_id, bill_number, bill_date, due_date,
    subtotal, discount_amount, tax_amount, adjustment, total_amount,
    notes, status, items
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const billRes = await client.query(
      `INSERT INTO bills
         (user_id, vendor_id, bill_number, bill_date, due_date,
          subtotal, discount_amount, tax_amount, adjustment, total_amount, balance_due,
          status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        req.user.id,
        vendor_id,
        bill_number || `BILL-${Date.now()}`,
        bill_date || null,
        due_date || null,
        parseFloat(subtotal) || 0,
        parseFloat(discount_amount) || 0,
        parseFloat(tax_amount) || 0,
        parseFloat(adjustment) || 0,
        parseFloat(total_amount) || 0,
        parseFloat(total_amount) || 0, // initial balance_due is same as total
        status || 'draft',
        notes || null
      ]
    );
    const bill = billRes.rows[0];

    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(
          `INSERT INTO bill_items
             (bill_id, item_id, item_name, description, hsn_code, unit,
              quantity, unit_price, discount, tax_rate, total)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            bill.id,
            item.item_id || null,
            item.item_name || item.name || '',
            item.description || null,
            item.hsn_code || null,
            item.unit || null,
            parseFloat(item.quantity) || 1,
            parseFloat(item.unit_price) || 0,
            parseFloat(item.discount) || 0,
            parseFloat(item.tax_rate) || 0,
            parseFloat(item.total) || 0
          ]
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json({ bill, message: "Bill created successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CREATE BILL ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ===== UPDATE BILL =====
const updateBill = async (req, res) => {
  const { id } = req.params;
  const {
    vendor_id, bill_number, bill_date, due_date,
    subtotal, discount_amount, tax_amount, adjustment, total_amount,
    notes, status, items
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check if bill exists and belongs to user
    const checkRes = await client.query(
      `SELECT * FROM bills WHERE id = $1 AND user_id = $2 AND is_deleted = false`,
      [id, req.user.id]
    );
    if (checkRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Bill not found" });
    }

    await checkTransactionLock(req.user.id, "Bills", checkRes.rows[0].bill_date);
    if (bill_date) await checkTransactionLock(req.user.id, "Bills", bill_date);

    const billRes = await client.query(
      `UPDATE bills SET
         vendor_id = COALESCE($1, vendor_id),
         bill_number = COALESCE($2, bill_number),
         bill_date = COALESCE($3, bill_date),
         due_date = COALESCE($4, due_date),
         subtotal = COALESCE($5, subtotal),
         discount_amount = COALESCE($6, discount_amount),
         tax_amount = COALESCE($7, tax_amount),
         adjustment = COALESCE($8, adjustment),
         total_amount = COALESCE($9, total_amount),
         balance_due = COALESCE($9, balance_due), -- simple sync for now
         status = COALESCE($10, status),
         notes = COALESCE($11, notes),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $12 AND user_id = $13
       RETURNING *`,
      [
        vendor_id || null,
        bill_number || null,
        bill_date || null,
        due_date || null,
        subtotal !== undefined ? parseFloat(subtotal) : null,
        discount_amount !== undefined ? parseFloat(discount_amount) : null,
        tax_amount !== undefined ? parseFloat(tax_amount) : null,
        adjustment !== undefined ? parseFloat(adjustment) : null,
        total_amount !== undefined ? parseFloat(total_amount) : null,
        status || null,
        notes !== undefined ? notes : null,
        id,
        req.user.id
      ]
    );

    // Update items: delete old, insert new
    await client.query(`DELETE FROM bill_items WHERE bill_id = $1`, [id]);

    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(
          `INSERT INTO bill_items
             (bill_id, item_id, item_name, description, hsn_code, unit,
              quantity, unit_price, discount, tax_rate, total)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            id,
            item.item_id || null,
            item.item_name || item.name || '',
            item.description || null,
            item.hsn_code || null,
            item.unit || null,
            parseFloat(item.quantity) || 1,
            parseFloat(item.unit_price) || 0,
            parseFloat(item.discount) || 0,
            parseFloat(item.tax_rate) || 0,
            parseFloat(item.total) || 0
          ]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ bill: billRes.rows[0], message: "Bill updated successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("UPDATE BILL ERROR:", err);
    res.status(err.message.includes("locked") ? 403 : 500).json({ message: err.message || "Server error" });
  } finally {
    client.release();
  }
};

// ===== DELETE BILL (soft delete) =====
const deleteBill = async (req, res) => {
  const { id } = req.params;
  try {
    const checkRes = await pool.query(`SELECT bill_date FROM bills WHERE id = $1 AND user_id = $2 AND is_deleted = false`, [id, req.user.id]);
    if (checkRes.rows.length === 0) return res.status(404).json({ message: "Bill not found" });
    await checkTransactionLock(req.user.id, "Bills", checkRes.rows[0].bill_date);

    const result = await pool.query(
      `UPDATE bills SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND is_deleted = false
       RETURNING id`,
      [id, req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Bill not found" });
    res.json({ message: "Bill deleted" });
  } catch (err) {
    console.error("DELETE BILL ERROR:", err);
    res.status(err.message.includes("locked") ? 403 : 500).json({ message: err.message || "Server error" });
  }
};

module.exports = { getBills, getBillById, createBill, updateBill, deleteBill };
