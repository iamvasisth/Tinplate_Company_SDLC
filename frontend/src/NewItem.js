// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { apiRequest } from "./api";
// import toast from "react-hot-toast";
// import { useAuth } from "./AuthContext";

// function NewItem() {
//   const navigate = useNavigate();
//   const { user } = useAuth();

//   const itemLabel =
//     user?.business_type === "School"
//       ? "Student"
//       : user?.business_type === "Hospital"
//       ? "Patient"
//       : user?.business_type === "Retail"
//       ? "Product"
//       : "Item";

//   const [newItem, setNewItem] = useState({
//     name: "",
//     item_type: "Goods",
//     unit: "",
//     selling_price: "",
//     cost_price: "",
//     description: "",
//     sku: "",
//     hsn_code: "",
//     tax_rate: "0",
//   });

//   const updateNewField = (field, value) => {
//     setNewItem({ ...newItem, [field]: value });
//   };

//   const addNewItem = async () => {
//     if (!newItem.name.trim()) {
//       toast.error("Name is required");
//       return;
//     }
//     try {
//       await apiRequest("/items", {
//         method: "POST",
//         body: JSON.stringify(newItem),
//       });
//       toast.success(`${itemLabel} created successfully`);
//       navigate("/items");
//     } catch (err) {
//       toast.error("Create failed");
//     }
//   };

//   return (
//     <div style={styles.pageWrapper}>
//       {/* ── Page Header ── */}
//       <div style={styles.pageHeader}>
//         <div>
//           <h1 style={styles.title}>New {itemLabel}</h1>
//           <p style={styles.subtitle}>
//             Create a new item for{" "}
//             <span style={styles.subtitleLink}>sales</span>,{" "}
//             <span style={styles.subtitleLink}>purchases</span>,{" "}
//             <span style={styles.subtitleLink}>inventory</span> and tax tracking.
//           </p>
//         </div>
//         <button
//           onClick={() => navigate("/items")}
//           style={styles.backBtn}
//           onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
//           onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
//         >
//           ← Back
//         </button>
//       </div>

//       {/* ── Info Banner ── */}
//       <div style={styles.infoBanner}>
//         <span style={styles.bannerIcon}>💡</span>
//         <div>
//           <strong>Do you want to keep track of this item?</strong>{" "}
//           <span style={styles.bannerText}>
//             Enable inventory tracking from settings if you want to maintain stock.
//           </span>
//         </div>
//       </div>

//       {/* ── Two-column layout ── */}
//       <div style={styles.formLayout}>
//         {/* ── Left Panel ── */}
//         <div style={styles.leftPanel}>

//           {/* Basic Information */}
//           <div style={styles.sectionCard}>
//             <h3 style={styles.sectionTitle}>Basic Information</h3>
//             <div style={styles.formGrid}>
//               <div style={styles.formGroupFull}>
//                 <label style={styles.label}>Name <span style={styles.required}>*</span></label>
//                 <input
//                   id="item-name"
//                   placeholder="Enter item name"
//                   value={newItem.name}
//                   onChange={(e) => updateNewField("name", e.target.value)}
//                   style={styles.input}
//                   onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                   onBlur={(e) => Object.assign(e.target.style, styles.inputBlur)}
//                 />
//               </div>

//               <div style={styles.formGroup}>
//                 <label style={styles.label}>Type</label>
//                 <div style={styles.radioGroup}>
//                   <label style={styles.radioLabel}>
//                     <input
//                       type="radio"
//                       checked={newItem.item_type === "Goods"}
//                       onChange={() => updateNewField("item_type", "Goods")}
//                       style={{ accentColor: "#2563eb" }}
//                     />
//                     Goods
//                   </label>
//                   <label style={styles.radioLabel}>
//                     <input
//                       type="radio"
//                       checked={newItem.item_type === "Service"}
//                       onChange={() => updateNewField("item_type", "Service")}
//                       style={{ accentColor: "#2563eb" }}
//                     />
//                     Service
//                   </label>
//                 </div>
//               </div>

//               <div style={styles.formGroup}>
//                 <label style={styles.label}>Unit</label>
//                 <input
//                   id="item-unit"
//                   placeholder="pcs, kg, box..."
//                   value={newItem.unit}
//                   onChange={(e) => updateNewField("unit", e.target.value)}
//                   style={styles.input}
//                   onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                   onBlur={(e) => Object.assign(e.target.style, styles.inputBlur)}
//                 />
//               </div>

//               <div style={styles.formGroup}>
//                 <label style={styles.label}>SKU</label>
//                 <input
//                   id="item-sku"
//                   placeholder="Enter SKU"
//                   value={newItem.sku}
//                   onChange={(e) => updateNewField("sku", e.target.value)}
//                   style={styles.input}
//                   onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                   onBlur={(e) => Object.assign(e.target.style, styles.inputBlur)}
//                 />
//               </div>

