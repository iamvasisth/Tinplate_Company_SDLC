/**
 * AddInvoice.js – New Invoice creation form
 * Dependencies: apiRequest, react-router-dom, react-hot-toast
 */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

function AddInvoice() {
  const navigate = useNavigate();

  const [customerId, setCustomerId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  const [items, setItems] = useState([
    { description: "", quantity: 1, unit_price: 0, tax_rate: 0 }
  ]);

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await apiRequest("/customers");
        if (res) setCustomers(res.customers || res);
      } catch (err) {
        toast.error("Failed to load customers");
      }
    };
    fetchCustomers();
  }, []);

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unit_price: 0, tax_rate: 0 }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0);
  const grandTotal = subtotal; // can be extended with tax/discount

  const handleSave = async () => {
    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }
    setLoading(true);
    try {
      await apiRequest("/invoices", {
        method: "POST",
        body: JSON.stringify({
          customer_id: parseInt(customerId),
          invoice_date: invoiceDate,
          due_date: dueDate || null,
          status,
          notes,
          terms,
          items: items.map(item => ({
            ...item,
            quantity: parseFloat(item.quantity) || 0,
            unit_price: parseFloat(item.unit_price) || 0,
            tax_rate: parseFloat(item.tax_rate) || 0,
          })),
        }),
      });
      toast.success("Invoice created");
      navigate("/invoices");
    } catch (err) {
      toast.error("Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "900px", margin: "auto", padding: "30px" }}>
      <h2>New Invoice</h2>

      {/* Customer Dropdown */}
      <div style={{ marginBottom: "15px" }}>
        <label><strong>Customer</strong></label>
        <select value={customerId} onChange={e => setCustomerId(e.target.value)} style={inputStyle}>
          <option value="">Select customer</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>
              {c.display_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}
            </option>
          ))}
        </select>
      </div>

      {/* Dates */}
      <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
        <div style={{ flex: 1 }}>
          <label><strong>Invoice Date</strong></label>
          <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label><strong>Due Date</strong></label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Items Table */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <h3 style={{ margin: 0 }}>Items</h3>
        <button onClick={addItem} style={secondaryBtn}>+ Add New Row</button>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "15px" }}>
        <thead>
          <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
            <th style={thStyle}>Description</th>
            <th style={thStyle}>Qty</th>
            <th style={thStyle}>Unit Price</th>
            <th style={thStyle}>Tax %</th>
            <th style={thStyle}>Total</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
              <td style={tdStyle}>
                <input type="text" placeholder="Item description" value={item.description}
                  onChange={e => updateItem(idx, "description", e.target.value)} style={inputStyle} />
              </td>
              <td style={tdStyle}>
                <input type="number" min="0" value={item.quantity}
                  onChange={e => updateItem(idx, "quantity", e.target.value)} style={{ ...inputStyle, width: "70px" }} />
              </td>
              <td style={tdStyle}>
                <input type="number" min="0" step="0.01" value={item.unit_price}
                  onChange={e => updateItem(idx, "unit_price", e.target.value)} style={{ ...inputStyle, width: "100px" }} />
              </td>
              <td style={tdStyle}>
                <input type="number" min="0" max="100" value={item.tax_rate}
                  onChange={e => updateItem(idx, "tax_rate", e.target.value)} style={{ ...inputStyle, width: "60px" }} />
              </td>
              <td style={tdStyle}>
                ₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}
              </td>
              <td style={tdStyle}>
                {items.length > 1 && (
                  <button onClick={() => removeItem(idx)} style={deleteItemBtn}>✕</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Notes & Terms */}
      <div style={{ marginBottom: "15px" }}>
        <label><strong>Notes</strong></label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={inputStyle} placeholder="Additional notes..." />
      </div>
      <div style={{ marginBottom: "20px" }}>
        <label><strong>Terms & Conditions</strong></label>
        <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={2} style={inputStyle} placeholder="Terms and conditions..." />
      </div>

      {/* Totals */}
      <div style={{ background: "#f9fafb", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
          <span>Total</span><span>₹{grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
        <button onClick={() => navigate("/invoices")} style={cancelBtnStyle}>Cancel</button>
        <button onClick={handleSave} disabled={loading} style={primaryBtn}>
          {loading ? "Saving..." : "Save Invoice"}
        </button>
      </div>
    </div>
  );
}

const thStyle = { padding: "10px", borderBottom: "2px solid #cbd5e1", whiteSpace: "nowrap" };
const tdStyle = { padding: "10px" };
const inputStyle = { width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc", boxSizing: "border-box" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "500" };
const secondaryBtn = { padding: "8px 14px", background: "#f0f0f0", color: "#333", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer", fontSize: "13px" };
const cancelBtnStyle = { padding: "10px 20px", background: "#ccc", color: "#333", border: "none", borderRadius: "5px", cursor: "pointer" };
const deleteItemBtn = { background: "red", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", padding: "4px 8px" };

export default AddInvoice;