const pool = require("../config/db");

// ---- ensure tables and extra columns exist ----
const initializeVendorCredits = async () => {
  const statements = [
    `CREATE TABLE IF NOT EXISTS vendor_credits (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
      bill_id INTEGER REFERENCES bills(id) ON DELETE SET NULL,
      vendor_credit_number VARCHAR(50) NOT NULL,
      vendor_credit_date DATE NOT NULL,
      reference_number VARCHAR(100),
      reason VARCHAR(255),
      status VARCHAR(50) DEFAULT 'Draft',
      subtotal NUMERIC(12,2) DEFAULT 0,
      discount_total NUMERIC(12,2) DEFAULT 0,
      tax_total NUMERIC(12,2) DEFAULT 0,
      total NUMERIC(12,2) DEFAULT 0,
      applied_amount NUMERIC(12,2) DEFAULT 0,
      remaining_amount NUMERIC(12,2) DEFAULT 0,
      notes TEXT,
      terms_conditions TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS vendor_credit_items (
      id SERIAL PRIMARY KEY,
      vendor_credit_id INTEGER REFERENCES vendor_credits(id) ON DELETE CASCADE,
      item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
      item_name VARCHAR(255),
      description TEXT,
      quantity NUMERIC(10,2) DEFAULT 1,
      rate NUMERIC(12,2) DEFAULT 0,
      discount NUMERIC(10,2) DEFAULT 0,
      discount_type VARCHAR(10) DEFAULT 'flat',
      tax_rate NUMERIC(5,2) DEFAULT 0,
      tax_amount NUMERIC(12,2) DEFAULT 0,
      line_total NUMERIC(12,2) DEFAULT 0
    )`
  ];
  for (const sql of statements) {
    try { await pool.query(sql); } catch (err) { console.error("Vendor Credits DB Init Error:", err); }
  }
};
initializeVendorCredits();