//               <div style={styles.formGroup}>
//                 <label style={styles.label}>HSN Code</label>
//                 <input
//                   id="item-hsn"
//                   placeholder="Enter HSN code"
//                   value={newItem.hsn_code}
//                   onChange={(e) => updateNewField("hsn_code", e.target.value)}
//                   style={styles.input}
//                   onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                   onBlur={(e) => Object.assign(e.target.style, styles.inputBlur)}
//                 />
//               </div>
//             </div>
//           </div>

//           {/* Sales Information */}
//           <div style={styles.sectionCard}>
//             <h3 style={styles.sectionTitle}>Sales Information</h3>
//             <div style={styles.formGrid}>
//               <div style={styles.formGroup}>
//                 <label style={styles.label}>Selling Price</label>
//                 <div style={styles.priceBox}>
//                   <span style={styles.currency}>INR</span>
//                   <input
//                     id="item-selling-price"
//                     type="number"
//                     placeholder="0.00"
//                     value={newItem.selling_price}
//                     onChange={(e) => updateNewField("selling_price", e.target.value)}
//                     style={styles.priceInput}
//                   />
//                 </div>
//               </div>

//               <div style={styles.formGroup}>
//                 <label style={styles.label}>Tax Rate (%)</label>
//                 <input
//                   id="item-tax-rate"
//                   type="number"
//                   placeholder="0"
//                   value={newItem.tax_rate}
//                   onChange={(e) => updateNewField("tax_rate", e.target.value)}
//                   style={styles.input}
//                   onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                   onBlur={(e) => Object.assign(e.target.style, styles.inputBlur)}
//                 />
//               </div>

//               <div style={styles.formGroupFull}>
//                 <label style={styles.label}>Sales Description</label>
//                 <textarea
//                   id="item-description"
//                   placeholder="Enter sales description"
//                   value={newItem.description}
//                   onChange={(e) => updateNewField("description", e.target.value)}
//                   style={styles.textarea}
//                   onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
//                   onBlur={(e) => Object.assign(e.target.style, styles.inputBlur)}
//                 />
//               </div>
//             </div>
//           </div>

//           {/* Purchase Information */}
//           <div style={styles.sectionCard}>
//             <h3 style={styles.sectionTitle}>Purchase Information</h3>
//             <div style={styles.formGrid}>
//               <div style={styles.formGroup}>
//                 <label style={styles.label}>Cost Price</label>
//                 <div style={styles.priceBox}>
//                   <span style={styles.currency}>INR</span>
//                   <input
//                     id="item-cost-price"
//                     type="number"
//                     placeholder="0.00"
//                     value={newItem.cost_price}
//                     onChange={(e) => updateNewField("cost_price", e.target.value)}
//                     style={styles.priceInput}
//                   />
//                 </div>
//               </div>

//               <div style={styles.formGroup}>
//                 <label style={styles.label}>Account</label>
//                 <input
//                   value="Cost of Goods Sold"
//                   disabled
//                   style={{ ...styles.input, background: "#f8fafc", color: "#94a3b8", cursor: "not-allowed" }}
//                 />
//               </div>
//             </div>
//           </div>

//         </div>

//         {/* ── Right Panel ── */}
//         <div style={styles.rightPanel}>
//           {/* Image Box */}
//           <div style={styles.imageBox}>
//             <div style={styles.imageIcon}>
//               <span style={{ fontSize: "28px" }}>🖼️</span>
//             </div>
//             <p style={styles.imageLabel}>Item Image</p>
//             <span style={styles.imageHint}>Upload feature can be added later</span>
//           </div>

//           {/* Quick Summary */}
//           <div style={styles.summaryCard}>
//             <h3 style={styles.sectionTitle}>Quick Summary</h3>
//             <div style={styles.summaryRow}>
//               <span style={styles.summaryKey}>Name</span>
//               <span style={styles.summaryVal}>{newItem.name || "Not added"}</span>
//             </div>
//             <div style={styles.summaryRow}>
//               <span style={styles.summaryKey}>Type</span>
//               <span style={styles.summaryVal}>{newItem.item_type}</span>
//             </div>
//             <div style={styles.summaryRow}>
//               <span style={styles.summaryKey}>Selling</span>
//               <span style={{ ...styles.summaryVal, color: "#2563eb", fontWeight: "700" }}>
//                 ₹{newItem.selling_price || "0.00"}
//               </span>
//             </div>
//             <div style={styles.summaryRow}>
//               <span style={styles.summaryKey}>Cost</span>
//               <span style={styles.summaryVal}>₹{newItem.cost_price || "0.00"}</span>
//             </div>
//             <div style={styles.summaryRow}>
//               <span style={styles.summaryKey}>Tax</span>
//               <span style={styles.summaryVal}>{newItem.tax_rate || "0"}%</span>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* ── Sticky Footer ── */}
//       <div style={styles.footerBar}>
//         <button
//           id="cancel-item-btn"
//           onClick={() => navigate("/items")}
//           style={styles.cancelBtn}
//           onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
//           onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
//         >
//           Cancel
//         </button>
//         <button
//           id="save-item-btn"
//           onClick={addNewItem}
//           style={styles.saveBtn}
//           onMouseEnter={(e) => {
//             e.currentTarget.style.background = "#1d4ed8";
//             e.currentTarget.style.boxShadow = "0 6px 20px rgba(37,99,235,0.45)";
//           }}
//           onMouseLeave={(e) => {
//             e.currentTarget.style.background = "#2563eb";
//             e.currentTarget.style.boxShadow = "0 4px 14px rgba(37,99,235,0.3)";
//           }}
//         >
//           Save {itemLabel}
//         </button>
//       </div>
//     </div>
//   );
// }

