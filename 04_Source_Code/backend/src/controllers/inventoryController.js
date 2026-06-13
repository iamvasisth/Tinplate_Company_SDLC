const pool = require("../config/db");

const ensureInventoryTables = async () => {
  try {
    // Add safe columns to items if missing
    await pool.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS stock_quantity NUMERIC(12,2) DEFAULT 0`);
    await pool.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS reorder_level NUMERIC(12,2) DEFAULT 0`);
    await pool.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS is_inventory_tracked BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS inventory_account VARCHAR(255)`);
    await pool.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS opening_stock NUMERIC(12,2) DEFAULT 0`);
    await pool.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS opening_stock_rate NUMERIC(12,2) DEFAULT 0`);

    // Create inventory_movements table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        movement_type VARCHAR(30) NOT NULL,
        quantity NUMERIC(12,2) NOT NULL,
        previous_stock NUMERIC(12,2) DEFAULT 0,
        new_stock NUMERIC(12,2) DEFAULT 0,
        reason VARCHAR(255),
        reference_number VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.error("ensureInventoryTables error:", err);
  }
};
ensureInventoryTables();

const getInventoryMovements = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, i.name as item_name 
       FROM inventory_movements m
       JOIN items i ON m.item_id = i.id
       WHERE m.user_id = $1
       ORDER BY m.created_at DESC`,
      [req.user.id]
    );
    res.json({ movements: result.rows });
  } catch (err) {
    console.error("GET MOVEMENTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getMovementById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT m.*, i.name as item_name 
       FROM inventory_movements m
       JOIN items i ON m.item_id = i.id
       WHERE m.id = $1 AND m.user_id = $2`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Movement not found" });
    res.json({ movement: result.rows[0] });
  } catch (err) {
    console.error("GET MOVEMENT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getItemMovements = async (req, res) => {
  const { itemId } = req.params;
  try {
    const result = await pool.query(
      `SELECT m.*, i.name as item_name 
       FROM inventory_movements m
       JOIN items i ON m.item_id = i.id
       WHERE m.item_id = $1 AND m.user_id = $2
       ORDER BY m.created_at DESC`,
      [itemId, req.user.id]
    );
    res.json({ movements: result.rows });
  } catch (err) {
    console.error("GET ITEM MOVEMENTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const createMovement = async (req, res) => {
  const { item_id, movement_type, quantity, reason, reference_number, notes } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const itemCheck = await client.query("SELECT * FROM items WHERE id = $1 AND user_id = $2", [item_id, req.user.id]);
    if (itemCheck.rows.length === 0) throw new Error("Item not found");

    const item = itemCheck.rows[0];
    const currentStock = parseFloat(item.stock_quantity || 0);
    const movQty = parseFloat(quantity);

    if (movQty <= 0) throw new Error("Quantity must be greater than zero");

    let newStock = currentStock;
    let qtyChange = 0;

    if (movement_type === "stock_in") {
      newStock = currentStock + movQty;
      qtyChange = movQty;
    } else if (movement_type === "stock_out") {
      if (movQty > currentStock) throw new Error(`Cannot dispatch ${movQty}. Current stock is only ${currentStock}.`);
      newStock = currentStock - movQty;
      qtyChange = -movQty;
    } else if (movement_type === "adjustment") {
      // For adjustment, UI can either send the exact diff or we can treat 'quantity' as the new absolute stock level.
      // Let's treat 'adjustment' here as setting the new absolute stock level for simplicity.
      newStock = movQty; 
      qtyChange = newStock - currentStock;
    } else {
      throw new Error("Invalid movement_type");
    }

    const moveRes = await client.query(
      `INSERT INTO inventory_movements 
       (user_id, item_id, transaction_type, quantity_change, reference_number, entry_date, description)
       VALUES ($1, $2, 'adjustment', $3, $4, CURRENT_DATE, $5) RETURNING *`,
      [req.user.id, item_id, qtyChange, reference_number, notes || reason]
    );

    await client.query(
      `UPDATE items SET stock_quantity = $1 WHERE id = $2 AND user_id = $3`,
      [newStock, item_id, req.user.id]
    );

    await client.query("COMMIT");
    res.json({ movement: moveRes.rows[0], new_stock: newStock });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CREATE MOVEMENT ERROR:", err);
    res.status(400).json({ message: err.message || "Failed to create movement" });
  } finally {
    client.release();
  }
};

module.exports = { getInventoryMovements, getMovementById, getItemMovements, createMovement };
