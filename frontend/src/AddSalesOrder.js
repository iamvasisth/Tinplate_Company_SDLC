/**
 * AddSalesOrder.js – Modernized Zoho-style Sales Order creation & edit form
 */
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "./api";
import { FormSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";
import AddCustomer from "./AddCustomer";

function AddSalesOrder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // --- Basic fields ---
  const [customerId, setCustomerId] = useState("");
  const [soDate, setSoDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedShipmentDate, setExpectedShipmentDate] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [soNumber, setSoNumber] = useState(""); // auto-generated placeholder

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

  // --- New Customer form ---
  const [newCust, setNewCust] = useState({ customer_type: "Business", display_name: "", company_name: "", email: "", phone: "", billing_address: "", shipping_address: "", pan: "" });

  // --- New Salesperson form ---
  const [newSp, setNewSp] = useState({ name: "", email: "", phone: "", employee_id: "" });

  // --- New Project form ---
  const [newProj, setNewProj] = useState({ project_name: "", customer_id: "", start_date: "", end_date: "", description: "", status: "active" });

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
          const res = await apiRequest(`/sales-orders/${id}`);
          if (res?.sales_order) {
            const so = res.sales_order;
            setCustomerId(so.customer_id ? String(so.customer_id) : "");
            setSoDate(so.sales_order_date ? so.sales_order_date.slice(0, 10) : "");
            setExpectedShipmentDate(so.expected_shipment_date ? so.expected_shipment_date.slice(0, 10) : "");
            setReferenceNumber(so.reference_number || "");
            setCustomerNotes(so.notes || "");
            setTerms(so.terms || "");
            setSalespersonId(so.salesperson_id ? String(so.salesperson_id) : "");
            setProjectId(so.project_id ? String(so.project_id) : "");
            setSoNumber(so.sales_order_number || "");
            if (res.items && res.items.length > 0) {
              setItems(res.items.map(item => ({
                item_id:       item.item_id       ? String(item.item_id)  : "",
                item_name:     item.item_name     || "",
                description:   item.description   || "",
                quantity:      item.quantity       || 1,
                unit_price:    item.rate           || 0,
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
  const grandTotal = subtotal - totalDiscount + totalTax;

  const handleSave = async (statusOverride = null) => {
    if (!customerId) { toast.error("Please select a customer"); return; }
    if (items.length === 0 || items.every(item => !item.description && !item.item_id)) {
      toast.error("Add at least one item"); return;
    }
    setLoading(true);
    try {
      const payload = {
        customer_id: parseInt(customerId),
        sales_order_date: soDate,
        expected_shipment_date: expectedShipmentDate || null,
        reference_number: referenceNumber,
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
        if (statusOverride) payload.status = statusOverride;
        await apiRequest(`/sales-orders/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Sales Order updated");
        navigate(`/sales-orders/${id}/document`);
      } else {
        payload.status = statusOverride || "draft";
        await apiRequest("/sales-orders", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Sales Order created");
        navigate("/sales-orders");
      }
    } catch (err) {
      toast.error(isEditMode ? "Failed to update Sales Order" : "Failed to create Sales Order");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomerSuccess = (newCustomer) => {
    setShowCustomerModal(false);
    setCustomers(prev => [...prev, newCustomer]);
    setCustomerId(String(newCustomer.id));
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
      <div style={{ maxWidth: "1120px", margin: "30px auto", padding: "30px" }}>
        <FormSkeleton fields={8} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1120px", margin: "30px auto", background: "#ffffff", borderRadius: "12px", border: "1px solid #eaecf0", boxShadow: "0 4px 20px rgba(16, 24, 40, 0.04)", overflow: "hidden", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      
      {/* Styles Injection */}
      <style dangerouslySetInnerHTML={{__html: `
        .premium-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d0d5dd;
          border-radius: 6px;
          font-size: 13px;
          color: #344054;
          background: #ffffff;
          box-sizing: border-box;
          outline: none;
          transition: all 0.15s ease;
        }
        .premium-input:hover {
          border-color: #98a2b3;
        }
        .premium-input:focus {
          border-color: #006ee6;
          box-shadow: 0 0 0 3px rgba(0, 110, 230, 0.1);
        }
        .table-input {
          border: 1px solid transparent;
          background: transparent;
          padding: 6px 8px;
          border-radius: 4px;
          font-size: 13px;
          outline: none;
          width: 100%;
          box-sizing: border-box;
          transition: all 0.1s ease;
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
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease;
          outline: none;
        }
        .control-group-btn:hover {
          background: #0056b3;
        }
      `}} />

      {/* Form Header Banner */}
      <div style={{ borderBottom: "1px solid #eaecf0", padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => navigate(isEditMode ? `/sales-orders/${id}/document` : "/sales-orders")}
            style={{ border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "#667085", padding: "4px", borderRadius: "4px" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#f2f4f7"}
            onMouseLeave={(e) => e.currentTarget.style.background = "none"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#006ee6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1d2939" }}>
              {isEditMode ? "Edit Sales Order" : "New Sales Order"}
            </h2>
          </div>
        </div>
        <button
          onClick={() => navigate(isEditMode ? `/sales-orders/${id}/document` : "/sales-orders")}
          style={{ border: "none", background: "none", cursor: "pointer", fontSize: "20px", color: "#98a2b3", display: "flex", padding: "4px", borderRadius: "4px" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#f2f4f7"}
          onMouseLeave={(e) => e.currentTarget.style.background = "none"}
        >
          &times;
        </button>
      </div>

      {/* Main Form Area */}
      <div style={{ padding: "32px" }}>
        
        {/* Row 1: Customer details & References */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr 1fr", gap: "24px", marginBottom: "24px" }}>
          
          {/* Customer Selection */}
          <div>
            <label style={labelStyle}>Customer Name <span style={{ color: "#d92d20" }}>*</span></label>
            <div style={{ display: "flex", width: "100%" }}>
              <select 
                value={customerId} 
                onChange={e => {
                  if (e.target.value === "new") setShowCustomerModal(true);
                  else setCustomerId(e.target.value);
                }} 
                style={{ ...selectStyle, borderRadius: "6px 0 0 6px" }}
                className="premium-input"
              >
                <option value="">Select or add a customer</option>
                <option value="new" style={{ color: "#0ba5ec", fontWeight: "600" }}>+ New Customer</option>
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

          {/* Sales Order# */}
          <div>
            <label style={labelStyle}>Sales Order#</label>
            <div style={{ position: "relative" }}>
              <input 
                type="text" 
                value={isEditMode ? soNumber : "SO-[Auto-Generated]"} 
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

          {/* Reference# */}
          <div>
            <label style={labelStyle}>Reference#</label>
            <input 
              type="text" 
              value={referenceNumber} 
              onChange={e => setReferenceNumber(e.target.value)} 
              placeholder="e.g. PO-12345" 
              className="premium-input"
            />
          </div>
        </div>

        {/* Row 2: Dates & payment terms */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px", marginBottom: "24px", borderTop: "1px solid #f2f4f7", paddingTop: "24px" }}>
          <div>
            <label style={labelStyle}>Sales Order Date <span style={{ color: "#d92d20" }}>*</span></label>
            <input 
              type="date" 
              value={soDate} 
              onChange={e => setSoDate(e.target.value)} 
              className="premium-input"
            />
          </div>
          <div>
            <label style={labelStyle}>Expected Shipment Date</label>
            <input 
              type="date" 
              value={expectedShipmentDate} 
              onChange={e => setExpectedShipmentDate(e.target.value)} 
              className="premium-input"
            />
          </div>
          <div>
            <label style={labelStyle}>Payment Terms</label>
            <select style={selectStyle} className="premium-input">
              <option>Due on Receipt</option>
              <option>Net 15</option>
              <option>Net 30</option>
              <option>Net 60</option>
            </select>
          </div>
        </div>

        {/* Row 3: Dispatch Details */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px", marginBottom: "32px", borderTop: "1px solid #f2f4f7", paddingTop: "24px" }}>
          
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
            <label style={labelStyle}>Project</label>
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

          {/* Delivery Method */}
          <div>
            <label style={labelStyle}>Delivery Method</label>
            <select style={selectStyle} className="premium-input">
              <option value="">Select delivery method</option>
              <option value="UPS">UPS</option>
              <option value="FedEx">FedEx</option>
              <option value="DHL">DHL</option>
              <option value="Hand Delivery">Hand Delivery</option>
            </select>
          </div>
        </div>

        {/* Item Management Table */}
        <div style={{ borderTop: "1px solid #eaecf0", paddingTop: "24px", marginBottom: "24px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "600", color: "#344054" }}>Item Details</h3>
          <div style={{ border: "1px solid #eaecf0", borderRadius: "8px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #eaecf0" }}>
                  <th style={{ ...thStyle, width: "30px" }}></th>
                  <th style={{ ...thStyle, width: "30%" }}>Item Details</th>
                  <th style={thStyle}>Description</th>
                  <th style={{ ...thStyle, width: "80px", textAlign: "right" }}>Qty</th>
                  <th style={{ ...thStyle, width: "110px", textAlign: "right" }}>Rate</th>
                  <th style={{ ...thStyle, width: "140px", textAlign: "right" }}>Discount</th>
                  <th style={{ ...thStyle, width: "80px", textAlign: "right" }}>Tax %</th>
                  <th style={{ ...thStyle, width: "120px", textAlign: "right" }}>Amount</th>
                  <th style={{ ...thStyle, width: "40px" }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #eaecf0" }}>
                    <td style={{ ...tdStyle, color: "#98a2b3" }}>
                      {/* 6-dots drag indicator */}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle>
                        <circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle>
                      </svg>
                    </td>
                    <td style={tdStyle}>
                      <select 
                        value={item.item_id} 
                        onChange={e => handleItemSelect(idx, e.target.value)}
                        style={{ border: "1px solid #d0d5dd", padding: "6px", borderRadius: "4px", fontSize: "12px", width: "100%", color: "#344054" }}
                      >
                        <option value="">Type or select item...</option>
                        {catalogItems.map(ci => (
                          <option key={ci.id} value={ci.id}>{ci.name}</option>
                        ))}
                      </select>
                      {(item.hsn_code || item.unit) && (
                        <div style={{ fontSize: "10px", color: "#667085", marginTop: "4px", display: "flex", gap: "6px" }}>
                          {item.hsn_code && <span style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "3px", padding: "1px 4px" }}>HSN: {item.hsn_code}</span>}
                          {item.unit && <span style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "3px", padding: "1px 4px" }}>Unit: {item.unit}</span>}
                        </div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <input 
                        type="text" 
                        placeholder="Description" 
                        value={item.description}
                        onChange={e => updateItem(idx, "description", e.target.value)} 
                        className="table-input" 
                      />
                    </td>
                    <td style={tdStyle}>
                      <input 
                        type="number" 
                        min="0" 
                        value={item.quantity}
                        onChange={e => updateItem(idx, "quantity", e.target.value)} 
                        className="table-input" 
                        style={{ textAlign: "right" }}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        value={item.unit_price}
                        onChange={e => updateItem(idx, "unit_price", e.target.value)} 
                        className="table-input" 
                        style={{ textAlign: "right" }}
                      />
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "3px", alignItems: "center", justifyContent: "flex-end" }}>
                        <input 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          value={item.discount}
                          onChange={e => updateItem(idx, "discount", e.target.value)} 
                          className="table-input" 
                          style={{ textAlign: "right", width: "60px" }}
                        />
                        <select 
                          value={item.discount_type} 
                          onChange={e => updateItem(idx, "discount_type", e.target.value)}
                          style={{ border: "1px solid #d0d5dd", padding: "4px", borderRadius: "4px", fontSize: "11px", color: "#475569" }}
                        >
                          <option value="flat">₹</option>
                          <option value="percent">%</option>
                        </select>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <input 
                        type="number" 
                        min="0" 
                        max="100" 
                        value={item.tax_rate}
                        onChange={e => updateItem(idx, "tax_rate", e.target.value)} 
                        className="table-input" 
                        style={{ textAlign: "right" }}
                      />
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600", color: "#1d2939" }}>
                      ₹{(calcLineAmount(item) + calcLineTax(item)).toFixed(2)}
                    </td>
                    <td style={tdStyle}>
                      {items.length > 1 && (
                        <button onClick={() => removeItem(idx)} className="row-action-btn" style={{ border: "none", background: "none", cursor: "pointer", color: "#667085", padding: 0 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button onClick={addItem} className="add-row-btn" style={{ padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
              + Add New Row
            </button>
            <button onClick={() => toast("Bulk Add Feature")} className="add-row-btn" style={{ padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
              Add Items in Bulk
            </button>
          </div>
        </div>

        {/* Lower split layout: Notes & Totals card */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "40px", borderTop: "1px solid #eaecf0", paddingTop: "32px", marginTop: "32px" }}>
          
          {/* Notes column */}
          <div>
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Customer Notes</label>
              <textarea 
                value={customerNotes} 
                onChange={e => setCustomerNotes(e.target.value)}
                rows={3} 
                style={{ ...inputStyle, width: "100%", height: "80px", resize: "none" }} 
                placeholder="Looking forward to doing business with you." 
                className="premium-input"
              />
            </div>
            <div>
              <label style={labelStyle}>Terms & Conditions</label>
              <textarea 
                value={terms} 
                onChange={e => setTerms(e.target.value)}
                rows={3} 
                style={{ ...inputStyle, width: "100%", height: "80px", resize: "none" }} 
                placeholder="Terms and conditions of this sale order..." 
                className="premium-input"
              />
            </div>
          </div>

          {/* Totals & Upload Card */}
          <div>
            
            {/* Calculation summary */}
            <div style={{ background: "#fcfcfd", border: "1px solid #eaecf0", borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "13px", color: "#667085" }}>
                <span>Sub Total</span>
                <span style={{ fontWeight: "500", color: "#344054" }}>₹{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "13px", color: "#b91c1c" }}>
                <span>Total Discount</span>
                <span style={{ fontWeight: "500" }}>- ₹{totalDiscount.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "13px", color: "#0f766e" }}>
                <span>Total Tax</span>
                <span style={{ fontWeight: "500" }}>+ ₹{totalTax.toFixed(2)}</span>
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", fontSize: "15px", borderTop: "1px solid #eaecf0", paddingTop: "14px", color: "#1d2939" }}>
                <span>Total ( ₹ )</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Attach File block */}
            <div className="attach-box" onClick={() => toast("File browser opened")}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "8px", opacity: 0.8 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#344054", marginBottom: "2px" }}>Upload Files</div>
              <div style={{ fontSize: "11px", color: "#667085" }}>Drag & Drop or click to upload. Max 5MB.</div>
            </div>

          </div>
        </div>

      </div>

      {/* Action Footer Bar */}
      <div style={{ background: "#f9fafb", borderTop: "1px solid #eaecf0", padding: "16px 32px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
        <button 
          onClick={() => navigate(isEditMode ? `/sales-orders/${id}/document` : "/sales-orders")} 
          style={{ ...cancelBtnStyle, background: "#ffffff", border: "1px solid #d0d5dd", color: "#344054", fontSize: "13px", fontWeight: "600", borderRadius: "6px", padding: "8px 16px", cursor: "pointer" }}
        >
          Cancel
        </button>
        <button 
          onClick={() => handleSave("draft")} 
          disabled={loading}
          style={{ background: "#ffffff", border: "1px solid #d0d5dd", color: "#344054", fontSize: "13px", fontWeight: "600", borderRadius: "6px", padding: "8px 16px", cursor: "pointer" }}
        >
          Save as Draft
        </button>
        <button 
          onClick={() => handleSave("confirmed")} 
          disabled={loading} 
          style={{ ...primaryBtn, background: "#006ee6", fontSize: "13px", fontWeight: "600", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", border: "none", color: "#ffffff" }}
        >
          {loading ? "Saving..." : (isEditMode ? "Update Order" : "Save and Send")}
        </button>
      </div>

      {/* ===== NEW CUSTOMER MODAL (Unchanged Backend integration) ===== */}
      {showCustomerModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: "950px", maxWidth: "95vw", maxHeight: "90vh", padding: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px 0 20px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#1d2939" }}>+ New Customer</h3>
              <button onClick={() => setShowCustomerModal(false)} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#98a2b3" }}>&times;</button>
            </div>
            <AddCustomer isModal={true} onSaveSuccess={handleSaveCustomerSuccess} onCancel={() => setShowCustomerModal(false)} />
          </div>
        </div>
      )}

      {/* ===== NEW SALESPERSON MODAL ===== */}
      {showSalespersonModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: "400px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>+ Add Salesperson</h3>
              <button onClick={() => setShowSalespersonModal(false)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "20px", color: "#98a2b3" }}>&times;</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div><label style={labelStyle}>Name *</label><input value={newSp.name} onChange={e => setNewSp({ ...newSp, name: e.target.value })} style={modalInputStyle} /></div>
              <div><label style={labelStyle}>Email</label><input type="email" value={newSp.email} onChange={e => setNewSp({ ...newSp, email: e.target.value })} style={modalInputStyle} /></div>
              <div><label style={labelStyle}>Phone</label><input value={newSp.phone} onChange={e => setNewSp({ ...newSp, phone: e.target.value })} style={modalInputStyle} /></div>
              <div><label style={labelStyle}>Employee ID</label><input value={newSp.employee_id} onChange={e => setNewSp({ ...newSp, employee_id: e.target.value })} style={modalInputStyle} /></div>
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "24px", borderTop: "1px solid #eaecf0", paddingTop: "16px" }}>
              <button onClick={() => setShowSalespersonModal(false)} style={modalCancelBtn}>Cancel</button>
              <button onClick={handleSaveSalesperson} style={modalPrimaryBtn}>Save Salesperson</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== NEW PROJECT MODAL ===== */}
      {showProjectModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: "450px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>+ Add Project</h3>
              <button onClick={() => setShowProjectModal(false)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "20px", color: "#98a2b3" }}>&times;</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div><label style={labelStyle}>Project Name *</label><input value={newProj.project_name} onChange={e => setNewProj({ ...newProj, project_name: e.target.value })} style={modalInputStyle} /></div>
              <div>
                <label style={labelStyle}>Customer</label>
                <select value={newProj.customer_id} onChange={e => setNewProj({ ...newProj, customer_id: e.target.value })} style={modalInputStyle}>
                  <option value="">Select customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.display_name || c.email}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}><label style={labelStyle}>Start Date</label><input type="date" value={newProj.start_date} onChange={e => setNewProj({ ...newProj, start_date: e.target.value })} style={modalInputStyle} /></div>
                <div style={{ flex: 1 }}><label style={labelStyle}>End Date</label><input type="date" value={newProj.end_date} onChange={e => setNewProj({ ...newProj, end_date: e.target.value })} style={modalInputStyle} /></div>
              </div>
              <div><label style={labelStyle}>Description</label><textarea value={newProj.description} onChange={e => setNewProj({ ...newProj, description: e.target.value })} rows={2} style={modalInputStyle} /></div>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={newProj.status} onChange={e => setNewProj({ ...newProj, status: e.target.value })} style={modalInputStyle}>
                  <option value="active">Active</option><option value="on_hold">On Hold</option><option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "24px", borderTop: "1px solid #eaecf0", paddingTop: "16px" }}>
              <button onClick={() => setShowProjectModal(false)} style={modalCancelBtn}>Cancel</button>
              <button onClick={handleSaveProject} style={modalPrimaryBtn}>Save Project</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline constant styles
const labelStyle = {
  display: "block",
  fontSize: "12px",
  fontWeight: "600",
  color: "#344054",
  marginBottom: "6px",
};

const inputStyle = {
  boxSizing: "border-box",
};

const selectStyle = {
  width: "100%",
  boxSizing: "border-box",
};

const thStyle = {
  padding: "10px 12px",
  color: "#475569",
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: "1px solid #eaecf0",
};

const tdStyle = {
  padding: "8px 12px",
  verticalAlign: "top",
};

const cancelBtnStyle = {
  transition: "all 0.1s ease",
};

const primaryBtn = {
  transition: "all 0.1s ease",
};

// Modal styles
const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(16, 24, 40, 0.4)",
  backdropFilter: "blur(4px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalBox = {
  background: "#ffffff",
  borderRadius: "12px",
  padding: "24px",
  width: "550px",
  maxWidth: "95%",
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 20px 24px -4px rgba(16, 24, 40, 0.08), 0 8px 8px -4px rgba(16, 24, 40, 0.03)",
};

const modalInputStyle = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #d0d5dd",
  borderRadius: "6px",
  fontSize: "13px",
  color: "#344054",
  boxSizing: "border-box",
  outline: "none",
  marginTop: "4px",
};

const modalCancelBtn = {
  padding: "8px 16px",
  background: "#ffffff",
  border: "1px solid #d0d5dd",
  color: "#344054",
  fontSize: "13px",
  fontWeight: "600",
  borderRadius: "6px",
  cursor: "pointer",
};

const modalPrimaryBtn = {
  padding: "8px 16px",
  background: "#006ee6",
  border: "none",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: "600",
  borderRadius: "6px",
  cursor: "pointer",
};

export default AddSalesOrder;