// /* ── Styles ── */
// const styles = {
//   pageWrapper: {
//     minHeight: "100vh",
//     background: "#f8fafc",
//     padding: "28px 32px",
//     paddingBottom: "90px",
//     fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
//   },
//   pageHeader: {
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "flex-start",
//     marginBottom: "18px",
//     flexWrap: "wrap",
//     gap: "12px",
//   },
//   title: {
//     margin: 0,
//     fontSize: "22px",
//     fontWeight: "700",
//     color: "#0f172a",
//     letterSpacing: "-0.3px",
//   },
//   subtitle: {
//     margin: "5px 0 0",
//     fontSize: "13px",
//     color: "#64748b",
//   },
//   subtitleLink: {
//     color: "#2563eb",
//     fontWeight: "500",
//   },
//   required: {
//     color: "#ef4444",
//   },
//   backBtn: {
//     padding: "9px 16px",
//     border: "1px solid #cbd5e1",
//     background: "#ffffff",
//     color: "#334155",
//     borderRadius: "8px",
//     cursor: "pointer",
//     fontWeight: "600",
//     fontSize: "13px",
//     transition: "background 0.15s",
//   },
//   infoBanner: {
//     background: "#eff6ff",
//     border: "1px solid #bfdbfe",
//     borderRadius: "10px",
//     padding: "12px 16px",
//     color: "#1e40af",
//     marginBottom: "22px",
//     display: "flex",
//     gap: "10px",
//     alignItems: "flex-start",
//     fontSize: "13.5px",
//   },
//   bannerIcon: {
//     fontSize: "16px",
//     marginTop: "1px",
//     flexShrink: 0,
//   },
//   bannerText: {
//     color: "#3b82f6",
//   },
//   formLayout: {
//     display: "grid",
//     gridTemplateColumns: "1fr 300px",
//     gap: "24px",
//   },
//   leftPanel: {
//     display: "flex",
//     flexDirection: "column",
//     gap: "20px",
//   },
//   rightPanel: {
//     display: "flex",
//     flexDirection: "column",
//     gap: "20px",
//   },
//   sectionCard: {
//     background: "#ffffff",
//     borderRadius: "12px",
//     padding: "22px",
//     border: "1px solid #e2e8f0",
//     boxShadow: "0 1px 6px rgba(15,23,42,0.05)",
//   },
//   sectionTitle: {
//     margin: "0 0 18px",
//     fontSize: "15px",
//     fontWeight: "700",
//     color: "#0f172a",
//     paddingBottom: "12px",
//     borderBottom: "1px solid #f1f5f9",
//   },
//   formGrid: {
//     display: "grid",
//     gridTemplateColumns: "1fr 1fr",
//     gap: "16px",
//   },
//   formGroup: {
//     display: "flex",
//     flexDirection: "column",
//     gap: "6px",
//   },
//   formGroupFull: {
//     gridColumn: "1 / -1",
//     display: "flex",
//     flexDirection: "column",
//     gap: "6px",
//   },
//   label: {
//     fontSize: "13px",
//     fontWeight: "600",
//     color: "#475569",
//   },
//   input: {
//     width: "100%",
//     padding: "10px 13px",
//     borderRadius: "8px",
//     border: "1px solid #cbd5e1",
//     outline: "none",
//     fontSize: "14px",
//     color: "#0f172a",
//     background: "#ffffff",
//     boxSizing: "border-box",
//     transition: "border-color 0.15s, box-shadow 0.15s",
//   },
//   inputFocus: {
//     borderColor: "#2563eb",
//     boxShadow: "0 0 0 3px rgba(37,99,235,0.1)",
//   },
//   inputBlur: {
//     borderColor: "#cbd5e1",
//     boxShadow: "none",
//   },
//   textarea: {
//     width: "100%",
//     padding: "10px 13px",
//     borderRadius: "8px",
//     border: "1px solid #cbd5e1",
//     outline: "none",
//     fontSize: "14px",
//     color: "#0f172a",
//     background: "#ffffff",
//     boxSizing: "border-box",
//     minHeight: "88px",
//     resize: "vertical",
//     fontFamily: "inherit",
//     transition: "border-color 0.15s, box-shadow 0.15s",
//   },
//   radioGroup: {
//     display: "flex",
//     gap: "20px",
//     alignItems: "center",
//     minHeight: "42px",
//   },
//   radioLabel: {
//     display: "flex",
//     alignItems: "center",
//     gap: "7px",
//     fontSize: "14px",
//     color: "#334155",
//     cursor: "pointer",
//     fontWeight: "500",
//   },
//   priceBox: {
//     display: "flex",
//     border: "1px solid #cbd5e1",
//     borderRadius: "8px",
//     overflow: "hidden",
//     background: "#ffffff",
//   },
//   currency: {
//     padding: "10px 13px",
//     background: "#f1f5f9",
//     borderRight: "1px solid #cbd5e1",
//     color: "#475569",
//     fontSize: "13px",
//     fontWeight: "600",
//     display: "flex",
//     alignItems: "center",
//     whiteSpace: "nowrap",
//   },
//   priceInput: {
//     flex: 1,
//     border: "none",
//     outline: "none",
//     padding: "10px 13px",
//     fontSize: "14px",
//     color: "#0f172a",
//     width: "100%",
//   },
//   imageBox: {
//     background: "#ffffff",
//     border: "2px dashed #cbd5e1",
//     borderRadius: "12px",
//     padding: "32px 20px",
//     textAlign: "center",
//     color: "#64748b",
//   },
//   imageIcon: {
//     width: "52px",
//     height: "52px",
//     margin: "0 auto 10px",
//     borderRadius: "12px",
//     background: "#eff6ff",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   imageLabel: {
//     margin: "0 0 4px",
//     fontWeight: "600",
//     fontSize: "14px",
//     color: "#334155",
//   },
//   imageHint: {
//     fontSize: "12px",
//     color: "#94a3b8",
//   },
//   summaryCard: {
//     background: "#ffffff",
//     borderRadius: "12px",
//     padding: "20px",
//     border: "1px solid #e2e8f0",
//     boxShadow: "0 1px 6px rgba(15,23,42,0.05)",
//   },
//   summaryRow: {
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//     padding: "8px 0",
//     borderBottom: "1px solid #f8fafc",
//   },
//   summaryKey: {
//     fontSize: "13px",
//     color: "#64748b",
//   },
//   summaryVal: {
//     fontSize: "13px",
//     fontWeight: "600",
//     color: "#1e293b",
//     maxWidth: "55%",
//     textAlign: "right",
//     wordBreak: "break-word",
//   },
//   footerBar: {
//     position: "fixed",
//     left: 0,
//     right: 0,
//     bottom: 0,
//     background: "#ffffff",
//     borderTop: "1px solid #e2e8f0",
//     padding: "14px 32px",
//     display: "flex",
//     justifyContent: "flex-end",
//     alignItems: "center",
//     gap: "12px",
//     boxShadow: "0 -4px 20px rgba(15,23,42,0.08)",
//     zIndex: 1000,
//   },
//   cancelBtn: {
//     padding: "10px 22px",
//     border: "1px solid #cbd5e1",
//     background: "#ffffff",
//     color: "#334155",
//     borderRadius: "8px",
//     cursor: "pointer",
//     fontWeight: "600",
//     fontSize: "14px",
//     transition: "background 0.15s",
//   },
//   saveBtn: {
//     padding: "10px 24px",
//     border: "none",
//     background: "#2563eb",
//     color: "#ffffff",
//     borderRadius: "8px",
//     cursor: "pointer",
//     fontWeight: "700",
//     fontSize: "14px",
//     boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
//     transition: "all 0.18s ease",
//   },
// };

