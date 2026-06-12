/**
 * AddQuote.js – New Quote creation form (Zoho Books‑style)
 * Enhanced: Item dropdown, Salesperson/Project dropdowns, popup modals, per-item discount/tax
 * Dependencies: apiRequest, react-router-dom, react-hot-toast
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

  // --- New Customer form ---
  const [newCust, setNewCust] = useState({ customer_type: "Business", display_name: "", company_name: "", email: "", phone: "", billing_address: "", shipping_address: "", pan: "" });

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
  }, []);

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
      // Clear snapshot fields when item is deselected
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
  const grandTotal = subtotal - totalDiscount + totalTax;

  // Save
  const handleSave = async () => {
    if (!customerId) { toast.error("Please select a customer"); return; }
    if (items.length === 0 || items.every(item => !item.description && !item.item_id)) {
      toast.error("Add at least one item"); return;
    }
    setLoading(true);
    try {
      if (isEditMode) {
        await apiRequest(`/quotes/${id}`, {
          method: "PUT",
          body: JSON.stringify({
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
          }),
        });
        toast.success("Quote updated");
        navigate(`/quotes/${id}`);
      } else {
        await apiRequest("/quotes", {
          method: "POST",
          body: JSON.stringify({
            customer_id: parseInt(customerId),
            quote_date: quoteDate,
            expiry_date: expiryDate || null,
            status: "draft",
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
          }),
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

  // Save new salesperson via popup
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

  // Save new project via popup
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
      <div style={{ maxWidth: "960px", margin: "auto", padding: "30px" }}>
        <h2 style={{ marginBottom: "25px" }}>{isEditMode ? "Edit Quote" : "New Quote"}</h2>
        <FormSkeleton fields={8} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "960px", margin: "auto", padding: "30px" }}>
      <h2 style={{ marginBottom: "25px" }}>{isEditMode ? "Edit Quote" : "New Quote"}</h2>

      {/* Row 1: Customer + Salesperson + Project */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px", marginBottom: "15px" }}>
        <div>
          <label><strong>Customer *</strong></label>
          <div style={{ display: "flex", gap: "5px" }}>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="">Select customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.display_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}
                </option>
              ))}
            </select>
            <button onClick={() => setShowCustomerModal(true)} style={addBtnSmall} title="New Customer">+</button>
          </div>
        </div>
        <div>
          <label><strong>Salesperson</strong></label>
          <div style={{ display: "flex", gap: "5px" }}>
            <select value={salespersonId} onChange={e => setSalespersonId(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="">Select salesperson</option>
              {salespersons.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
            </select>
            <button onClick={() => setShowSalespersonModal(true)} style={addBtnSmall} title="New Salesperson">+</button>
          </div>
        </div>
        <div>
          <label><strong>Project</strong></label>
          <div style={{ display: "flex", gap: "5px" }}>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
            </select>
            <button onClick={() => setShowProjectModal(true)} style={addBtnSmall} title="New Project">+</button>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
        <div style={{ flex: 1 }}>
          <label><strong>Quote Date</strong></label>
          <input type="date" value={quoteDate} onChange={e => setQuoteDate(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label><strong>Expiry Date</strong></label>
          <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} style={inputStyle} />
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
                  {/* Show HSN + unit info when item is linked */}
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
                  <input type="number" min="0" step="0.01" value={item.unit_price}
                    onChange={e => updateItem(idx, "unit_price", e.target.value)} style={{ ...inputStyle, width: "85px" }} />
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

      {/* Customer Notes */}
      <div style={{ marginBottom: "15px" }}>
        <label><strong>Customer Notes</strong></label>
        <textarea value={customerNotes} onChange={e => setCustomerNotes(e.target.value)}
          rows={2} style={inputStyle} placeholder="Looking forward for your business." />
      </div>

      {/* Terms & Conditions */}
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
        <button onClick={() => navigate(isEditMode ? `/quotes/${id}` : "/quotes")} style={cancelBtnStyle}>Cancel</button>
        <button onClick={handleSave} disabled={loading} style={primaryBtn}>
          {loading ? "Saving..." : (isEditMode ? "Update Quote" : "Save Quote")}
        </button>
      </div>

      {/* ===== NEW CUSTOMER MODAL ===== */}
      {showCustomerModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: "950px", maxWidth: "95vw", maxHeight: "90vh", padding: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px 0 20px" }}>
              <h3 style={{ margin: 0 }}>+ New Customer</h3>
              <button onClick={() => setShowCustomerModal(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#666" }}>&times;</button>
            </div>
            <AddCustomer isModal={true} onSaveSuccess={handleSaveCustomerSuccess} onCancel={() => setShowCustomerModal(false)} />
          </div>
        </div>
      )}

      {/* ===== NEW SALESPERSON MODAL ===== */}
      {showSalespersonModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: "400px" }}>
            <h3 style={{ marginTop: 0 }}>+ New Salesperson</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div><label>Name *</label><input value={newSp.name} onChange={e => setNewSp({ ...newSp, name: e.target.value })} style={inputStyle} /></div>
              <div><label>Email</label><input type="email" value={newSp.email} onChange={e => setNewSp({ ...newSp, email: e.target.value })} style={inputStyle} /></div>
              <div><label>Phone</label><input value={newSp.phone} onChange={e => setNewSp({ ...newSp, phone: e.target.value })} style={inputStyle} /></div>
              <div><label>Employee ID</label><input value={newSp.employee_id} onChange={e => setNewSp({ ...newSp, employee_id: e.target.value })} style={inputStyle} /></div>
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "15px" }}>
              <button onClick={() => setShowSalespersonModal(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleSaveSalesperson} style={primaryBtn}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== NEW PROJECT MODAL ===== */}
      {showProjectModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: "450px" }}>
            <h3 style={{ marginTop: 0 }}>+ New Project</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div><label>Project Name *</label><input value={newProj.project_name} onChange={e => setNewProj({ ...newProj, project_name: e.target.value })} style={inputStyle} /></div>
              <div>
                <label>Customer</label>
                <select value={newProj.customer_id} onChange={e => setNewProj({ ...newProj, customer_id: e.target.value })} style={inputStyle}>
                  <option value="">Select customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.display_name || c.email}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}><label>Start Date</label><input type="date" value={newProj.start_date} onChange={e => setNewProj({ ...newProj, start_date: e.target.value })} style={inputStyle} /></div>
                <div style={{ flex: 1 }}><label>End Date</label><input type="date" value={newProj.end_date} onChange={e => setNewProj({ ...newProj, end_date: e.target.value })} style={inputStyle} /></div>
              </div>
              <div><label>Description</label><textarea value={newProj.description} onChange={e => setNewProj({ ...newProj, description: e.target.value })} rows={2} style={inputStyle} /></div>
              <div>
                <label>Status</label>
                <select value={newProj.status} onChange={e => setNewProj({ ...newProj, status: e.target.value })} style={inputStyle}>
                  <option value="active">Active</option><option value="on_hold">On Hold</option><option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "15px" }}>
              <button onClick={() => setShowProjectModal(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleSaveProject} style={primaryBtn}>Save</button>
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

export default AddQuote;