const pool = require("../config/db");

// ---- ensure tables and extra columns exist ----
const initializePurchaseOrders = async () => {
  const statements = [
    `CREATE TABLE IF NOT EXISTS purchase_orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
      purchase_order_number VARCHAR(50) NOT NULL,
      purchase_order_date DATE NOT NULL,
      expected_delivery_date DATE,
      reference_number VARCHAR(100),
      status VARCHAR(50) DEFAULT 'Draft',
      notes TEXT,
      terms_conditions TEXT,
      subtotal NUMERIC(12,2) DEFAULT 0,
      discount_total NUMERIC(12,2) DEFAULT 0,
      tax_total NUMERIC(12,2) DEFAULT 0,
      total_amount NUMERIC(12,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS purchase_order_items (
      id SERIAL PRIMARY KEY,
      purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
      item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
      item_name VARCHAR(255),
      description TEXT,
      hsn_code VARCHAR(50),
      unit VARCHAR(50),
      quantity NUMERIC(10,2) DEFAULT 1,
      rate NUMERIC(12,2) DEFAULT 0,
      discount NUMERIC(10,2) DEFAULT 0,
      discount_type VARCHAR(10) DEFAULT 'flat',
      tax_rate NUMERIC(5,2) DEFAULT 0,
      tax_amount NUMERIC(12,2) DEFAULT 0,
      line_total NUMERIC(12,2) DEFAULT 0
    )`,
    `ALTER TABLE bills ADD COLUMN IF NOT EXISTS purchase_order_id INTEGER`
  ];
  for (const sql of statements) {
    try { await pool.query(sql); } catch (err) { console.error("Purchase Orders DB Init Error:", err); }
  }
};
initializePurchaseOrders();

