/**
 * AddQuote.js – Redesigned Quote Form UI (Zoho Books style)
 * Visually updated with grids, subtle borders, highlighted table, calculations summary block,
 * and elegant modals, maintaining all original logic, state, and API variables.
 */
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "./api";
import { FormSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";
import AddCustomer from "./AddCustomer";

function AddQuote() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // --- Basic fields ---
  const [customerId, setCustomerId] = useState("");
  const [quoteNumber, setQuoteNumber] = useState("");
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [projectId, setProjectId] = useState("");

  // --- Items ---
  const [items, setItems] = useState([
    { item_id: "", item_name: "", description: "", quantity: 1, unit_price: 0, tax_rate: 0, discount: 0, discount_type: "flat", hsn_code: "", unit: "" }
  ]);

  // --- Dropdown data ---
  const [customers, setCustomers] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [salespersons, setSalespersons] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // --- Modals ---
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showSalespersonModal, setShowSalespersonModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  // --- New Salesperson form ---
  const [newSp, setNewSp] = useState({ name: "", email: "", phone: "", employee_id: "" });

  // --- New Project form ---
  const [newProj, setNewProj] = useState({ project_name: "", customer_id: "", start_date: "", end_date: "", description: "", status: "active" });

  // Fetch all dropdown data
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [custRes, itemRes, spRes, projRes] = await Promise.all([
          apiRequest("/customers"),
          apiRequest("/items"),
          apiRequest("/salespersons"),
          apiRequest("/projects"),
        ]);
        setCustomers(custRes?.customers || []);
        setCatalogItems(itemRes?.items || []);
        setSalespersons(spRes?.salespersons || []);
        setProjects(projRes?.projects || []);

        if (isEditMode) {
          setFetching(true);
          const res = await apiRequest(`/quotes/${id}`);
          if (res?.quote) {
            const q = res.quote;
            setCustomerId(q.customer_id ? String(q.customer_id) : "");
            setQuoteDate(q.quote_date ? q.quote_date.slice(0, 10) : "");
            setExpiryDate(q.expiry_date ? q.expiry_date.slice(0, 10) : "");
            setCustomerNotes(q.notes || "");
            setTerms(q.terms || "");
            setSalespersonId(q.salesperson_id ? String(q.salesperson_id) : "");
            setProjectId(q.project_id ? String(q.project_id) : "");
            setQuoteNumber(q.quote_number || "");
            if (res.items && res.items.length > 0) {
              setItems(res.items.map(item => ({
                item_id:       item.item_id       ? String(item.item_id)  : "",
                item_name:     item.item_name     || "",
                description:   item.description   || "",
                quantity:      item.quantity       || 1,
                unit_price:    item.unit_price     || 0,
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

  // Item helpers
  const addItem = () => {
    setItems([...items, { item_id: "", item_name: "", description: "", quantity: 1, unit_price: 0, tax_rate: 0, discount: 0, discount_type: "flat", hsn_code: "", unit: "" }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  // When selecting an item from dropdown, auto-fill fields from catalog
  const handleItemSelect = (index, itemId) => {
    const updated = [...items];
    updated[index].item_id = itemId;
    if (itemId) {
      const catalogItem = catalogItems.find(ci => String(ci.id) === String(itemId));
      if (catalogItem) {
        updated[index].item_name   = catalogItem.name || "";
        updated[index].description = catalogItem.description || catalogItem.name || "";
        updated[index].unit_price  = catalogItem.selling_price || 0;
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

  // Calculations
  const calcLineAmount = (item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.unit_price) || 0;
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

  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0);
  const totalDiscount = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.unit_price) || 0;
    const disc = parseFloat(item.discount) || 0;
    if (item.discount_type === "percent") return sum + (qty * rate * disc / 100);
    return sum + disc;
  }, 0);
  const totalTax = items.reduce((sum, item) => sum + calcLineTax(item), 0);
  const grandTotal = subtotal - totalDiscount + totalTax;  // Save
  const handleSave = async (statusArg) => {
    if (!customerId) { toast.error("Please select a customer"); return; }
    if (items.length === 0 || items.every(item => !item.description && !item.item_id)) {
      toast.error("Add at least one item"); return;
    }
    setLoading(true);
    try {
      const payload = {
        customer_id: parseInt(customerId),
        quote_date: quoteDate,
        expiry_date: expiryDate || null,
        notes: customerNotes,
        terms,
        salesperson_id: salespersonId ? parseInt(salespersonId) : null,
        project_id: projectId ? parseInt(projectId) : null,
        items: items.map(item => ({
          ...item,
          item_id:   item.item_id   ? parseInt(item.item_id) : null,
          item_name: item.item_name || null,
          hsn_code:  item.hsn_code  || null,
          unit:      item.unit      || null,
          quantity:  parseFloat(item.quantity) || 0,
          unit_price: parseFloat(item.unit_price) || 0,
          tax_rate:  parseFloat(item.tax_rate) || 0,
          discount:  parseFloat(item.discount) || 0,
        })),
      };

      if (isEditMode) {
        const finalPayload = statusArg ? { ...payload, status: statusArg } : payload;
        await apiRequest(`/quotes/${id}`, {
          method: "PUT",
          body: JSON.stringify(finalPayload),
        });
        toast.success("Quote updated");
        navigate(`/quotes/${id}`);
      } else {
        const finalStatus = statusArg || "draft";
        await apiRequest("/quotes", {
          method: "POST",
          body: JSON.stringify({ ...payload, status: finalStatus }),
        });
        toast.success("Quote created");
        navigate("/quotes");
      }
    } catch (err) {
      toast.error(isEditMode ? "Failed to update quote" : "Failed to create quote");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomerSuccess = (newCustomer) => {
    if (newCustomer) {
      setCustomers(prev => {
        if (prev.some(c => c.id === newCustomer.id)) return prev;
        return [...prev, newCustomer];
      });
      setCustomerId(String(newCustomer.id));
    }
    setShowCustomerModal(false);
  };

  const handleSaveSalesperson = async () => {
    if (!newSp.name) { toast.error("Name required"); return; }
    try {
      const res = await apiRequest("/salespersons", {
        method: "POST",
        body: JSON.stringify(newSp),
      });
      if (res?.salesperson) {
        setSalespersons(prev => [...prev, res.salesperson]);
        setSalespersonId(String(res.salesperson.id));
        toast.success("Salesperson created");
      }
      setShowSalespersonModal(false);
      setNewSp({ name: "", email: "", phone: "", employee_id: "" });
    } catch (err) { toast.error("Failed to create salesperson"); }
  };

  const handleSaveProject = async () => {
    if (!newProj.project_name) { toast.error("Project name required"); return; }
    try {
      const res = await apiRequest("/projects", {
        method: "POST",
        body: JSON.stringify(newProj),
      });
      if (res?.project) {
        setProjects(prev => [...prev, res.project]);
        setProjectId(String(res.project.id));
        toast.success("Project created");
      }
      setShowProjectModal(false);
      setNewProj({ project_name: "", customer_id: "", start_date: "", end_date: "", description: "", status: "active" });
    } catch (err) { toast.error("Failed to create project"); }
  };

  if (fetching) {
    return (
      <div style={{ maxWidth: "1000px", margin: "auto", padding: "40px" }}>
        <h2 style={{ marginBottom: "25px", fontSize: "20px", fontWeight: "600" }}>{isEditMode ? "Edit Quote" : "New Quote"}</h2>
        <FormSkeleton fields={8} />
      </div>
    );
  }

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", padding: "24px 16px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        .premium-input {
          border: 1px solid #d0d5dd;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .premium-input:focus {
          border-color: #006ee6 !important;
          box-shadow: 0 0 0 4px rgba(0, 110, 230, 0.12) !important;
        }
        .table-input {
          border: 1px solid transparent;
          background: transparent;
          padding: 8px 10px;
          border-radius: 4px;
          transition: all 0.15s ease;
          width: 100%;
          font-size: 13px;
          color: #344054;
          box-sizing: border-box;
          outline: none;
        }
        .table-input:hover {
          border-color: #eaecf0;
          background: #f9fafb;
        }
        .table-input:focus {
          border-color: #006ee6 !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 3px rgba(0, 110, 230, 0.1) !important;
        }
        .row-action-btn {
          opacity: 0.6;
          transition: opacity 0.15s ease, color 0.15s ease;
        }
        .row-action-btn:hover {
          opacity: 1;
          color: #d92d20;
        }
        .add-row-btn {
          border: 1px solid #d0d5dd;
          color: #344054;
          background: #ffffff;
          transition: all 0.15s ease;
        }
        .add-row-btn:hover {
          border-color: #006ee6;
          color: #006ee6;
          background: #f0f6ff;
        }
        .attach-box {
          border: 2px dashed #eaecf0;
          border-radius: 8px;
          padding: 24px;
          text-align: center;
          background: #fcfcfd;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .attach-box:hover {
          border-color: #006ee6;
          background: #f0f6ff;
        }
        .control-group-btn {
          padding: 10px 14px;
          background: #006ee6;
          color: #ffffff;
          border: none;
          border-radius: 0 6px 6px 0;
          cursor: pointer;
          font-weight: 500;
          display: flex;
          alignItems: center;
          justifyContent: center;
          transition: background 0.15s ease;
          outline: none;
        }
        .control-group-btn:hover {
          background: #0056b3;
        }
      `}</style>

      <div style={{ maxWidth: "1120px", margin: "0 auto", background: "#ffffff", borderRadius: "12px", border: "1px solid #eaecf0", boxShadow: "0 4px 20px rgba(16, 24, 40, 0.04)", overflow: "hidden" }}>
        
        {/* Header Banner */}
        <div style={{ borderBottom: "1px solid #eaecf0", padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => navigate(isEditMode ? `/quotes/${id}` : "/quotes")}
              style={{ border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "#667085", padding: "4px", borderRadius: "4px" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f2f4f7"}
              onMouseLeave={(e) => e.currentTarget.style.background = "none"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1d2939" }}>
              {isEditMode ? "Edit Quote" : "New Quote"}
            </h2>
          </div>
          <button
            onClick={() => navigate(isEditMode ? `/quotes/${id}` : "/quotes")}
            style={{ border: "none", background: "none", cursor: "pointer", fontSize: "20px", color: "#98a2b3", display: "flex", padding: "4px", borderRadius: "4px" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#f2f4f7"}
            onMouseLeave={(e) => e.currentTarget.style.background = "none"}
          >
            &times;
          </button>
        </div>

        {/* Form Grid Area */}
        <div style={{ padding: "32px" }}>
          
          {/* Section 1: Customer Details */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr 1fr", gap: "24px", marginBottom: "24px" }}>
            
            {/* Customer Name selection */}
            <div>
              <label style={labelStyle}>Customer Name <span style={{ color: "#d92d20" }}>*</span></label>
              <div style={{ display: "flex", width: "100%" }}>
                <select 
                  value={customerId} 
                  onChange={e => setCustomerId(e.target.value)} 
                  style={{ ...selectStyle, borderRadius: "6px 0 0 6px" }}
                  className="premium-input"
                >
                  <option value="">Select or add a customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.display_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}
                    </option>
                  ))}
                </select>
                <button 
                  onClick={() => setShowCustomerModal(true)} 
                  className="control-group-btn" 
                  title="New Customer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              </div>
            </div>

            {/* Quote ID input */}
            <div>
              <label style={labelStyle}>Quote#</label>
              <div style={{ position: "relative" }}>
                <input 
                  type="text" 
                  value={isEditMode ? quoteNumber : "QT-[Auto-Generated]"} 
                  disabled 
                  style={{ ...inputStyle, background: "#f8fafc", color: "#667085", paddingRight: "36px" }} 
                />
                <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", display: "flex", color: "#98a2b3" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                </span>
              </div>
            </div>

            {/* Date Pickers */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Quote Date <span style={{ color: "#d92d20" }}>*</span></label>
                <input 
                  type="date" 
                  value={quoteDate} 
                  onChange={e => setQuoteDate(e.target.value)} 
                  style={inputStyle} 
                  className="premium-input"
                />
              </div>
              <div>
                <label style={labelStyle}>Expiry Date</label>
                <input 
                  type="date" 
                  value={expiryDate} 
                  onChange={e => setExpiryDate(e.target.value)} 
                  style={inputStyle} 
                  className="premium-input"
                />
              </div>
            </div>

          </div>

          {/* Section 2: Salesperson, Project, Subject */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "24px", marginBottom: "32px", borderTop: "1px solid #f2f4f7", paddingTop: "24px" }}>
            
            {/* Salesperson */}
            <div>
              <label style={labelStyle}>Salesperson</label>
              <div style={{ display: "flex", width: "100%" }}>
                <select 
                  value={salespersonId} 
                  onChange={e => setSalespersonId(e.target.value)} 
                  style={{ ...selectStyle, borderRadius: "6px 0 0 6px" }}
                  className="premium-input"
                >
                  <option value="">Select salesperson</option>
                  {salespersons.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                </select>
                <button 
                  onClick={() => setShowSalespersonModal(true)} 
                  className="control-group-btn" 
                  title="New Salesperson"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              </div>
            </div>

            {/* Project */}
            <div>
              <label style={labelStyle}>Project Name</label>
              <div style={{ display: "flex", width: "100%" }}>
                <select 
                  value={projectId} 
                  onChange={e => setProjectId(e.target.value)} 
                  style={{ ...selectStyle, borderRadius: "6px 0 0 6px" }}
                  className="premium-input"
                >
                  <option value="">Select project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                </select>
                <button 
                  onClick={() => setShowProjectModal(true)} 
                  className="control-group-btn" 
                  title="New Project"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label style={labelStyle}>Subject</label>
              <input 
                type="text" 
                placeholder="Let your customer know what this Quote is for..." 
                style={inputStyle} 
                className="premium-input"
              />
            </div>

          </div>

          {/* Section 3: Item Table */}
          <div style={{ borderTop: "1px solid #f2f4f7", paddingTop: "24px", marginBottom: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#344054", textTransform: "uppercase", letterSpacing: "0.03em" }}>Item Details</h3>
            </div>

            <div style={{ border: "1px solid #eaecf0", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(16, 24, 40, 0.05)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #eaecf0", textAlign: "left" }}>
                    <th style={{ ...thStyle, width: "260px" }}>Item Details</th>
                    <th style={thStyle}>Description</th>
                    <th style={{ ...thStyle, width: "90px", textAlign: "right" }}>Quantity</th>
                    <th style={{ ...thStyle, width: "120px", textAlign: "right" }}>Rate</th>
                    <th style={{ ...thStyle, width: "140px", textAlign: "right" }}>Discount</th>
                    <th style={{ ...thStyle, width: "90px", textAlign: "right" }}>Tax %</th>
                    <th style={{ ...thStyle, width: "140px", textAlign: "right" }}>Amount</th>
                    <th style={{ ...thStyle, width: "50px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #eaecf0", background: "#ffffff" }}>
                      
                      {/* Item drop selection */}
                      <td style={{ ...tdStyle, padding: "8px 12px" }}>
                        <select
                          value={item.item_id}
                          onChange={e => handleItemSelect(idx, e.target.value)}
                          style={{ ...selectStyle, padding: "8px 10px", border: "1px solid #eaecf0" }}
                          className="premium-input"
                        >
                          <option value="">— Select an item —</option>
                          {catalogItems.map(ci => (
                            <option key={ci.id} value={ci.id}>{ci.name}</option>
                          ))}
                        </select>
                        {(item.hsn_code || item.unit) && (
                          <div style={{ fontSize: "10px", color: "#667085", marginTop: "6px", display: "flex", gap: "6px" }}>
                            {item.hsn_code && <span style={{ background: "#f0f4ff", border: "1px solid #c7d2fe", borderRadius: "4px", padding: "1px 6px", fontWeight: "500" }}>HSN: {item.hsn_code}</span>}
                            {item.unit && <span style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "4px", padding: "1px 6px", fontWeight: "500" }}>Unit: {item.unit}</span>}
                          </div>
                        )}
                      </td>

                      {/* Description */}
                      <td style={{ ...tdStyle, padding: "8px 12px" }}>
                        <input
                          type="text"
                          placeholder="Enter description..."
                          value={item.description}
                          onChange={e => updateItem(idx, "description", e.target.value)}
                          className="table-input"
                        />
                      </td>

                      {/* Quantity */}
                      <td style={{ ...tdStyle, padding: "8px 12px" }}>
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={e => updateItem(idx, "quantity", e.target.value)}
                          style={{ textAlign: "right" }}
                          className="table-input"
                        />
                      </td>

                      {/* Unit Price Rate */}
                      <td style={{ ...tdStyle, padding: "8px 12px" }}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={e => updateItem(idx, "unit_price", e.target.value)}
                          style={{ textAlign: "right" }}
                          className="table-input"
                        />
                      </td>

                      {/* Discount block */}
                      <td style={{ ...tdStyle, padding: "8px 12px" }}>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", justifyContent: "flex-end" }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.discount}
                            onChange={e => updateItem(idx, "discount", e.target.value)}
                            style={{ width: "70px", textAlign: "right", border: "1px solid #eaecf0", padding: "6px" }}
                            className="premium-input"
                          />
                          <select
                            value={item.discount_type}
                            onChange={e => updateItem(idx, "discount_type", e.target.value)}
                            style={{ ...selectStyle, padding: "6px", width: "45px", fontSize: "12px", border: "1px solid #eaecf0" }}
                            className="premium-input"
                          >
                            <option value="flat">₹</option>
                            <option value="percent">%</option>
                          </select>
                        </div>
                      </td>

                      {/* Tax Rate */}
                      <td style={{ ...tdStyle, padding: "8px 12px" }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.tax_rate}
                          onChange={e => updateItem(idx, "tax_rate", e.target.value)}
                          style={{ textAlign: "right" }}
                          className="table-input"
                        />
                      </td>

                      {/* Amount */}
                      <td style={{ ...tdStyle, padding: "8px 12px", textAlign: "right", fontWeight: "600", color: "#1d2939" }}>
                        ₹{(calcLineAmount(item) + calcLineTax(item)).toFixed(2)}
                      </td>

                      {/* Actions */}
                      <td style={{ ...tdStyle, padding: "8px 12px", textAlign: "center" }}>
                        {items.length > 1 && (
                          <button
                            onClick={() => removeItem(idx)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}
                            className="row-action-btn"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add buttons */}
            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
              <button
                onClick={addItem}
                className="add-row-btn"
                style={{
                  padding: "8px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Row
              </button>
              <button
                onClick={() => toast("Bulk add feature coming soon")}
                style={{
                  padding: "8px 14px",
                  background: "#ffffff",
                  border: "1px solid #d0d5dd",
                  color: "#344054",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#ffffff"}
              >
                Add Items in Bulk
              </button>
            </div>
          </div>

          {/* Section 4: Customer Notes & Totals Layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "40px", borderTop: "1px solid #f2f4f7", paddingTop: "24px", alignItems: "start" }}>
            
            {/* Notes, Terms, and Attachments dropzone */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div>
                  <label style={labelStyle}>Customer Notes</label>
                  <textarea
                    value={customerNotes}
                    onChange={e => setCustomerNotes(e.target.value)}
                    rows={3}
                    style={{ ...inputStyle, height: "auto", resize: "vertical" }}
                    placeholder="Looking forward to your business."
                    className="premium-input"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Terms &amp; Conditions</label>
                  <textarea
                    value={terms}
                    onChange={e => setTerms(e.target.value)}
                    rows={3}
                    style={{ ...inputStyle, height: "auto", resize: "vertical" }}
                    placeholder="Enter the terms and conditions..."
                    className="premium-input"
                  />
                </div>
              </div>

              {/* File drop zone */}
              <div>
                <label style={labelStyle}>Attach File(s) to Quote</label>
                <div className="attach-box" onClick={() => toast("File upload feature coming soon")}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#006ee6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "8px" }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#344054" }}>Upload File</div>
                  <div style={{ fontSize: "11px", color: "#667085", marginTop: "4px" }}>You can upload a maximum of 5 files, 10MB each</div>
                </div>
              </div>

            </div>

            {/* Calculations Card Summary */}
            <div style={{ background: "#f8fafc", borderRadius: "10px", border: "1px solid #eaecf0", padding: "24px", boxShadow: "0 1px 2px rgba(16, 24, 40, 0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px", fontSize: "13px", color: "#475569" }}>
                <span>Sub Total</span>
                <span style={{ fontWeight: "600" }}>₹{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px", fontSize: "13px", color: "#d92d20" }}>
                <span>Total Discount</span>
                <span style={{ fontWeight: "600" }}>- ₹{totalDiscount.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", fontSize: "13px", color: "#006ee6" }}>
                <span>Total Tax</span>
                <span style={{ fontWeight: "600" }}>+ ₹{totalTax.toFixed(2)}</span>
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", fontSize: "15px", borderTop: "1.5px dashed #d0d5dd", paddingTop: "16px", color: "#1d2939" }}>
                <span>Total (₹)</span>
                <span style={{ color: "#006ee6", fontSize: "16px" }}>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

          </div>

        </div>

        {/* Action Button Footer bar */}
        <div style={{ borderTop: "1px solid #eaecf0", padding: "20px 32px", display: "flex", gap: "12px", justifyContent: "flex-end", background: "#ffffff" }}>
          <button
            onClick={() => navigate(isEditMode ? `/quotes/${id}` : "/quotes")}
            style={{
              padding: "10px 20px",
              background: "#ffffff",
              color: "#344054",
              border: "1px solid #d0d5dd",
              borderRadius: "6px",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#ffffff"}
          >
            Cancel
          </button>
          
          <button
            onClick={() => handleSave("draft")}
            disabled={loading}
            style={{
              padding: "10px 20px",
              background: "#ffffff",
              color: "#006ee6",
              border: "1px solid #006ee6",
              borderRadius: "6px",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f6ff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; }}
          >
            Save as Draft
          </button>

          <button
            onClick={() => handleSave("sent")}
            disabled={loading}
            style={{
              padding: "10px 20px",
              background: "#006ee6",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#0056b3"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#006ee6"}
          >
            {loading ? "Saving..." : (isEditMode ? "Update & Send" : "Save and Send")}
          </button>
        </div>

      </div>

      {/* ===== NEW CUSTOMER MODAL ===== */}
      {showCustomerModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: "950px", maxWidth: "95vw", maxHeight: "90vh", padding: "12px", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px 0 20px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1d2939" }}>+ New Customer</h3>
              <button
                onClick={() => setShowCustomerModal(false)}
                style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#98a2b3", display: "flex", padding: "4px" }}
              >
                &times;
              </button>
            </div>
            <AddCustomer isModal={true} onSaveSuccess={handleSaveCustomerSuccess} onCancel={() => setShowCustomerModal(false)} />
          </div>
        </div>
      )}

      {/* ===== NEW SALESPERSON MODAL ===== */}
      {showSalespersonModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: "420px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1d2939" }}>+ New Salesperson</h3>
              <button
                onClick={() => setShowSalespersonModal(false)}
                style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#98a2b3", display: "flex", padding: "4px" }}
              >
                &times;
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={modalLabelStyle}>Name <span style={{ color: "#d92d20" }}>*</span></label>
                <input value={newSp.name} onChange={e => setNewSp({ ...newSp, name: e.target.value })} style={modalInputStyle} className="premium-input" />
              </div>
              <div>
                <label style={modalLabelStyle}>Email</label>
                <input type="email" value={newSp.email} onChange={e => setNewSp({ ...newSp, email: e.target.value })} style={modalInputStyle} className="premium-input" />
              </div>
              <div>
                <label style={modalLabelStyle}>Phone</label>
                <input value={newSp.phone} onChange={e => setNewSp({ ...newSp, phone: e.target.value })} style={modalInputStyle} className="premium-input" />
              </div>
              <div>
                <label style={modalLabelStyle}>Employee ID</label>
                <input value={newSp.employee_id} onChange={e => setNewSp({ ...newSp, employee_id: e.target.value })} style={modalInputStyle} className="premium-input" />
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
              <button
                onClick={() => setShowSalespersonModal(false)}
                style={{
                  padding: "8px 16px",
                  background: "#ffffff",
                  color: "#344054",
                  border: "1px solid #d0d5dd",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSalesperson}
                style={{
                  padding: "8px 16px",
                  background: "#006ee6",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== NEW PROJECT MODAL ===== */}
      {showProjectModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: "450px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1d2939" }}>+ New Project</h3>
              <button
                onClick={() => setShowProjectModal(false)}
                style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#98a2b3", display: "flex", padding: "4px" }}
              >
                &times;
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={modalLabelStyle}>Project Name <span style={{ color: "#d92d20" }}>*</span></label>
                <input value={newProj.project_name} onChange={e => setNewProj({ ...newProj, project_name: e.target.value })} style={modalInputStyle} className="premium-input" />
              </div>
              <div>
                <label style={modalLabelStyle}>Customer</label>
                <select value={newProj.customer_id} onChange={e => setNewProj({ ...newProj, customer_id: e.target.value })} style={selectStyle} className="premium-input">
                  <option value="">Select customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.display_name || c.email}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={modalLabelStyle}>Start Date</label>
                  <input type="date" value={newProj.start_date} onChange={e => setNewProj({ ...newProj, start_date: e.target.value })} style={modalInputStyle} className="premium-input" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={modalLabelStyle}>End Date</label>
                  <input type="date" value={newProj.end_date} onChange={e => setNewProj({ ...newProj, end_date: e.target.value })} style={modalInputStyle} className="premium-input" />
                </div>
              </div>
              <div>
                <label style={modalLabelStyle}>Description</label>
                <textarea value={newProj.description} onChange={e => setNewProj({ ...newProj, description: e.target.value })} rows={2} style={modalInputStyle} className="premium-input" />
              </div>
              <div>
                <label style={modalLabelStyle}>Status</label>
                <select value={newProj.status} onChange={e => setNewProj({ ...newProj, status: e.target.value })} style={selectStyle} className="premium-input">
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
              <button
                onClick={() => setShowProjectModal(false)}
                style={{
                  padding: "8px 16px",
                  background: "#ffffff",
                  color: "#344054",
                  border: "1px solid #d0d5dd",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProject}
                style={{
                  padding: "8px 16px",
                  background: "#006ee6",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styling definitions
const thStyle = {
  padding: "12px 14px",
  borderBottom: "1px solid #eaecf0",
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase",
  color: "#475569",
  letterSpacing: "0.03em",
};

const tdStyle = {
  padding: "12px 14px",
  verticalAlign: "middle",
};

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "550",
  color: "#344054",
  marginBottom: "6px",
};

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: "6px",
  border: "1px solid #d0d5dd",
  fontSize: "13px",
  boxSizing: "border-box",
  color: "#344054",
  outline: "none",
  background: "#ffffff",
};

const selectStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: "6px",
  border: "1px solid #d0d5dd",
  fontSize: "13px",
  boxSizing: "border-box",
  color: "#344054",
  outline: "none",
  background: "#ffffff",
  cursor: "pointer",
};

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(15, 23, 42, 0.4)",
  backdropFilter: "blur(4px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalBox = {
  background: "#ffffff",
  borderRadius: "12px",
  padding: "32px",
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
  border: "1px solid #eaecf0",
};

const modalLabelStyle = {
  display: "block",
  fontSize: "12px",
  fontWeight: "600",
  color: "#344054",
  marginBottom: "6px",
};

const modalInputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: "6px",
  border: "1px solid #d0d5dd",
  fontSize: "13px",
  boxSizing: "border-box",
  outline: "none",
  color: "#344054",
};

export default AddQuote;