/**
 * Contacts.js
 * Purpose: Full CRUD UI for Customer/Vendor contacts.
 * Dependencies: apiRequest, react-hot-toast, Navbar
 */

import React, { useEffect, useState } from "react";
import { apiRequest } from "./api";
import toast from "react-hot-toast";



function Contacts() {
  // ================= STATE =================
  const [contacts, setContacts] = useState([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("customer");

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("customer");

  // ================= LOAD CONTACTS =================
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

  // ================= ADD =================
  const addContact = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

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

  // ================= START EDIT =================
  const startEdit = (contact) => {
    setEditingId(contact.id);
    setEditName(contact.name);
    setEditType(contact.type);
  };

  // ================= SAVE EDIT =================
  const saveEdit = async (id) => {
    if (!editName.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      await apiRequest(`/contacts/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editName,
          type: editType,
        }),
      });

      toast.success("Contact updated");
      setEditingId(null);
      loadContacts();
    } catch (err) {
      toast.error("Update failed");
    }
  };

  // ================= CANCEL EDIT =================
  const cancelEdit = () => {
    setEditingId(null);
  };

  // ================= DELETE =================
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

  // ================= LOGOUT =================
  const handleLogout = async () => {
    try {
      await apiRequest("/logout", { method: "POST" });
      window.location.href = "/";
    } catch (err) {
      toast.error("Logout failed");
    }
  };

  // ================= RENDER =================
  return (
    <>
      <div style={{ padding: "30px" }}>
        <h2>Contacts</h2>

        {/* ---------- ADD FORM ---------- */}
        <div style={{ marginBottom: "20px" }}>
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginRight: "10px", padding: "5px" }}
          />

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ marginRight: "10px", padding: "5px" }}
          >
            <option value="customer">Customer</option>
            <option value="vendor">Vendor</option>
          </select>

          <button onClick={addContact} style={{ padding: "5px 12px" }}>
            Add
          </button>
        </div>

        {/* ---------- CONTACTS TABLE ---------- */}
        <table border="1" cellPadding="8" style={{ minWidth: "400px" }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {contacts.map((c) => (
              <tr key={c.id}>
                {editingId === c.id ? (
                  // ------------- EDITING MODE -------------
                  <>
                    <td>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{ padding: "4px", width: "120px" }}
                      />
                    </td>
                    <td>
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        style={{ padding: "4px" }}
                      >
                        <option value="customer">Customer</option>
                        <option value="vendor">Vendor</option>
                      </select>
                    </td>
                    <td>
                      <button
                        onClick={() => saveEdit(c.id)}
                        style={{ marginRight: "5px", padding: "4px 8px" }}
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        style={{ padding: "4px 8px" }}
                      >
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  // ------------- VIEW MODE -------------
                  <>
                    <td>{c.name}</td>
                    <td>{c.type}</td>
                    <td>
                      <button
                        onClick={() => startEdit(c)}
                        style={{
                          marginRight: "5px",
                          padding: "4px 8px",
                          background: "orange",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteContact(c.id)}
                        style={{
                          padding: "4px 8px",
                          background: "red",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default Contacts;