// ================= GET ALL PURCHASE ORDERS =================
const getPurchaseOrders = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM purchase_orders WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ purchase_orders: result.rows });
  } catch (err) {
    console.error("GET PURCHASE ORDERS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET SINGLE PURCHASE ORDER =================
const getPurchaseOrderById = async (req, res) => {
  const { id } = req.params;
  try {
    const poResult = await pool.query(
      `SELECT * FROM purchase_orders WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (poResult.rows.length === 0) {
      return res.status(404).json({ message: "Purchase Order not found" });
    }

    const itemsResult = await pool.query(
      `SELECT poi.*,
              COALESCE(poi.item_name, i.name) AS item_name,
              COALESCE(poi.hsn_code, i.hsn_code)  AS hsn_code,
              COALESCE(poi.unit, i.unit)            AS unit
       FROM purchase_order_items poi
       LEFT JOIN items i ON poi.item_id = i.id
       WHERE poi.purchase_order_id = $1`,
      [id]
    );

    res.json({
      purchase_order: poResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (err) {
    console.error("GET PURCHASE ORDER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= CREATE PURCHASE ORDER =================
const createPurchaseOrder = async (req, res) => {
  const { vendor_id, purchase_order_date, expected_delivery_date, reference_number, status, notes, terms_conditions, items } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Generate PO number
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const countResult = await client.query(
      `SELECT COUNT(*) FROM purchase_orders WHERE purchase_order_date = $1 AND user_id = $2`,
      [purchase_order_date || new Date().toISOString().slice(0, 10), req.user.id]
    );
    const count = parseInt(countResult.rows[0].count) + 1;
    const poNumber = `PO-${today}-${String(count).padStart(4, "0")}`;

    const poResult = await client.query(
      `INSERT INTO purchase_orders
       (customer_id, user_id, vendor_id, purchase_order_number, purchase_order_date, expected_delivery_date, reference_number, status, notes, terms_conditions, subtotal, discount_total, tax_total, total_amount)
       VALUES (NULL, $1,$2,$3,$4,$5,$6,$7,$8,$9, 0, 0, 0, 0)
       RETURNING *`,
      [
        req.user.id,
        vendor_id,
        poNumber,
        purchase_order_date || new Date().toISOString().slice(0, 10),
        expected_delivery_date || null,
        reference_number || null,
        status || "Draft",
        notes || null,
        terms_conditions || null,
      ]
    ).catch(async (e) => {
        // Fallback if schema does not have customer_id
        return await client.query(
          `INSERT INTO purchase_orders
           (user_id, vendor_id, purchase_order_number, purchase_order_date, expected_delivery_date, reference_number, status, notes, terms_conditions, subtotal, discount_total, tax_total, total_amount)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, 0, 0, 0, 0)
           RETURNING *`,
          [
            req.user.id,
            vendor_id,
            poNumber,
            purchase_order_date || new Date().toISOString().slice(0, 10),
            expected_delivery_date || null,
            reference_number || null,
            status || "Draft",
            notes || null,
            terms_conditions || null,
          ]
        )
    });
    const poId = poResult.rows[0].id;

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
          `INSERT INTO purchase_order_items
           (purchase_order_id, item_id, item_name, description, hsn_code, unit, quantity, rate, discount, discount_type, tax_rate, tax_amount, line_total)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            poId,
            item.item_id || null,
            item.item_name || null,
            item.description || null,
            item.hsn_code || null,
            item.unit || null,
            item.quantity || 1,
            item.rate || 0,
            disc,
            discType,
            item.tax_rate || 0,
            rowTax,
            lineTotal,
          ]
        );
      }
    }

    const totalAmount = subtotal - discountTotal + taxTotal;

    // Update totals
    await client.query(
      `UPDATE purchase_orders SET subtotal = $1, discount_total = $2, tax_total = $3, total_amount = $4 WHERE id = $5`,
      [subtotal, discountTotal, taxTotal, totalAmount, poId]
    );

    soResult = await client.query(`SELECT * FROM purchase_orders WHERE id = $1`, [poId]);

    await client.query("COMMIT");
    res.json({ message: "Purchase Order created", purchase_order: soResult.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CREATE PURCHASE ORDER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ================= UPDATE PURCHASE ORDER =================
const updatePurchaseOrder = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  delete updates.id;
  delete updates.user_id;
  delete updates.created_at;
  delete updates.updated_at;

  const { items, ...poFields } = updates;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const setColumns = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(poFields)) {
      if (value !== undefined && key !== 'subtotal' && key !== 'discount_total' && key !== 'tax_total' && key !== 'total_amount') {
        setColumns.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    let poResult;
    if (setColumns.length > 0) {
      setColumns.push(`updated_at = CURRENT_TIMESTAMP`);
      const query = `
        UPDATE purchase_orders
        SET ${setColumns.join(", ")}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;
      values.push(id, req.user.id);
      poResult = await client.query(query, values);
      if (poResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Purchase Order not found" });
      }
    } else {
      poResult = await client.query(
        `SELECT * FROM purchase_orders WHERE id = $1 AND user_id = $2`,
        [id, req.user.id]
      );
      if (poResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Purchase Order not found" });
      }
    }

    if (items !== undefined) {
      await client.query(`DELETE FROM purchase_order_items WHERE purchase_order_id = $1`, [id]);

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
            `INSERT INTO purchase_order_items
             (purchase_order_id, item_id, item_name, description, hsn_code, unit, quantity, rate, discount, discount_type, tax_rate, tax_amount, line_total)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [
              id,
              item.item_id || null,
              item.item_name || null,
              item.description || null,
              item.hsn_code || null,
              item.unit || null,
              item.quantity || 1,
              item.rate || 0,
              disc,
              discType,
              item.tax_rate || 0,
              rowTax,
              lineTotal,
            ]
          );
        }
      }

      const totalAmount = subtotal - discountTotal + taxTotal;

      await client.query(
        `UPDATE purchase_orders SET subtotal = $1, discount_total = $2, tax_total = $3, total_amount = $4 WHERE id = $5`,
        [subtotal, discountTotal, taxTotal, totalAmount, id]
      );
      poResult = await client.query(`SELECT * FROM purchase_orders WHERE id = $1`, [id]);
    }

    await client.query("COMMIT");
    res.json({ message: "Purchase Order updated", purchase_order: poResult.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("UPDATE PURCHASE ORDER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ================= CANCEL / DELETE PURCHASE ORDER =================
const deletePurchaseOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM purchase_orders WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Purchase Order not found" });
    }
    res.json({ message: "Purchase Order deleted" });
  } catch (err) {
    console.error("DELETE PURCHASE ORDER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= CONVERT PURCHASE ORDER TO BILL =================
const convertPurchaseOrderToBill = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const poRes = await client.query(
      `SELECT * FROM purchase_orders WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (poRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Purchase Order not found" });
    }
    const po = poRes.rows[0];

    // Duplicate check
    const dupCheck = await client.query(
      `SELECT id FROM bills WHERE purchase_order_id = $1 AND user_id = $2 AND is_deleted = false LIMIT 1`,
      [id, req.user.id]
    );
    if (dupCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(200).json({
        message: "Bill already exists for this purchase order",
        billId: dupCheck.rows[0].id,
        alreadyConverted: true,
      });
    }

    const itemsRes = await client.query(
      `SELECT * FROM purchase_order_items WHERE purchase_order_id = $1`,
      [id]
    );
    const poItems = itemsRes.rows;

    const today = new Date().toISOString().slice(0, 10);
    const billNumber = `BILL-${today.replace(/-/g, "")}-${Date.now().toString().slice(-4)}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);
    const dueDateStr = dueDate.toISOString().slice(0, 10);

    const billResult = await client.query(
      `INSERT INTO bills
         (user_id, vendor_id, bill_number, bill_date, due_date,
          subtotal, discount_amount, tax_amount, adjustment, total_amount, balance_due,
          status, notes, purchase_order_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        req.user.id,
        po.vendor_id,
        billNumber,
        today,
        dueDateStr,
        po.subtotal,
        po.discount_total,
        po.tax_total,
        0,
        po.total_amount,
        po.total_amount, // balance_due
        "draft",
        po.notes || null,
        id, 
      ]
    );
    const billId = billResult.rows[0].id;

    for (const item of poItems) {
      await client.query(
        `INSERT INTO bill_items
           (bill_id, item_id, item_name, description, hsn_code, unit,
            quantity, unit_price, discount, tax_rate, total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          billId,
          item.item_id        || null,
          item.item_name      || null,
          item.description    || null,
          item.hsn_code       || null,
          item.unit           || null,
          item.quantity       || 1,
          item.rate           || 0, // In PO it's rate, in Bill it's unit_price
          item.discount       || 0,
          item.tax_rate       || 0,
          item.line_total     || 0,
        ]
      );
    }

    // Mark PO as Billed
    await client.query(
      `UPDATE purchase_orders SET status = 'Billed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    await client.query("COMMIT");
    res.json({
      message: "Purchase Order converted to bill successfully",
      billId,
      bill: billResult.rows[0],
      alreadyConverted: false,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CONVERT PO TO BILL ERROR:", err);
    res.status(500).json({ message: "Failed to convert purchase order to bill" });
  } finally {
    client.release();
  }
};

module.exports = {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  convertPurchaseOrderToBill,
};
