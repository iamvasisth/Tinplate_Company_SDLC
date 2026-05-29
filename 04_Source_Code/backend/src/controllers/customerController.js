const pool = require("../config/db");

// ================= GET ALL CUSTOMERS =================
const getCustomers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM customers WHERE user_id = $1 ORDER BY id DESC",
      [req.user.id]
    );
    res.json({ customers: result.rows });
  } catch (err) {
    console.error("GET CUSTOMERS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET CUSTOMER BY ID =================
const getCustomerById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM customers WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Customer not found" });

    res.json({ customer: result.rows[0] });
  } catch (err) {
    console.error("GET CUSTOMER BY ID ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= CREATE CUSTOMER =================
const createCustomer = async (req, res) => {
  const {
    first_name, last_name, display_name,
    email, phone, address, city, state, pincode
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO customers 
        (user_id, first_name, last_name, display_name, email, phone, address, city, state, pincode)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [req.user.id, first_name, last_name, display_name,
       email, phone, address, city, state, pincode]
    );
    res.json({ message: "Customer created", customer: result.rows[0] });
  } catch (err) {
    console.error("CREATE CUSTOMER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= UPDATE CUSTOMER =================
const updateCustomer = async (req, res) => {
  const { id } = req.params;
  const {
    first_name, last_name, display_name,
    email, phone, address, city, state, pincode
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE customers 
       SET first_name=$1, last_name=$2, display_name=$3,
           email=$4, phone=$5, address=$6, city=$7, state=$8, pincode=$9
       WHERE id=$10 AND user_id=$11
       RETURNING *`,
      [first_name, last_name, display_name,
       email, phone, address, city, state, pincode, id, req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Customer not found" });

    res.json({ message: "Customer updated", customer: result.rows[0] });
  } catch (err) {
    console.error("UPDATE CUSTOMER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= DELETE CUSTOMER =================
const deleteCustomer = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      "DELETE FROM customers WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    res.json({ message: "Customer deleted" });
  } catch (err) {
    console.error("DELETE CUSTOMER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET ACTIVITY LOG =================
const getActivityLog = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM activity_log 
       WHERE customer_id = $1 AND user_id = $2 
       ORDER BY created_at DESC`,
      [id, req.user.id]
    );
    res.json({ activity: result.rows });
  } catch (err) {
    console.error("GET ACTIVITY LOG ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getActivityLog
};