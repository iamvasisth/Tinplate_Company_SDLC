/**
 * AddItem.js – Zoho Books–style form for New / Edit item
 * Dependencies: apiRequest, react-router-dom, react-hot-toast
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

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

function AddItem() {
  const navigate = useNavigate();
  const { id } = useParams();             // 👈 for edit mode
  const isEdit = Boolean(id);

  // ---- Dirty state ----
  const [dirty, setDirty] = useState(false);

  // ---- Basic fields ----
  const [name, setName] = useState("");
  const [itemType, setItemType] = useState("Goods");
  const [unit, setUnit] = useState("");
  const [imageFile, setImageFile] = useState(null);

  // ---- Sales section ----
  const [salesEnabled, setSalesEnabled] = useState(false);
  const [sellPrice, setSellPrice] = useState("");
  const [salesAccount, setSalesAccount] = useState(INITIAL_SALES_ACCOUNTS[0]);
  const [salesDesc, setSalesDesc] = useState("");
  const [salesAccounts, setSalesAccounts] = useState(INITIAL_SALES_ACCOUNTS);
  const [addingSalesAccount, setAddingSalesAccount] = useState(false);
  const [newSalesAccount, setNewSalesAccount] = useState("");

  // ---- Purchase section ----
  const [purchaseEnabled, setPurchaseEnabled] = useState(false);
  const [costPrice, setCostPrice] = useState("");
  const [purchaseAccount, setPurchaseAccount] = useState(INITIAL_PURCHASE_ACCOUNTS[0]);
  const [purchaseDesc, setPurchaseDesc] = useState("");
  const [purchaseAccounts, setPurchaseAccounts] = useState(INITIAL_PURCHASE_ACCOUNTS);
  const [addingPurchaseAccount, setAddingPurchaseAccount] = useState(false);
  const [newPurchaseAccount, setNewPurchaseAccount] = useState("");
  const [preferredVendor, setPreferredVendor] = useState("");

  // ---- Vendors list ----
  const [vendors, setVendors] = useState([]);

  // ---- Loading ----
  const [loading, setLoading] = useState(false);

  // Mark dirty helper
  const markDirty = useCallback(() => setDirty(true), []);

  // Generic change handler
  const handleChange = (setter) => (e) => {
    setter(e.target.value);
    markDirty();
  };

  // Checkbox handler
  const handleCheckbox = (setter) => (e) => {
    setter(e.target.checked);
    markDirty();
  };

  // Load vendors
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await apiRequest("/contacts?type=vendor");
        if (res) setVendors(res.contacts);
      } catch (err) {
        console.error("Failed to fetch vendors", err);
      }
    };
    fetchVendors();
  }, []);

  // ----- LOAD ITEM DATA IF EDITING -----
  useEffect(() => {
    if (!isEdit) return;
    const fetchItem = async () => {
      try {
        const res = await apiRequest(`/items/${id}`);
        if (!res?.item) return;
        const item = res.item;
        setName(item.name || "");
        setItemType(item.item_type || "Goods");
        setUnit(item.unit || "");
        // imageFile cannot be pre-filled via file input; skip
        setSalesEnabled(!!(item.selling_price || item.sales_account));
        setSellPrice(item.selling_price ? String(item.selling_price) : "");
        setSalesAccount(item.sales_account || INITIAL_SALES_ACCOUNTS[0]);
        setSalesDesc(item.description || "");
        setPurchaseEnabled(!!(item.cost_price || item.purchase_account));
        setCostPrice(item.cost_price ? String(item.cost_price) : "");
        setPurchaseAccount(item.purchase_account || INITIAL_PURCHASE_ACCOUNTS[0]);
        setPurchaseDesc(item.purchase_description || "");
        setPreferredVendor(item.preferred_vendor_id ? String(item.preferred_vendor_id) : "");
        // Also add custom accounts to list if they are not in the initial list
        if (item.sales_account && !INITIAL_SALES_ACCOUNTS.includes(item.sales_account)) {
          setSalesAccounts(prev => prev.includes(item.sales_account) ? prev : [...prev, item.sales_account]);
        }
        if (item.purchase_account && !INITIAL_PURCHASE_ACCOUNTS.includes(item.purchase_account)) {
          setPurchaseAccounts(prev => prev.includes(item.purchase_account) ? prev : [...prev, item.purchase_account]);
        }
        setDirty(false); // not dirty after initial load
      } catch (err) {
        toast.error("Failed to load item");
      }
    };
    fetchItem();
  }, [id, isEdit]);

  // ---- Tab close / refresh warning ----
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

  // ---- Add account helpers ----
  const addSalesAccount = () => {
    if (!newSalesAccount.trim()) return;
    setSalesAccounts([...salesAccounts, newSalesAccount.trim()]);
    setSalesAccount(newSalesAccount.trim());
    setNewSalesAccount("");
    setAddingSalesAccount(false);
    markDirty();
  };

  const addPurchaseAccount = () => {
    if (!newPurchaseAccount.trim()) return;
    setPurchaseAccounts([...purchaseAccounts, newPurchaseAccount.trim()]);
    setPurchaseAccount(newPurchaseAccount.trim());
    setNewPurchaseAccount("");
    setAddingPurchaseAccount(false);
    markDirty();
  };

  // ---- Save ----
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
        image_url: imageFile ? imageFile.name : "", // placeholder, real upload later
        selling_price: salesEnabled ? (parseFloat(sellPrice) || 0) : 0,
        sales_account: salesEnabled ? salesAccount : null,
        description: salesEnabled ? salesDesc : "",
        purchase_description: purchaseEnabled ? purchaseDesc : "",
        cost_price: purchaseEnabled ? (parseFloat(costPrice) || 0) : 0,
        purchase_account: purchaseEnabled ? purchaseAccount : null,
        preferred_vendor_id: purchaseEnabled && preferredVendor ? parseInt(preferredVendor) : null,
      };

      if (isEdit) {
        await apiRequest(`/items/${id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("Item updated");
      } else {
        await apiRequest("/items", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Item created");
      }
      setDirty(false);
      navigate("/items");
    } catch (err) {
      toast.error(isEdit ? "Failed to update item" : "Failed to create item");
    } finally {
      setLoading(false);
    }
  };

  // Cancel – warn if dirty
  const handleCancel = () => {
    if (dirty) {
      const leave = window.confirm("You have unsaved changes. Are you sure you want to cancel?");
      if (!leave) return;
    }
    navigate("/items");
  };

  return (
    <div style={{ maxWidth: "700px", margin: "auto", padding: "30px" }}>
      <h2>{isEdit ? "Edit Item" : "New Item"}</h2>

      {/* ===== NAME & TYPE ===== */}
      <div style={formRow}>
        <div style={formGroup}>
          <label>Name *</label>
          <input
            value={name}
            onChange={handleChange(setName)}
            style={inputStyle}
            placeholder="Enter item name"
          />
        </div>
        <div style={formGroup}>
          <label>Type</label>
          <select value={itemType} onChange={handleChange(setItemType)} style={inputStyle}>
            <option value="Goods">Goods</option>
            <option value="Service">Service</option>
          </select>
        </div>
      </div>

      {/* ===== UNIT & IMAGE ===== */}
      <div style={formRow}>
        <div style={formGroup}>
          <label>Unit</label>
          <input
            list="unit-list"
            value={unit}
            onChange={handleChange(setUnit)}
            style={inputStyle}
            placeholder="e.g. pcs, kg, box"
          />
          <datalist id="unit-list">
            {UNITS.map(u => <option key={u} value={u} />)}
          </datalist>
        </div>
        <div style={formGroup}>
          <label>Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => { setImageFile(e.target.files[0]); markDirty(); }}
            style={inputStyle}
          />
        </div>
      </div>

      {/* ===== SALES INFORMATION ===== */}
      <div style={sectionStyle}>
        <label style={checkboxLabel}>
          <input
            type="checkbox"
            checked={salesEnabled}
            onChange={handleCheckbox(setSalesEnabled)}
          />
          Enable Sales Information
        </label>
      </div>
      {salesEnabled && (
        <div style={collapsibleContent}>
          <div style={formGroup}>
            <label>Selling Price</label>
            <input type="number" value={sellPrice} onChange={handleChange(setSellPrice)} style={inputStyle} placeholder="Rate at which you sell this item" />
          </div>
          <div style={formGroup}>
            <label>Account</label>
            <div style={{ display: "flex", gap: "5px" }}>
              <select value={salesAccount} onChange={handleChange(setSalesAccount)} style={inputStyle}>
                {salesAccounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
              </select>
              {!addingSalesAccount ? (
                <button onClick={() => setAddingSalesAccount(true)} style={addBtn}>+</button>
              ) : (
                <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                  <input value={newSalesAccount} onChange={handleChange(setNewSalesAccount)} placeholder="New account name" style={{ ...inputStyle, width: "150px" }} onKeyDown={e => e.key === "Enter" && addSalesAccount()} />
                  <button onClick={addSalesAccount} style={smallSaveBtn}>Add</button>
                  <button onClick={() => { setAddingSalesAccount(false); setNewSalesAccount(""); }} style={smallCancelBtn}>X</button>
                </div>
              )}
            </div>
            <small style={hint}>All sales transactions for this item will be tracked under this account.</small>
          </div>
          <div style={formGroup}>
            <label>Description</label>
            <input value={salesDesc} onChange={handleChange(setSalesDesc)} style={inputStyle} placeholder="Optional sales description" />
          </div>
        </div>
      )}

      {/* ===== PURCHASE INFORMATION ===== */}
      <div style={sectionStyle}>
        <label style={checkboxLabel}>
          <input
            type="checkbox"
            checked={purchaseEnabled}
            onChange={handleCheckbox(setPurchaseEnabled)}
          />
          Enable Purchase Information
        </label>
      </div>
      {purchaseEnabled && (
        <div style={collapsibleContent}>
          <div style={formGroup}>
            <label>Cost Price</label>
            <input type="number" value={costPrice} onChange={handleChange(setCostPrice)} style={inputStyle} placeholder="Rate at which you purchased this item" />
          </div>
          <div style={formGroup}>
            <label>Account</label>
            <div style={{ display: "flex", gap: "5px" }}>
              <select value={purchaseAccount} onChange={handleChange(setPurchaseAccount)} style={inputStyle}>
                {purchaseAccounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
              </select>
              {!addingPurchaseAccount ? (
                <button onClick={() => setAddingPurchaseAccount(true)} style={addBtn}>+</button>
              ) : (
                <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                  <input value={newPurchaseAccount} onChange={handleChange(setNewPurchaseAccount)} placeholder="New account name" style={{ ...inputStyle, width: "150px" }} onKeyDown={e => e.key === "Enter" && addPurchaseAccount()} />
                  <button onClick={addPurchaseAccount} style={smallSaveBtn}>Add</button>
                  <button onClick={() => { setAddingPurchaseAccount(false); setNewPurchaseAccount(""); }} style={smallCancelBtn}>X</button>
                </div>
              )}
            </div>
            <small style={hint}>All purchase transactions for this item will be tracked under this account.</small>
          </div>
          <div style={formGroup}>
            <label>Description</label>
            <input value={purchaseDesc} onChange={handleChange(setPurchaseDesc)} style={inputStyle} placeholder="Optional purchase description" />
          </div>
          <div style={formGroup}>
            <label>Preferred Vendor</label>
            <select value={preferredVendor} onChange={handleChange(setPreferredVendor)} style={inputStyle}>
              <option value="">Select vendor</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id.toString()}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ===== BUTTONS ===== */}
      <div style={{ marginTop: "30px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
        <button onClick={handleCancel} style={cancelBtn}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={loading} style={saveBtn}>
          {loading ? "Saving..." : isEdit ? "Update" : "Save"}
        </button>
      </div>
    </div>
  );
}

// ---- styles ----
const formGroup = { marginBottom: "15px", flex: 1 };
const formRow = { display: "flex", gap: "15px" };
const inputStyle = {
  width: "100%", padding: "8px", borderRadius: "5px",
  border: "1px solid #ccc", boxSizing: "border-box"
};
const sectionStyle = { margin: "20px 0 10px" };
const checkboxLabel = { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" };
const collapsibleContent = {
  background: "#f9f9f9", padding: "15px",
  borderRadius: "8px", marginBottom: "15px"
};
const hint = { display: "block", color: "gray", fontSize: "12px", marginTop: "4px" };
const addBtn = {
  background: "#4a90e2", color: "#fff", border: "none",
  borderRadius: "4px", width: "32px", cursor: "pointer",
  fontSize: "18px", fontWeight: "bold"
};
const smallSaveBtn = {
  background: "#28a745", color: "#fff", border: "none",
  borderRadius: "4px", padding: "4px 8px", cursor: "pointer"
};
const smallCancelBtn = {
  background: "#ccc", color: "#333", border: "none",
  borderRadius: "4px", padding: "4px 8px", cursor: "pointer"
};
const saveBtn = {
  background: "#28a745", color: "#fff", border: "none",
  padding: "10px 20px", borderRadius: "5px", cursor: "pointer"
};
const cancelBtn = {
  background: "#ccc", color: "#333", border: "none",
  padding: "10px 20px", borderRadius: "5px", cursor: "pointer"
};

export default AddItem;