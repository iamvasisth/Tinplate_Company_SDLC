import React, { useState, useEffect } from "react";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

function RecurringExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    expense_name: "",
    category: "",
    amount: "",
    frequency: "Monthly",
    due_day: "",
    start_date: "",
    end_date: "",
    status: "Active",
    notes: ""
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/recurring-expenses");
      setExpenses(res?.recurringExpenses || []);
    } catch (err) {
      toast.error("Failed to load recurring expenses");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      id: null,
      expense_name: "",
      category: "",
      amount: "",
      frequency: "Monthly",
      due_day: "",
      start_date: new Date().toISOString().split('T')[0],
      end_date: "",
      status: "Active",
      notes: ""
    });
    setIsEditing(false);
    setShowModal(true);
  };

  const handleOpenEdit = (exp) => {
    setFormData({
      id: exp.id,
      expense_name: exp.expense_name,
      category: exp.category,
      amount: exp.amount,
      frequency: exp.frequency,
      due_day: exp.due_day,
      start_date: new Date(exp.start_date).toISOString().split('T')[0],
      end_date: exp.end_date ? new Date(exp.end_date).toISOString().split('T')[0] : "",
      status: exp.status,
      notes: exp.notes || ""
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.expense_name || !formData.category || !formData.amount || !formData.due_day || !formData.start_date) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      if (isEditing) {
        await apiRequest(`/recurring-expenses/${formData.id}`, {
          method: "PUT",
          body: JSON.stringify(formData)
        });
        toast.success("Recurring expense updated");
      } else {
        await apiRequest("/recurring-expenses", {
          method: "POST",
          body: JSON.stringify(formData)
        });
        toast.success("Recurring expense added");
      }
      setShowModal(false);
      fetchExpenses();
    } catch (err) {
      toast.error(err.message || "Failed to save recurring expense");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this recurring expense?")) return;
    try {
      await apiRequest(`/recurring-expenses/${id}`, { method: "DELETE" });
      toast.success("Recurring expense deleted");
      fetchExpenses();
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const handleStatusUpdate = async (id, action) => {
    try {
      await apiRequest(`/recurring-expenses/${id}/${action}`, { method: "PATCH" });
      toast.success(`Expense ${action}d successfully`);
      fetchExpenses();
    } catch (err) {
      toast.error(`Failed to ${action} expense`);
    }
  };

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.expense_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || exp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    if (status === "Active") return { bg: "#dcfce7", text: "#166534" };
    if (status === "Paused") return { bg: "#fef08a", text: "#854d0e" };
    if (status === "Stopped") return { bg: "#fee2e2", text: "#991b1b" };
    return { bg: "#f1f5f9", text: "#475569" };
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Recurring / Fixed Expenses</h2>
        <button onClick={handleOpenAdd} style={primaryBtn}>+ New Recurring Expense</button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search by Expense Name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={inputStyle}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Paused">Paused</option>
          <option value="Stopped">Stopped</option>
        </select>
      </div>

      <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>Loading...</div>
        ) : filteredExpenses.length === 0 ? (
          <div style={{ padding: "50px", textAlign: "center", color: "#64748b" }}>
            <p>No recurring expenses found.</p>
            <button onClick={handleOpenAdd} style={{ ...primaryBtn, marginTop: "10px" }}>Add New Expense</button>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #cbd5e1", background: "#f8fafc", textAlign: "left" }}>
                <th style={thStyle}>Expense Name</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Amount</th>
                <th style={thStyle}>Frequency</th>
                <th style={thStyle}>Due Day</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((exp) => {
                const statusColor = getStatusColor(exp.status);
                return (
                  <tr key={exp.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ ...tdStyle, fontWeight: "500", color: "#1e293b" }}>{exp.expense_name}</td>
                    <td style={tdStyle}>{exp.category}</td>
                    <td style={{ ...tdStyle, fontWeight: "bold" }}>₹{parseFloat(exp.amount).toFixed(2)}</td>
                    <td style={tdStyle}>{exp.frequency}</td>
                    <td style={tdStyle}>Day {exp.due_day}</td>
                    <td style={tdStyle}>
                      <span style={{
                        background: statusColor.bg, color: statusColor.text,
                        padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold"
                      }}>
                        {exp.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => handleOpenEdit(exp)} style={actionBtn}>Edit</button>
                        
                        {exp.status === "Active" && (
                          <button onClick={() => handleStatusUpdate(exp.id, "pause")} style={{ ...actionBtn, color: "#b45309" }}>Pause</button>
                        )}
                        {exp.status === "Paused" && (
                          <button onClick={() => handleStatusUpdate(exp.id, "resume")} style={{ ...actionBtn, color: "#16a34a" }}>Resume</button>
                        )}
                        {(exp.status === "Active" || exp.status === "Paused") && (
                          <button onClick={() => handleStatusUpdate(exp.id, "stop")} style={{ ...actionBtn, color: "#dc2626" }}>Stop</button>
                        )}

                        <button onClick={() => handleDelete(exp.id)} style={{ ...actionBtn, color: "#dc2626" }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3>{isEditing ? "Edit Recurring Expense" : "Add Recurring Expense"}</h3>
              <button onClick={handleCloseModal} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "15px", gridTemplateColumns: "1fr 1fr" }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Expense Name *</label>
                <input type="text" name="expense_name" value={formData.expense_name} onChange={handleChange} style={inputStyle} required />
              </div>
              
              <div>
                <label style={labelStyle}>Category *</label>
                <input type="text" name="category" value={formData.category} onChange={handleChange} style={inputStyle} required />
              </div>
              
              <div>
                <label style={labelStyle}>Amount *</label>
                <input type="number" name="amount" value={formData.amount} onChange={handleChange} style={inputStyle} step="0.01" required />
              </div>

              <div>
                <label style={labelStyle}>Frequency *</label>
                <select name="frequency" value={formData.frequency} onChange={handleChange} style={inputStyle} required>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Due Day (1-31) *</label>
                <input type="number" name="due_day" value={formData.due_day} onChange={handleChange} style={inputStyle} min="1" max="31" required />
              </div>

              <div>
                <label style={labelStyle}>Start Date *</label>
                <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} style={inputStyle} required />
              </div>

              <div>
                <label style={labelStyle}>End Date (Optional)</label>
                <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Status *</label>
                <select name="status" value={formData.status} onChange={handleChange} style={inputStyle} required>
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                  <option value="Stopped">Stopped</option>
                </select>
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Notes</label>
                <textarea name="notes" value={formData.notes} onChange={handleChange} style={{ ...inputStyle, minHeight: "80px" }} />
              </div>

              <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" onClick={handleCloseModal} style={secondaryBtn}>Cancel</button>
                <button type="submit" style={primaryBtn}>Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = { padding: "12px", color: "#475569", fontWeight: "600", fontSize: "14px" };
const tdStyle = { padding: "12px", color: "#334155", fontSize: "14px" };
const primaryBtn = { background: "#2563eb", color: "#fff", padding: "8px 16px", borderRadius: "6px", border: "none", fontWeight: "500", cursor: "pointer" };
const secondaryBtn = { background: "#fff", color: "#334155", padding: "8px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", fontWeight: "500", cursor: "pointer" };
const actionBtn = { background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: "500", fontSize: "13px" };
const inputStyle = { width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" };
const labelStyle = { display: "block", marginBottom: "5px", fontSize: "13px", fontWeight: "500", color: "#334155" };

const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
const modalContent = { background: "#fff", padding: "30px", borderRadius: "8px", width: "100%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" };

export default RecurringExpenses;
