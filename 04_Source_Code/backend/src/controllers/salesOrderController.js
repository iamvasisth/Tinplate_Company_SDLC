const pool = require("../config/db");

// ---- ensure tables and extra columns exist ----
const initializeSalesOrders = async () => {
  const statements = [
    `CREATE TABLE IF NOT EXISTS sales_orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      quote_id INTEGER,
      sales_order_number VARCHAR(50) NOT NULL,
      sales_order_date DATE NOT NULL,
      expected_shipment_date DATE,
      reference_number VARCHAR(100),
      status VARCHAR(50) DEFAULT 'draft',
      notes TEXT,
      terms TEXT,
      total NUMERIC(12,2) DEFAULT 0,
      salesperson_id INTEGER,
      project_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sales_order_items (
      id SERIAL PRIMARY KEY,
      sales_order_id INTEGER REFERENCES sales_orders(id) ON DELETE CASCADE,
      item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
      item_name VARCHAR(255),
      hsn_code VARCHAR(50),
      unit VARCHAR(50),
      description TEXT,
      quantity NUMERIC(10,2) DEFAULT 1,
      unit_price NUMERIC(12,2) DEFAULT 0,
      discount NUMERIC(10,2) DEFAULT 0,
      discount_type VARCHAR(10) DEFAULT 'flat',
      tax_rate NUMERIC(5,2) DEFAULT 0,
      total NUMERIC(12,2) DEFAULT 0
    )`
  ];
  for (const sql of statements) {
    try { await pool.query(sql); } catch (err) { console.error("Sales Orders DB Init Error:", err); }
  }
};
initializeSalesOrders();

