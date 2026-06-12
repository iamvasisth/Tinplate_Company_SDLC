const pool = require("../config/db");

// ---- ensure tables and extra columns exist ----
const initializeCreditNotes = async () => {
  const statements = [
    `CREATE TABLE IF NOT EXISTS credit_notes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
      credit_note_number VARCHAR(50) NOT NULL,
      credit_note_date DATE NOT NULL,
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
    `CREATE TABLE IF NOT EXISTS credit_note_items (
      id SERIAL PRIMARY KEY,
      credit_note_id INTEGER REFERENCES credit_notes(id) ON DELETE CASCADE,
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
    try { await pool.query(sql); } catch (err) { console.error("Credit Notes DB Init Error:", err); }
  }
};
initializeCreditNotes();

// ================= GET ALL CREDIT NOTES =================
const getCreditNotes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM credit_notes WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ credit_notes: result.rows });
  } catch (err) {
    console.error("GET CREDIT NOTES ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET SINGLE CREDIT NOTE =================
const getCreditNoteById = async (req, res) => {
  const { id } = req.params;
  try {
    const cnResult = await pool.query(
      `SELECT * FROM credit_notes WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (cnResult.rows.length === 0) {
      return res.status(404).json({ message: "Credit Note not found" });
    }

    const itemsResult = await pool.query(
      `SELECT cni.*,
              COALESCE(cni.item_name, i.name) AS item_name
       FROM credit_note_items cni
       LEFT JOIN items i ON cni.item_id = i.id
       WHERE cni.credit_note_id = $1`,
      [id]
    );

    res.json({
      credit_note: cnResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (err) {
    console.error("GET CREDIT NOTE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= CREATE CREDIT NOTE =================
const createCreditNote = async (req, res) => {
  const { customer_id, invoice_id, credit_note_date, reference_number, reason, status, notes, terms_conditions, items } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Generate CN number
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const countResult = await client.query(
      `SELECT COUNT(*) FROM credit_notes WHERE credit_note_date = $1 AND user_id = $2`,
      [credit_note_date || new Date().toISOString().slice(0, 10), req.user.id]
    );
    const count = parseInt(countResult.rows[0].count) + 1;
    const cnNumber = `CN-${today}-${String(count).padStart(4, "0")}`;

    const cnResult = await client.query(
      `INSERT INTO credit_notes
       (user_id, customer_id, invoice_id, credit_note_number, credit_note_date, reference_number, reason, status, notes, terms_conditions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        req.user.id,
        customer_id,
        invoice_id || null,
        cnNumber,
        credit_note_date || new Date().toISOString().slice(0, 10),
        reference_number || null,
        reason || null,
        status || "Draft",
        notes || null,
        terms_conditions || null,
      ]
    );
    const cnId = cnResult.rows[0].id;

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
          `INSERT INTO credit_note_items
           (credit_note_id, item_id, item_name, description, quantity, rate, discount, discount_type, tax_rate, tax_amount, line_total)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            cnId,
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
      `UPDATE credit_notes SET subtotal = $1, discount_total = $2, tax_total = $3, total = $4, remaining_amount = $4 WHERE id = $5`,
      [subtotal, discountTotal, taxTotal, total, cnId]
    );

    const fetchedRes = await client.query(`SELECT * FROM credit_notes WHERE id = $1`, [cnId]);

    await client.query("COMMIT");
    res.json({ message: "Credit Note created", credit_note: fetchedRes.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CREATE CREDIT NOTE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ================= UPDATE CREDIT NOTE =================
const updateCreditNote = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  delete updates.id;
  delete updates.user_id;
  delete updates.created_at;
  delete updates.updated_at;
  delete updates.applied_amount;
  delete updates.remaining_amount;

  const { items, ...cnFields } = updates;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const currentRes = await client.query(
      `SELECT status, applied_amount FROM credit_notes WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (currentRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Credit Note not found" });
    }
    const currentCN = currentRes.rows[0];

    if (parseFloat(currentCN.applied_amount) > 0 && items !== undefined) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Cannot edit items after credit has been applied." });
    }

    const setColumns = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(cnFields)) {
      if (value !== undefined && key !== 'subtotal' && key !== 'discount_total' && key !== 'tax_total' && key !== 'total') {
        setColumns.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    let cnResult;
    if (setColumns.length > 0) {
      setColumns.push(`updated_at = CURRENT_TIMESTAMP`);
      const query = `
        UPDATE credit_notes
        SET ${setColumns.join(", ")}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;
      values.push(id, req.user.id);
      cnResult = await client.query(query, values);
    } else {
      cnResult = await client.query(
        `SELECT * FROM credit_notes WHERE id = $1 AND user_id = $2`,
        [id, req.user.id]
      );
    }

    if (items !== undefined && parseFloat(currentCN.applied_amount) === 0) {
      await client.query(`DELETE FROM credit_note_items WHERE credit_note_id = $1`, [id]);

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
            `INSERT INTO credit_note_items
             (credit_note_id, item_id, item_name, description, quantity, rate, discount, discount_type, tax_rate, tax_amount, line_total)
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
        `UPDATE credit_notes SET subtotal = $1, discount_total = $2, tax_total = $3, total = $4, remaining_amount = $4 WHERE id = $5`,
        [subtotal, discountTotal, taxTotal, total, id]
      );
      cnResult = await client.query(`SELECT * FROM credit_notes WHERE id = $1`, [id]);
    }

    await client.query("COMMIT");
    res.json({ message: "Credit Note updated", credit_note: cnResult.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("UPDATE CREDIT NOTE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ================= DELETE CREDIT NOTE =================
const deleteCreditNote = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    const check = await client.query(
      `SELECT applied_amount FROM credit_notes WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Credit Note not found" });
    }
    if (parseFloat(check.rows[0].applied_amount) > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Cannot delete a credit note that has been applied." });
    }

    await client.query(
      `DELETE FROM credit_notes WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id]
    );
    
    await client.query("COMMIT");
    res.json({ message: "Credit Note deleted" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("DELETE CREDIT NOTE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ================= CANCEL CREDIT NOTE =================
const cancelCreditNote = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    const check = await client.query(
      `SELECT applied_amount FROM credit_notes WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Credit Note not found" });
    }
    if (parseFloat(check.rows[0].applied_amount) > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Cannot cancel a credit note that has been applied." });
    }

    const result = await client.query(
      `UPDATE credit_notes SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id]
    );
    
    await client.query("COMMIT");
    res.json({ message: "Credit Note cancelled", credit_note: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CANCEL CREDIT NOTE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ================= APPLY CREDIT TO INVOICE =================
const applyCreditToInvoice = async (req, res) => {
  const { id } = req.params;
  const { invoice_id, amount_to_apply } = req.body;
  
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const cnRes = await client.query(
      `SELECT * FROM credit_notes WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (cnRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Credit Note not found" });
    }
    const cn = cnRes.rows[0];

    if (cn.status === 'Cancelled') {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Cannot apply a cancelled credit note." });
    }

    const invRes = await client.query(
      `SELECT * FROM invoices WHERE id = $1 AND user_id = $2`,
      [invoice_id, req.user.id]
    );
    if (invRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Invoice not found" });
    }
    const inv = invRes.rows[0];

    if (inv.status === 'paid' || parseFloat(inv.balance_due) <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Invoice is already fully paid." });
    }

    const amount = parseFloat(amount_to_apply) || 0;
    if (amount <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Amount to apply must be greater than zero." });
    }

    const remainingCN = parseFloat(cn.remaining_amount);
    if (amount > remainingCN) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: `Cannot apply more than the remaining credit note balance (₹${remainingCN}).` });
    }

    const remainingInv = parseFloat(inv.balance_due);
    if (amount > remainingInv) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: `Cannot apply more than the invoice balance due (₹${remainingInv}).` });
    }

    // Update Invoice
    const newInvBalance = remainingInv - amount;
    const newInvStatus = newInvBalance <= 0 ? 'paid' : 'partially_paid';

    await client.query(
      `UPDATE invoices SET balance_due = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [newInvBalance, newInvStatus, invoice_id]
    );

    // Update Credit Note
    const newCNApplied = parseFloat(cn.applied_amount) + amount;
    const newCNRemaining = remainingCN - amount;
    const newCNStatus = newCNRemaining <= 0 ? 'Applied' : 'Open';

    const updatedCN = await client.query(
      `UPDATE credit_notes SET applied_amount = $1, remaining_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`,
      [newCNApplied, newCNRemaining, newCNStatus, id]
    );

    // Optional: Log this application in a separate table if we ever create `credit_note_applications`
    // For now, updating balances directly is sufficient per schema.

    await client.query("COMMIT");
    res.json({ message: `Successfully applied ₹${amount} to invoice ${inv.invoice_number}`, credit_note: updatedCN.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("APPLY CREDIT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

module.exports = {
  getCreditNotes,
  getCreditNoteById,
  createCreditNote,
  updateCreditNote,
  deleteCreditNote,
  cancelCreditNote,
  applyCreditToInvoice,
};
