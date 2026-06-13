import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

function AddExpense() {
  const navigate = useNavigate();
  
  const [vendorId, setVendorId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [category, setCategory] = useState("Other Expenses");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [status, setStatus] = useState("paid");
  
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [venRes, projRes] = await Promise.all([
          apiRequest("/vendors"),
          apiRequest("/projects")
        ]);
        setVendors(venRes?.vendors || []);
        setProjects(projRes?.projects || []);
      } catch (err) {
        console.error("Error fetching dropdowns:", err);
      }
    };
    fetchDropdowns();
  }, []);

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) return toast.error("Enter a valid amount");
    if (!category) return toast.error("Select a category");
    
    setSaving(true);
    try {
      await apiRequest("/expenses", {
        method: "POST",
        body: JSON.stringify({
          vendor_id: vendorId || null,
          project_id: projectId || null,
          category,
          amount: parseFloat(amount),
          expense_date: expenseDate,
          description,
          reference,
          status
        }),
      });
      toast.success("Expense recorded successfully!");
      navigate("/expenses");
    } catch (err) {
      toast.error(err.message || "Failed to record expense");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0, fontSize: "22px", color: "#1e293b" }}>Record Expense</h2>
          <p style={{ margin: "5px 0 0 0", color: "#64748b", fontSize: "14px" }}>Add a new expense transaction.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => navigate("/expenses")} style={cancelBtn} disabled={saving}>Cancel</button>
          <button onClick={handleSave} style={saveBtn} disabled={saving}>
            {saving ? "Saving..." : "Save Expense"}
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={gridStyle}>
          
          {/* Vendor */}
          <div style={fieldGroup}>
            <label style={labelStyle}>Vendor (Optional)</label>
            <select value={vendorId} onChange={e => setVendorId(e.target.value)} style={inputStyle}>
              <option value="">-- Select Vendor --</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.display_name}</option>)}
            </select>
          </div>

          {/* Project */}
          <div style={fieldGroup}>
            <label style={labelStyle}>Project (Optional)</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} style={inputStyle}>
              <option value="">-- Select Project --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
            </select>
          </div>

          {/* Category */}
          <div style={fieldGroup}>
            <label style={labelStyle}>Category <span style={{color: "red"}}>*</span></label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
              <option value="Other Expenses">Other Expenses</option>
              <option value="Travel">Travel</option>
              <option value="Meals">Meals</option>
              <option value="Office Supplies">Office Supplies</option>
              <option value="Rent">Rent</option>
              <option value="Utilities">Utilities</option>
              <option value="Advertising">Advertising</option>
            </select>
          </div>

          {/* Amount */}
          <div style={fieldGroup}>
            <label style={labelStyle}>Amount (INR) <span style={{color: "red"}}>*</span></label>
            <input 
              type="number" 
              placeholder="0.00" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              style={inputStyle} 
              min="0"
              step="0.01"
            />
          </div>

          {/* Date */}
          <div style={fieldGroup}>
            <label style={labelStyle}>Date <span style={{color: "red"}}>*</span></label>
            <input 
              type="date" 
              value={expenseDate} 
              onChange={e => setExpenseDate(e.target.value)} 
              style={inputStyle} 
            />
          </div>

          {/* Reference */}
          <div style={fieldGroup}>
            <label style={labelStyle}>Reference #</label>
            <input 
              type="text" 
              placeholder="Bill No. / Receipt No." 
              value={reference} 
              onChange={e => setReference(e.target.value)} 
              style={inputStyle} 
            />
          </div>
          
          {/* Status */}
          <div style={fieldGroup}>
            <label style={labelStyle}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div style={{ ...fieldGroup, marginTop: "20px" }}>
          <label style={labelStyle}>Notes / Description</label>
          <textarea 
            placeholder="Add details about this expense..." 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} 
          />
        </div>

      </div>
    </div>
  );
}

// --- Styles ---
const pageStyle = { padding: "30px", maxWidth: "900px", margin: "auto", fontFamily: "'Inter', sans-serif" };
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" };
const cardStyle = { background: "#fff", padding: "25px", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" };
const gridStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" };
const fieldGroup = { display: "flex", flexDirection: "column", gap: "6px" };
const labelStyle = { fontSize: "13px", fontWeight: "600", color: "#475569" };
const inputStyle = { padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", color: "#1e293b", outline: "none", transition: "border-color 0.2s" };
const saveBtn = { padding: "10px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "14px" };
const cancelBtn = { padding: "10px 20px", background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontWeight: "500", fontSize: "14px" };

export default AddExpense;
