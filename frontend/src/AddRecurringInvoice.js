/**
 * AddRecurringInvoice.js – Form to create/edit recurring invoice templates
 */
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "./api";
import { FormSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function AddRecurringInvoice() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [profileName, setProfileName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [frequency, setFrequency] = useState("Monthly");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [nextInvoiceDate, setNextInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [autoSendEmail, setAutoSendEmail] = useState(false);

  const [items, setItems] = useState([{ id: Date.now(), item_id: "", item_name: "", description: "", quantity: 1, rate: 0, discount: 0, tax_rate: 0 }]);
  
  const [customers, setCustomers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setFetching(true);
        const [custRes, itemRes] = await Promise.all([
          apiRequest("/customers"),
          apiRequest("/items")
        ]);
        setCustomers(custRes?.customers || []);
        setInventoryItems(itemRes?.items || []);

        if (isEditMode) {
          const res = await apiRequest(`/recurring-invoices/${id}`);
          if (res?.recurring_invoice) {
            const r = res.recurring_invoice;
            setProfileName(r.profile_name || "");
            setCustomerId(r.customer_id ? String(r.customer_id) : "");
            setFrequency(r.frequency || "Monthly");
            setStartDate(r.start_date ? r.start_date.slice(0, 10) : "");
            setEndDate(r.end_date ? r.end_date.slice(0, 10) : "");
            setNextInvoiceDate(r.next_invoice_date ? r.next_invoice_date.slice(0, 10) : "");
            setNotes(r.notes || "");
            setTerms(r.terms_conditions || "");
            setAutoSendEmail(r.auto_send_email || false);
            
            if (r.items && r.items.length > 0) {
              setItems(r.items.map(i => ({
                id: i.id || Math.random(),
                item_id: i.item_id ? String(i.item_id) : "",
                item_name: i.item_name || "",
                description: i.description || "",
                quantity: parseFloat(i.quantity) || 1,
                rate: parseFloat(i.rate) || 0,
                discount: parseFloat(i.discount) || 0,
                tax_rate: parseFloat(i.tax_rate) || 0
              })));
            }
          }
        }
      } catch (err) {
        toast.error("Failed to load data");
      } finally {
        setFetching(false);
      }
    };
    fetchAll();
  }, [id, isEditMode]);

  // Sync Start Date and Next Invoice Date on new records
  useEffect(() => {
      if (!isEditMode) setNextInvoiceDate(startDate);
  }, [startDate, isEditMode]);

  // Math Helpers
  const calcLineTotal = (item) => {
    const q = parseFloat(item.quantity) || 0;
    const r = parseFloat(item.rate) || 0;
    const d = parseFloat(item.discount) || 0;
    const sub = (q * r) - d;
    return sub > 0 ? sub : 0;
  };

  const calcLineTax = (item) => {
    const sub = calcLineTotal(item);
    const t = parseFloat(item.tax_rate) || 0;
    return (sub * t) / 100;
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let tax_total = 0;
    let discount_total = 0;
    
    items.forEach(i => {
      discount_total += parseFloat(i.discount) || 0;
      subtotal += calcLineTotal(i);
      tax_total += calcLineTax(i);
    });

    return {
      subtotal,
      discount_total,
      tax_total,
      total: subtotal + tax_total
    };
  }, [items]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    if (field === "item_id") {
      const selected = inventoryItems.find(i => String(i.id) === String(value));
      if (selected) {
        newItems[index].item_name = selected.name;
        newItems[index].description = selected.description || "";
        newItems[index].rate = selected.selling_price || 0;
        newItems[index].tax_rate = selected.tax_rate || 0;
      }
    }
    setItems(newItems);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!profileName || !customerId || !frequency || !startDate) {
      toast.error("Please fill required fields"); return;
    }
    
    const validItems = items.filter(i => i.item_name && i.quantity > 0);
    if (validItems.length === 0) {
      toast.error("Add at least one valid item"); return;
    }

    const payloadItems = validItems.map(i => ({
      ...i,
      item_id: i.item_id ? parseInt(i.item_id) : null,
      tax_amount: calcLineTax(i),
      line_total: calcLineTotal(i)
    }));

    const payload = {
      profile_name: profileName,
      customer_id: parseInt(customerId),
      frequency,
      start_date: startDate,
      end_date: endDate || null,
      next_invoice_date: nextInvoiceDate,
      notes,
      terms_conditions: terms,
      auto_send_email: autoSendEmail,
      subtotal: totals.subtotal,
      discount_total: totals.discount_total,
      tax_total: totals.tax_total,
      total: totals.total,
      items: payloadItems
    };

    setLoading(true);
    try {
      if (isEditMode) {
        await apiRequest(`/recurring-invoices/${id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("Recurring Invoice updated");
        navigate(`/recurring-invoices/${id}`);
      } else {
        await apiRequest("/recurring-invoices", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Recurring Invoice created");
        navigate("/recurring-invoices");
      }
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div style={{ padding: "40px" }}><FormSkeleton fields={8} /></div>;

  return (
    <div style={{ maxWidth: "1000px", margin: "auto", padding: "40px" }}>
      <h2 style={{ marginBottom: "30px", color: "#1e293b" }}>{isEditMode ? "Edit Recurring Invoice" : "New Recurring Invoice"}</h2>
      
      <form onSubmit={handleSave}>
        
        {/* Profile Info */}
        <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "30px" }}>
          <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#334155", fontSize: "16px" }}>Profile Setup</h3>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label style={labelStyle}>Profile Name *</label>
              <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} required style={inputStyle} placeholder="e.g., Monthly Retainer" />
            </div>
            <div>
              <label style={labelStyle}>Customer *</label>
              <select value={customerId} onChange={e => setCustomerId(e.target.value)} required style={inputStyle}>
                <option value="">— Select Customer —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.display_name || c.company_name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "20px" }}>
            <div>
              <label style={labelStyle}>Frequency *</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value)} required style={inputStyle}>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Start Date *</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>End Date (Optional)</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Next Invoice Date</label>
              <input type="date" value={nextInvoiceDate} onChange={e => setNextInvoiceDate(e.target.value)} required style={{...inputStyle, background: "#f8fafc"}} />
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "30px" }}>
          <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#334155", fontSize: "16px" }}>Line Items</h3>
          
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "15px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: "10px", fontWeight: "600", color: "#475569", fontSize: "13px" }}>Item Details</th>
                <th style={{ padding: "10px", fontWeight: "600", color: "#475569", fontSize: "13px", width: "100px" }}>Quantity</th>
                <th style={{ padding: "10px", fontWeight: "600", color: "#475569", fontSize: "13px", width: "120px" }}>Rate</th>
                <th style={{ padding: "10px", fontWeight: "600", color: "#475569", fontSize: "13px", width: "100px" }}>Discount</th>
                <th style={{ padding: "10px", fontWeight: "600", color: "#475569", fontSize: "13px", width: "100px" }}>Tax (%)</th>
                <th style={{ padding: "10px", fontWeight: "600", color: "#475569", fontSize: "13px", width: "120px", textAlign: "right" }}>Amount</th>
                <th style={{ width: "40px" }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "10px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      <select value={item.item_id} onChange={e => handleItemChange(index, 'item_id', e.target.value)} style={{ ...inputStyle, padding: "6px" }}>
                        <option value="">— Type/Select Item —</option>
                        {inventoryItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                      <input type="text" placeholder="Or enter custom name" value={item.item_name} onChange={e => handleItemChange(index, 'item_name', e.target.value)} style={{ ...inputStyle, padding: "6px" }} />
                      <textarea placeholder="Description" value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} style={{ ...inputStyle, padding: "6px", resize: "vertical" }} rows={1} />
                    </div>
                  </td>
                  <td style={{ padding: "10px", verticalAlign: "top" }}>
                    <input type="number" step="0.01" min="1" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} style={{ ...inputStyle, padding: "6px" }} />
                  </td>
                  <td style={{ padding: "10px", verticalAlign: "top" }}>
                    <input type="number" step="0.01" min="0" value={item.rate} onChange={e => handleItemChange(index, 'rate', e.target.value)} style={{ ...inputStyle, padding: "6px" }} />
                  </td>
                  <td style={{ padding: "10px", verticalAlign: "top" }}>
                    <input type="number" step="0.01" min="0" value={item.discount} onChange={e => handleItemChange(index, 'discount', e.target.value)} style={{ ...inputStyle, padding: "6px" }} />
                  </td>
                  <td style={{ padding: "10px", verticalAlign: "top" }}>
                    <input type="number" step="0.01" min="0" value={item.tax_rate} onChange={e => handleItemChange(index, 'tax_rate', e.target.value)} style={{ ...inputStyle, padding: "6px" }} />
                  </td>
                  <td style={{ padding: "10px", verticalAlign: "top", textAlign: "right", fontWeight: "500", color: "#334155", paddingTop: "18px" }}>
                    ₹{calcLineTotal(item).toFixed(2)}
                  </td>
                  <td style={{ padding: "10px", verticalAlign: "top", paddingTop: "18px" }}>
                    {items.length > 1 && (
                      <button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer" }}>✖</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={() => setItems([...items, { id: Date.now(), item_id: "", item_name: "", description: "", quantity: 1, rate: 0, discount: 0, tax_rate: 0 }])}
            style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: "500" }}>+ Add another line</button>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
            <div style={{ width: "350px", background: "#f8fafc", padding: "20px", borderRadius: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "14px", color: "#475569" }}>
                <span>Subtotal</span><span>₹{totals.subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "14px", color: "#475569" }}>
                <span>Tax Total</span><span>₹{totals.tax_total.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "15px", paddingTop: "15px", borderTop: "1px solid #cbd5e1", fontSize: "18px", fontWeight: "700", color: "#1e293b" }}>
                <span>Total</span><span>₹{totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Options */}
        <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "30px" }}>
           <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <input type="checkbox" id="autoEmail" checked={autoSendEmail} onChange={e => setAutoSendEmail(e.target.checked)} style={{ width: "16px", height: "16px", cursor: "pointer" }} />
              <label htmlFor="autoEmail" style={{ cursor: "pointer", fontSize: "14px", color: "#334155", fontWeight: "500" }}>Automatically send generated invoices via email to customer</label>
           </div>
           <div style={{ marginBottom: "20px" }}>
             <label style={labelStyle}>Customer Notes</label>
             <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} style={inputStyle} />
           </div>
           <div>
             <label style={labelStyle}>Terms & Conditions</label>
             <textarea rows={2} value={terms} onChange={e => setTerms(e.target.value)} style={inputStyle} />
           </div>
        </div>

        <div style={{ display: "flex", gap: "15px", justifyContent: "flex-end" }}>
          <button type="button" onClick={() => navigate(-1)} style={cancelBtnStyle} disabled={loading}>Cancel</button>
          <button type="submit" style={primaryBtnStyle} disabled={loading}>{loading ? "Saving..." : "Save Profile"}</button>
        </div>

      </form>
    </div>
  );
}

const labelStyle = { display: "block", marginBottom: "8px", fontWeight: "500", color: "#475569", fontSize: "14px" };
const inputStyle = { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box", fontSize: "14px", outline: "none" };
const primaryBtnStyle = { padding: "10px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500", fontSize: "15px" };
const cancelBtnStyle = { padding: "10px 24px", background: "#fff", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontWeight: "500", fontSize: "15px" };

export default AddRecurringInvoice;
