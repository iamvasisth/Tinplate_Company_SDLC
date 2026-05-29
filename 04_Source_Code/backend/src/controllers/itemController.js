/**
 * itemsController.js – CRUD for inventory items
 * Dependencies: pool, validationResult
 */
const pool = require("../config/db");
const { validationResult } = require("express-validator");

// ================= GET ALL ITEMS (for logged-in user) =================
const getItems = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM items WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ items: result.rows });
  } catch (err) {
    console.error("GET ITEMS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET SINGLE ITEM =================
const getItemById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM items WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.json({ item: result.rows[0] });
  } catch (err) {
    console.error("GET ITEM ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= CREATE ITEM =================
const createItem = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  const {
    name,
    sku,
    hsn_code,
    tax_rate,
    item_type,
    unit,
    selling_price,
    sales_account,
    cost_price,
    purchase_account,
    description,
    purchase_description,
    image_url,
    preferred_vendor_id,
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO items
        (user_id, name, sku, hsn_code, tax_rate, item_type, unit,
         selling_price, sales_account, cost_price, purchase_account,
         description, purchase_description, image_url, preferred_vendor_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        req.user.id,
        name,
        sku || null,
        hsn_code || null,
        tax_rate || 0,
        item_type || "Goods",
        unit || null,
        selling_price || 0,
        sales_account || null,
        cost_price || 0,
        purchase_account || null,
        description || null,
        purchase_description || null,
        image_url || null,
        preferred_vendor_id || null,
      ]
    );
    res.json({ message: "Item created", item: result.rows[0] });
  } catch (err) {
    console.error("CREATE ITEM ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= UPDATE ITEM =================
const updateItem = async (req, res) => {
  const { id } = req.params;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  const {
    name,
    sku,
    hsn_code,
    tax_rate,
    item_type,
    unit,
    selling_price,
    sales_account,
    cost_price,
    purchase_account,
    description,
    purchase_description,
    image_url,
    preferred_vendor_id,
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE items
       SET name = $1, sku = $2, hsn_code = $3, tax_rate = $4,
           item_type = $5, unit = $6, selling_price = $7,
           sales_account = $8, cost_price = $9, purchase_account = $10,
           description = $11, purchase_description = $12,
           image_url = $13, preferred_vendor_id = $14
       WHERE id = $15 AND user_id = $16
       RETURNING *`,
      [
        name,
        sku || null,
        hsn_code || null,
        tax_rate || 0,
        item_type || "Goods",
        unit || null,
        selling_price || 0,
        sales_account || null,
        cost_price || 0,
        purchase_account || null,
        description || null,
        purchase_description || null,
        image_url || null,
        preferred_vendor_id || null,
        id,
        req.user.id,
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

// ================= DELETE ITEM =================
const deleteItem = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM items WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.json({ message: "Item deleted" });
  } catch (err) {
    console.error("DELETE ITEM ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getItems, getItemById, createItem, updateItem, deleteItem };