/**
 * AddPurchaseOrder.js – New Purchase Order creation form
 */
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "./api";
import { FormSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function AddPurchaseOrder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // --- Basic fields ---
  const [vendorId, setVendorId] = useState("");
  const [poDate, setPoDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  // --- Items ---
  const [items, setItems] = useState([
    { item_id: "", item_name: "", description: "", quantity: 1, rate: 0, tax_rate: 0, discount: 0, discount_type: "flat", hsn_code: "", unit: "" }
  ]);

  // --- Dropdown data ---
  const [vendors, setVendors] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // --- Modals ---
  const [showVendorModal, setShowVendorModal] = useState(false);

  // --- New Vendor form ---
  const [newVendor, setNewVendor] = useState({ display_name: "", company_name: "", email: "", phone: "", billing_address: "", pan: "" });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [vendRes, itemRes] = await Promise.all([
          apiRequest("/vendors"),
          apiRequest("/items"),
        ]);
        setVendors(vendRes?.vendors || []);
        setCatalogItems(itemRes?.items || []);

        if (isEditMode) {
          setFetching(true);
          const res = await apiRequest(`/purchase-orders/${id}`);
          if (res?.purchase_order) {
            const po = res.purchase_order;
            setVendorId(po.vendor_id ? String(po.vendor_id) : "");
            setPoDate(po.purchase_order_date ? po.purchase_order_date.slice(0, 10) : "");
            setExpectedDeliveryDate(po.expected_delivery_date ? po.expected_delivery_date.slice(0, 10) : "");
            setReferenceNumber(po.reference_number || "");
            setNotes(po.notes || "");
            setTerms(po.terms_conditions || "");
            if (res.items && res.items.length > 0) {
              setItems(res.items.map(item => ({
                item_id:       item.item_id       ? String(item.item_id)  : "",
                item_name:     item.item_name     || "",
                description:   item.description   || "",
                quantity:      item.quantity       || 1,
                rate:          item.rate           || 0,
                tax_rate:      item.tax_rate       || 0,
                discount:      item.discount       || 0,
                discount_type: item.discount_type  || "flat",
                hsn_code:      item.hsn_code       || "",
                unit:          item.unit           || "",
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
  }, [id, isEditMode]);

  const addItem = () => {
    setItems([...items, { item_id: "", item_name: "", description: "", quantity: 1, rate: 0, tax_rate: 0, discount: 0, discount_type: "flat", hsn_code: "", unit: "" }]);
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
        updated[index].rate        = catalogItem.purchase_price || 0; // PO uses purchase_price
        updated[index].tax_rate    = catalogItem.tax_rate || 0;
        updated[index].hsn_code    = catalogItem.hsn_code || "";
        updated[index].unit        = catalogItem.unit || "";
      }
    } else {
      updated[index].item_name = "";
      updated[index].hsn_code  = "";
      updated[index].unit      = "";
    }
    setItems(updated);
  };

  const calcLineAmount = (item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    let amt = qty * rate;
    const disc = parseFloat(item.discount) || 0;
    if (item.discount_type === "percent") {
      amt -= amt * (disc / 100);
    } else {
      amt -= disc;
    }
    return amt;
  };

  const calcLineTax = (item) => {
    const amt = calcLineAmount(item);
    return amt * ((parseFloat(item.tax_rate) || 0) / 100);
  };

  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0), 0);
  const totalDiscount = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const disc = parseFloat(item.discount) || 0;
    if (item.discount_type === "percent") return sum + (qty * rate * disc / 100);
    return sum + disc;
  }, 0);
  const totalTax = items.reduce((sum, item) => sum + calcLineTax(item), 0);
  const grandTotal = subtotal - totalDiscount + totalTax;

  const handleSave = async () => {
    if (!vendorId) { toast.error("Please select a vendor"); return; }
    if (items.length === 0 || items.every(item => !item.description && !item.item_id)) {
      toast.error("Add at least one item"); return;
    }
    setLoading(true);
    try {
      if (isEditMode) {
        await apiRequest(`/purchase-orders/${id}`, {
          method: "PUT",
          body: JSON.stringify({
            vendor_id: parseInt(vendorId),
            purchase_order_date: poDate,
            expected_delivery_date: expectedDeliveryDate || null,
            reference_number: referenceNumber,
            notes: notes,
            terms_conditions: terms,
            items: items.map(item => ({
              ...item,
              item_id:   item.item_id   ? parseInt(item.item_id) : null,
              item_name: item.item_name || null,
              hsn_code:  item.hsn_code  || null,
              unit:      item.unit      || null,
              quantity:  parseFloat(item.quantity) || 0,
              rate:      parseFloat(item.rate) || 0,
              tax_rate:  parseFloat(item.tax_rate) || 0,
              discount:  parseFloat(item.discount) || 0,
            })),
          }),
        });
        toast.success("Purchase Order updated");
        navigate(`/purchase-orders/${id}/document`);
      } else {
        await apiRequest("/purchase-orders", {
          method: "POST",
          body: JSON.stringify({
            vendor_id: parseInt(vendorId),
            purchase_order_date: poDate,
            expected_delivery_date: expectedDeliveryDate || null,
            reference_number: referenceNumber,
            status: "Draft",
            notes: notes,
            terms_conditions: terms,
            items: items.map(item => ({
              ...item,
              item_id:   item.item_id   ? parseInt(item.item_id) : null,
              item_name: item.item_name || null,
              hsn_code:  item.hsn_code  || null,
              unit:      item.unit      || null,
              quantity:  parseFloat(item.quantity) || 0,
              rate:      parseFloat(item.rate) || 0,
              tax_rate:  parseFloat(item.tax_rate) || 0,
              discount:  parseFloat(item.discount) || 0,
            })),
          }),
        });
        toast.success("Purchase Order created");
        navigate("/purchase-orders");
      }
    } catch (err) {
      toast.error(isEditMode ? "Failed to update Purchase Order" : "Failed to create Purchase Order");
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
        <h2 style={{ marginBottom: "25px" }}>{isEditMode ? "Edit Purchase Order" : "New Purchase Order"}</h2>
        <FormSkeleton fields={8} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "960px", margin: "auto", padding: "30px" }}>
      <h2 style={{ marginBottom: "25px" }}>{isEditMode ? "Edit Purchase Order" : "New Purchase Order"}</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px", marginBottom: "15px" }}>
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
          <label><strong>Purchase Order Date</strong></label>
          <input type="date" value={poDate} onChange={e => setPoDate(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label><strong>Expected Delivery Date</strong></label>
          <input type="date" value={expectedDeliveryDate} onChange={e => setExpectedDeliveryDate(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px", marginBottom: "15px" }}>
        <div>
          <label><strong>Reference#</strong></label>
          <input type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} style={inputStyle} placeholder="e.g. REF-1234" />
        </div>
      </div>

      {/* Items Table */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <h3 style={{ margin: 0 }}>Item Table</h3>
        <button onClick={addItem} style={secondaryBtn}>+ Add Row</button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "15px", minWidth: "800px" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={thStyle}>Item</th>
              <th style={thStyle}>Description</th>
              <th style={{ ...thStyle, width: "70px" }}>Qty</th>
              <th style={{ ...thStyle, width: "90px" }}>Rate</th>
              <th style={{ ...thStyle, width: "80px" }}>Discount</th>
              <th style={{ ...thStyle, width: "60px" }}>Tax %</th>
              <th style={{ ...thStyle, width: "90px" }}>Amount</th>
              <th style={{ ...thStyle, width: "40px" }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={tdStyle}>
                  <select value={item.item_id} onChange={e => handleItemSelect(idx, e.target.value)}
                    style={{ ...inputStyle, minWidth: "120px" }}>
                    <option value="">— Select item —</option>
                    {catalogItems.map(ci => (
                      <option key={ci.id} value={ci.id}>{ci.name}</option>
                    ))}
                  </select>
                  {(item.hsn_code || item.unit) && (
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px", display: "flex", gap: "6px" }}>
                      {item.hsn_code && <span style={{ background: "#f0f4ff", border: "1px solid #c7d2fe", borderRadius: "3px", padding: "1px 5px" }}>HSN: {item.hsn_code}</span>}
                      {item.unit && <span style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "3px", padding: "1px 5px" }}>Unit: {item.unit}</span>}
                    </div>
                  )}
                </td>
                <td style={tdStyle}>
                  <input type="text" placeholder="Description" value={item.description}
                    onChange={e => updateItem(idx, "description", e.target.value)} style={{ ...inputStyle, minWidth: "140px" }} />
                </td>
                <td style={tdStyle}>
                  <input type="number" min="0" value={item.quantity}
                    onChange={e => updateItem(idx, "quantity", e.target.value)} style={{ ...inputStyle, width: "65px" }} />
                </td>
                <td style={tdStyle}>
                  <input type="number" min="0" step="0.01" value={item.rate}
                    onChange={e => updateItem(idx, "rate", e.target.value)} style={{ ...inputStyle, width: "85px" }} />
                </td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                    <input type="number" min="0" step="0.01" value={item.discount}
                      onChange={e => updateItem(idx, "discount", e.target.value)} style={{ ...inputStyle, width: "55px" }} />
                    <select value={item.discount_type} onChange={e => updateItem(idx, "discount_type", e.target.value)}
                      style={{ ...inputStyle, width: "35px", padding: "4px" }}>
                      <option value="flat">₹</option>
                      <option value="percent">%</option>
                    </select>
                  </div>
                </td>
                <td style={tdStyle}>
                  <input type="number" min="0" max="100" value={item.tax_rate}
                    onChange={e => updateItem(idx, "tax_rate", e.target.value)} style={{ ...inputStyle, width: "55px" }} />
                </td>
                <td style={{ ...tdStyle, fontWeight: "500" }}>
                  ₹{(calcLineAmount(item) + calcLineTax(item)).toFixed(2)}
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

      {/* Notes & Terms */}
      <div style={{ marginBottom: "15px" }}>
        <label><strong>Notes</strong></label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          rows={2} style={inputStyle} placeholder="Looking forward to doing business with you." />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label><strong>Terms & Conditions</strong></label>
        <textarea value={terms} onChange={e => setTerms(e.target.value)}
          rows={3} style={inputStyle} placeholder="Enter the terms and conditions..." />
      </div>

      {/* Totals */}
      <div style={{ background: "#f9fafb", padding: "15px", borderRadius: "8px", marginBottom: "20px", maxWidth: "350px", marginLeft: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span>Sub Total</span><span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", color: "#e74c3c" }}>
          <span>Total Discount</span><span>- ₹{totalDiscount.toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", color: "#2980b9" }}>
          <span>Total Tax</span><span>+ ₹{totalTax.toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "16px", borderTop: "1px solid #ddd", paddingTop: "10px" }}>
          <span>Grand Total (₹)</span><span>₹{grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
        <button onClick={() => navigate(isEditMode ? `/purchase-orders/${id}/document` : "/purchase-orders")} style={cancelBtnStyle}>Cancel</button>
        <button onClick={handleSave} disabled={loading} style={primaryBtn}>
          {loading ? "Saving..." : (isEditMode ? "Update Purchase Order" : "Save Purchase Order")}
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
const tdStyle = { padding: "6px 8px" };
const inputStyle = { width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc", boxSizing: "border-box", fontSize: "13px" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "500" };
const secondaryBtn = { padding: "8px 14px", background: "#f0f0f0", color: "#333", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer", fontSize: "13px" };
const cancelBtnStyle = { padding: "10px 20px", background: "#ccc", color: "#333", border: "none", borderRadius: "5px", cursor: "pointer" };
const deleteItemBtn = { background: "red", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", padding: "4px 8px" };
const addBtnSmall = { padding: "6px 10px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" };
const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalBox = { background: "#fff", borderRadius: "8px", padding: "25px", width: "550px", maxWidth: "95%", maxHeight: "85vh", overflow: "auto", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" };

export default AddPurchaseOrder;
