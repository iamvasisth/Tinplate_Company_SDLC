import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { TableSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await apiRequest("/expenses");
      setExpenses(res?.expenses || []);
    } catch (err) { toast.error("Failed to load expenses"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  useEffect(() => {
    const fetchVendorsAndProjects = async () => {
      try {
        const [venRes, projRes] = await Promise.all([
          apiRequest("/vendors"),
          apiRequest("/projects")
        ]);
        setVendors(venRes?.vendors || []);
        setProjects(projRes?.projects || []);
      } catch (err) { /* ignore */ }
    };
    fetchVendorsAndProjects();
  }, []);


  const handleDelete = async (id) => {
    if (!window.confirm("Delete?")) return;
    try {
      await apiRequest(`/expenses/${id}`, { method: "DELETE" });
      toast.success("Deleted");
      fetchExpenses();
    } catch (err) { toast.error("Delete failed"); }
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1000px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Expenses</h2>
        <button onClick={() => navigate("/expenses/new")} style={primaryBtn}>+ New Expense</button>
      </div>

      {loading ? <TableSkeleton columns={6} rows={5} /> : expenses.length === 0 ? (
        <p>No expenses yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Vendor</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(exp => (
              <tr key={exp.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={tdStyle}>{new Date(exp.expense_date).toLocaleDateString()}</td>
                <td style={tdStyle}>{exp.category}</td>
                <td style={tdStyle}>{exp.vendor_name || "—"}</td>
                <td style={tdStyle}>₹{parseFloat(exp.amount).toFixed(2)}</td>
                <td style={tdStyle}>{exp.status}</td>
                <td style={tdStyle}>
                  <button onClick={() => handleDelete(exp.id)} style={deleteBtnStyle}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle = { padding: "10px", borderBottom: "2px solid #cbd5e1", whiteSpace: "nowrap" };
const tdStyle = { padding: "10px" };
const inputStyle = { padding: "8px", borderRadius: "5px", border: "1px solid #ccc" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "500" };
const cancelBtnStyle = { padding: "10px 20px", background: "#ccc", color: "#333", border: "none", borderRadius: "5px", cursor: "pointer" };
const deleteBtnStyle = { padding: "5px 10px", background: "red", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" };

export default Expenses;