// ================= GET ALL VENDOR CREDITS =================
const getVendorCredits = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM vendor_credits WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ vendor_credits: result.rows });
  } catch (err) {
    console.error("GET VENDOR CREDITS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET SINGLE VENDOR CREDIT =================
const getVendorCreditById = async (req, res) => {
  const { id } = req.params;
  try {
    const vcResult = await pool.query(
      `SELECT * FROM vendor_credits WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (vcResult.rows.length === 0) {
      return res.status(404).json({ message: "Vendor Credit not found" });
    }

    const itemsResult = await pool.query(
      `SELECT vci.*,
              COALESCE(vci.item_name, i.name) AS item_name
       FROM vendor_credit_items vci
       LEFT JOIN items i ON vci.item_id = i.id
       WHERE vci.vendor_credit_id = $1`,
      [id]
    );

    res.json({
      vendor_credit: vcResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (err) {
    console.error("GET VENDOR CREDIT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= CREATE VENDOR CREDIT =================
const createVendorCredit = async (req, res) => {
  const { vendor_id, bill_id, vendor_credit_date, reference_number, reason, status, notes, terms_conditions, items } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Generate VC number
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const countResult = await client.query(
      `SELECT COUNT(*) FROM vendor_credits WHERE vendor_credit_date = $1 AND user_id = $2`,
      [vendor_credit_date || new Date().toISOString().slice(0, 10), req.user.id]
    );
    const count = parseInt(countResult.rows[0].count) + 1;
    const vcNumber = `VC-${today}-${String(count).padStart(4, "0")}`;

    const vcResult = await client.query(
      `INSERT INTO vendor_credits
       (user_id, vendor_id, bill_id, vendor_credit_number, vendor_credit_date, reference_number, reason, status, notes, terms_conditions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        req.user.id,
        vendor_id,
        bill_id || null,
        vcNumber,
        vendor_credit_date || new Date().toISOString().slice(0, 10),
        reference_number || null,
        reason || null,
        status || "Draft",
        notes || null,
        terms_conditions || null,
      ]
    );
    const vcId = vcResult.rows[0].id;

    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        const disc = parseFloat(item.discount) || 0;
        const discType = item.discount_type || "flat";
        const taxRate = parseFloat(item.tax_rate) || 0;

        const rowSubtotal = qty * rate;
        subtotal += rowSubtotal;

        let rowDiscount = 0;
        if (discType === "percent") {
          rowDiscount = rowSubtotal * (disc / 100);
        } else {
          rowDiscount = disc;
        }
        discountTotal += rowDiscount;

        let taxableAmount = rowSubtotal - rowDiscount;
        let rowTax = taxableAmount * (taxRate / 100);
        taxTotal += rowTax;

        let lineTotal = taxableAmount + rowTax;

        await client.query(
          `INSERT INTO vendor_credit_items
           (vendor_credit_id, item_id, item_name, description, quantity, rate, discount, discount_type, tax_rate, tax_amount, line_total)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            vcId,
            item.item_id || null,
            item.item_name || null,
            item.description || null,
            qty,
            rate,
            disc,
            discType,
            taxRate,
            rowTax,
            lineTotal,
          ]
        );
      }
    }

    const total = subtotal - discountTotal + taxTotal;

    // Update totals and remaining amount
    await client.query(
      `UPDATE vendor_credits SET subtotal = $1, discount_total = $2, tax_total = $3, total = $4, remaining_amount = $4 WHERE id = $5`,
      [subtotal, discountTotal, taxTotal, total, vcId]
    );

    const fetchedRes = await client.query(`SELECT * FROM vendor_credits WHERE id = $1`, [vcId]);

    await client.query("COMMIT");
    res.json({ message: "Vendor Credit created", vendor_credit: fetchedRes.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CREATE VENDOR CREDIT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ================= UPDATE VENDOR CREDIT =================
const updateVendorCredit = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  delete updates.id;
  delete updates.user_id;
  delete updates.created_at;
  delete updates.updated_at;
  delete updates.applied_amount;
  delete updates.remaining_amount;

  const { items, ...vcFields } = updates;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const currentRes = await client.query(
      `SELECT status, applied_amount FROM vendor_credits WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (currentRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Vendor Credit not found" });
    }
    const currentVC = currentRes.rows[0];

    if (parseFloat(currentVC.applied_amount) > 0 && items !== undefined) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Cannot edit items after credit has been applied." });
    }

    const setColumns = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(vcFields)) {
      if (value !== undefined && key !== 'subtotal' && key !== 'discount_total' && key !== 'tax_total' && key !== 'total') {
        setColumns.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    let vcResult;
    if (setColumns.length > 0) {
      setColumns.push(`updated_at = CURRENT_TIMESTAMP`);
      const query = `
        UPDATE vendor_credits
        SET ${setColumns.join(", ")}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;
      values.push(id, req.user.id);
      vcResult = await client.query(query, values);
    } else {
      vcResult = await client.query(
        `SELECT * FROM vendor_credits WHERE id = $1 AND user_id = $2`,
        [id, req.user.id]
      );
    }

    if (items !== undefined && parseFloat(currentVC.applied_amount) === 0) {
      await client.query(`DELETE FROM vendor_credit_items WHERE vendor_credit_id = $1`, [id]);

      let subtotal = 0;
      let discountTotal = 0;
      let taxTotal = 0;

      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          const qty = parseFloat(item.quantity) || 0;
          const rate = parseFloat(item.rate) || 0;
          const disc = parseFloat(item.discount) || 0;
          const discType = item.discount_type || "flat";
          const taxRate = parseFloat(item.tax_rate) || 0;

          const rowSubtotal = qty * rate;
          subtotal += rowSubtotal;

          let rowDiscount = 0;
          if (discType === "percent") {
            rowDiscount = rowSubtotal * (disc / 100);
          } else {
            rowDiscount = disc;
          }
          discountTotal += rowDiscount;

          let taxableAmount = rowSubtotal - rowDiscount;
          let rowTax = taxableAmount * (taxRate / 100);
          taxTotal += rowTax;

          let lineTotal = taxableAmount + rowTax;

          await client.query(
            `INSERT INTO vendor_credit_items
             (vendor_credit_id, item_id, item_name, description, quantity, rate, discount, discount_type, tax_rate, tax_amount, line_total)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [
              id,
              item.item_id || null,
              item.item_name || null,
              item.description || null,
              qty,
              rate,
              disc,
              discType,
              taxRate,
              rowTax,
              lineTotal,
            ]
          );
        }
      }

      const total = subtotal - discountTotal + taxTotal;

      await client.query(
        `UPDATE vendor_credits SET subtotal = $1, discount_total = $2, tax_total = $3, total = $4, remaining_amount = $4 WHERE id = $5`,
        [subtotal, discountTotal, taxTotal, total, id]
      );
      vcResult = await client.query(`SELECT * FROM vendor_credits WHERE id = $1`, [id]);
    }

    await client.query("COMMIT");
    res.json({ message: "Vendor Credit updated", vendor_credit: vcResult.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("UPDATE VENDOR CREDIT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ================= DELETE VENDOR CREDIT =================
const deleteVendorCredit = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    const check = await client.query(
      `SELECT applied_amount FROM vendor_credits WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Vendor Credit not found" });
    }
    if (parseFloat(check.rows[0].applied_amount) > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Cannot delete a vendor credit that has been applied." });
    }

    await client.query(
      `DELETE FROM vendor_credits WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id]
    );
    
    await client.query("COMMIT");
    res.json({ message: "Vendor Credit deleted" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("DELETE VENDOR CREDIT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ================= CANCEL VENDOR CREDIT =================
const cancelVendorCredit = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    const check = await client.query(
      `SELECT applied_amount FROM vendor_credits WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Vendor Credit not found" });
    }
    if (parseFloat(check.rows[0].applied_amount) > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Cannot cancel a vendor credit that has been applied." });
    }

    const result = await client.query(
      `UPDATE vendor_credits SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id]
    );
    
    await client.query("COMMIT");
    res.json({ message: "Vendor Credit cancelled", vendor_credit: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CANCEL VENDOR CREDIT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ================= APPLY CREDIT TO BILL =================
const applyCreditToBill = async (req, res) => {
  const { id } = req.params;
  const { bill_id, amount_to_apply } = req.body;
  
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const vcRes = await client.query(
      `SELECT * FROM vendor_credits WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (vcRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Vendor Credit not found" });
    }
    const vc = vcRes.rows[0];

    if (vc.status === 'Cancelled') {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Cannot apply a cancelled vendor credit." });
    }

    const billRes = await client.query(
      `SELECT * FROM bills WHERE id = $1 AND user_id = $2`,
      [bill_id, req.user.id]
    );
    if (billRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Bill not found" });
    }
    const bill = billRes.rows[0];

    if (bill.status === 'paid' || parseFloat(bill.balance_due) <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Bill is already fully paid." });
    }

    const amount = parseFloat(amount_to_apply) || 0;
    if (amount <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Amount to apply must be greater than zero." });
    }

    const remainingVC = parseFloat(vc.remaining_amount);
    if (amount > remainingVC) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: `Cannot apply more than the remaining vendor credit balance (₹${remainingVC}).` });
    }

    const remainingBill = parseFloat(bill.balance_due);
    if (amount > remainingBill) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: `Cannot apply more than the bill balance due (₹${remainingBill}).` });
    }

    // Update Bill
    const newBillBalance = remainingBill - amount;
    const newBillStatus = newBillBalance <= 0 ? 'paid' : 'partially_paid';

    await client.query(
      `UPDATE bills SET balance_due = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [newBillBalance, newBillStatus, bill_id]
    );

    // Update Vendor Credit
    const newVCApplied = parseFloat(vc.applied_amount) + amount;
    const newVCRemaining = remainingVC - amount;
    const newVCStatus = newVCRemaining <= 0 ? 'Applied' : 'Open';

    const updatedVC = await client.query(
      `UPDATE vendor_credits SET applied_amount = $1, remaining_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`,
      [newVCApplied, newVCRemaining, newVCStatus, id]
    );

    await client.query("COMMIT");
    res.json({ message: `Successfully applied ₹${amount} to bill ${bill.bill_number}`, vendor_credit: updatedVC.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("APPLY VENDOR CREDIT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

module.exports = {
  getVendorCredits,
  getVendorCreditById,
  createVendorCredit,
  updateVendorCredit,
  deleteVendorCredit,
  cancelVendorCredit,
  applyCreditToBill,
};
