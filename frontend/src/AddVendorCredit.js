/**
 * AddVendorCredit.js – New Vendor Credit creation form
 */
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "./api";
import { FormSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function AddVendorCredit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // --- Basic fields ---
  const [vendorId, setVendorId] = useState("");
  const [billId, setBillId] = useState("");
  const [vendorCreditDate, setVendorCreditDate] = useState(new Date().toISOString().slice(0, 10));
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
  const [vendors, setVendors] = useState([]);
  const [bills, setBills] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // --- Modals ---
  const [showVendorModal, setShowVendorModal] = useState(false);

  // --- New Vendor form ---
  const [newVendor, setNewVendor] = useState({ display_name: "", company_name: "", email: "", phone: "", billing_address: "", pan: "" });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [vendorRes, itemRes, billRes, taxRes] = await Promise.all([
          apiRequest("/vendors"),
          apiRequest("/items"),
          apiRequest("/bills"),
          apiRequest("/taxes"),
        ]);
        setVendors(vendorRes?.vendors || []);
        setCatalogItems(itemRes?.items || []);
        setBills(billRes?.bills || []);
        setTaxes(taxRes?.taxes || []);

        if (isEditMode) {
          setFetching(true);
          const res = await apiRequest(`/vendor-credits/${id}`);
          if (res?.vendor_credit) {
            const vc = res.vendor_credit;
            if (parseFloat(vc.applied_amount) > 0) {
              toast.error("Cannot edit a vendor credit that has already been applied to a bill.");
              navigate("/vendor-credits");
              return;
            }
            setVendorId(vc.vendor_id ? String(vc.vendor_id) : "");
            setBillId(vc.bill_id ? String(vc.bill_id) : "");
            setVendorCreditDate(vc.vendor_credit_date ? vc.vendor_credit_date.slice(0, 10) : "");
            setReferenceNumber(vc.reference_number || "");
            setReason(vc.reason || "");
            setNotes(vc.notes || "");
            setTerms(vc.terms_conditions || "");
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
        updated[index].rate        = catalogItem.purchase_price || catalogItem.selling_price || 0;
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

  // Pre-fill bill items optionally
  const handleBillSelect = async (bId) => {
    setBillId(bId);
    if (!bId) return;
    
    if (window.confirm("Do you want to copy items from this bill? This will replace your current items.")) {
        try {
            const res = await apiRequest(`/bills/${bId}`);
            if(res?.items) {
                setItems(res.items.map(i => ({
                    item_id: i.item_id ? String(i.item_id) : "",
                    item_name: i.item_name || "",
                    description: i.description || "",
                    quantity: i.quantity || 1,
                    rate: i.rate || i.unit_price || 0,
                    discount: i.discount || 0,
                    discount_type: i.discount_type || "percent", // fallback to percent
                    tax_rate: i.tax_rate || 0,
                })));
            }
        } catch(err) {
            toast.error("Failed to load bill items");
        }
    }
  };

  const handleSave = async () => {
    if (!vendorId) { toast.error("Please select a vendor"); return; }
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
        await apiRequest(`/vendor-credits/${id}`, {
          method: "PUT",
          body: JSON.stringify({
            vendor_id: parseInt(vendorId),
            bill_id: billId ? parseInt(billId) : null,
            vendor_credit_date: vendorCreditDate,
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
        toast.success("Vendor Credit updated");
        navigate(`/vendor-credits/${id}/document`);
      } else {
        await apiRequest("/vendor-credits", {
          method: "POST",
          body: JSON.stringify({
            vendor_id: parseInt(vendorId),
            bill_id: billId ? parseInt(billId) : null,
            vendor_credit_date: vendorCreditDate,
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
        toast.success("Vendor Credit created");
        navigate("/vendor-credits");
      }
    } catch (err) {
      toast.error(err.message || (isEditMode ? "Failed to update Vendor Credit" : "Failed to create Vendor Credit"));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVendor = async () => {
    if (!newVendor.display_name && !newVendor.company_name) { toast.error("Vendor name required"); return; }
    try {
      const res = await apiRequest("/vendors", {
        method: "POST",
        body: JSON.stringify(newVendor),
      });
      if (res?.vendor) {
        setVendors(prev => [...prev, res.vendor]);
        setVendorId(String(res.vendor.id));
        toast.success("Vendor created");
      }
      setShowVendorModal(false);
      setNewVendor({ display_name: "", company_name: "", email: "", phone: "", billing_address: "", pan: "" });
    } catch (err) { toast.error("Failed to create vendor"); }
  };

  if (fetching) {
    return (
      <div style={{ maxWidth: "960px", margin: "auto", padding: "30px" }}>
        <h2 style={{ marginBottom: "25px" }}>{isEditMode ? "Edit Vendor Credit" : "New Vendor Credit"}</h2>
        <FormSkeleton fields={8} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "960px", margin: "auto", padding: "30px" }}>
      <h2 style={{ marginBottom: "25px" }}>{isEditMode ? "Edit Vendor Credit" : "New Vendor Credit"}</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
        <div>
          <label><strong>Vendor *</strong></label>
          <div style={{ display: "flex", gap: "5px" }}>
            <select value={vendorId} onChange={e => setVendorId(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="">Select vendor</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>
                  {v.display_name || v.company_name || v.email}
                </option>
              ))}
            </select>
            <button onClick={() => setShowVendorModal(true)} style={addBtnSmall} title="New Vendor">+</button>
          </div>
        </div>
        <div>
          <label><strong>Bill (Optional)</strong></label>
          <select value={billId} onChange={e => handleBillSelect(e.target.value)} style={inputStyle}>
              <option value="">Select Bill</option>
              {bills.filter(b => !vendorId || String(b.vendor_id) === vendorId).map(b => (
                <option key={b.id} value={b.id}>
                  {b.bill_number} (Bal: ₹{parseFloat(b.balance_due).toFixed(2)})
                </option>
              ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px", marginBottom: "15px" }}>
        <div>
          <label><strong>Vendor Credit Date</strong></label>
          <input type="date" value={vendorCreditDate} onChange={e => setVendorCreditDate(e.target.value)} style={inputStyle} />
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
          rows={2} style={inputStyle} placeholder="Any specific notes for this vendor credit." />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label><strong>Terms & Conditions</strong></label>
        <textarea value={terms} onChange={e => setTerms(e.target.value)}
          rows={3} style={inputStyle} placeholder="Terms and conditions..." />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "30px" }}>
        <button onClick={() => navigate(isEditMode ? `/vendor-credits/${id}/document` : "/vendor-credits")} style={cancelBtnStyle}>Cancel</button>
        <button onClick={handleSave} disabled={loading} style={primaryBtn}>
          {loading ? "Saving..." : (isEditMode ? "Update Vendor Credit" : "Save Vendor Credit")}
        </button>
      </div>

      {/* ===== NEW VENDOR MODAL ===== */}
      {showVendorModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ marginTop: 0 }}>+ New Vendor</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label>Display Name *</label>
                <input value={newVendor.display_name} onChange={e => setNewVendor({ ...newVendor, display_name: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label>Company Name</label>
                <input value={newVendor.company_name} onChange={e => setNewVendor({ ...newVendor, company_name: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label>Email</label>
                <input type="email" value={newVendor.email} onChange={e => setNewVendor({ ...newVendor, email: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label>Phone</label>
                <input value={newVendor.phone} onChange={e => setNewVendor({ ...newVendor, phone: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label>GSTIN / Tax Number</label>
                <input value={newVendor.pan} onChange={e => setNewVendor({ ...newVendor, pan: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label>Billing Address</label>
                <input value={newVendor.billing_address} onChange={e => setNewVendor({ ...newVendor, billing_address: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "15px" }}>
              <button onClick={() => setShowVendorModal(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleSaveVendor} style={primaryBtn}>Save Vendor</button>
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

export default AddVendorCredit;
