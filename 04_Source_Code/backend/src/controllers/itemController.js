/**
 * itemController.js – CRUD operations for inventory items
 * Dependencies: pool
 */
const pool = require("../config/db");

// GET all items for the logged-in user
const getItems = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM items WHERE user_id = $1 ORDER BY id DESC",
      [req.user.id]
    );
    res.json({ items: result.rows });
  } catch (err) {
    console.error("GET ITEMS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ADD a new item
const addItem = async (req, res) => {
  const {
    name, sku, hsn_code, tax_rate,
    buying_price, selling_price, stock_quantity, low_stock_alert
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO items
         (user_id, name, sku, hsn_code, tax_rate, buying_price, selling_price, stock_quantity, low_stock_alert)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        req.user.id, name, sku, hsn_code, tax_rate,
        buying_price, selling_price, stock_quantity, low_stock_alert
      ]
    );
    res.json({
      message: "Item added",
      item: result.rows[0]
    });
  } catch (err) {
    console.error("ADD ITEM ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE an item
const updateItem = async (req, res) => {
  const { id } = req.params;
  const {
    name, sku, hsn_code, tax_rate,
    buying_price, selling_price, stock_quantity, low_stock_alert
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE items
       SET name = $1, sku = $2, hsn_code = $3, tax_rate = $4,
           buying_price = $5, selling_price = $6,
           stock_quantity = $7, low_stock_alert = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [
        name, sku, hsn_code, tax_rate,
        buying_price, selling_price, stock_quantity, low_stock_alert,
        id, req.user.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json({ message: "Item updated", item: result.rows[0] });
  } catch (err) {
    console.error("UPDATE ITEM ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE an item
const deleteItem = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      "DELETE FROM items WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    res.json({ message: "Item deleted" });
  } catch (err) {
    console.error("DELETE ITEM ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getItems, addItem, updateItem, deleteItem };