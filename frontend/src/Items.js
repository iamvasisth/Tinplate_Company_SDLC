/**
 * Items.js – Inventory items listing with multi‑select, action bar,
 * and hamburger menu for filter/sort/refresh/import.
 * Dependencies: apiRequest, AuthContext, react‑router‑dom
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";

function Items() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);       // array of selected item IDs
  const [menuOpen, setMenuOpen] = useState(false);

  // Dynamic label
  const dynamicLabel =
    user?.business_type === "School" ? "Students" :
    user?.business_type === "Hospital" ? "Patients" :
    user?.business_type === "Retail" ? "Products" : "Items";

  // Fetch items
  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRequest("/items");
      if (res) setItems(res.items);
    } catch (err) {
      toast.error("Failed to load items");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ---- Selection handlers ----
  const toggleSelectAll = () => {
    if (selected.length === items.length) {
      setSelected([]);
    } else {
      setSelected(items.map(item => item.id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  // ---- Batch delete ----
  const deleteSelected = async () => {
    if (!window.confirm(`Delete ${selected.length} selected item(s)?`)) return;
    try {
      await Promise.all(selected.map(id =>
        apiRequest(`/items/${id}`, { method: "DELETE" })
      ));
      toast.success("Selected items deleted");
      setSelected([]);
      fetchItems();
    } catch (err) {
      toast.error("Failed to delete selected items");
    }
  };

  // ---- Per‑item delete ----
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await apiRequest(`/items/${id}`, { method: "DELETE" });
      toast.success("Item deleted");
      fetchItems();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  // ---- Hamburger menu handlers ----
  const handleRefresh = () => {
    setMenuOpen(false);
    fetchItems();
  };

  const handleImport = () => {
    setMenuOpen(false);
    navigate("/import_more");
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1100px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>{dynamicLabel}</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => navigate("/items/new")}
            style={primaryBtn}
          >
            + New {dynamicLabel.slice(0, -1)}
          </button>

          {/* Hamburger menu */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setMenuOpen(!menuOpen)} style={hamburgerBtn}>
              ☰
            </button>
            {menuOpen && (
              <div style={dropdownMenu}>
                <button style={menuItem} onClick={() => { setMenuOpen(false); alert("Filter feature coming soon"); }}>
                  🔍 Filter
                </button>
                <button style={menuItem} onClick={() => { setMenuOpen(false); alert("Sort feature coming soon"); }}>
                  🔃 Sort
                </button>
                <button style={menuItem} onClick={handleRefresh}>
                  🔄 Refresh
                </button>
                <button style={menuItem} onClick={handleImport}>
                  📥 Import
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== ACTION BAR (visible when items selected) ===== */}
      {selected.length > 0 && (
        <div style={actionBar}>
          <span>{selected.length} selected</span>
          <button onClick={deleteSelected} style={dangerBtn}>
            Delete Selected
          </button>
          <button onClick={() => setSelected([])} style={cancelBtn}>
            Cancel Selection
          </button>
        </div>
      )}

      {/* ===== TABLE ===== */}
      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p>No {dynamicLabel.toLowerCase()} found.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={thStyle}>
                <input
                  type="checkbox"
                  checked={selected.length === items.length && items.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>SKU</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Selling Price</th>
              <th style={thStyle}>Stock</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0", background: selected.includes(item.id) ? "#f0f4ff" : "transparent" }}>
                <td style={tdStyle}>
                  <input
                    type="checkbox"
                    checked={selected.includes(item.id)}
                    onChange={() => toggleSelectOne(item.id)}
                  />
                </td>
                <td style={tdStyle}>{item.name}</td>
                <td style={tdStyle}>{item.sku || "-"}</td>
                <td style={tdStyle}>{item.item_type}</td>
                <td style={tdStyle}>{item.selling_price}</td>
                <td style={tdStyle}>{item.stock_quantity ?? "-"}</td>
                <td style={tdStyle}>
                  <button onClick={() => navigate(`/items/${item.id}`)} style={actionBtn}>Edit</button>
                  <button onClick={() => handleDelete(item.id)} style={{ ...actionBtn, background: "red", marginLeft: "5px" }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---- styles ----
const thStyle = { padding: "10px", borderBottom: "2px solid #cbd5e1" };
const tdStyle = { padding: "10px" };
const actionBtn = { padding: "5px 10px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "500" };
const dangerBtn = { padding: "8px 16px", background: "#e74c3c", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", marginLeft: "10px" };
const cancelBtn = { padding: "8px 16px", background: "#ccc", color: "#333", border: "none", borderRadius: "5px", cursor: "pointer", marginLeft: "5px" };
const hamburgerBtn = { fontSize: "24px", background: "none", border: "1px solid #ccc", borderRadius: "5px", padding: "5px 10px", cursor: "pointer" };
const dropdownMenu = { position: "absolute", right: 0, top: "100%", background: "#fff", borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 10, minWidth: "150px" };
const menuItem = { display: "block", width: "100%", padding: "8px 16px", border: "none", background: "none", textAlign: "left", cursor: "pointer", whiteSpace: "nowrap" };
const actionBar = { background: "#fef3c7", padding: "10px 15px", borderRadius: "5px", display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px" };

export default Items;