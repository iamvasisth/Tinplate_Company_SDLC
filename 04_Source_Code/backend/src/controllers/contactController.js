const pool = require("../config/db");

// ================= GET ALL CONTACTS =================
const getContacts = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM contacts ORDER BY id DESC"
    );

    res.json({ contacts: result.rows });

  } catch (err) {
    console.error("GET CONTACTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= ADD CONTACT =================
const addContact = async (req, res) => {
  const { name, type, email, phone, address } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO contacts (name, type, email, phone, address)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, type, email, phone, address]
    );

    res.json({
      message: "Contact added",
      contact: result.rows[0],
    });

  } catch (err) {
    console.error("ADD CONTACT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= DELETE CONTACT =================
const deleteContact = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM contacts WHERE id = $1", [id]);

    res.json({ message: "Contact deleted" });

  } catch (err) {
    console.error("DELETE CONTACT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getContacts,
  addContact,
  deleteContact,
};