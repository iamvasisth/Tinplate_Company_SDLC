const pool = require("../config/db");

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
      "SELECT * FROM invoice_items WHERE invoice_id = $1",
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
  const { customer_id, invoice_date, due_date, status, notes, terms, items } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const invNumber = "INV-" + Date.now();
    const invResult = await client.query(
      `INSERT INTO invoices (customer_id, user_id, invoice_number, invoice_date, due_date, status, notes, terms, total_amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0) RETURNING *`,
      [customer_id, req.user.id, invNumber, invoice_date || new Date(), due_date, status || "draft", notes, terms]
    );
    const invoiceId = invResult.rows[0].id;

    let total = 0;
    if (Array.isArray(items)) {
      for (const item of items) {
        const amt = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
        await client.query(
          `INSERT INTO invoice_items (invoice_id, item_id, description, quantity, unit_price, tax_rate, total)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [invoiceId, item.item_id, item.description, item.quantity, item.unit_price, item.tax_rate, amt]
        );
        total += amt;
      }
    }
    await client.query("UPDATE invoices SET total_amount = $1 WHERE id = $2", [total, invoiceId]);

    await client.query("COMMIT");
    res.json({ message: "Invoice created", invoice: { ...invResult.rows[0], total_amount: total } });
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
          const amt = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
          await client.query(
            `INSERT INTO invoice_items (invoice_id, item_id, description, quantity, unit_price, tax_rate, total)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [id, item.item_id, item.description, item.quantity, item.unit_price, item.tax_rate, amt]
          );
          total += amt;
        }
      }
      await client.query("UPDATE invoices SET total_amount = $1 WHERE id = $2", [total, id]);
    }

    await client.query("COMMIT");
    res.json({ message: "Invoice updated" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("UPDATE INVOICE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// DELETE invoice
const deleteInvoice = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM invoices WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Invoice not found" });
    res.json({ message: "Invoice deleted" });
  } catch (err) {
    console.error("DELETE INVOICE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getInvoices, getInvoiceById, createInvoice, updateInvoice, deleteInvoice };