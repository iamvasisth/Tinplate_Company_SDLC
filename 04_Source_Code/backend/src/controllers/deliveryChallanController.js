const pool = require("../config/db");

// ---- ensure tables and extra columns exist ----
const initializeDeliveryChallans = async () => {
  const statements = [
    `CREATE TABLE IF NOT EXISTS delivery_challans (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      sales_order_id INTEGER,
      delivery_challan_number VARCHAR(50) NOT NULL,
      challan_date DATE NOT NULL,
      delivery_date DATE,
      delivery_address TEXT,
      reference_number VARCHAR(100),
      status VARCHAR(50) DEFAULT 'Draft',
      stock_reduced BOOLEAN DEFAULT FALSE,
      notes TEXT,
      terms_conditions TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS delivery_challan_items (
      id SERIAL PRIMARY KEY,
      delivery_challan_id INTEGER REFERENCES delivery_challans(id) ON DELETE CASCADE,
      item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
      item_name VARCHAR(255),
      description TEXT,
      quantity NUMERIC(10,2) DEFAULT 1,
      unit VARCHAR(50),
      rate NUMERIC(12,2) DEFAULT 0,
      line_total NUMERIC(12,2) DEFAULT 0
    )`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivery_challan_id INTEGER`
  ];
  for (const sql of statements) {
    try { await pool.query(sql); } catch (err) { console.error("Delivery Challan DB Init Error:", err); }
  }
};
initializeDeliveryChallans();

// ================= GET ALL DELIVERY CHALLANS =================
const getDeliveryChallans = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM delivery_challans WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ delivery_challans: result.rows });
  } catch (err) {
    console.error("GET DELIVERY CHALLANS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET SINGLE DELIVERY CHALLAN =================
const getDeliveryChallanById = async (req, res) => {
  const { id } = req.params;
  try {
    const dcResult = await pool.query(
      `SELECT * FROM delivery_challans WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (dcResult.rows.length === 0) {
      return res.status(404).json({ message: "Delivery Challan not found" });
    }

    const itemsResult = await pool.query(
      `SELECT dci.*,
              COALESCE(dci.item_name, i.name) AS item_name,
              COALESCE(dci.unit, i.unit)            AS unit
       FROM delivery_challan_items dci
       LEFT JOIN items i ON dci.item_id = i.id
       WHERE dci.delivery_challan_id = $1`,
      [id]
    );

    res.json({
      delivery_challan: dcResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (err) {
    console.error("GET DELIVERY CHALLAN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= CREATE DELIVERY CHALLAN =================
const createDeliveryChallan = async (req, res) => {
  const { customer_id, sales_order_id, challan_date, delivery_date, delivery_address, reference_number, status, notes, terms_conditions, items } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Generate DC number
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const countResult = await client.query(
      `SELECT COUNT(*) FROM delivery_challans WHERE challan_date = $1 AND user_id = $2`,
      [challan_date || new Date().toISOString().slice(0, 10), req.user.id]
    );
    const count = parseInt(countResult.rows[0].count) + 1;
    const dcNumber = `DC-${today}-${String(count).padStart(4, "0")}`;

    const dcResult = await client.query(
      `INSERT INTO delivery_challans
       (user_id, customer_id, sales_order_id, delivery_challan_number, challan_date, delivery_date, delivery_address, reference_number, status, notes, terms_conditions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        req.user.id,
        customer_id,
        sales_order_id || null,
        dcNumber,
        challan_date || new Date().toISOString().slice(0, 10),
        delivery_date || null,
        delivery_address || null,
        reference_number || null,
        status || "Draft",
        notes || null,
        terms_conditions || null,
      ]
    );
    const dcId = dcResult.rows[0].id;

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        const lineTotal = qty * rate;

        await client.query(
          `INSERT INTO delivery_challan_items
           (delivery_challan_id, item_id, item_name, description, quantity, unit, rate, line_total)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            dcId,
            item.item_id || null,
            item.item_name || null,
            item.description || null,
            qty,
            item.unit || null,
            rate,
            lineTotal,
          ]
        );
      }
    }

    const fetchedRes = await client.query(`SELECT * FROM delivery_challans WHERE id = $1`, [dcId]);

    await client.query("COMMIT");
    res.json({ message: "Delivery Challan created", delivery_challan: fetchedRes.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CREATE DELIVERY CHALLAN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ================= UPDATE DELIVERY CHALLAN =================
const updateDeliveryChallan = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  delete updates.id;
  delete updates.user_id;
  delete updates.created_at;
  delete updates.updated_at;
  delete updates.stock_reduced; // prevent manual modification of stock flag

  const { items, ...dcFields } = updates;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // First check if it's already delivered. If stock is already reduced, we cannot update items
    const currentRes = await client.query(
      `SELECT status, stock_reduced FROM delivery_challans WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (currentRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Delivery Challan not found" });
    }
    const currentDC = currentRes.rows[0];

    if (currentDC.stock_reduced && items !== undefined) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Cannot edit items after stock has been delivered and reduced." });
    }

    const setColumns = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(dcFields)) {
      if (value !== undefined) {
        setColumns.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    let dcResult;
    if (setColumns.length > 0) {
      setColumns.push(`updated_at = CURRENT_TIMESTAMP`);
      const query = `
        UPDATE delivery_challans
        SET ${setColumns.join(", ")}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;
      values.push(id, req.user.id);
      dcResult = await client.query(query, values);
    } else {
      dcResult = await client.query(
        `SELECT * FROM delivery_challans WHERE id = $1 AND user_id = $2`,
        [id, req.user.id]
      );
    }

    if (items !== undefined && !currentDC.stock_reduced) {
      await client.query(`DELETE FROM delivery_challan_items WHERE delivery_challan_id = $1`, [id]);

      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          const qty = parseFloat(item.quantity) || 0;
          const rate = parseFloat(item.rate) || 0;
          const lineTotal = qty * rate;

          await client.query(
            `INSERT INTO delivery_challan_items
             (delivery_challan_id, item_id, item_name, description, quantity, unit, rate, line_total)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              id,
              item.item_id || null,
              item.item_name || null,
              item.description || null,
              qty,
              item.unit || null,
              rate,
              lineTotal,
            ]
          );
        }
      }
      dcResult = await client.query(`SELECT * FROM delivery_challans WHERE id = $1`, [id]);
    }

    await client.query("COMMIT");
    res.json({ message: "Delivery Challan updated", delivery_challan: dcResult.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("UPDATE DELIVERY CHALLAN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ================= DELETE DELIVERY CHALLAN =================
const deleteDeliveryChallan = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Check stock_reduced
    const check = await client.query(
      `SELECT stock_reduced FROM delivery_challans WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Delivery Challan not found" });
    }
    if (check.rows[0].stock_reduced) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Cannot delete a delivered challan. Stock has already been reduced." });
    }

    const result = await client.query(
      `DELETE FROM delivery_challans WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id]
    );
    
    await client.query("COMMIT");
    res.json({ message: "Delivery Challan deleted" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("DELETE DELIVERY CHALLAN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ================= CANCEL DELIVERY CHALLAN =================
const cancelDeliveryChallan = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    const check = await client.query(
      `SELECT stock_reduced FROM delivery_challans WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (check.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Delivery Challan not found" });
    }
    if (check.rows[0].stock_reduced) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Cannot cancel a delivered challan. Stock has already been reduced." });
    }

    const result = await client.query(
      `UPDATE delivery_challans SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id]
    );
    
    await client.query("COMMIT");
    res.json({ message: "Delivery Challan cancelled", delivery_challan: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CANCEL DELIVERY CHALLAN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ================= MARK DELIVERED (STOCK LOGIC) =================
const markDelivered = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const dcRes = await client.query(
      `SELECT * FROM delivery_challans WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (dcRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Delivery Challan not found" });
    }
    const dc = dcRes.rows[0];

    if (dc.stock_reduced) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Stock is already reduced for this Delivery Challan." });
    }
    if (dc.status === 'Cancelled') {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Cannot mark a cancelled challan as delivered." });
    }

    const itemsRes = await client.query(
      `SELECT * FROM delivery_challan_items WHERE delivery_challan_id = $1`,
      [id]
    );
    const items = itemsRes.rows;

    for (const item of items) {
      if (!item.item_id) continue;

      const itemCheck = await client.query(
        "SELECT * FROM items WHERE id = $1 AND user_id = $2",
        [item.item_id, req.user.id]
      );
      if (itemCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: `Item ID ${item.item_id} not found in inventory.` });
      }

      const invItem = itemCheck.rows[0];
      
      // If the item is not inventory tracked (e.g., a Service or untracked Good), safely skip it.
      if (!invItem.is_inventory_tracked) continue;

      const currentStock = parseFloat(invItem.stock_quantity || 0);
      const movQty = parseFloat(item.quantity || 0);

      if (movQty > currentStock) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: `Cannot deliver ${movQty} of ${invItem.name}. Current stock is only ${currentStock}.` });
      }

      const newStock = currentStock - movQty;

      // 1. Insert Inventory Movement
      await client.query(
        `INSERT INTO inventory_movements 
         (user_id, item_id, transaction_type, quantity_change, reference_number, entry_date, description)
         VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6)`,
        [
          req.user.id,
          item.item_id,
          "adjustment",
          -movQty, // negative because it's a reduction
          dc.delivery_challan_number,
          `Delivered via Challan ${dc.delivery_challan_number}`
        ]
      );

      // 2. Update Item Stock
      await client.query(
        `UPDATE items SET stock_quantity = $1 WHERE id = $2 AND user_id = $3`,
        [newStock, item.item_id, req.user.id]
      );
    }

    // Mark as delivered and stock reduced
    const updatedRes = await client.query(
      `UPDATE delivery_challans SET status = 'Delivered', stock_reduced = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );

    await client.query("COMMIT");
    res.json({ message: "Marked as Delivered and stock reduced", delivery_challan: updatedRes.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("MARK DELIVERED ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ================= CREATE DELIVERY CHALLAN FROM SALES ORDER =================
const convertFromSalesOrder = async (req, res) => {
  const { salesOrderId } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const soRes = await client.query(
      `SELECT * FROM sales_orders WHERE id = $1 AND user_id = $2`,
      [salesOrderId, req.user.id]
    );
    if (soRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Sales Order not found" });
    }
    const so = soRes.rows[0];

    // Check if DC already exists for this SO
    const dupCheck = await client.query(
      `SELECT id FROM delivery_challans WHERE sales_order_id = $1 AND user_id = $2 LIMIT 1`,
      [salesOrderId, req.user.id]
    );
    if (dupCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(200).json({
        message: "Delivery Challan already exists for this Sales Order",
        deliveryChallanId: dupCheck.rows[0].id,
        alreadyConverted: true,
      });
    }

    const itemsRes = await client.query(
      `SELECT * FROM sales_order_items WHERE sales_order_id = $1`,
      [salesOrderId]
    );
    const soItems = itemsRes.rows;

    const today = new Date().toISOString().slice(0, 10);
    const countResult = await client.query(
      `SELECT COUNT(*) FROM delivery_challans WHERE challan_date = $1 AND user_id = $2`,
      [today, req.user.id]
    );
    const count = parseInt(countResult.rows[0].count) + 1;
    const dcNumber = `DC-${today.replace(/-/g, "")}-${String(count).padStart(4, "0")}`;

    const dcResult = await client.query(
      `INSERT INTO delivery_challans
         (user_id, customer_id, sales_order_id, delivery_challan_number, challan_date, delivery_date, reference_number, status, notes, terms_conditions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        req.user.id,
        so.customer_id,
        salesOrderId,
        dcNumber,
        today,
        so.expected_shipment_date || null,
        so.reference_number || so.sales_order_number,
        "Draft",
        so.notes || null,
        so.terms || null,
      ]
    );
    const dcId = dcResult.rows[0].id;

    for (const item of soItems) {
      await client.query(
        `INSERT INTO delivery_challan_items
           (delivery_challan_id, item_id, item_name, description, quantity, unit, rate, line_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          dcId,
          item.item_id        || null,
          item.item_name      || null,
          item.description    || null,
          item.quantity       || 1,
          item.unit           || null,
          item.unit_price     || 0,
          ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)) || 0,
        ]
      );
    }

    await client.query("COMMIT");
    res.json({
      message: "Delivery Challan created from Sales Order",
      deliveryChallanId: dcId,
      delivery_challan: dcResult.rows[0],
      alreadyConverted: false,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CONVERT SO TO DC ERROR:", err);
    res.status(500).json({ message: "Failed to convert sales order" });
  } finally {
    client.release();
  }
};

// ================= CONVERT DELIVERY CHALLAN TO INVOICE =================
const convertDeliveryChallanToInvoice = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const dcRes = await client.query(
      `SELECT * FROM delivery_challans WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (dcRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Delivery Challan not found" });
    }
    const dc = dcRes.rows[0];

    // Check if invoice already exists
    const dupCheck = await client.query(
      `SELECT id FROM invoices WHERE delivery_challan_id = $1 AND user_id = $2 AND is_deleted = false LIMIT 1`,
      [id, req.user.id]
    );
    if (dupCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(200).json({
        message: "Invoice already exists for this Delivery Challan",
        invoiceId: dupCheck.rows[0].id,
        alreadyConverted: true,
      });
    }

    const itemsRes = await client.query(
      `SELECT * FROM delivery_challan_items WHERE delivery_challan_id = $1`,
      [id]
    );
    const dcItems = itemsRes.rows;

    const today = new Date().toISOString().slice(0, 10);
    const invoiceNumber = `INV-${today.replace(/-/g, "")}-${Date.now().toString().slice(-4)}`;
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);
    const dueDateStr = dueDate.toISOString().slice(0, 10);

    // Calc totals
    let subtotal = 0;
    dcItems.forEach(item => {
        subtotal += parseFloat(item.line_total) || 0;
    });
    const total_amount = subtotal; // Assuming no extra tax/discount on DC

    const invResult = await client.query(
      `INSERT INTO invoices
         (user_id, customer_id, invoice_number, invoice_date, due_date,
          subtotal, discount_amount, tax_amount, adjustment, total_amount, balance_due,
          status, notes, delivery_challan_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        req.user.id,
        dc.customer_id,
        invoiceNumber,
        today,
        dueDateStr,
        subtotal,
        0, 0, 0,
        total_amount,
        total_amount, // balance_due
        "draft",
        dc.notes || null,
        id, 
      ]
    );
    const invoiceId = invResult.rows[0].id;

    for (const item of dcItems) {
      await client.query(
        `INSERT INTO invoice_items
           (invoice_id, item_id, item_name, description, hsn_code, unit,
            quantity, unit_price, discount, tax_rate, total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          invoiceId,
          item.item_id        || null,
          item.item_name      || null,
          item.description    || null,
          null,
          item.unit           || null,
          item.quantity       || 1,
          item.rate           || 0,
          0,
          0,
          item.line_total     || 0,
        ]
      );
    }

    await client.query("COMMIT");
    res.json({
      message: "Delivery Challan converted to invoice successfully",
      invoiceId,
      invoice: invResult.rows[0],
      alreadyConverted: false,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CONVERT DC TO INVOICE ERROR:", err);
    res.status(500).json({ message: "Failed to convert delivery challan to invoice" });
  } finally {
    client.release();
  }
};

module.exports = {
  getDeliveryChallans,
  getDeliveryChallanById,
  createDeliveryChallan,
  updateDeliveryChallan,
  deleteDeliveryChallan,
  cancelDeliveryChallan,
  markDelivered,
  convertFromSalesOrder,
  convertDeliveryChallanToInvoice,
};
