/**
 * vendorController.js – Full CRUD with addresses & contact persons (matching customer structure)
 * Dependencies: pool
 */
const pool = require("../config/db");

// ================= GET ALL VENDORS (with optional status filter) =================
const getVendors = async (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT * FROM vendors WHERE user_id = $1 AND is_deleted = false`;
    const values = [req.user.id];

    if (status === "active") {
      query += " AND is_active = true";
    } else if (status === "inactive") {
      query += " AND is_active = false";
    }

    query += " ORDER BY created_at DESC";
    const result = await pool.query(query, values);
    res.json({ vendors: result.rows });
  } catch (err) {
    console.error("GET VENDORS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET SINGLE VENDOR (with addresses & contacts) =================
const getVendorById = async (req, res) => {
  const { id } = req.params;
  try {
    const vendor = await pool.query(
      `SELECT * FROM vendors WHERE id = $1 AND user_id = $2 AND is_deleted = false`,
      [id, req.user.id]
    );
    if (vendor.rows.length === 0) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const addresses = await pool.query(
      `SELECT * FROM vendor_addresses WHERE vendor_id = $1`,
      [id]
    );
    const contacts = await pool.query(
      `SELECT * FROM vendor_contacts WHERE vendor_id = $1`,
      [id]
    );

    res.json({
      vendor: vendor.rows[0],
      addresses: addresses.rows,
      contacts: contacts.rows,
    });
  } catch (err) {
    console.error("GET VENDOR ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= CREATE VENDOR =================
const createVendor = async (req, res) => {
  const {
    vendor_type,
    vendor_sub_type,
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
    pan_number,
    currency,
    opening_balance,
    payment_terms,
    enable_portal,
    portal_language,
    documents,
    vendor_owner_id,
    is_msme_registered,
    tds,
    addresses,
    contacts,
  } = req.body;

  const contactPersonsArray = contacts || contact_persons || [];
  const { addActivityLog } = require("./activityController");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const vendorResult = await client.query(
      `INSERT INTO vendors
        (user_id, vendor_type, vendor_sub_type, salutation, first_name, last_name,
         company_name, display_name, email, phone, work_phone, mobile, language,
         contact_persons, custom_fields, reporting_tags, remarks, pan_number,
         currency, opening_balance, payment_terms, enable_portal, portal_language,
         documents, vendor_owner_id, is_msme_registered, tds)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
       RETURNING *`,
      [
        req.user.id,
        vendor_type || "Business",
        vendor_sub_type || null,
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
        pan_number || null,
        currency || "INR",
        opening_balance || 0,
        payment_terms || null,
        enable_portal || false,
        portal_language || "en",
        documents ? JSON.stringify(documents) : "[]",
        vendor_owner_id || null,
        is_msme_registered || false,
        tds || null,
      ]
    );
    const vendorId = vendorResult.rows[0].id;

    if (Array.isArray(addresses)) {
      for (const addr of addresses) {
        await client.query(
          `INSERT INTO vendor_addresses
           (vendor_id, type, attention, country, address_line1, address_line2,
            city, state, pin_code, phone, fax)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            vendorId,
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
          ]
        );
      }
    }

    if (Array.isArray(contactPersonsArray)) {
      for (const person of contactPersonsArray) {
        await client.query(
          `INSERT INTO vendor_contacts
           (vendor_id, salutation, first_name, last_name, email, work_phone, mobile)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            vendorId,
            person.salutation || null,
            person.first_name || null,
            person.last_name || null,
            person.email || null,
            person.work_phone || null,
            person.mobile || null,
          ]
        );
      }
    }

    await client.query("COMMIT");
    await logActivity(vendorResult.rows[0].id, req.user.id, "created", "Vendor created");
    
    // using the generic activity logger too if exists
    if (addActivityLog) {
      await addActivityLog(
        vendorId,
        req.user.id,
        req.user.email,
        "created",
        "Vendor created",
      );
    }

    res.json({ message: "Vendor created", vendor: vendorResult.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CREATE VENDOR ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ================== ACTIVITY LOGGING FUNCTION (can be used across controllers) =================
const logActivity = async (vendorId, userId, actionType, description) => {
  try {
    await pool.query(
      `INSERT INTO vendor_activity_log (vendor_id, user_id, action_type, description)
       VALUES ($1, $2, $3, $4)`,
      [vendorId, userId, actionType, description]
    );
  } catch (err) {
    console.error("LOG ACTIVITY ERROR:", err);
  }
};

// ================= UPDATE VENDOR =================
const updateVendor = async (req, res) => {
  const { id } = req.params;
  const updates = req.body; 
  const { addActivityLog } = require("./activityController");

  // Remove fields that should never be mass-updated directly
  delete updates.id;
  delete updates.user_id;
  delete updates.created_at;
  delete updates.updated_at;

  const { addresses, contacts, contact_persons, ...vendorFields } = updates;
  const contactPersonsArray = contacts || contact_persons || null;

  const setColumns = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(vendorFields)) {
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

    let vendorResult;
    if (setColumns.length > 0) {
      setColumns.push(`updated_at = CURRENT_TIMESTAMP`);

      const query = `
        UPDATE vendors
        SET ${setColumns.join(", ")}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;
      values.push(id, req.user.id);
      vendorResult = await client.query(query, values);
      if (vendorResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Vendor not found" });
      }
    } else {
      vendorResult = await client.query(
        `SELECT * FROM vendors WHERE id = $1 AND user_id = $2`,
        [id, req.user.id]
      );
      if (vendorResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Vendor not found" });
      }
    }

    if (addresses !== undefined) {
      await client.query(
        `DELETE FROM vendor_addresses WHERE vendor_id = $1`,
        [id]
      );
      if (Array.isArray(addresses)) {
        for (const addr of addresses) {
          await client.query(
            `INSERT INTO vendor_addresses
             (vendor_id, type, attention, country, address_line1, address_line2,
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
            ]
          );
        }
      }
    }

    if (contactPersonsArray !== undefined) {
      await client.query(
        `DELETE FROM vendor_contacts WHERE vendor_id = $1`,
        [id]
      );
      if (Array.isArray(contactPersonsArray)) {
        for (const person of contactPersonsArray) {
          await client.query(
            `INSERT INTO vendor_contacts
             (vendor_id, salutation, first_name, last_name, email, work_phone, mobile)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [
              id,
              person.salutation || null,
              person.first_name || null,
              person.last_name || null,
              person.email || null,
              person.work_phone || null,
              person.mobile || null,
            ]
          );
        }
      }
    }

    await client.query("COMMIT");
    
    if (vendorFields.hasOwnProperty("is_active")) {
      await logActivity(
        vendorResult.rows[0].id,
        req.user.id,
        "status_changed",
        `Marked as ${vendorFields.is_active ? "active" : "inactive"}`
      );
    } else {
      await logActivity(
        vendorResult.rows[0].id,
        req.user.id,
        "updated",
        "Vendor updated"
      );
    }
    
    if (addActivityLog) {
      if (vendorFields.hasOwnProperty("is_active")) {
        const statusText = vendorFields.is_active ? "Marked as active" : "Marked as inactive";
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
          "Vendor updated",
        );
      }
    }

    res.json({ message: "Vendor updated", vendor: vendorResult.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("UPDATE VENDOR ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ================= DELETE VENDOR =================
const deleteVendor = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE vendors SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND is_deleted = false RETURNING *`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    res.json({ message: "Vendor deleted" });
  } catch (err) {
    console.error("DELETE VENDOR ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor
};
