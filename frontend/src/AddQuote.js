/**
 * AddQuote.js – New Quote creation form (Zoho Books‑style)
 * Dependencies: apiRequest, react-router-dom, react-hot-toast
 */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

function AddQuote() {
  const navigate = useNavigate();

  // --- Basic fields ---
  const [customerId, setCustomerId] = useState("");
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [terms, setTerms] = useState("");

  // --- Items ---
  const [items, setItems] = useState([
    { description: "", quantity: 1, unit_price: 0, tax_rate: 0 }
  ]);

  // --- Price adjustments ---
  const [discountPercent, setDiscountPercent] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [taxType, setTaxType] = useState("none");   // none / tds / tcs
  const [taxPercent, setTaxPercent] = useState("0");
  const [adjustment, setAdjustment] = useState("0");

  // --- Customers list ---
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- Attachments placeholder ---
  const [files, setFiles] = useState([]);

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await apiRequest("/customers");
        if (res) setCustomers(res.customers);
      } catch (err) {
        toast.error("Failed to load customers");
      }
    };
    fetchCustomers();
  }, []);

  // Item helpers
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

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0);
  
  const discountVal = discountPercent > 0
    ? subtotal * (parseFloat(discountPercent) / 100)
    : parseFloat(discountAmount) || 0;
  
  const afterDiscount = subtotal - discountVal;
  
  const taxVal = (taxType !== "none" && afterDiscount > 0)
    ? afterDiscount * (parseFloat(taxPercent) / 100)
    : 0;
  
  const adjustmentVal = parseFloat(adjustment) || 0;
  const grandTotal = afterDiscount + taxVal + adjustmentVal;

  // When discount percent changes, auto-fill amount
  useEffect(() => {
    if (discountPercent > 0) {
      setDiscountAmount((subtotal * (parseFloat(discountPercent) / 100)).toFixed(2));
    }
  }, [discountPercent, subtotal]);

  // File change handler (placeholder)
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length + files.length > 5) {
      toast.error("You can upload a maximum of 5 files");
      return;
    }
    setFiles([...files, ...selected]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  // Save
  const handleSave = async () => {
    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }
    if (items.length === 0 || items.every(item => !item.description)) {
      toast.error("Add at least one item with description");
      return;
    }

    setLoading(true);
    try {
      await apiRequest("/quotes", {
        method: "POST",
        body: JSON.stringify({
          customer_id: parseInt(customerId),
          quote_date: quoteDate,
          expiry_date: expiryDate || null,
          status: "draft",               // ✅ hardcoded string, not a global variable
          notes: customerNotes,
          terms,
          items: items.map(item => ({
            ...item,
            quantity: parseFloat(item.quantity) || 0,
            unit_price: parseFloat(item.unit_price) || 0,
            tax_rate: parseFloat(item.tax_rate) || 0,
          })),
        }),
      });
      toast.success("Quote created");
      navigate("/quotes");
    } catch (err) {
      toast.error("Failed to create quote");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "900px", margin: "auto", padding: "30px" }}>
      <h2>New Quote</h2>

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
          <label><strong>Quote Date</strong></label>
          <input type="date" value={quoteDate} onChange={e => setQuoteDate(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label><strong>Expiry Date</strong></label>
          <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Items Table */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <h3 style={{ margin: 0 }}>Items</h3>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={addItem} style={secondaryBtn}>+ Add New Row</button>
          <button onClick={() => toast("Bulk import coming soon")} style={secondaryBtn}>+ Add Items in Bulk</button>
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "15px" }}>
        <thead>
          <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
            <th style={thStyle}>Item Details</th>
            <th style={thStyle}>Quantity</th>
            <th style={thStyle}>Rate</th>
            <th style={thStyle}>Tax %</th>
            <th style={thStyle}>Amount</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
              <td style={tdStyle}>
                <input
                  type="text"
                  placeholder="Item description"
                  value={item.description}
                  onChange={e => updateItem(idx, "description", e.target.value)}
                  style={inputStyle}
                />
              </td>
              <td style={tdStyle}>
                <input
                  type="number"
                  min="0"
                  value={item.quantity}
                  onChange={e => updateItem(idx, "quantity", e.target.value)}
                  style={{ ...inputStyle, width: "70px" }}
                />
              </td>
              <td style={tdStyle}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_price}
                  onChange={e => updateItem(idx, "unit_price", e.target.value)}
                  style={{ ...inputStyle, width: "100px" }}
                />
              </td>
              <td style={tdStyle}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={item.tax_rate}
                  onChange={e => updateItem(idx, "tax_rate", e.target.value)}
                  style={{ ...inputStyle, width: "60px" }}
                />
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

      {/* Customer Notes */}
      <div style={{ marginBottom: "15px" }}>
        <label><strong>Customer Notes</strong></label>
        <textarea
          value={customerNotes}
          onChange={e => setCustomerNotes(e.target.value)}
          rows={2}
          style={inputStyle}
          placeholder="Looking forward for your business."
        />
      </div>

      {/* Totals & Adjustments */}
      <div style={{ background: "#f9fafb", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span>Sub Total</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>

        {/* Discount */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <span>Discount</span>
          <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
            <input
              type="number"
              min="0"
              max="100"
              value={discountPercent}
              onChange={e => { setDiscountPercent(e.target.value); if (e.target.value === "0") setDiscountAmount("0"); }}
              style={{ ...inputStyle, width: "60px" }}
            />
            <span>%</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={discountAmount}
              onChange={e => { setDiscountAmount(e.target.value); setDiscountPercent("0"); }}
              style={{ ...inputStyle, width: "80px" }}
            />
          </div>
        </div>

        {/* Tax (TDS / TCS) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <span>Tax</span>
          <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
            <select value={taxType} onChange={e => setTaxType(e.target.value)} style={{ ...inputStyle, width: "80px" }}>
              <option value="none">None</option>
              <option value="tds">TDS</option>
              <option value="tcs">TCS</option>
            </select>
            {taxType !== "none" && (
              <input
                type="number"
                min="0"
                max="100"
                value={taxPercent}
                onChange={e => setTaxPercent(e.target.value)}
                style={{ ...inputStyle, width: "60px" }}
              />
            )}
            {taxType !== "none" && <span>%</span>}
            <span style={{ marginLeft: "10px" }}>₹{taxVal.toFixed(2)}</span>
          </div>
        </div>

        {/* Adjustment */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <span>Adjustment</span>
          <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
            <input
              type="number"
              value={adjustment}
              onChange={e => setAdjustment(e.target.value)}
              style={{ ...inputStyle, width: "80px" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "16px", marginTop: "10px", borderTop: "1px solid #ddd", paddingTop: "10px" }}>
          <span>Total (₹)</span>
          <span>₹{grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div style={{ marginBottom: "15px" }}>
        <label><strong>Terms & Conditions</strong></label>
        <textarea
          value={terms}
          onChange={e => setTerms(e.target.value)}
          rows={3}
          style={inputStyle}
          placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
        />
      </div>

      {/* Attachments */}
      <div style={{ marginBottom: "20px" }}>
        <label><strong>Attach File(s) to Quote</strong></label>
        <div style={{ marginTop: "5px" }}>
          <input type="file" multiple onChange={handleFileChange} style={{ marginBottom: "10px" }} />
          <small style={{ color: "gray" }}>You can upload a maximum of 5 files, 10MB each</small>
          {files.length > 0 && (
            <ul style={{ marginTop: "10px", paddingLeft: "20px" }}>
              {files.map((file, idx) => (
                <li key={idx} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {file.name}
                  <button onClick={() => removeFile(idx)} style={deleteItemBtn}>✕</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Additional Fields Note */}
      <p style={{ color: "gray", fontSize: "13px", marginBottom: "20px" }}>
        Additional Fields: Start adding custom fields for your quotes by going to Settings → Sales → Quotes.
      </p>

      {/* Actions */}
      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
        <button onClick={() => navigate("/quotes")} style={cancelBtnStyle}>Cancel</button>
        <button onClick={handleSave} disabled={loading} style={primaryBtn}>
          {loading ? "Saving..." : "Save Quote"}
        </button>
      </div>
    </div>
  );
}

// Styles
const thStyle = { padding: "10px", borderBottom: "2px solid #cbd5e1", whiteSpace: "nowrap" };
const tdStyle = { padding: "10px" };
const inputStyle = { width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc", boxSizing: "border-box" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "500" };
const secondaryBtn = { padding: "8px 14px", background: "#f0f0f0", color: "#333", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer", fontSize: "13px" };
const cancelBtnStyle = { padding: "10px 20px", background: "#ccc", color: "#333", border: "none", borderRadius: "5px", cursor: "pointer" };
const deleteItemBtn = { background: "red", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", padding: "4px 8px" };

export default AddQuote;