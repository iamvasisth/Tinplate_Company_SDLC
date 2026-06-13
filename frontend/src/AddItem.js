/**
 * AddItem.js – Zoho Books–style form for New / Edit item
 * Dependencies: apiRequest, react-router-dom, react-hot-toast
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
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

const customCSS = `
  .add-item-container {
    background: #fff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #212529;
    min-height: calc(100vh - 60px);
  }
  .add-item-header {
    padding: 15px 30px;
    border-bottom: 1px solid #f0f0f0;
  }
  .add-item-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 400;
  }
  .form-section {
    padding: 30px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    gap: 60px;
  }
  .top-left {
    flex: 1;
    max-width: 650px;
  }
  .top-right {
    width: 250px;
  }
  .form-row {
    display: flex;
    margin-bottom: 20px;
    align-items: flex-start;
  }
  .form-label {
    width: 160px;
    font-size: 13px;
    padding-top: 8px;
    display: flex;
    align-items: center;
    gap: 5px;
    color: #333;
  }
  .req-dashed {
    color: #d32f2f;
    border-bottom: 1px dashed #d32f2f;
    padding-bottom: 2px;
  }
  .form-control {
    flex: 1;
    min-width: 0;
  }
  .input-field {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s;
  }
  .input-field:focus {
    border-color: #4a90e2;
  }
  .radio-group {
    display: flex;
    gap: 20px;
    padding-top: 8px;
  }
  .radio-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    cursor: pointer;
  }
  .radio-label input[type="radio"] {
    accent-color: #4a90e2;
    margin: 0;
    width: 16px;
    height: 16px;
  }
  .icon-help {
    color: #777;
    font-size: 11px;
    border: 1px solid #ccc;
    border-radius: 50%;
    width: 14px;
    height: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: help;
  }
  .image-dropzone {
    border: 1px dashed #ccc;
    border-radius: 6px;
    height: 160px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #888;
    font-size: 13px;
    cursor: pointer;
    background: #fff;
    transition: background 0.2s;
  }
  .image-dropzone:hover {
    background: #f9f9f9;
  }
  .image-dropzone svg {
    color: #999;
    margin-bottom: 12px;
  }
  .image-dropzone a {
    color: #4a90e2;
    text-decoration: none;
    margin-top: 4px;
  }
  .section-container {
    border-bottom: 1px solid #f0f0f0;
  }
  .section-title {
    font-size: 15px;
    font-weight: 500;
    padding: 20px 30px;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
  }
  .section-title input[type="checkbox"] {
    accent-color: #4a90e2;
    width: 16px;
    height: 16px;
    margin: 0;
  }
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    padding: 0 30px 30px 30px;
  }
  .prefix-input {
    display: flex;
    border: 1px solid #ccc;
    border-radius: 4px;
    overflow: hidden;
    transition: border-color 0.2s;
  }
  .prefix-input:focus-within {
    border-color: #4a90e2;
  }
  .prefix-input span {
    background: #f8f9fa;
    padding: 8px 12px;
    color: #555;
    font-size: 13px;
    border-right: 1px solid #ccc;
  }
  .prefix-input input {
    flex: 1;
    border: none;
    padding: 8px 12px;
    font-size: 13px;
    outline: none;
    width: 100%;
    min-width: 0;
  }
  textarea.input-field {
    resize: vertical;
    font-family: inherit;
  }
  .btn-add {
    background: #fff;
    color: #666;
    border: 1px solid #ccc;
    border-radius: 4px;
    width: 34px;
    cursor: pointer;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  .btn-add:hover {
    background: #f0f0f0;
  }
  .form-actions {
    padding: 20px 30px;
    display: flex;
    gap: 12px;
    background: #fbfbfb;
    border-top: 1px solid #f0f0f0;
  }
  .btn-save {
    background: #4a90e2;
    color: white;
    border: none;
    padding: 8px 24px;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s;
  }
  .btn-save:hover {
    background: #357abd;
  }
  .btn-cancel {
    background: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
    padding: 8px 24px;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s;
  }
  .btn-cancel:hover {
    background: #ebebeb;
  }
`;

function AddItem() {
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

  // ---- Inventory section ----
  const [isInventoryTracked, setIsInventoryTracked] = useState(false);
  const [inventoryAccount, setInventoryAccount] = useState("Inventory Asset");
  const [openingStock, setOpeningStock] = useState("");
  const [openingStockRate, setOpeningStockRate] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");

  // ---- Vendors list ----
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);

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
        try {
          const res = await apiRequest("/items/" + id);
          if (!res?.item) return;
          populateForm(res.item);
          setDirty(false);
        } catch (err) {
          toast.error("Failed to load item");
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

    setIsInventoryTracked(item.is_inventory_tracked || false);
    setInventoryAccount(item.inventory_account || "Inventory Asset");
    setOpeningStock(item.opening_stock ? String(item.opening_stock) : "");
    setOpeningStockRate(item.opening_stock_rate ? String(item.opening_stock_rate) : "");
    setReorderLevel(item.reorder_level ? String(item.reorder_level) : "");

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
        is_inventory_tracked: isInventoryTracked,
        inventory_account: isInventoryTracked ? inventoryAccount : null,
        opening_stock: isInventoryTracked ? (parseFloat(openingStock) || 0) : 0,
        opening_stock_rate: isInventoryTracked ? (parseFloat(openingStockRate) || 0) : 0,
        reorder_level: isInventoryTracked ? (parseFloat(reorderLevel) || 0) : 0,
      };

      if (isEdit) {
        await apiRequest("/items/" + id, { method: "PUT", body: JSON.stringify(payload) });
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

  const handleCancel = () => {
    if (dirty) {
      const leave = window.confirm("You have unsaved changes. Are you sure you want to cancel?");
      if (!leave) return;
    }
    navigate("/items");
  };

  return (
    <>
      <style>{customCSS}</style>
      <div className="add-item-container">
        <div className="add-item-header">
          <h2>{isEdit ? "Edit Item" : "New Item"}</h2>
        </div>

        {/* ===== NAME, TYPE, UNIT & IMAGE ===== */}
        <div className="form-section">
          <div className="top-left">
            <div className="form-row">
              <label className="form-label" style={{ color: '#d32f2f' }}>Name*</label>
              <div className="form-control">
                <input
                  type="text"
                  className="input-field"
                  value={name}
                  onChange={handleChange(setName)}
                />
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">
                Type{" "}
                <span className="icon-help" title="Select Goods for physical items and Service for non-physical items.">?</span>
              </label>
              <div className="form-control radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    checked={itemType === "Goods"}
                    onChange={() => { setItemType("Goods"); markDirty(); }}
                  /> Goods
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    checked={itemType === "Service"}
                    onChange={() => { setItemType("Service"); markDirty(); }}
                  /> Service
                </label>
              </div>
            </div>
            {itemType === "Goods" && (
              <div className="form-row">
                <label className="form-label">
                  Unit{" "}
                  <span className="icon-help" title="Select the unit of measurement.">?</span>
                </label>
                <div className="form-control">
                  <input
                    list="unit-list"
                    className="input-field"
                    value={unit}
                    onChange={handleChange(setUnit)}
                    placeholder="Select or type to add"
                  />
                  <datalist id="unit-list">
                    {UNITS.map(u => <option key={u} value={u} />)}
                  </datalist>
                </div>
              </div>
            )}
          </div>
          <div className="top-right">
            <div
              className="image-dropzone"
              onClick={() => document.getElementById("item-image").click()}
            >
              <svg
                width="40" height="40" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <div>Drag image(s) here or</div>
              <a href="#browse" onClick={(e) => e.preventDefault()}>Browse images</a>
              <input
                type="file"
                id="item-image"
                style={{ display: "none" }}
                onChange={(e) => { setImageFile(e.target.files[0]); markDirty(); }}
                accept="image/*"
              />
            </div>
          </div>
        </div>

        {/* ===== SALES INFORMATION ===== */}
        <div className="section-container">
          <label className="section-title">
            <input
              type="checkbox"
              checked={salesEnabled}
              onChange={handleCheckbox(setSalesEnabled)}
            />
            Sales Information
          </label>
          {salesEnabled && (
            <div className="info-grid">
              <div className="grid-col">
                <div className="form-row">
                  <label className="form-label">
                    <span className="req-dashed">Selling Price*</span>
                  </label>
                  <div className="form-control">
                    <div className="prefix-input">
                      <span>INR</span>
                      <input
                        type="number"
                        value={sellPrice}
                        onChange={handleChange(setSellPrice)}
                      />
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <label className="form-label">Description</label>
                  <div className="form-control">
                    <textarea
                      className="input-field"
                      rows="3"
                      value={salesDesc}
                      onChange={handleChange(setSalesDesc)}
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="grid-col">
                <div className="form-row">
                  <label className="form-label">
                    <span className="req-dashed">Account*</span>
                  </label>
                  <div className="form-control" style={{ display: 'flex', gap: '8px' }}>
                    <select
                      className="input-field"
                      value={salesAccount || salesAccounts[0]}
                      onChange={handleChange(setSalesAccount)}
                    >
                      {salesAccounts.map(acc => (
                        <option key={acc} value={acc}>{acc}</option>
                      ))}
                    </select>
                    {!addingSalesAccount ? (
                      <button
                        type="button"
                        className="btn-add"
                        onClick={() => setAddingSalesAccount(true)}
                      >+</button>
                    ) : (
                      <div style={{ display: 'flex', gap: '5px', width: '200px' }}>
                        <input
                          className="input-field"
                          value={newSalesAccount}
                          onChange={handleChange(setNewSalesAccount)}
                        />
                        <button
                          type="button"
                          className="btn-add"
                          style={{ width: 'auto', padding: '0 10px' }}
                          onClick={addSalesAccount}
                        >Add</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== PURCHASE INFORMATION ===== */}
        <div className="section-container">
          <label className="section-title">
            <input
              type="checkbox"
              checked={purchaseEnabled}
              onChange={handleCheckbox(setPurchaseEnabled)}
            />
            Purchase Information
          </label>
          {purchaseEnabled && (
            <div className="info-grid">
              <div className="grid-col">
                <div className="form-row">
                  <label className="form-label">
                    <span className="req-dashed">Cost Price*</span>
                  </label>
                  <div className="form-control">
                    <div className="prefix-input">
                      <span>INR</span>
                      <input
                        type="number"
                        value={costPrice}
                        onChange={handleChange(setCostPrice)}
                      />
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <label className="form-label">Description</label>
                  <div className="form-control">
                    <textarea
                      className="input-field"
                      rows="3"
                      value={purchaseDesc}
                      onChange={handleChange(setPurchaseDesc)}
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="grid-col">
                <div className="form-row">
                  <label className="form-label">
                    <span className="req-dashed">Account*</span>
                  </label>
                  <div className="form-control" style={{ display: 'flex', gap: '8px' }}>
                    <select
                      className="input-field"
                      value={purchaseAccount || purchaseAccounts[0]}
                      onChange={handleChange(setPurchaseAccount)}
                    >
                      {purchaseAccounts.map(acc => (
                        <option key={acc} value={acc}>{acc}</option>
                      ))}
                    </select>
                    {!addingPurchaseAccount ? (
                      <button
                        type="button"
                        className="btn-add"
                        onClick={() => setAddingPurchaseAccount(true)}
                      >+</button>
                    ) : (
                      <div style={{ display: 'flex', gap: '5px', width: '200px' }}>
                        <input
                          className="input-field"
                          value={newPurchaseAccount}
                          onChange={handleChange(setNewPurchaseAccount)}
                        />
                        <button
                          type="button"
                          className="btn-add"
                          style={{ width: 'auto', padding: '0 10px' }}
                          onClick={addPurchaseAccount}
                        >Add</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-row">
                  <label className="form-label">Preferred Vendor</label>
                  <div className="form-control">
                    <select
                      className="input-field"
                      value={preferredVendor}
                      onChange={handleChange(setPreferredVendor)}
                    >
                      <option value="">Select vendor</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id.toString()}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== INVENTORY INFORMATION ===== */}
        {itemType === "Goods" && (
          <div className="section-container">
            <label className="section-title">
              <input
                type="checkbox"
                checked={isInventoryTracked}
                onChange={handleCheckbox(setIsInventoryTracked)}
              />
              Track Inventory for this item
            </label>
            {isInventoryTracked && (
              <div className="info-grid">
                <div className="grid-col">
                  <div className="form-row">
                    <label className="form-label">Inventory Account*</label>
                    <div className="form-control">
                      <select
                        className="input-field"
                        value={inventoryAccount}
                        onChange={handleChange(setInventoryAccount)}
                      >
                        <option value="Inventory Asset">Inventory Asset</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <label className="form-label">Opening Stock</label>
                    <div className="form-control">
                      <input
                        type="number"
                        className="input-field"
                        value={openingStock}
                        onChange={handleChange(setOpeningStock)}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid-col">
                  <div className="form-row">
                    <label className="form-label">Opening Stock Rate</label>
                    <div className="form-control">
                      <div className="prefix-input">
                        <span>INR</span>
                        <input
                          type="number"
                          value={openingStockRate}
                          onChange={handleChange(setOpeningStockRate)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="form-row">
                    <label className="form-label">Reorder Level</label>
                    <div className="form-control">
                      <input
                        type="number"
                        className="input-field"
                        value={reorderLevel}
                        onChange={handleChange(setReorderLevel)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== ACTIONS ===== */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-save"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Saving..." : isEdit ? "Update" : "Save"}
          </button>
          <button
            type="button"
            className="btn-cancel"
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>

      </div>
    </>
  );
}

export default AddItem;