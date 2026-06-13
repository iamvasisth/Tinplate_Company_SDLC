/**
 * RecurringInvoices.js – List view of all recurring invoices
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { TableSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function RecurringInvoices() {
  const navigate = useNavigate();
  const [recurringInvoices, setRecurringInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRequest("/recurring-invoices");
      setRecurringInvoices(Array.isArray(res?.recurring_invoices) ? res.recurring_invoices : []);
    } catch (err) { 
      toast.error("Failed to load recurring invoices"); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const filteredInvoices = recurringInvoices.filter(r => {
    const term = search.toLowerCase();
    const matchSearch = search === "" ||
      (r.profile_name || "").toLowerCase().includes(term) ||
      (r.customer_name || "").toLowerCase().includes(term) ||
      (r.recurring_invoice_number || "").toLowerCase().includes(term);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "Active": return { bg: "#dcfce7", color: "#166534" };
      case "Paused": return { bg: "#fef3c7", color: "#92400e" };
      case "Stopped": return { bg: "#fee2e2", color: "#991b1b" };
      default: return { bg: "#f1f5f9", color: "#475569" };
    }
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1200px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Recurring Invoices</h2>
        <button onClick={() => navigate("/recurring-invoices/new")} style={primaryBtn}>+ New Profile</button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap" }}>
        <input type="text" placeholder="Search profile, customer, #..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: "300px" }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, maxWidth: "140px" }}>
          <option value="all">All Status</option>
          <option value="Active">Active</option>
          <option value="Paused">Paused</option>
          <option value="Stopped">Stopped</option>
        </select>
      </div>

      {loading ? <TableSkeleton columns={8} rows={5} /> : filteredInvoices.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "gray" }}>
          <p>No recurring invoices found.</p>
          <button onClick={() => navigate("/recurring-invoices/new")} style={{ ...primaryBtn, marginTop: "15px" }}>+ New Profile</button>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderRadius: "8px", overflow: "hidden" }}>
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
              <th style={thStyle}>Profile Name</th>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Frequency</th>
              <th style={thStyle}>Next Invoice</th>
              <th style={thStyle}>Status</th>
              <th style={{...thStyle, textAlign:"right"}}>Amount</th>
              <th style={{...thStyle, textAlign:"center"}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map(r => {
              const statusColors = getStatusColor(r.status);
              return (
                <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#f8fafc"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                  <td style={tdStyle}>
                    <button onClick={() => navigate(`/recurring-invoices/${r.id}`)} style={{ background:"none", border:"none", color: "#2563eb", fontWeight: "500", cursor: "pointer", padding:0, fontSize:"14px" }}>
                      {r.profile_name}
                    </button>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{r.recurring_invoice_number}</div>
                  </td>
                  <td style={tdStyle}>{r.customer_name || "—"}</td>
                  <td style={tdStyle}>{r.frequency}</td>
                  <td style={tdStyle}>
                      {r.next_invoice_date ? new Date(r.next_invoice_date).toLocaleDateString() : "—"}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "600", background: statusColors.bg, color: statusColors.color }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{...tdStyle, textAlign:"right", fontWeight:"600"}}>₹{parseFloat(r.total).toFixed(2)}</td>
                  <td style={{...tdStyle, textAlign:"center"}}>
                    <button onClick={() => navigate(`/recurring-invoices/${r.id}/edit`)} style={iconBtn} title="Edit">✏️</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle = { padding: "12px 15px", fontWeight: "600", color: "#475569" };
const tdStyle = { padding: "12px 15px", color: "#334155" };
const inputStyle = { width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px" };
const primaryBtn = { padding: "8px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500", fontSize: "14px" };
const iconBtn = { background: "none", border: "none", cursor: "pointer", fontSize: "16px", margin: "0 5px", padding: "4px" };

export default RecurringInvoices;
