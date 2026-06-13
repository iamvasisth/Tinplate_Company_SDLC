require('dotenv').config();
const pool = require('./src/config/db');

async function testCreateCustomer() {
  const req = {
    user: { id: 1 }, // mock user id
    body: {
      first_name: "Test",
      last_name: "Customer",
      display_name: "Test Customer Popup",
      email: "test@example.com",
      phone: "1234567890",
      address: "Test Billing Address",
      city: "",
      state: "",
      pincode: ""
    }
  };

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
    console.log("SUCCESS:", result.rows[0]);
  } catch (err) {
    console.error("ERROR CAUGHT:", err.message);
  } finally {
    process.exit(0);
  }
}
testCreateCustomer();
