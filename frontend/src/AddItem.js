/**
 * AddItem.js – Zoho Books–style form for New / Edit item
 * Dependencies: apiRequest, react-router-dom, react-hot-toast
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { apiRequest } from "./api";
import { FormSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

const BLUE = '#4a90e2';
const BORDER_COLOR = '#e2e8f0';
const TEXT_PRIMARY = '#1e293b';
const TEXT_SECONDARY = '#64748b';
const BG_PAGE = '#f8fafc';
const BG_CARD = '#ffffff';
const RADIUS = '8px';
const SHADOW = '0 1px 4px rgba(0,0,0,0.06)';

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  boxSizing: 'border-box',
  fontSize: '14px',
  color: '#374151',
  outline: 'none',
  transition: 'border-color 0.15s',
};

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: '500',
  color: '#374151',
  marginBottom: '6px',
};

// Predefined unit options
const UNITS = [
  "pcs", "kg", "g", "gm", "ltr", "ml", "m", "cm", "mm",
  "box", "pack", "roll", "set", "nos", "hour", "day", "month"
];

// Initial account lists
const INITIAL_SALES_ACCOUNTS = [
  "Sales", "General Income", "Interest Income",
  "Late Fee Income", "Other Charges", "Shipping Charge"
];

const INITIAL_PURCHASE_ACCOUNTS = [
  "Cost of Goods Sold", "Advertising And Marketing", "Automobile Expense",
  "Bad Debt", "Bank Fees and Charges", "Consultant Expense",
  "Credit Card Charges", "Depreciation And Amortisation",
  "IT and Internet Expenses", "Office Supplies", "Rent Expense",
  "Salaries and Employee Wages", "Travel Expense", "Uncategorized"
];

function AddItem({ onSaveSuccess, onCancel, isModal }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  // ---- Dirty state ----
  const [dirty, setDirty] = useState(false);

  // ---- Basic fields ----
  const [name, setName] = useState("");
  const [itemType, setItemType] = useState("Goods");
  const [unit, setUnit] = useState("");
  const [imageFile, setImageFile] = useState(null);

  // ---- Sales section ----
  const [salesEnabled, setSalesEnabled] = useState(true);
  const [sellPrice, setSellPrice] = useState("");
  const [salesAccount, setSalesAccount] = useState("");
  const [salesDesc, setSalesDesc] = useState("");
  const [salesAccounts, setSalesAccounts] = useState(() => {
    const saved = localStorage.getItem('customSalesAccounts');
    return saved ? JSON.parse(saved) : INITIAL_SALES_ACCOUNTS;
  });
  const [addingSalesAccount, setAddingSalesAccount] = useState(false);
  const [newSalesAccount, setNewSalesAccount] = useState("");

  // ---- Purchase section ----
  const [purchaseEnabled, setPurchaseEnabled] = useState(true);
  const [costPrice, setCostPrice] = useState("");
  const [purchaseAccount, setPurchaseAccount] = useState("");
  const [purchaseDesc, setPurchaseDesc] = useState("");
  const [purchaseAccounts, setPurchaseAccounts] = useState(() => {
    const saved = localStorage.getItem('customPurchaseAccounts');
    return saved ? JSON.parse(saved) : INITIAL_PURCHASE_ACCOUNTS;
  });
  const [addingPurchaseAccount, setAddingPurchaseAccount] = useState(false);
  const [newPurchaseAccount, setNewPurchaseAccount] = useState("");
  const [preferredVendor, setPreferredVendor] = useState("");

  // ---- Vendors list ----
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const markDirty = useCallback(() => setDirty(true), []);

  const handleChange = (setter) => (e) => {
    setter(e.target.value);
    markDirty();
  };

  const handleCheckbox = (setter) => (e) => {
    setter(e.target.checked);
    markDirty();
  };

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await apiRequest("/contacts?type=vendor");
        if (res) setVendors(res.contacts || []);
      } catch (err) {
        console.error("Failed to fetch vendors", err);
      }
    };
    fetchVendors();
  }, []);

  const location = useLocation();
  const cloneItem = location.state?.cloneItem;

  useEffect(() => {
    if (isEdit) {
      const fetchItem = async () => {
        setFetching(true);
        try {
          const res = await apiRequest("/items/" + id);
          if (!res?.item) return;
          populateForm(res.item);
          setDirty(false);
        } catch (err) {
          toast.error("Failed to load item");
        } finally {
          setFetching(false);
        }
      };
      fetchItem();
    } else if (cloneItem) {
      populateForm(cloneItem);
      setName((prev) => prev ? prev + " (Copy)" : "");
      setDirty(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit, cloneItem]);

  const populateForm = (item) => {
    setName(item.name || "");
    setItemType(item.item_type || "Goods");
    setUnit(item.unit || "");

    const hasSales = !!(item.selling_price || item.sales_account);
    setSalesEnabled(hasSales);
    setSellPrice(item.selling_price ? String(item.selling_price) : "");
    setSalesDesc(item.description || "");

    const hasPurchase = !!(item.cost_price || item.purchase_account);
    setPurchaseEnabled(hasPurchase);
    setCostPrice(item.cost_price ? String(item.cost_price) : "");
    setPurchaseDesc(item.purchase_description || "");
    setPreferredVendor(item.preferred_vendor_id ? String(item.preferred_vendor_id) : "");

    if (item.sales_account) {
      setSalesAccounts(prev => {
        if (!prev.includes(item.sales_account)) {
          const updated = [...prev, item.sales_account];
          localStorage.setItem('customSalesAccounts', JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
      setSalesAccount(item.sales_account);
    }

    if (item.purchase_account) {
      setPurchaseAccounts(prev => {
        if (!prev.includes(item.purchase_account)) {
          const updated = [...prev, item.purchase_account];
          localStorage.setItem('customPurchaseAccounts', JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
      setPurchaseAccount(item.purchase_account);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const addSalesAccount = () => {
    if (!newSalesAccount.trim()) return;
    const newAccount = newSalesAccount.trim();
    if (!salesAccounts.includes(newAccount)) {
      const updated = [...salesAccounts, newAccount];
      setSalesAccounts(updated);
      localStorage.setItem('customSalesAccounts', JSON.stringify(updated));
    }
    setSalesAccount(newAccount);
    setNewSalesAccount("");
    setAddingSalesAccount(false);
    markDirty();
  };

  const addPurchaseAccount = () => {
    if (!newPurchaseAccount.trim()) return;
    const newAccount = newPurchaseAccount.trim();
    if (!purchaseAccounts.includes(newAccount)) {
      const updated = [...purchaseAccounts, newAccount];
      setPurchaseAccounts(updated);
      localStorage.setItem('customPurchaseAccounts', JSON.stringify(updated));
    }
    setPurchaseAccount(newAccount);
    setNewPurchaseAccount("");
    setAddingPurchaseAccount(false);
    markDirty();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Item name is required");
      return;
    }
    try {
      setLoading(true);
      const payload = {
        name,
        item_type: itemType,
        unit,
        image_url: imageFile ? imageFile.name : "",
        selling_price: salesEnabled ? (parseFloat(sellPrice) || 0) : 0,
        sales_account: salesEnabled ? (salesAccount || salesAccounts[0]) : null,
        description: salesEnabled ? salesDesc : "",
        purchase_description: purchaseEnabled ? purchaseDesc : "",
        cost_price: purchaseEnabled ? (parseFloat(costPrice) || 0) : 0,
        purchase_account: purchaseEnabled ? (purchaseAccount || purchaseAccounts[0]) : null,
        preferred_vendor_id: purchaseEnabled && preferredVendor ? parseInt(preferredVendor) : null,
      };

      if (isEdit) {
        await apiRequest("/items/" + id, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("Item updated");
      } else {
        await apiRequest("/items", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Item created");
      }
      setDirty(false);
      
      if (onSaveSuccess) {
        onSaveSuccess();
      } else {
        navigate("/items");
      }
    } catch (err) {
      toast.error(isEdit ? "Failed to update item" : "Failed to create item");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (dirty) {
      const leave = window.confirm("You have unsaved changes. Are you sure you want to cancel?");
      if (!leave) return;
    }
    if (onCancel) {
      onCancel();
    } else {
      navigate("/items");
    }
  };

  if (fetching) {
    return (
      <div style={{ maxWidth: "900px", margin: "auto", padding: "30px" }}>
        <FormSkeleton fields={8} />
      </div>
    );
  }

  return (
    <div style={isModal ? { padding: "10px", background: BG_CARD } : { maxWidth: "900px", margin: "auto", padding: "30px", background: BG_PAGE, minHeight: "100vh" }}>
      {/* Header */}
      {!isModal && (
        <div style={{ display: "flex", alignItems: "center", marginBottom: "20px", paddingBottom: "15px", borderBottom: `1px solid ${BORDER_COLOR}` }}>
          <button onClick={handleCancel} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: TEXT_SECONDARY, marginRight: "15px", padding: 0 }}>
            ← Back to Items
          </button>
          <h2 style={{ margin: 0, color: TEXT_PRIMARY }}>{isEdit ? "Edit Item" : "New Item"}</h2>
        </div>
      )}

      <div style={isModal ? { background: BG_CARD } : { background: BG_CARD, border: `1px solid ${BORDER_COLOR}`, borderRadius: '10px', padding: '30px', boxShadow: SHADOW }}>
        
        {/* Type & Name */}
        <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Type</label>
            <div style={{ display: "flex", gap: "15px", padding: "8px 0" }}>
              <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: TEXT_PRIMARY, cursor: "pointer" }}>
                <input type="radio" checked={itemType === "Goods"} onChange={() => { setItemType("Goods"); markDirty(); }} style={{ marginRight: "8px", accentColor: BLUE }} /> Goods
              </label>
              <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: TEXT_PRIMARY, cursor: "pointer" }}>
                <input type="radio" checked={itemType === "Service"} onChange={() => { setItemType("Service"); markDirty(); }} style={{ marginRight: "8px", accentColor: BLUE }} /> Service
              </label>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
          <div style={{ flex: 2 }}>
            <label style={{...labelStyle, color: '#d32f2f'}}>Name *</label>
            <input value={name} onChange={handleChange(setName)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
          </div>
          {itemType === "Goods" && (
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Unit</label>
              <input
                list="unit-list"
                value={unit}
                onChange={handleChange(setUnit)}
                style={inputStyle}
                placeholder="Select or type"
                onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'}
              />
              <datalist id="unit-list">
                {UNITS.map(u => <option key={u} value={u} />)}
              </datalist>
            </div>
          )}
        </div>

        {/* Image Dropzone - Using similar style to other fields but styled as dropzone */}
        <div style={{ marginBottom: "30px" }}>
          <label style={labelStyle}>Item Image</label>
          <div 
            style={{ 
              border: `1px dashed #d1d5db`, 
              borderRadius: RADIUS, 
              padding: "20px", 
              textAlign: "center", 
              cursor: "pointer", 
              background: "#fafafa" 
            }}
            onClick={() => document.getElementById("item-image").click()}
          >
            <div style={{ color: TEXT_SECONDARY, marginBottom: "8px" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto", display: "block", marginBottom: "10px" }}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              {imageFile ? imageFile.name : "Drag image here or click to browse"}
            </div>
            <input
              type="file"
              id="item-image"
              style={{ display: "none" }}
              onChange={(e) => { setImageFile(e.target.files[0]); markDirty(); }}
              accept="image/*"
            />
          </div>
        </div>

        {/* Sales Information */}
        <div style={{ marginBottom: "20px", borderTop: `1px solid ${BORDER_COLOR}`, paddingTop: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "16px", fontWeight: "600", color: TEXT_PRIMARY, marginBottom: "15px", cursor: "pointer" }}>
            <input type="checkbox" checked={salesEnabled} onChange={handleCheckbox(setSalesEnabled)} style={{ marginRight: "10px", width: "16px", height: "16px", accentColor: BLUE }} />
            Sales Information
          </label>
          
          {salesEnabled && (
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 300px" }}>
                <label style={{...labelStyle, color: '#d32f2f'}}>Selling Price *</label>
                <div style={{ display: "flex", alignItems: "stretch", marginBottom: "15px" }}>
                  <span style={{ padding: "9px 12px", background: "#f8f9fa", border: "1px solid #d1d5db", borderRight: "none", borderRadius: "6px 0 0 6px", color: "#555", fontSize: "14px" }}>INR</span>
                  <input type="number" value={sellPrice} onChange={handleChange(setSellPrice)} style={{...inputStyle, borderRadius: "0 6px 6px 0"}} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
                </div>
                
                <label style={labelStyle}>Description</label>
                <textarea rows="3" value={salesDesc} onChange={handleChange(setSalesDesc)} style={{...inputStyle, resize: "vertical"}} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'}></textarea>
              </div>
              
              <div style={{ flex: "1 1 300px" }}>
                <label style={{...labelStyle, color: '#d32f2f'}}>Account *</label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
                  <select value={salesAccount || salesAccounts[0]} onChange={handleChange(setSalesAccount)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'}>
                    {salesAccounts.map(acc => (
                      <option key={acc} value={acc}>{acc}</option>
                    ))}
                  </select>
                  {!addingSalesAccount ? (
                    <button type="button" onClick={() => setAddingSalesAccount(true)} style={{ padding: "0 12px", background: "#fff", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontSize: "18px", color: TEXT_SECONDARY }}>+</button>
                  ) : (
                    <div style={{ display: 'flex', gap: '5px', width: '250px' }}>
                      <input value={newSalesAccount} onChange={handleChange(setNewSalesAccount)} style={inputStyle} placeholder="New Account" onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
                      <button type="button" onClick={addSalesAccount} style={{ padding: "0 12px", background: BLUE, color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>Add</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Purchase Information */}
        <div style={{ marginBottom: "20px", borderTop: `1px solid ${BORDER_COLOR}`, paddingTop: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "16px", fontWeight: "600", color: TEXT_PRIMARY, marginBottom: "15px", cursor: "pointer" }}>
            <input type="checkbox" checked={purchaseEnabled} onChange={handleCheckbox(setPurchaseEnabled)} style={{ marginRight: "10px", width: "16px", height: "16px", accentColor: BLUE }} />
            Purchase Information
          </label>
          
          {purchaseEnabled && (
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 300px" }}>
                <label style={{...labelStyle, color: '#d32f2f'}}>Cost Price *</label>
                <div style={{ display: "flex", alignItems: "stretch", marginBottom: "15px" }}>
                  <span style={{ padding: "9px 12px", background: "#f8f9fa", border: "1px solid #d1d5db", borderRight: "none", borderRadius: "6px 0 0 6px", color: "#555", fontSize: "14px" }}>INR</span>
                  <input type="number" value={costPrice} onChange={handleChange(setCostPrice)} style={{...inputStyle, borderRadius: "0 6px 6px 0"}} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
                </div>
                
                <label style={labelStyle}>Description</label>
                <textarea rows="3" value={purchaseDesc} onChange={handleChange(setPurchaseDesc)} style={{...inputStyle, resize: "vertical"}} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'}></textarea>
              </div>
              
              <div style={{ flex: "1 1 300px" }}>
                <label style={{...labelStyle, color: '#d32f2f'}}>Account *</label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
                  <select value={purchaseAccount || purchaseAccounts[0]} onChange={handleChange(setPurchaseAccount)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'}>
                    {purchaseAccounts.map(acc => (
                      <option key={acc} value={acc}>{acc}</option>
                    ))}
                  </select>
                  {!addingPurchaseAccount ? (
                    <button type="button" onClick={() => setAddingPurchaseAccount(true)} style={{ padding: "0 12px", background: "#fff", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontSize: "18px", color: TEXT_SECONDARY }}>+</button>
                  ) : (
                    <div style={{ display: 'flex', gap: '5px', width: '250px' }}>
                      <input value={newPurchaseAccount} onChange={handleChange(setNewPurchaseAccount)} style={inputStyle} placeholder="New Account" onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
                      <button type="button" onClick={addPurchaseAccount} style={{ padding: "0 12px", background: BLUE, color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>Add</button>
                    </div>
                  )}
                </div>

                <label style={labelStyle}>Preferred Vendor</label>
                <select value={preferredVendor} onChange={handleChange(setPreferredVendor)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'}>
                  <option value="">Select vendor</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id.toString()}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ marginTop: "30px", paddingTop: "20px", borderTop: `1px solid ${BORDER_COLOR}`, display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button onClick={handleCancel} style={{ padding: "10px 20px", background: "#fff", color: TEXT_PRIMARY, border: `1px solid #d1d5db`, borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>Cancel</button>
          <button onClick={handleSave} disabled={loading} style={{ padding: "10px 20px", background: BLUE, color: "#fff", border: "none", borderRadius: "6px", cursor: loading ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: "500", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Saving..." : isEdit ? "Update" : "Save"}
          </button>
        </div>

      </div>
    </div>
  );
}

export default AddItem;