/**
 * AddCreditNote.js – New Credit Note creation form
 */
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "./api";
import { FormSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function AddCreditNote() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // --- Basic fields ---
  const [customerId, setCustomerId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [creditNoteDate, setCreditNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [referenceNumber, setReferenceNumber] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  // --- Items ---
  const [items, setItems] = useState([
    { item_id: "", item_name: "", description: "", quantity: 1, rate: 0, discount: 0, discount_type: "flat", tax_rate: 0 }
  ]);

  // --- Calculations ---
  const [subTotal, setSubTotal] = useState(0);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [totalTax, setTotalTax] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

  // --- Dropdown data ---
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // --- Modals ---
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // --- New Customer form ---
  const [newCustomer, setNewCustomer] = useState({ display_name: "", company_name: "", email: "", phone: "", billing_address: "", pan: "" });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [custRes, itemRes, invRes, taxRes] = await Promise.all([
          apiRequest("/customers"),
          apiRequest("/items"),
          apiRequest("/invoices"),
          apiRequest("/taxes"),
        ]);
        setCustomers(custRes?.customers || []);
        setCatalogItems(itemRes?.items || []);
        setInvoices(invRes?.invoices || []);
        setTaxes(taxRes?.taxes || []);

        if (isEditMode) {
          setFetching(true);
          const res = await apiRequest(`/credit-notes/${id}`);
          if (res?.credit_note) {
            const cn = res.credit_note;
            if (parseFloat(cn.applied_amount) > 0) {
              toast.error("Cannot edit a credit note that has already been applied to an invoice.");
              navigate("/credit-notes");
              return;
            }
            setCustomerId(cn.customer_id ? String(cn.customer_id) : "");
            setInvoiceId(cn.invoice_id ? String(cn.invoice_id) : "");
            setCreditNoteDate(cn.credit_note_date ? cn.credit_note_date.slice(0, 10) : "");
            setReferenceNumber(cn.reference_number || "");
            setReason(cn.reason || "");
            setNotes(cn.notes || "");
            setTerms(cn.terms_conditions || "");
            if (res.items && res.items.length > 0) {
              setItems(res.items.map(item => ({
                item_id:       item.item_id       ? String(item.item_id)  : "",
                item_name:     item.item_name     || "",
                description:   item.description   || "",
                quantity:      item.quantity      || 1,
                rate:          item.rate          || 0,
                discount:      item.discount      || 0,
                discount_type: item.discount_type || "flat",
                tax_rate:      item.tax_rate      || 0,
              })));
            }
          }
        }
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setFetching(false);
      }
    };
    fetchAll();
  }, [id, isEditMode, navigate]);

  // Recalculate totals whenever items change
  useEffect(() => {
    let sTotal = 0, dTotal = 0, tTotal = 0;
    items.forEach(item => {
      const q = parseFloat(item.quantity) || 0;
      const r = parseFloat(item.rate) || 0;
      const rowSub = q * r;
      sTotal += rowSub;

      let d = parseFloat(item.discount) || 0;
      let rowDisc = 0;
      if (item.discount_type === "percent") {
        rowDisc = rowSub * (d / 100);
      } else {
        rowDisc = d;
      }
      dTotal += rowDisc;

      const taxable = rowSub - rowDisc;
      const taxRate = parseFloat(item.tax_rate) || 0;
      tTotal += taxable * (taxRate / 100);
    });
    setSubTotal(sTotal);
    setTotalDiscount(dTotal);
    setTotalTax(tTotal);
    setGrandTotal(sTotal - dTotal + tTotal);
  }, [items]);

  const addItem = () => {
    setItems([...items, { item_id: "", item_name: "", description: "", quantity: 1, rate: 0, discount: 0, discount_type: "flat", tax_rate: 0 }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleItemSelect = (index, itemId) => {
    const updated = [...items];
    updated[index].item_id = itemId;
    if (itemId) {
      const catalogItem = catalogItems.find(ci => String(ci.id) === String(itemId));
      if (catalogItem) {
        updated[index].item_name   = catalogItem.name || "";
        updated[index].description = catalogItem.description || catalogItem.name || "";
        updated[index].rate        = catalogItem.selling_price || 0;
        if (catalogItem.tax_id) {
          const tax = taxes.find(t => String(t.id) === String(catalogItem.tax_id));
          if (tax) updated[index].tax_rate = tax.rate;
        }
      }
    } else {
      updated[index].item_name = "";
      updated[index].rate = 0;
      updated[index].tax_rate = 0;
    }
    setItems(updated);
  };

  // Pre-fill invoice items optionally
  const handleInvoiceSelect = async (invId) => {
    setInvoiceId(invId);
    if (!invId) return;
    
    if (window.confirm("Do you want to copy items from this invoice? This will replace your current items.")) {
        try {
            const res = await apiRequest(`/invoices/${invId}`);
            if(res?.items) {
                setItems(res.items.map(i => ({
                    item_id: i.item_id ? String(i.item_id) : "",
                    item_name: i.item_name || "",
                    description: i.description || "",
                    quantity: i.quantity || 1,
                    rate: i.unit_price || 0,
                    discount: i.discount || 0,
                    discount_type: "percent", // original invoice assumed percent for discount column
                    tax_rate: i.tax_rate || 0,
                })));
            }
        } catch(err) {
            toast.error("Failed to load invoice items");
        }
    }
  };

  const handleSave = async () => {
    if (!customerId) { toast.error("Please select a customer"); return; }
    if (items.length === 0 || items.every(item => !item.description && !item.item_id && !item.rate)) {
      toast.error("Add at least one item or amount"); return;
    }
    
    for(const item of items) {
        if(parseFloat(item.quantity) <= 0) {
            toast.error("Quantity must be greater than zero"); return;
        }
        if(parseFloat(item.rate) < 0) {
            toast.error("Rate cannot be negative"); return;
        }
    }

    setLoading(true);
    try {
      if (isEditMode) {
        await apiRequest(`/credit-notes/${id}`, {
          method: "PUT",
          body: JSON.stringify({
            customer_id: parseInt(customerId),
            invoice_id: invoiceId ? parseInt(invoiceId) : null,
            credit_note_date: creditNoteDate,
            reference_number: referenceNumber,
            reason: reason,
            notes: notes,
            terms_conditions: terms,
            items: items.map(item => ({
              ...item,
              item_id:   item.item_id   ? parseInt(item.item_id) : null,
              item_name: item.item_name || null,
              quantity:  parseFloat(item.quantity) || 0,
              rate:      parseFloat(item.rate) || 0,
              discount:  parseFloat(item.discount) || 0,
              tax_rate:  parseFloat(item.tax_rate) || 0,
            })),
          }),
        });
        toast.success("Credit Note updated");
        navigate(`/credit-notes/${id}/document`);
      } else {
        await apiRequest("/credit-notes", {
          method: "POST",
          body: JSON.stringify({
            customer_id: parseInt(customerId),
            invoice_id: invoiceId ? parseInt(invoiceId) : null,
            credit_note_date: creditNoteDate,
            reference_number: referenceNumber,
            reason: reason,
            status: "Draft",
            notes: notes,
            terms_conditions: terms,
            items: items.map(item => ({
              ...item,
              item_id:   item.item_id   ? parseInt(item.item_id) : null,
              item_name: item.item_name || null,
              quantity:  parseFloat(item.quantity) || 0,
              rate:      parseFloat(item.rate) || 0,
              discount:  parseFloat(item.discount) || 0,
              tax_rate:  parseFloat(item.tax_rate) || 0,
            })),
          }),
        });
        toast.success("Credit Note created");
        navigate("/credit-notes");
      }
    } catch (err) {
      toast.error(err.message || (isEditMode ? "Failed to update Credit Note" : "Failed to create Credit Note"));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomer = async () => {
    if (!newCustomer.display_name && !newCustomer.company_name) { toast.error("Customer name required"); return; }
    try {
      const res = await apiRequest("/customers", {
        method: "POST",
        body: JSON.stringify(newCustomer),
      });
      if (res?.customer) {
        setCustomers(prev => [...prev, res.customer]);
        setCustomerId(String(res.customer.id));
        toast.success("Customer created");
      }
      setShowCustomerModal(false);
      setNewCustomer({ display_name: "", company_name: "", email: "", phone: "", billing_address: "", pan: "" });
    } catch (err) { toast.error("Failed to create customer"); }
  };

  if (fetching) {
    return (
      <div style={{ maxWidth: "960px", margin: "auto", padding: "30px" }}>
        <h2 style={{ marginBottom: "25px" }}>{isEditMode ? "Edit Credit Note" : "New Credit Note"}</h2>
        <FormSkeleton fields={8} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "960px", margin: "auto", padding: "30px" }}>
      <h2 style={{ marginBottom: "25px" }}>{isEditMode ? "Edit Credit Note" : "New Credit Note"}</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
        <div>
          <label><strong>Customer *</strong></label>
          <div style={{ display: "flex", gap: "5px" }}>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="">Select customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.display_name || c.company_name || c.email}
                </option>
              ))}
            </select>
            <button onClick={() => setShowCustomerModal(true)} style={addBtnSmall} title="New Customer">+</button>
          </div>
        </div>
        <div>
          <label><strong>Invoice (Optional)</strong></label>
          <select value={invoiceId} onChange={e => handleInvoiceSelect(e.target.value)} style={inputStyle}>
              <option value="">Select Invoice</option>
              {invoices.filter(inv => !customerId || String(inv.customer_id) === customerId).map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} (Bal: ₹{parseFloat(inv.balance_due).toFixed(2)})
                </option>
              ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px", marginBottom: "15px" }}>
        <div>
          <label><strong>Credit Note Date</strong></label>
          <input type="date" value={creditNoteDate} onChange={e => setCreditNoteDate(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label><strong>Reference#</strong></label>
          <input type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} style={inputStyle} placeholder="e.g. Return-001" />
        </div>
        <div>
          <label><strong>Reason</strong></label>
          <input type="text" value={reason} onChange={e => setReason(e.target.value)} style={inputStyle} placeholder="e.g. Items returned, Price adjustment" />
        </div>
      </div>

      {/* Items Table */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", marginTop: "30px" }}>
        <h3 style={{ margin: 0 }}>Item Table</h3>
        <button onClick={addItem} style={secondaryBtn}>+ Add Row</button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "15px", minWidth: "800px" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={thStyle}>Item Details</th>
              <th style={{ ...thStyle, width: "80px" }}>Qty</th>
              <th style={{ ...thStyle, width: "100px" }}>Rate</th>
              <th style={{ ...thStyle, width: "140px" }}>Discount</th>
              <th style={{ ...thStyle, width: "120px" }}>Tax</th>
              <th style={{ ...thStyle, width: "100px", textAlign: "right" }}>Amount</th>
              <th style={{ ...thStyle, width: "40px" }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={tdStyle}>
                  <select value={item.item_id} onChange={e => handleItemSelect(idx, e.target.value)}
                    style={{ ...inputStyle, marginBottom: "5px" }}>
                    <option value="">— Select or type description —</option>
                    {catalogItems.map(ci => (
                      <option key={ci.id} value={ci.id}>{ci.name}</option>
                    ))}
                  </select>
                  <input type="text" placeholder="Description (Optional)" value={item.description}
                    onChange={e => updateItem(idx, "description", e.target.value)} style={inputStyle} />
                </td>
                <td style={tdStyle}>
                  <input type="number" min="0" step="0.01" value={item.quantity}
                    onChange={e => updateItem(idx, "quantity", e.target.value)} style={inputStyle} />
                </td>
                <td style={tdStyle}>
                  <input type="number" min="0" step="0.01" value={item.rate}
                    onChange={e => updateItem(idx, "rate", e.target.value)} style={inputStyle} />
                </td>
                <td style={tdStyle}>
                  <div style={{ display: "flex" }}>
                    <input type="number" min="0" step="0.01" value={item.discount}
                      onChange={e => updateItem(idx, "discount", e.target.value)}
                      style={{ ...inputStyle, borderRight: "none", borderRadius: "5px 0 0 5px", width: "60%" }} />
                    <select value={item.discount_type} onChange={e => updateItem(idx, "discount_type", e.target.value)}
                      style={{ ...inputStyle, borderRadius: "0 5px 5px 0", width: "40%", padding: "8px 2px" }}>
                      <option value="percent">%</option><option value="flat">₹</option>
                    </select>
                  </div>
                </td>
                <td style={tdStyle}>
                  <select value={item.tax_rate} onChange={e => updateItem(idx, "tax_rate", e.target.value)} style={inputStyle}>
                    <option value="0">Non-Taxable</option>
                    {taxes.map(t => (
                      <option key={t.id} value={t.rate}>{t.tax_name} ({t.rate}%)</option>
                    ))}
                  </select>
                </td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: "bold" }}>
                  {(() => {
                    const q = parseFloat(item.quantity) || 0;
                    const r = parseFloat(item.rate) || 0;
                    const d = parseFloat(item.discount) || 0;
                    const t = parseFloat(item.tax_rate) || 0;
                    const sub = q * r;
                    const disc = item.discount_type === "percent" ? sub * (d / 100) : d;
                    const tax = (sub - disc) * (t / 100);
                    return `₹${(sub - disc + tax).toFixed(2)}`;
                  })()}
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
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "15px", marginTop: "20px" }}>
        <div style={{ width: "300px", padding: "15px", background: "#f8fafc", borderRadius: "8px" }}>
          <div style={calcRow}><span>Sub Total</span><span>₹{subTotal.toFixed(2)}</span></div>
          <div style={calcRow}><span>Discount</span><span style={{ color: "red" }}>-₹{totalDiscount.toFixed(2)}</span></div>
          <div style={calcRow}><span>Tax</span><span>₹{totalTax.toFixed(2)}</span></div>
          <div style={{ ...calcRow, fontWeight: "bold", fontSize: "16px", borderTop: "2px solid #cbd5e1", paddingTop: "10px", marginTop: "5px" }}>
            <span>Total Amount</span><span>₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      <div style={{ marginBottom: "15px" }}>
        <label><strong>Notes</strong></label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          rows={2} style={inputStyle} placeholder="Any specific notes for this credit note." />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label><strong>Terms & Conditions</strong></label>
        <textarea value={terms} onChange={e => setTerms(e.target.value)}
          rows={3} style={inputStyle} placeholder="Terms and conditions..." />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "30px" }}>
        <button onClick={() => navigate(isEditMode ? `/credit-notes/${id}/document` : "/credit-notes")} style={cancelBtnStyle}>Cancel</button>
        <button onClick={handleSave} disabled={loading} style={primaryBtn}>
          {loading ? "Saving..." : (isEditMode ? "Update Credit Note" : "Save Credit Note")}
        </button>
      </div>

      {/* ===== NEW CUSTOMER MODAL ===== */}
      {showCustomerModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ marginTop: 0 }}>+ New Customer</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label>Display Name *</label>
                <input value={newCustomer.display_name} onChange={e => setNewCustomer({ ...newCustomer, display_name: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label>Company Name</label>
                <input value={newCustomer.company_name} onChange={e => setNewCustomer({ ...newCustomer, company_name: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label>Email</label>
                <input type="email" value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label>Phone</label>
                <input value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label>GSTIN / Tax Number</label>
                <input value={newCustomer.pan} onChange={e => setNewCustomer({ ...newCustomer, pan: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label>Billing Address</label>
                <input value={newCustomer.billing_address} onChange={e => setNewCustomer({ ...newCustomer, billing_address: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "15px" }}>
              <button onClick={() => setShowCustomerModal(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleSaveCustomer} style={primaryBtn}>Save Customer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const thStyle = { padding: "10px", borderBottom: "2px solid #cbd5e1", whiteSpace: "nowrap", fontSize: "13px" };
const tdStyle = { padding: "6px 8px", verticalAlign: "top" };
const inputStyle = { width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc", boxSizing: "border-box", fontSize: "13px" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "500" };
const secondaryBtn = { padding: "8px 14px", background: "#f0f0f0", color: "#333", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer", fontSize: "13px" };
const cancelBtnStyle = { padding: "10px 20px", background: "#ccc", color: "#333", border: "none", borderRadius: "5px", cursor: "pointer" };
const deleteItemBtn = { background: "red", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", padding: "6px 10px", marginTop: "4px" };
const addBtnSmall = { padding: "6px 10px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" };
const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalBox = { background: "#fff", borderRadius: "8px", padding: "25px", width: "550px", maxWidth: "95%", maxHeight: "85vh", overflow: "auto", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" };
const calcRow = { display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#334155", fontSize: "14px" };

export default AddCreditNote;