// ================= GET ALL SALES ORDERS =================
const getSalesOrders = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM sales_orders WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ sales_orders: result.rows });
  } catch (err) {
    console.error("GET SALES ORDERS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET SINGLE SALES ORDER =================
const getSalesOrderById = async (req, res) => {
  const { id } = req.params;
  try {
    const soResult = await pool.query(
      `SELECT * FROM sales_orders WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (soResult.rows.length === 0) {
      return res.status(404).json({ message: "Sales Order not found" });
    }

    const itemsResult = await pool.query(
      `SELECT soi.*,
              COALESCE(soi.item_name, i.name) AS item_name,
              COALESCE(soi.hsn_code, i.hsn_code)  AS hsn_code,
              COALESCE(soi.unit, i.unit)            AS unit
       FROM sales_order_items soi
       LEFT JOIN items i ON soi.item_id = i.id
       WHERE soi.sales_order_id = $1`,
      [id]
    );

    res.json({
      sales_order: soResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (err) {
    console.error("GET SALES ORDER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= CREATE SALES ORDER =================
const createSalesOrder = async (req, res) => {
  const { customer_id, quote_id, sales_order_date, expected_shipment_date, reference_number, status, notes, terms, items, salesperson_id, project_id } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Generate sales order number
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const countResult = await client.query(
      `SELECT COUNT(*) FROM sales_orders WHERE sales_order_date = $1`,
      [sales_order_date || new Date().toISOString().slice(0, 10)]
    );
    const count = parseInt(countResult.rows[0].count) + 1;
    const soNumber = `SO-${today}-${String(count).padStart(4, "0")}`;

    const soResult = await client.query(
      `INSERT INTO sales_orders
       (customer_id, user_id, quote_id, sales_order_number, sales_order_date, expected_shipment_date, reference_number, status, notes, terms, total, salesperson_id, project_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,$11,$12)
       RETURNING *`,
      [
        customer_id,
        req.user.id,
        quote_id || null,
        soNumber,
        sales_order_date || new Date().toISOString().slice(0, 10),
        expected_shipment_date || null,
        reference_number || null,
        status || "draft",
        notes || null,
        terms || null,
        salesperson_id || null,
        project_id || null,
      ]
    );
    const soId = soResult.rows[0].id;

    let totalAmount = 0;

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.unit_price) || 0;
        const disc = parseFloat(item.discount) || 0;
        const discType = item.discount_type || "flat";
        const taxRate = parseFloat(item.tax_rate) || 0;

        let lineTotal = qty * rate;
        if (discType === "percent") {
          lineTotal -= lineTotal * (disc / 100);
        } else {
          lineTotal -= disc;
        }
        const taxAmt = lineTotal * (taxRate / 100);
        lineTotal += taxAmt;

        await client.query(
          `INSERT INTO sales_order_items
           (sales_order_id, item_id, item_name, hsn_code, unit, description, quantity, rate, tax_rate, discount, discount_type, amount)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            soId,
            item.item_id || null,
            item.item_name || null,
            item.hsn_code || null,
            item.unit || null,
            item.description || null,
            item.quantity || 1,
            item.unit_price || 0,
            item.tax_rate || 0,
            disc,
            discType,
            lineTotal,
          ]
        );
        totalAmount += lineTotal;
      }
    }

    // Update total
    await client.query(
      `UPDATE sales_orders SET total = $1 WHERE id = $2`,
      [totalAmount, soId]
    );
    soResult.rows[0].total = totalAmount;

    // If it was created from a quote, optionally update quote status if it is not already invoiced
    if (quote_id) {
        await client.query(`UPDATE quotes SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status != 'invoiced'`, [quote_id]);
    }

    await client.query("COMMIT");
    res.json({ message: "Sales Order created", sales_order: soResult.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CREATE SALES ORDER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ================= UPDATE SALES ORDER =================
const updateSalesOrder = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;   

  delete updates.id;
  delete updates.user_id;
  delete updates.created_at;
  delete updates.updated_at;

  const { items, ...soFields } = updates;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const setColumns = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(soFields)) {
      if (value !== undefined) {
        setColumns.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    let soResult;
    if (setColumns.length > 0) {
      setColumns.push(`updated_at = CURRENT_TIMESTAMP`);
      const query = `
        UPDATE sales_orders
        SET ${setColumns.join(", ")}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;
      values.push(id, req.user.id);
      soResult = await client.query(query, values);
      if (soResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Sales Order not found" });
      }
    } else {
      soResult = await client.query(
        `SELECT * FROM sales_orders WHERE id = $1 AND user_id = $2`,
        [id, req.user.id]
      );
      if (soResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Sales Order not found" });
      }
    }

    if (items !== undefined) {
      await client.query(`DELETE FROM sales_order_items WHERE sales_order_id = $1`, [id]);

      let totalAmount = 0;
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          const qty = parseFloat(item.quantity) || 0;
          const rate = parseFloat(item.unit_price) || 0;
          const disc = parseFloat(item.discount) || 0;
          const discType = item.discount_type || "flat";
          const taxRate = parseFloat(item.tax_rate) || 0;

          let lineTotal = qty * rate;
          if (discType === "percent") {
            lineTotal -= lineTotal * (disc / 100);
          } else {
            lineTotal -= disc;
          }
          const taxAmt = lineTotal * (taxRate / 100);
          lineTotal += taxAmt;

          await client.query(
            `INSERT INTO sales_order_items
             (sales_order_id, item_id, item_name, hsn_code, unit, description, quantity, rate, tax_rate, discount, discount_type, amount)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              id,
              item.item_id || null,
              item.item_name || null,
              item.hsn_code || null,
              item.unit || null,
              item.description || null,
              item.quantity || 1,
              item.unit_price || 0,
              item.tax_rate || 0,
              disc,
              discType,
              lineTotal,
            ]
          );
          totalAmount += lineTotal;
        }
      }
      await client.query(`UPDATE sales_orders SET total = $1 WHERE id = $2`, [totalAmount, id]);
    }

    await client.query("COMMIT");
    res.json({ message: "Sales Order updated", sales_order: soResult.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("UPDATE SALES ORDER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ================= DELETE SALES ORDER =================
const deleteSalesOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM sales_orders WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Sales Order not found" });
    }
    res.json({ message: "Sales Order deleted" });
  } catch (err) {
    console.error("DELETE SALES ORDER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= CONVERT QUOTE TO SALES ORDER =================
const convertQuoteToSalesOrder = async (req, res) => {
    const { quoteId } = req.params;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
  
      const quoteRes = await client.query(
        `SELECT * FROM quotes WHERE id = $1 AND user_id = $2`,
        [quoteId, req.user.id]
      );
      if (quoteRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Quote not found" });
      }
      const quote = quoteRes.rows[0];
  
      // Duplicate check
      const dupCheck = await client.query(
        `SELECT id FROM sales_orders WHERE quote_id = $1 AND user_id = $2 LIMIT 1`,
        [quoteId, req.user.id]
      );
      if (dupCheck.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(200).json({
          message: "Sales Order already exists for this quote",
          salesOrderId: dupCheck.rows[0].id,
          alreadyConverted: true,
        });
      }
  
      const qiRes = await client.query(
        `SELECT * FROM quote_items WHERE quote_id = $1`,
        [quoteId]
      );
      const quoteItems = qiRes.rows;
  
      // Generate SO number
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const countResult = await client.query(
        `SELECT COUNT(*) FROM sales_orders WHERE sales_order_date = $1`,
        [new Date().toISOString().slice(0, 10)]
      );
      const count = parseInt(countResult.rows[0].count) + 1;
      const soNumber = `SO-${today}-${String(count).padStart(4, "0")}`;
  
      const soResult = await client.query(
        `INSERT INTO sales_orders
           (customer_id, user_id, quote_id, sales_order_number, sales_order_date, status,
            notes, terms, total, salesperson_id, project_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [
          quote.customer_id,
          req.user.id,
          quoteId,
          soNumber,
          new Date().toISOString().slice(0, 10),
          "draft",
          quote.notes   || null,
          quote.terms   || null,
          quote.total_amount,
          quote.salesperson_id    || null,
          quote.project_id        || null,
        ]
      );
      const soId = soResult.rows[0].id;
  
      for (const item of quoteItems) {
        await client.query(
          `INSERT INTO sales_order_items
             (sales_order_id, item_id, item_name, hsn_code, unit,
              description, quantity, rate, tax_rate,
              discount, discount_type, amount)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            soId,
            item.item_id        || null,
            item.item_name      || null,
            item.hsn_code       || null,
            item.unit           || null,
            item.description    || null,
            item.quantity       || 1,
            item.unit_price     || 0,
            item.tax_rate       || 0,
            item.discount       || 0,
            item.discount_type  || "flat",
            item.total          || 0,
          ]
        );
      }
  
      // Mark quote as accepted
      await client.query(
        `UPDATE quotes SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status != 'invoiced'`,
        [quoteId]
      );
  
      await client.query("COMMIT");
      res.json({
        message: "Quote converted to Sales Order successfully",
        salesOrderId: soId,
        salesOrder: soResult.rows[0],
        alreadyConverted: false,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("CONVERT QUOTE TO SALES ORDER ERROR:", err);
      res.status(500).json({ message: "Failed to convert quote" });
    } finally {
      client.release();
    }
};

// ================= CONVERT SALES ORDER TO INVOICE =================
const convertSalesOrderToInvoice = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const soRes = await client.query(
      `SELECT * FROM sales_orders WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (soRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Sales Order not found" });
    }
    const so = soRes.rows[0];

    try {
      await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sales_order_id INTEGER`);
    } catch (_) {}

    // Duplicate prevention
    const dupCheck = await client.query(
      `SELECT id FROM invoices WHERE sales_order_id = $1 AND user_id = $2 LIMIT 1`,
      [id, req.user.id]
    );
    if (dupCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(200).json({
        message: "Invoice already exists for this sales order",
        invoiceId: dupCheck.rows[0].id,
        alreadyConverted: true,
      });
    }

    const itemsRes = await client.query(
      `SELECT * FROM sales_order_items WHERE sales_order_id = $1`,
      [id]
    );
    const soItems = itemsRes.rows;

    const today = new Date().toISOString().slice(0, 10);
    const invNumber = `INV-${today.replace(/-/g, "")}-${Date.now().toString().slice(-4)}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);
    const dueDateStr = dueDate.toISOString().slice(0, 10);

    const invResult = await client.query(
      `INSERT INTO invoices
         (customer_id, user_id, invoice_number, invoice_date, due_date, status,
          notes, terms, total_amount, balance_due,
          salesperson_id, project_id, quote_id, sales_order_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        so.customer_id,
        req.user.id,
        invNumber,
        today,
        dueDateStr,
        "draft",
        so.notes   || null,
        so.terms   || null,
        so.total,
        so.total,
        so.salesperson_id    || null,
        so.project_id        || null,
        so.quote_id          || null,
        id, 
      ]
    );
    const invoiceId = invResult.rows[0].id;

    for (const item of soItems) {
      await client.query(
        `INSERT INTO invoice_items
           (invoice_id, item_id, item_name, hsn_code, unit,
            description, quantity, unit_price, tax_rate,
            discount, discount_type, total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          invoiceId,
          item.item_id        || null,
          item.item_name      || null,
          item.hsn_code       || null,
          item.unit           || null,
          item.description    || null,
          item.quantity       || 1,
          item.rate           || 0,
          item.tax_rate       || 0,
          item.discount       || 0,
          item.discount_type  || "flat",
          item.amount         || 0,
        ]
      );
    }

    // Mark sales order as invoiced
    await client.query(
      `UPDATE sales_orders SET status = 'invoiced', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    // If it was created from a quote, optionally update quote status to invoiced as well
    if (so.quote_id) {
         await client.query(`UPDATE quotes SET status = 'invoiced', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [so.quote_id]);
    }

    await client.query("COMMIT");
    res.json({
      message: "Sales Order converted to invoice successfully",
      invoiceId,
      invoice: invResult.rows[0],
      alreadyConverted: false,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CONVERT SO TO INVOICE ERROR:", err);
    res.status(500).json({ message: "Failed to convert sales order to invoice" });
  } finally {
    client.release();
  }
};

module.exports = {
  getSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  convertQuoteToSalesOrder,
  convertSalesOrderToInvoice,
};
