import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiRequest } from "./api";
import { FormSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function AddBill() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const preselectedVendorId = searchParams.get("vendor_id");
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [vendors, setVendors] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const [formData, setFormData] = useState({
    vendor_id: preselectedVendorId || "",
    bill_number: "",
    bill_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    status: "draft",
    notes: "",
  });

  const [items, setItems] = useState([
    { item_id: "", item_name: "", description: "", quantity: 1, unit_price: 0, tax_rate: 0, discount: 0, hsn_code: "", unit: "" }
  ]);

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      const [venRes, itRes] = await Promise.all([
        apiRequest("/vendors"),
        apiRequest("/items")
      ]);
      setVendors(venRes?.vendors || []);
      setCatalogItems(itRes?.items || []);

      if (isEditMode) {
        setFetching(true);
        const billRes = await apiRequest(`/bills/${id}`);
        if (billRes?.bill) {
          setFormData({
            vendor_id: billRes.bill.vendor_id || "",
            bill_number: billRes.bill.bill_number || "",
            bill_date: billRes.bill.bill_date ? billRes.bill.bill_date.slice(0, 10) : "",
            due_date: billRes.bill.due_date ? billRes.bill.due_date.slice(0, 10) : "",
            status: billRes.bill.status || "draft",
            notes: billRes.bill.notes || "",
          });
          if (billRes.items && billRes.items.length > 0) {
            setItems(billRes.items);
          }
        }
      }
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setFetching(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleItemSelect = (index, catalogItemId) => {
    const selected = catalogItems.find(i => i.id === parseInt(catalogItemId));
    const newItems = [...items];
    if (selected) {
      newItems[index] = {
        ...newItems[index],
        item_id: selected.id,
        item_name: selected.name,
        description: selected.description || "",
        unit_price: selected.cost_price > 0 ? selected.cost_price : selected.selling_price || 0,
        tax_rate: selected.tax_rate || 0,
        hsn_code: selected.hsn_code || "",
        unit: selected.unit || ""
      };
    } else {
      newItems[index] = { item_id: "", item_name: "", description: "", quantity: 1, unit_price: 0, tax_rate: 0, discount: 0, hsn_code: "", unit: "" };
    }
    setItems(newItems);
  };

  const addItemRow = () => {
    setItems([...items, { item_id: "", item_name: "", description: "", quantity: 1, unit_price: 0, tax_rate: 0, discount: 0, hsn_code: "", unit: "" }]);
  };

  const removeItemRow = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Calculations
  const calcSubtotal = () => items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0);
  const calcDiscount = () => items.reduce((sum, item) => sum + (parseFloat(item.discount) || 0), 0);
  const calcTax = () => items.reduce((sum, item) => {
    const lineAmt = ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)) - (parseFloat(item.discount) || 0);
    return sum + (lineAmt * (parseFloat(item.tax_rate) || 0) / 100);
  }, 0);
  
  const subtotal = calcSubtotal();
  const discountTotal = calcDiscount();
  const taxTotal = calcTax();
  const total = subtotal - discountTotal + taxTotal;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.vendor_id) { toast.error("Please select a vendor"); return; }
    
    // Prepare payload
    const payload = {
      ...formData,
      subtotal,
      discount_amount: discountTotal,
      tax_amount: taxTotal,
      total_amount: total,
      items: items.map(item => {
        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.unit_price) || 0;
        const disc = parseFloat(item.discount) || 0;
        const lineAmt = (qty * rate) - disc;
        const tax = lineAmt * (parseFloat(item.tax_rate) || 0) / 100;
        return { ...item, total: lineAmt + tax };
      })
    };

    setLoading(true);
    try {
      if (isEditMode) {
        await apiRequest(`/bills/${id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("Bill updated");
        navigate(`/bills/${id}`);
      } else {
        const res = await apiRequest("/bills", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Bill created");
        navigate(`/bills/${res.bill.id}`);
      }
    } catch (err) {
      toast.error(isEditMode ? "Update failed" : "Creation failed");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div style={{ maxWidth: "1000px", margin: "auto", padding: "30px" }}>
        <h2 style={{ marginBottom: "25px" }}>{isEditMode ? "Edit Bill" : "New Bill"}</h2>
        <FormSkeleton fields={6} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "auto", padding: "30px" }}>
      <h2 style={{ marginBottom: "25px" }}>{isEditMode ? "Edit Bill" : "New Bill"}</h2>
      <form onSubmit={handleSave} style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        
        {/* Header Section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
          <div>
            <label style={labelStyle}>Vendor *</label>
            <select name="vendor_id" value={formData.vendor_id} onChange={handleFormChange} style={inputStyle} required>
              <option value="">Select a vendor...</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.display_name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Bill #</label>
            <input type="text" name="bill_number" value={formData.bill_number} onChange={handleFormChange} placeholder="Leave blank to auto-generate" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Bill Date</label>
            <input type="date" name="bill_date" value={formData.bill_date} onChange={handleFormChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Due Date</label>
            <input type="date" name="due_date" value={formData.due_date} onChange={handleFormChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select name="status" value={formData.status} onChange={handleFormChange} style={inputStyle}>
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>

        {/* Items Table */}
        <div style={{ marginBottom: "20px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: "10px" }}>Item Details</th>
                <th style={{ padding: "10px", width: "100px" }}>Qty</th>
                <th style={{ padding: "10px", width: "120px" }}>Rate</th>
                <th style={{ padding: "10px", width: "100px" }}>Discount</th>
                <th style={{ padding: "10px", width: "100px" }}>Tax %</th>
                <th style={{ padding: "10px", width: "120px", textAlign: "right" }}>Amount</th>
                <th style={{ padding: "10px", width: "50px" }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const qty = parseFloat(item.quantity) || 0;
                const rate = parseFloat(item.unit_price) || 0;
                const disc = parseFloat(item.discount) || 0;
                const lineAmt = (qty * rate) - disc;
                const tax = lineAmt * (parseFloat(item.tax_rate) || 0) / 100;
                const rowTotal = lineAmt + tax;

                return (
                  <tr key={index} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "10px" }}>
                      <select
                        value={item.item_id || ""}
                        onChange={(e) => handleItemSelect(index, e.target.value)}
                        style={{ ...inputStyle, marginBottom: "5px" }}
                      >
                        <option value="">Select Item (Optional)</option>
                        {catalogItems.map(ci => <option key={ci.id} value={ci.id}>{ci.name}</option>)}
                      </select>
                      <input
                        type="text"
                        placeholder="Item name / Description"
                        value={item.item_name || item.description}
                        onChange={(e) => handleItemChange(index, "item_name", e.target.value)}
                        style={inputStyle}
                      />
                      {(item.hsn_code || item.unit) && (
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", display: "flex", gap: "8px" }}>
                          {item.hsn_code && <span style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>HSN: {item.hsn_code}</span>}
                          {item.unit && <span style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>Unit: {item.unit}</span>}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "10px" }}>
                      <input type="number" step="0.01" value={item.quantity} onChange={(e) => handleItemChange(index, "quantity", e.target.value)} style={inputStyle} min="1" />
                    </td>
                    <td style={{ padding: "10px" }}>
                      <input type="number" step="0.01" value={item.unit_price} onChange={(e) => handleItemChange(index, "unit_price", e.target.value)} style={inputStyle} />
                    </td>
                    <td style={{ padding: "10px" }}>
                      <input type="number" step="0.01" value={item.discount} onChange={(e) => handleItemChange(index, "discount", e.target.value)} style={inputStyle} />
                    </td>
                    <td style={{ padding: "10px" }}>
                      <input type="number" step="0.01" value={item.tax_rate} onChange={(e) => handleItemChange(index, "tax_rate", e.target.value)} style={inputStyle} />
                    </td>
                    <td style={{ padding: "10px", textAlign: "right", fontWeight: "500" }}>
                      ₹{rowTotal.toFixed(2)}
                    </td>
                    <td style={{ padding: "10px", textAlign: "center" }}>
                      <button type="button" onClick={() => removeItemRow(index)} style={{ color: "red", background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}>×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button type="button" onClick={addItemRow} style={{ marginTop: "10px", ...secondaryBtn }}>+ Add Another Item</button>
        </div>

        {/* Footer & Totals */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "30px", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
          <div style={{ flex: 1, marginRight: "40px" }}>
            <label style={labelStyle}>Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleFormChange} rows={4} style={inputStyle} placeholder="Notes for internal use or vendor details..."></textarea>
          </div>
          <div style={{ width: "300px", background: "#f8fafc", padding: "20px", borderRadius: "8px" }}>
            <div style={totalsRow}><span>Subtotal:</span><span>₹{subtotal.toFixed(2)}</span></div>
            <div style={totalsRow}><span>Discount:</span><span style={{ color: "red" }}>-₹{discountTotal.toFixed(2)}</span></div>
            <div style={totalsRow}><span>Tax Amount:</span><span>₹{taxTotal.toFixed(2)}</span></div>
            <div style={{ ...totalsRow, fontSize: "18px", fontWeight: "bold", borderTop: "1px solid #cbd5e1", paddingTop: "10px", marginTop: "10px" }}>
              <span>Total:</span><span>₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "30px" }}>
          <button type="button" onClick={() => navigate("/bills")} style={cancelBtn}>Cancel</button>
          <button type="submit" disabled={loading} style={primaryBtn}>{loading ? "Saving..." : "Save Bill"}</button>
        </div>
      </form>
    </div>
  );
}

const labelStyle = { display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" };
const inputStyle = { width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" };
const secondaryBtn = { padding: "8px 16px", background: "#f1f5f9", color: "#333", border: "1px solid #cbd5e1", borderRadius: "5px", cursor: "pointer", fontSize: "14px" };
const cancelBtn = { padding: "10px 20px", background: "#f1f5f9", color: "#333", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer" };
const totalsRow = { display: "flex", justifyContent: "space-between", marginBottom: "8px" };

export default AddBill;