// export default NewItem;



/**
 * AddItem.js – Add/Edit item (Zoho Books-style UI)
 * Backend/API logic preserved. Only frontend image upload UI enhanced.
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

const UNITS = [
  "pcs",
  "kg",
  "g",
  "gm",
  "ltr",
  "ml",
  "m",
  "cm",
  "mm",
  "box",
  "pack",
  "roll",
  "set",
  "nos",
  "hour",
  "day",
  "month",
];

const INITIAL_SALES_ACCOUNTS = [
  "Sales",
  "General Income",
  "Interest Income",
  "Late Fee Income",
  "Other Charges",
  "Shipping Charge",
];

const INITIAL_PURCHASE_ACCOUNTS = [
  "Cost of Goods Sold",
  "Advertising And Marketing",
  "Automobile Expense",
  "Bad Debt",
  "Bank Fees and Charges",
  "Consultant Expense",
  "Credit Card Charges",
  "Depreciation And Amortisation",
  "IT and Internet Expenses",
  "Office Supplies",
  "Rent Expense",
  "Salaries and Employee Wages",
  "Travel Expense",
  "Uncategorized",
];

function AddItem() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [dirty, setDirty] = useState(false);
  const [name, setName] = useState("");
  const [itemType, setItemType] = useState("Goods");
  const [unit, setUnit] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [salesEnabled, setSalesEnabled] = useState(false);
  const [sellPrice, setSellPrice] = useState("");
  const [salesAccount, setSalesAccount] = useState(INITIAL_SALES_ACCOUNTS[0]);
  const [salesDesc, setSalesDesc] = useState("");
  const [salesAccounts, setSalesAccounts] = useState(INITIAL_SALES_ACCOUNTS);
  const [addingSalesAccount, setAddingSalesAccount] = useState(false);
  const [newSalesAccount, setNewSalesAccount] = useState("");

  const [purchaseEnabled, setPurchaseEnabled] = useState(false);
  const [costPrice, setCostPrice] = useState("");
  const [purchaseAccount, setPurchaseAccount] = useState(
    INITIAL_PURCHASE_ACCOUNTS[0]
  );
  const [purchaseDesc, setPurchaseDesc] = useState("");
  const [purchaseAccounts, setPurchaseAccounts] = useState(
    INITIAL_PURCHASE_ACCOUNTS
  );
  const [addingPurchaseAccount, setAddingPurchaseAccount] = useState(false);
  const [newPurchaseAccount, setNewPurchaseAccount] = useState("");

  const [preferredVendor, setPreferredVendor] = useState("");
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
        if (res) setVendors(res.contacts);
      } catch (err) {
        console.error("Failed to fetch vendors", err);
      }
    };

    fetchVendors();
  }, []);

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

        setSalesEnabled(!!(item.selling_price || item.sales_account));
        setSellPrice(item.selling_price ? String(item.selling_price) : "");
        setSalesAccount(item.sales_account || INITIAL_SALES_ACCOUNTS[0]);
        setSalesDesc(item.description || "");

        setPurchaseEnabled(!!(item.cost_price || item.purchase_account));
        setCostPrice(item.cost_price ? String(item.cost_price) : "");
        setPurchaseAccount(
          item.purchase_account || INITIAL_PURCHASE_ACCOUNTS[0]
        );
        setPurchaseDesc(item.purchase_description || "");
        setPreferredVendor(
          item.preferred_vendor_id ? String(item.preferred_vendor_id) : ""
        );

        if (
          item.sales_account &&
          !INITIAL_SALES_ACCOUNTS.includes(item.sales_account)
        ) {
          setSalesAccounts((prev) =>
            prev.includes(item.sales_account)
              ? prev
              : [...prev, item.sales_account]
          );
        }

        if (
          item.purchase_account &&
          !INITIAL_PURCHASE_ACCOUNTS.includes(item.purchase_account)
        ) {
          setPurchaseAccounts((prev) =>
            prev.includes(item.purchase_account)
              ? prev
              : [...prev, item.purchase_account]
          );
        }

        setDirty(false);
      } catch (err) {
        toast.error("Failed to load item");
      }
    };

    fetchItem();
  }, [id, isEdit]);

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

  const handleImageUpload = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size should be less than 2MB");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    markDirty();
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
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
        selling_price: salesEnabled ? parseFloat(sellPrice) || 0 : 0,
        sales_account: salesEnabled ? salesAccount : null,
        description: salesEnabled ? salesDesc : "",
        purchase_description: purchaseEnabled ? purchaseDesc : "",
        cost_price: purchaseEnabled ? parseFloat(costPrice) || 0 : 0,
        purchase_account: purchaseEnabled ? purchaseAccount : null,
        preferred_vendor_id:
          purchaseEnabled && preferredVendor ? parseInt(preferredVendor) : null,
      };

      if (isEdit) {
        await apiRequest(`/items/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        toast.success("Item updated");
      } else {
        await apiRequest("/items", {
          method: "POST",
          body: JSON.stringify(payload),
        });

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
      const leave = window.confirm(
        "You have unsaved changes. Are you sure you want to cancel?"
      );

      if (!leave) return;
    }

    navigate("/items");
  };

  return (
    <div style={S.pageWrapper}>
      {/* Header */}
      <div style={S.pageHeader}>
        <div>
          <h1 style={S.title}>{isEdit ? "Edit Item" : "New Item"}</h1>
          <p style={S.subtitle}>
            {isEdit
              ? "Update the item details below."
              : "Fill in the details to create a new item."}
          </p>
        </div>

        <button
          onClick={handleCancel}
          style={S.backBtn}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
        >
          ← Back
        </button>
      </div>

      {/* Info Banner */}
      <div style={S.infoBanner}>
        <span>💡</span>
        <div>
          <strong>Do you want to keep track of this item?</strong>{" "}
          <span style={{ color: "#3b82f6" }}>
            Enable inventory tracking from settings if you want to maintain
            stock.
          </span>
        </div>
      </div>

      {/* Form Layout */}
      <div style={S.formLayout}>
        {/* Left Panel */}
        <div style={S.leftPanel}>
          {/* Basic Information */}
          <div style={S.sectionCard}>
            <h3 style={S.sectionTitle}>Basic Information</h3>

            <div style={S.formGrid}>
              <div style={S.formGroupFull}>
                <label style={S.label}>
                  Name <span style={{ color: "#ef4444" }}>*</span>
                </label>

                <input
                  value={name}
                  onChange={handleChange(setName)}
                  placeholder="Enter item name"
                  style={S.input}
                  onFocus={(e) => Object.assign(e.target.style, S.inputFocus)}
                  onBlur={(e) => Object.assign(e.target.style, S.inputBlur)}
                />
              </div>

              <div style={S.formGroup}>
                <label style={S.label}>Type</label>

                <select
                  value={itemType}
                  onChange={handleChange(setItemType)}
                  style={S.select}
                >
                  <option value="Goods">Goods</option>
                  <option value="Service">Service</option>
                </select>
              </div>

              <div style={S.formGroup}>
                <label style={S.label}>Unit</label>

                <input
                  list="unit-list"
                  value={unit}
                  onChange={handleChange(setUnit)}
                  placeholder="e.g. pcs, kg, box"
                  style={S.input}
                  onFocus={(e) => Object.assign(e.target.style, S.inputFocus)}
                  onBlur={(e) => Object.assign(e.target.style, S.inputBlur)}
                />

                <datalist id="unit-list">
                  {UNITS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>

              <div style={S.formGroupFull}>
                <label style={S.label}>Item Image</label>

                <div style={S.imageUploadBox}>
                  {imagePreview ? (
                    <div style={S.imagePreviewWrapper}>
                      <img
                        src={imagePreview}
                        alt="Item Preview"
                        style={S.imagePreview}
                      />

                      <div style={S.imageFileInfo}>
                        <strong>{imageFile?.name}</strong>
                        <span>
                          {imageFile
                            ? `${(imageFile.size / 1024).toFixed(1)} KB`
                            : ""}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={removeImage}
                        style={S.removeImageBtn}
                      >
                        Remove Image
                      </button>
                    </div>
                  ) : (
                    <label style={S.uploadLabel}>
                      <div style={S.uploadIcon}>📷</div>

                      <strong style={S.uploadTitle}>Upload Item Image</strong>

                      <span style={S.uploadText}>
                        Click to upload PNG, JPG or JPEG file
                      </span>

                      <span style={S.uploadHint}>Maximum size: 2MB</span>

                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        onChange={handleImageUpload}
                        style={{ display: "none" }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sales Information */}
          <div style={S.sectionCard}>
            <div style={S.toggleHeader}>
              <h3
                style={{
                  ...S.sectionTitle,
                  margin: 0,
                  border: "none",
                  padding: 0,
                }}
              >
                Sales Information
              </h3>

              <label style={S.toggleLabel}>
                <input
                  type="checkbox"
                  checked={salesEnabled}
                  onChange={handleCheckbox(setSalesEnabled)}
                  style={{
                    accentColor: "#2563eb",
                    width: "16px",
                    height: "16px",
                  }}
                />
                Enable
              </label>
            </div>

            {salesEnabled && (
              <div style={{ marginTop: "20px" }}>
                <div style={S.formGrid}>
                  <div style={S.formGroup}>
                    <label style={S.label}>Selling Price</label>

                    <input
                      type="number"
                      value={sellPrice}
                      onChange={handleChange(setSellPrice)}
                      placeholder="0.00"
                      style={S.input}
                      onFocus={(e) =>
                        Object.assign(e.target.style, S.inputFocus)
                      }
                      onBlur={(e) => Object.assign(e.target.style, S.inputBlur)}
                    />
                  </div>

                  <div style={S.formGroup}>
                    <label style={S.label}>Account</label>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                      }}
                    >
                      <select
                        value={salesAccount}
                        onChange={handleChange(setSalesAccount)}
                        style={{ ...S.select, flex: 1 }}
                      >
                        {salesAccounts.map((acc) => (
                          <option key={acc} value={acc}>
                            {acc}
                          </option>
                        ))}
                      </select>

                      {!addingSalesAccount ? (
                        <button
                          type="button"
                          onClick={() => setAddingSalesAccount(true)}
                          style={S.addBtn}
                        >
                          +
                        </button>
                      ) : (
                        <div style={{ display: "flex", gap: "5px" }}>
                          <input
                            value={newSalesAccount}
                            onChange={(e) =>
                              setNewSalesAccount(e.target.value)
                            }
                            placeholder="Account name"
                            style={{ ...S.input, width: "130px" }}
                            onKeyDown={(e) =>
                              e.key === "Enter" && addSalesAccount()
                            }
                          />

                          <button
                            type="button"
                            onClick={addSalesAccount}
                            style={S.smallSaveBtn}
                          >
                            Add
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAddingSalesAccount(false);
                              setNewSalesAccount("");
                            }}
                            style={S.smallCancelBtn}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    <small style={S.hint}>
                      Sales transactions will be tracked under this account.
                    </small>
                  </div>

                  <div style={S.formGroupFull}>
                    <label style={S.label}>Description</label>

                    <input
                      value={salesDesc}
                      onChange={handleChange(setSalesDesc)}
                      placeholder="Optional sales description"
                      style={S.input}
                      onFocus={(e) =>
                        Object.assign(e.target.style, S.inputFocus)
                      }
                      onBlur={(e) => Object.assign(e.target.style, S.inputBlur)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Purchase Information */}
          <div style={S.sectionCard}>
            <div style={S.toggleHeader}>
              <h3
                style={{
                  ...S.sectionTitle,
                  margin: 0,
                  border: "none",
                  padding: 0,
                }}
              >
                Purchase Information
              </h3>

              <label style={S.toggleLabel}>
                <input
                  type="checkbox"
                  checked={purchaseEnabled}
                  onChange={handleCheckbox(setPurchaseEnabled)}
                  style={{
                    accentColor: "#2563eb",
                    width: "16px",
                    height: "16px",
                  }}
                />
                Enable
              </label>
            </div>

            {purchaseEnabled && (
              <div style={{ marginTop: "20px" }}>
                <div style={S.formGrid}>
                  <div style={S.formGroup}>
                    <label style={S.label}>Cost Price</label>

                    <input
                      type="number"
                      value={costPrice}
                      onChange={handleChange(setCostPrice)}
                      placeholder="0.00"
                      style={S.input}
                      onFocus={(e) =>
                        Object.assign(e.target.style, S.inputFocus)
                      }
                      onBlur={(e) => Object.assign(e.target.style, S.inputBlur)}
                    />
                  </div>

                  <div style={S.formGroup}>
                    <label style={S.label}>Account</label>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                      }}
                    >
                      <select
                        value={purchaseAccount}
                        onChange={handleChange(setPurchaseAccount)}
                        style={{ ...S.select, flex: 1 }}
                      >
                        {purchaseAccounts.map((acc) => (
                          <option key={acc} value={acc}>
                            {acc}
                          </option>
                        ))}
                      </select>

                      {!addingPurchaseAccount ? (
                        <button
                          type="button"
                          onClick={() => setAddingPurchaseAccount(true)}
                          style={S.addBtn}
                        >
                          +
                        </button>
                      ) : (
                        <div style={{ display: "flex", gap: "5px" }}>
                          <input
                            value={newPurchaseAccount}
                            onChange={(e) =>
                              setNewPurchaseAccount(e.target.value)
                            }
                            placeholder="Account name"
                            style={{ ...S.input, width: "130px" }}
                            onKeyDown={(e) =>
                              e.key === "Enter" && addPurchaseAccount()
                            }
                          />

                          <button
                            type="button"
                            onClick={addPurchaseAccount}
                            style={S.smallSaveBtn}
                          >
                            Add
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAddingPurchaseAccount(false);
                              setNewPurchaseAccount("");
                            }}
                            style={S.smallCancelBtn}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    <small style={S.hint}>
                      Purchase transactions will be tracked under this account.
                    </small>
                  </div>

                  <div style={S.formGroupFull}>
                    <label style={S.label}>Description</label>

                    <input
                      value={purchaseDesc}
                      onChange={handleChange(setPurchaseDesc)}
                      placeholder="Optional purchase description"
                      style={S.input}
                      onFocus={(e) =>
                        Object.assign(e.target.style, S.inputFocus)
                      }
                      onBlur={(e) => Object.assign(e.target.style, S.inputBlur)}
                    />
                  </div>

                  <div style={S.formGroupFull}>
                    <label style={S.label}>Preferred Vendor</label>

                    <select
                      value={preferredVendor}
                      onChange={handleChange(setPreferredVendor)}
                      style={S.select}
                    >
                      <option value="">Select vendor</option>

                      {vendors.map((v) => (
                        <option key={v.id} value={v.id.toString()}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel — Summary */}
        <div style={S.rightPanel}>
          <div style={S.summaryCard}>
            <h3 style={S.sectionTitle}>Quick Summary</h3>

            {imagePreview && (
              <div style={S.summaryImageBox}>
                <img
                  src={imagePreview}
                  alt="Item"
                  style={S.summaryImage}
                />
              </div>
            )}

            <SummaryRow label="Name" value={name || "Not added"} />
            <SummaryRow label="Type" value={itemType} />
            <SummaryRow label="Unit" value={unit || "Not added"} />
            <SummaryRow label="Selling" value={`₹${sellPrice || "0.00"}`} highlight />
            <SummaryRow label="Cost" value={`₹${costPrice || "0.00"}`} />
            <SummaryRow label="Sales On" value={salesEnabled ? "Yes" : "No"} />
            <SummaryRow
              label="Purchase On"
              value={purchaseEnabled ? "Yes" : "No"}
            />
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div style={S.footerBar}>
        <button
          id="cancel-edit-btn"
          type="button"
          onClick={handleCancel}
          style={S.cancelBtn}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
        >
          Cancel
        </button>

        <button
          id="save-edit-btn"
          type="button"
          onClick={handleSave}
          disabled={loading}
          style={{
            ...S.saveBtn,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.background = "#1d4ed8";
          }}
          onMouseLeave={(e) => {
            if (!loading) e.currentTarget.style.background = "#2563eb";
          }}
        >
          {loading ? "Saving…" : isEdit ? "Update Item" : "Save Item"}
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, highlight }) {
  return (
    <div style={S.summaryRow}>
      <span style={S.summaryLabel}>{label}</span>

      <span
        style={{
          ...S.summaryValue,
          fontWeight: highlight ? "700" : "600",
          color: highlight ? "#2563eb" : "#1e293b",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ── Styles ── */
const S = {
  pageWrapper: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "28px 32px",
    paddingBottom: "90px",
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  },

  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "18px",
    flexWrap: "wrap",
    gap: "12px",
  },

  title: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.3px",
  },

  subtitle: {
    margin: "5px 0 0",
    fontSize: "13px",
    color: "#64748b",
  },

  backBtn: {
    padding: "9px 16px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "13px",
    transition: "background 0.15s",
  },

  infoBanner: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "10px",
    padding: "12px 16px",
    color: "#1e40af",
    marginBottom: "22px",
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
    fontSize: "13.5px",
  },

  formLayout: {
    display: "grid",
    gridTemplateColumns: "1fr 280px",
    gap: "24px",
  },

  leftPanel: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },

  rightPanel: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },

  sectionCard: {
    background: "#ffffff",
    borderRadius: "12px",
    padding: "22px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 6px rgba(15,23,42,0.05)",
  },

  sectionTitle: {
    margin: "0 0 18px",
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
    paddingBottom: "12px",
    borderBottom: "1px solid #f1f5f9",
  },

  toggleHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: "12px",
    borderBottom: "1px solid #f1f5f9",
  },

  toggleLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    color: "#2563eb",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },

  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  formGroupFull: {
    gridColumn: "1 / -1",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#475569",
  },

  input: {
    width: "100%",
    padding: "10px 13px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    outline: "none",
    fontSize: "14px",
    color: "#0f172a",
    background: "#ffffff",
    boxSizing: "border-box",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },

  inputFocus: {
    borderColor: "#2563eb",
    boxShadow: "0 0 0 3px rgba(37,99,235,0.1)",
  },

  inputBlur: {
    borderColor: "#cbd5e1",
    boxShadow: "none",
  },

  select: {
    width: "100%",
    padding: "10px 13px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    outline: "none",
    fontSize: "14px",
    color: "#0f172a",
    background: "#ffffff",
    boxSizing: "border-box",
    cursor: "pointer",
  },

  hint: {
    display: "block",
    color: "#94a3b8",
    fontSize: "12px",
    marginTop: "4px",
  },

  imageUploadBox: {
    width: "100%",
    border: "1.5px dashed #cbd5e1",
    borderRadius: "12px",
    background: "#f8fafc",
    minHeight: "185px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  uploadLabel: {
    width: "100%",
    minHeight: "185px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    cursor: "pointer",
    color: "#64748b",
    textAlign: "center",
    padding: "22px",
  },

  uploadIcon: {
    width: "54px",
    height: "54px",
    borderRadius: "14px",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
    marginBottom: "4px",
  },

  uploadTitle: {
    fontSize: "14px",
    color: "#0f172a",
  },

  uploadText: {
    fontSize: "13px",
    color: "#64748b",
  },

  uploadHint: {
    fontSize: "12px",
    color: "#94a3b8",
  },

  imagePreviewWrapper: {
    width: "100%",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },

  imagePreview: {
    width: "155px",
    height: "155px",
    objectFit: "cover",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 8px 22px rgba(15,23,42,0.12)",
    background: "#ffffff",
  },

  imageFileInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "3px",
    fontSize: "12px",
    color: "#64748b",
    maxWidth: "100%",
    wordBreak: "break-word",
    textAlign: "center",
  },

  removeImageBtn: {
    padding: "8px 14px",
    background: "#fee2e2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "13px",
  },

  addBtn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    width: "34px",
    height: "34px",
    cursor: "pointer",
    fontSize: "18px",
    fontWeight: "bold",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  smallSaveBtn: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "5px 10px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },

  smallCancelBtn: {
    background: "#f1f5f9",
    color: "#475569",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    padding: "5px 10px",
    cursor: "pointer",
    fontSize: "13px",
  },

  summaryCard: {
    background: "#ffffff",
    borderRadius: "12px",
    padding: "20px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 6px rgba(15,23,42,0.05)",
  },

  summaryImageBox: {
    width: "100%",
    height: "150px",
    borderRadius: "12px",
    overflow: "hidden",
    marginBottom: "14px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },

  summaryImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #f8fafc",
    gap: "12px",
  },

  summaryLabel: {
    fontSize: "13px",
    color: "#64748b",
  },

  summaryValue: {
    fontSize: "13px",
    textAlign: "right",
    maxWidth: "55%",
    wordBreak: "break-word",
  },

  footerBar: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    background: "#ffffff",
    borderTop: "1px solid #e2e8f0",
    padding: "14px 32px",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "12px",
    boxShadow: "0 -4px 20px rgba(15,23,42,0.08)",
    zIndex: 1000,
  },

  cancelBtn: {
    padding: "10px 22px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    transition: "background 0.15s",
  },

  saveBtn: {
    padding: "10px 24px",
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "14px",
    boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
    transition: "all 0.18s ease",
  },
};

export default AddItem;