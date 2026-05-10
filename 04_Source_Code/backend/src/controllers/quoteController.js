const pool = require("../config/db");

// ================= GET ALL QUOTES (for logged-in user) =================
const getQuotes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM quotes WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ quotes: result.rows });
  } catch (err) {
    console.error("GET QUOTES ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET SINGLE QUOTE (with items) =================
const getQuoteById = async (req, res) => {
  const { id } = req.params;
  try {
    const quoteResult = await pool.query(
      `SELECT * FROM quotes WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ message: "Quote not found" });
    }

    const itemsResult = await pool.query(
      `SELECT qi.*, i.name as item_name
       FROM quote_items qi
       LEFT JOIN items i ON qi.item_id = i.id
       WHERE qi.quote_id = $1`,
      [id]
    );

    res.json({
      quote: quoteResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (err) {
    console.error("GET QUOTE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= CREATE QUOTE =================
const createQuote = async (req, res) => {
  const { customer_id, quote_date, expiry_date, status, notes, terms, items } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Generate quote number (simple: Q-YYYYMMDD-XXXX)
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const countResult = await client.query(
      `SELECT COUNT(*) FROM quotes WHERE quote_date = $1`,
      [quote_date || new Date().toISOString().slice(0, 10)]
    );
    const count = parseInt(countResult.rows[0].count) + 1;
    const quoteNumber = `Q-${today}-${String(count).padStart(4, "0")}`;

    const quoteResult = await client.query(
      `INSERT INTO quotes
       (customer_id, user_id, quote_number, quote_date, expiry_date, status, notes, terms, total_amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0)
       RETURNING *`,
      [
        customer_id,
        req.user.id,
        quoteNumber,
        quote_date || new Date().toISOString().slice(0, 10),
        expiry_date || null,
        status || "draft",
        notes || null,
        terms || null,
      ]
    );
    const quoteId = quoteResult.rows[0].id;

    let totalAmount = 0;

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const total = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
        await client.query(
          `INSERT INTO quote_items
           (quote_id, item_id, description, quantity, unit_price, tax_rate, total)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            quoteId,
            item.item_id || null,
            item.description || null,
            item.quantity || 1,
            item.unit_price || 0,
            item.tax_rate || 0,
            total,
          ]
        );
        totalAmount += total;
      }
    }

    // Update total
    await client.query(
      `UPDATE quotes SET total_amount = $1 WHERE id = $2`,
      [totalAmount, quoteId]
    );
    quoteResult.rows[0].total_amount = totalAmount;

    await client.query("COMMIT");
    res.json({ message: "Quote created", quote: quoteResult.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CREATE QUOTE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ================= UPDATE QUOTE =================
const updateQuote = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;   // only the fields the frontend wants to change

  // Remove fields that should never be directly updated
  delete updates.id;
  delete updates.user_id;
  delete updates.created_at;
  delete updates.updated_at;

  // If items are included, handle them separately (see below)
  const { items, ...quoteFields } = updates;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Build the SET clause dynamically from provided fields
    const setColumns = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(quoteFields)) {
      if (value !== undefined) {
        setColumns.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    let quoteResult;
    if (setColumns.length > 0) {
      // Automatically update the timestamp
      setColumns.push(`updated_at = CURRENT_TIMESTAMP`);

      const query = `
        UPDATE quotes
        SET ${setColumns.join(", ")}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;
      values.push(id, req.user.id);
      quoteResult = await client.query(query, values);
      if (quoteResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Quote not found" });
      }
    } else {
      // No fields to update in the quotes table; just fetch current data
      quoteResult = await client.query(
        `SELECT * FROM quotes WHERE id = $1 AND user_id = $2`,
        [id, req.user.id]
      );
      if (quoteResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Quote not found" });
      }
    }

    // Update items only if the 'items' field is present in the request
    if (items !== undefined) {
      await client.query(`DELETE FROM quote_items WHERE quote_id = $1`, [id]);

      let totalAmount = 0;
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          const total = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
          await client.query(
            `INSERT INTO quote_items
             (quote_id, item_id, description, quantity, unit_price, tax_rate, total)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              id,
              item.item_id || null,
              item.description || null,
              item.quantity || 1,
              item.unit_price || 0,
              item.tax_rate || 0,
              total,
            ]
          );
          totalAmount += total;
        }
      }
      await client.query(`UPDATE quotes SET total_amount = $1 WHERE id = $2`, [totalAmount, id]);
    }

    await client.query("COMMIT");
    res.json({ message: "Quote updated", quote: quoteResult.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("UPDATE QUOTE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ================= DELETE QUOTE =================
const deleteQuote = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM quotes WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Quote not found" });
    }
    res.json({ message: "Quote deleted" });
  } catch (err) {
    console.error("DELETE QUOTE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getQuotes,
  getQuoteById,
  createQuote,
  updateQuote,
  deleteQuote,
};