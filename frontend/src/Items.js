/**
 * Items.js – Products / Services with expandable rows (no Actions column)
 * Dependencies: apiRequest, AuthContext, react-hot-toast, react-router-dom
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";

function Items() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const itemLabel =
    user?.business_type === "School"
      ? "Students"
      : user?.business_type === "Hospital"
        ? "Patients"
        : user?.business_type === "Retail"
          ? "Products"
          : "Items";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Expand state
  const [expandedId, setExpandedId] = useState(null);

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    item_type: "Goods",
    unit: "",
    selling_price: "",
    cost_price: "",
    description: "",
    sku: "",
    hsn_code: "",
    tax_rate: "0",
  });

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRequest("/items");
      if (res) setItems(res.items || []);
    } catch (err) {
      toast.error("Failed to load items");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Toggle expand / collapse
  const toggleExpand = (itemId) => {
    if (expandedId === itemId) {
      setExpandedId(null);
    } else {
      setExpandedId(itemId);
    }
  };

  // Delete item
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await apiRequest(`/items/${id}`, { method: "DELETE" });
      toast.success("Item deleted");
      if (expandedId === id) setExpandedId(null);
      fetchItems();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  // Add new item (simple modal)
  const addNewItem = async () => {
    if (!newItem.name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      await apiRequest("/items", {
        method: "POST",
        body: JSON.stringify(newItem),
      });
      toast.success("Item created");
      setShowAddModal(false);
      setNewItem({
        name: "",
        item_type: "Goods",
        unit: "",
        selling_price: "",
        cost_price: "",
        description: "",
        sku: "",
        hsn_code: "",
        tax_rate: "0",
      });
      fetchItems();
    } catch (err) {
      toast.error("Create failed");
    }
  };

  const updateNewField = (field, value) => {
    setNewItem({ ...newItem, [field]: value });
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1100px", margin: "auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2>{itemLabel}</h2>
        <button onClick={() => setShowAddModal(true)} style={primaryBtn}>
          + New {itemLabel.slice(0, -1)}
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p>No {itemLabel.toLowerCase()} found.</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
          }}
        >
          <thead>
            <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>SKU</th>
              <th style={thStyle}>Selling Price</th>
              {/* No Actions column */}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <React.Fragment key={item.id}>
                <tr
                  style={{
                    borderBottom: "1px solid #e2e8f0",
                    cursor: "pointer",
                    background:
                      expandedId === item.id ? "#f0f4ff" : "transparent",
                  }}
                  onClick={() => toggleExpand(item.id)}
                >
                  <td style={tdStyle}>
                    <span
                      style={{ color: "#4a90e2", textDecoration: "underline" }}
                    >
                      {item.name}
                    </span>
                  </td>
                  <td style={tdStyle}>{item.item_type}</td>
                  <td style={tdStyle}>{item.sku || "—"}</td>
                  <td style={tdStyle}>
                    ₹{parseFloat(item.selling_price || 0).toFixed(2)}
                  </td>
                </tr>

                {/* Expanded inline detail */}
                {expandedId === item.id && (
                  <tr>
                    <td colSpan={4} style={{ padding: "0" }}>
                      <div
                        style={{
                          padding: "20px 25px",
                          background: "#fff",
                          borderTop: "1px solid #e2e8f0",
                          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.03)",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "10px",
                            fontSize: "14px",
                          }}
                        >
                          <div>
                            <strong>Type:</strong> {item.item_type}
                          </div>
                          <div>
                            <strong>Unit:</strong> {item.unit || "—"}
                          </div>
                          <div>
                            <strong>SKU:</strong> {item.sku || "—"}
                          </div>
                          <div>
                            <strong>HSN:</strong> {item.hsn_code || "—"}
                          </div>
                          <div>
                            <strong>Selling Price:</strong> ₹
                            {parseFloat(item.selling_price || 0).toFixed(2)}
                          </div>
                          <div>
                            <strong>Cost Price:</strong> ₹
                            {parseFloat(item.cost_price || 0).toFixed(2)}
                          </div>
                          <div>
                            <strong>Tax Rate:</strong> {item.tax_rate || 0}%
                          </div>
                          <div>
                            <strong>Description:</strong>{" "}
                            {item.description || "—"}
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            justifyContent: "flex-end",
                            marginTop: "15px",
                          }}
                        >
                          <button
                            onClick={() => navigate(`/items/${item.id}`)}
                            style={editBtnStyle}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            style={deleteBtnStyle}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}

      {/* ===== ADD MODAL ===== */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "25px",
              width: "500px",
              maxWidth: "90%",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            }}
          >
            <h3>New {itemLabel.slice(0, -1)}</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginTop: "15px",
              }}
            >
              <input
                placeholder="Name *"
                value={newItem.name}
                onChange={(e) => updateNewField("name", e.target.value)}
                style={inputStyle}
              />
              <select
                value={newItem.item_type}
                onChange={(e) => updateNewField("item_type", e.target.value)}
                style={inputStyle}
              >
                <option value="Goods">Goods</option>
                <option value="Service">Service</option>
              </select>
              <input
                placeholder="Unit"
                value={newItem.unit}
                onChange={(e) => updateNewField("unit", e.target.value)}
                style={inputStyle}
              />
              <input
                placeholder="SKU"
                value={newItem.sku}
                onChange={(e) => updateNewField("sku", e.target.value)}
                style={inputStyle}
              />
              <input
                type="number"
                placeholder="Selling Price"
                value={newItem.selling_price}
                onChange={(e) =>
                  updateNewField("selling_price", e.target.value)
                }
                style={inputStyle}
              />
              <input
                type="number"
                placeholder="Cost Price"
                value={newItem.cost_price}
                onChange={(e) => updateNewField("cost_price", e.target.value)}
                style={inputStyle}
              />
              <input
                placeholder="HSN Code"
                value={newItem.hsn_code}
                onChange={(e) => updateNewField("hsn_code", e.target.value)}
                style={inputStyle}
              />
              <input
                type="number"
                placeholder="Tax Rate (%)"
                value={newItem.tax_rate}
                onChange={(e) => updateNewField("tax_rate", e.target.value)}
                style={inputStyle}
              />
            </div>
            <input
              placeholder="Description"
              value={newItem.description}
              onChange={(e) => updateNewField("description", e.target.value)}
              style={{ ...inputStyle, marginTop: "10px" }}
            />
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
                marginTop: "20px",
              }}
            >
              <button
                onClick={() => setShowAddModal(false)}
                style={cancelBtnStyle}
              >
                Cancel
              </button>
              <button onClick={addNewItem} style={primaryBtn}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const thStyle = {
  padding: "10px",
  borderBottom: "2px solid #cbd5e1",
  whiteSpace: "nowrap",
};
const tdStyle = { padding: "10px" };
const inputStyle = {
  width: "100%",
  padding: "8px",
  borderRadius: "5px",
  border: "1px solid #ccc",
  boxSizing: "border-box",
};
const primaryBtn = {
  padding: "10px 20px",
  background: "#4a90e2",
  color: "#fff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
  fontWeight: "500",
};
const cancelBtnStyle = {
  padding: "10px 20px",
  background: "#ccc",
  color: "#333",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};
const editBtnStyle = {
  padding: "6px 12px",
  background: "orange",
  color: "#fff",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};
const deleteBtnStyle = {
  padding: "6px 12px",
  background: "red",
  color: "#fff",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};

export default Items;
