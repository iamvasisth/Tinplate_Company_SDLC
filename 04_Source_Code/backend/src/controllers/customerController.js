/**
 * customerController.js – Full CRUD with addresses & contact persons
 * Dependencies: pool
 */
const pool = require("../config/db");

// ================= GET ALL CUSTOMERS (with optional status filter) =================
const getCustomers = async (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT * FROM customers WHERE user_id = $1`;
    const values = [req.user.id];

    if (status === "active") {
      query += " AND is_active = true";
    } else if (status === "inactive") {
      query += " AND is_active = false";
    }

    query += " ORDER BY created_at DESC";
    const result = await pool.query(query, values);
    res.json({ customers: result.rows });
  } catch (err) {
    console.error("GET CUSTOMERS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET SINGLE CUSTOMER (with addresses & contacts) =================
const getCustomerById = async (req, res) => {
  const { id } = req.params;
  try {
    const customer = await pool.query(
      `SELECT * FROM customers WHERE id = $1 AND user_id = $2`,
      [id, req.user.id],
    );
    if (customer.rows.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const addresses = await pool.query(
      `SELECT * FROM customer_addresses WHERE customer_id = $1`,
      [id],
    );
    const contacts = await pool.query(
      `SELECT * FROM customer_contacts WHERE customer_id = $1`,
      [id],
    );

    res.json({
      customer: customer.rows[0],
      addresses: addresses.rows,
      contacts: contacts.rows,
    });
  } catch (err) {
    console.error("GET CUSTOMER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= CREATE CUSTOMER =================
const createCustomer = async (req, res) => {
  const {
    customer_type,
    customer_sub_type,
    salutation,
    first_name,
    last_name,
    company_name,
    display_name,
    email,
    phone,
    work_phone,
    mobile,
    language,
    contact_persons,
    custom_fields,
    reporting_tags,
    remarks,
    pan,
    currency,
    opening_balance,
    payment_terms,
    enable_portal,
    portal_language,
    documents,
    customer_owner_id,
    addresses,
    contacts,
  } = req.body;

  const contactPersonsArray = contacts || contact_persons || [];
  const { addActivityLog } = require("./activityController");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const customerResult = await client.query(
      `INSERT INTO customers
        (user_id, customer_type, customer_sub_type, salutation, first_name, last_name,
         company_name, display_name, email, phone, work_phone, mobile, language,
         contact_persons, custom_fields, reporting_tags, remarks, pan,
         currency, opening_balance, payment_terms, enable_portal, portal_language,
         documents, customer_owner_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
       RETURNING *`,
      [
        req.user.id,
        customer_type || "Business",
        customer_sub_type || null,
        salutation || null,
        first_name || null,
        last_name || null,
        company_name || null,
        display_name || null,
        email || null,
        phone || null,
        work_phone || null,
        mobile || null,
        language || null,
        "[]",
        custom_fields ? JSON.stringify(custom_fields) : "{}",
        reporting_tags || null,
        remarks || null,
        pan || null,
        currency || "INR",
        opening_balance || 0,
        payment_terms || null,
        enable_portal || false,
        portal_language || "en",
        documents ? JSON.stringify(documents) : "[]",
        customer_owner_id || null,
      ],
    );
    const customerId = customerResult.rows[0].id;

    if (Array.isArray(addresses)) {
      for (const addr of addresses) {
        await client.query(
          `INSERT INTO customer_addresses
           (customer_id, type, attention, country, address_line1, address_line2,
            city, state, pin_code, phone, fax)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            customerId,
            addr.type || "billing",
            addr.attention || null,
            addr.country || null,
            addr.address_line1 || null,
            addr.address_line2 || null,
            addr.city || null,
            addr.state || null,
            addr.pin_code || null,
            addr.phone || null,
            addr.fax || null,
          ],
        );
      }
    }

    if (Array.isArray(contactPersonsArray)) {
      for (const person of contactPersonsArray) {
        await client.query(
          `INSERT INTO customer_contacts
           (customer_id, salutation, first_name, last_name, email, work_phone, mobile)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            customerId,
            person.salutation || null,
            person.first_name || null,
            person.last_name || null,
            person.email || null,
            person.work_phone || null,
            person.mobile || null,
          ],
        );
      }
    }

    await client.query("COMMIT");
    await addActivityLog(
      customerId,
      req.user.id,
      req.user.email,
      "created",
      "Contact created",
    );

    res.json({ message: "Customer created", customer: customerResult.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CREATE CUSTOMER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ================= UPDATE CUSTOMER =================
// ================= UPDATE CUSTOMER (partial update) =================
const updateCustomer = async (req, res) => {
  const { id } = req.params;
  const updates = req.body; // all fields sent by the frontend
  const { addActivityLog } = require("./activityController");

  // Remove fields that should never be mass-updated directly (if any)
  delete updates.id;
  delete updates.user_id;
  delete updates.created_at;
  delete updates.updated_at;

  // Separate addresses / contacts / contact_persons if present
  const { addresses, contacts, contact_persons, ...customerFields } = updates;
  const contactPersonsArray = contacts || contact_persons || null;

  // Build SET clause dynamically from the provided customer fields
  const setColumns = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(customerFields)) {
    // Convert camelCase (frontend) to snake_case (DB column) if needed
    // All your frontend keys already match the column names (e.g., is_active, first_name)
    if (value !== undefined) {
      setColumns.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (setColumns.length === 0 && !addresses && !contactPersonsArray) {
    return res.status(400).json({ message: "No fields to update" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // --- Update customer record (only if we have column updates) ---
    let customerResult;
    if (setColumns.length > 0) {
      // Add updated_at automatically
      setColumns.push(`updated_at = CURRENT_TIMESTAMP`);

      const query = `
        UPDATE customers
        SET ${setColumns.join(", ")}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;
      values.push(id, req.user.id);
      customerResult = await client.query(query, values);
      if (customerResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Customer not found" });
      }
    } else {
      // No fields to update in customers table, just fetch current data
      customerResult = await client.query(
        `SELECT * FROM customers WHERE id = $1 AND user_id = $2`,
        [id, req.user.id],
      );
      if (customerResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Customer not found" });
      }
    }

    // --- Update addresses (replace all if provided) ---
    if (addresses !== undefined) {
      await client.query(
        `DELETE FROM customer_addresses WHERE customer_id = $1`,
        [id],
      );
      if (Array.isArray(addresses)) {
        for (const addr of addresses) {
          await client.query(
            `INSERT INTO customer_addresses
             (customer_id, type, attention, country, address_line1, address_line2,
              city, state, pin_code, phone, fax)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [
              id,
              addr.type || "billing",
              addr.attention || null,
              addr.country || null,
              addr.address_line1 || null,
              addr.address_line2 || null,
              addr.city || null,
              addr.state || null,
              addr.pin_code || null,
              addr.phone || null,
              addr.fax || null,
            ],
          );
        }
      }
    }

    // --- Update contacts (replace all if provided) ---
    if (contactPersonsArray !== undefined) {
      await client.query(
        `DELETE FROM customer_contacts WHERE customer_id = $1`,
        [id],
      );
      if (Array.isArray(contactPersonsArray)) {
        for (const person of contactPersonsArray) {
          await client.query(
            `INSERT INTO customer_contacts
             (customer_id, salutation, first_name, last_name, email, work_phone, mobile)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [
              id,
              person.salutation || null,
              person.first_name || null,
              person.last_name || null,
              person.email || null,
              person.work_phone || null,
              person.mobile || null,
            ],
          );
        }
      }
    }

    await client.query("COMMIT");
    if (is_active !== undefined) {
      const statusText = is_active ? "Marked as active" : "Marked as inactive";
      await addActivityLog(
        id,
        req.user.id,
        req.user.email,
        "status_changed",
        statusText,
      );
    } else {
      await addActivityLog(
        id,
        req.user.id,
        req.user.email,
        "updated",
        "Contact updated",
      );
    }
    res.json({ message: "Customer updated", customer: customerResult.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("UPDATE CUSTOMER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ================= DELETE CUSTOMER =================
const deleteCustomer = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM customers WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json({ message: "Customer deleted" });
  } catch (err) {
    console.error("DELETE CUSTOMER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
