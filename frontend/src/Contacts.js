import React, { useEffect, useState } from "react";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("customer");

  // Load contacts
  const loadContacts = async () => {
    try {
      const res = await apiRequest("/contacts");
      if (res) setContacts(res.contacts);
    } catch (err) {
      toast.error("Failed to load contacts");
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  // Add contact
  const addContact = async () => {
    if (!name) return;

    try {
      await apiRequest("/contacts", {
        method: "POST",
        body: JSON.stringify({ name, type }),
      });

      toast.success("Contact added");
      setName("");
      loadContacts();
    } catch (err) {
      toast.error("Error adding contact");
    }
  };

  // Delete contact
  const deleteContact = async (id) => {
    try {
      await apiRequest(`/contacts/${id}`, {
        method: "DELETE",
      });

      toast.success("Deleted");
      loadContacts();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2>Contacts</h2>

      {/* Add Form */}
      <div style={{ marginBottom: "20px" }}>
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="customer">Customer</option>
          <option value="vendor">Vendor</option>
        </select>

        <button onClick={addContact}>Add</button>
      </div>

      {/* Table */}
      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {contacts.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.type}</td>
              <td>
                <button onClick={() => deleteContact(c.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Contacts;