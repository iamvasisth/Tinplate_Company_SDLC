/**
 * Timesheets.js – List view of all timesheets
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { TableSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function Timesheets() {
  const navigate = useNavigate();
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [billingFilter, setBillingFilter] = useState("all");

  const fetchTimesheets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRequest("/timesheets");
      setTimesheets(Array.isArray(res?.timesheets) ? res.timesheets : []);
    } catch (err) { 
      toast.error("Failed to load timesheets"); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { fetchTimesheets(); }, [fetchTimesheets]);

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this timesheet?")) return;
    try {
      await apiRequest(`/timesheets/${id}/cancel`, { method: "PATCH" });
      toast.success("Timesheet cancelled");
      fetchTimesheets();
    } catch (err) { toast.error(err.message || "Action failed"); }
  };

  const handleApprove = async (id) => {
    try {
      await apiRequest(`/timesheets/${id}/approve`, { method: "PATCH" });
      toast.success("Timesheet approved");
      fetchTimesheets();
    } catch (err) { toast.error(err.message || "Failed to approve"); }
  };

  const handleConvertToInvoice = async (id) => {
    if (!window.confirm("Convert this approved timesheet to an Invoice?")) return;
    try {
      const res = await apiRequest(`/timesheets/${id}/convert-to-invoice`, { method: "POST" });
      toast.success("Invoice generated!");
      if (res.invoice_id) {
          navigate(`/invoices/${res.invoice_id}/document`);
      } else {
          fetchTimesheets();
      }
    } catch (err) { toast.error(err.message || "Conversion failed"); }
  };

  const filteredTimesheets = timesheets.filter(t => {
    const term = search.toLowerCase();
    const matchSearch = search === "" ||
      (t.project_name || "").toLowerCase().includes(term) ||
      (t.customer_name || "").toLowerCase().includes(term) ||
      (t.description || "").toLowerCase().includes(term);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchBilling = billingFilter === "all" || t.billing_type === billingFilter;
    return matchSearch && matchStatus && matchBilling;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "Approved": return { bg: "#dcfce7", color: "#166534" };
      case "Invoiced": return { bg: "#dbeafe", color: "#1e40af" };
      case "Draft": return { bg: "#f1f5f9", color: "#475569" };
      case "Cancelled": return { bg: "#fee2e2", color: "#991b1b" };
      default: return { bg: "#fef3c7", color: "#92400e" };
    }
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1200px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Timesheets</h2>
        <button onClick={() => navigate("/timesheets/new")} style={primaryBtn}>+ Log Time</button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap" }}>
        <input type="text" placeholder="Search project, customer, desc..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: "300px" }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, maxWidth: "140px" }}>
          <option value="all">All Status</option>
          <option value="Draft">Draft</option>
          <option value="Approved">Approved</option>
          <option value="Invoiced">Invoiced</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <select value={billingFilter} onChange={e => setBillingFilter(e.target.value)} style={{ ...inputStyle, maxWidth: "140px" }}>
          <option value="all">All Billing</option>
          <option value="Billable">Billable</option>
          <option value="Non-Billable">Non-Billable</option>
        </select>
      </div>

      {loading ? <TableSkeleton columns={8} rows={5} /> : filteredTimesheets.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "gray" }}>
          <p>No timesheets found.</p>
          <button onClick={() => navigate("/timesheets/new")} style={{ ...primaryBtn, marginTop: "15px" }}>+ Log Time</button>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderRadius: "8px", overflow: "hidden" }}>
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Project</th>
              <th style={thStyle}>Staff</th>
              <th style={thStyle}>Hours</th>
              <th style={thStyle}>Billing</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Status</th>
              <th style={{...thStyle, textAlign:"right"}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTimesheets.map(t => {
              const statusColors = getStatusColor(t.status);
              return (
                <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#f8fafc"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                  <td style={tdStyle}>{new Date(t.work_date).toLocaleDateString()}</td>
                  <td style={tdStyle}>
                    <button onClick={() => navigate(`/projects/${t.project_id}`)} style={{ background:"none", border:"none", color: "#2563eb", fontWeight: "500", cursor: "pointer", padding:0, fontSize:"14px" }}>
                      {t.project_name}
                    </button>
                    {t.customer_name && <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{t.customer_name}</div>}
                  </td>
                  <td style={tdStyle}>{t.staff_name || "—"}</td>
                  <td style={{...tdStyle, fontWeight: "600"}}>{t.hours}</td>
                  <td style={tdStyle}>{t.billing_type}</td>
                  <td style={tdStyle}>₹{parseFloat(t.billable_amount).toFixed(2)}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "600", background: statusColors.bg, color: statusColors.color }}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{...tdStyle, textAlign:"right"}}>
                    {t.status === 'Draft' && (
                        <>
                            <button onClick={() => handleApprove(t.id)} style={actionBtnText} title="Approve">Approve</button>
                            <button onClick={() => navigate(`/timesheets/${t.id}/edit`)} style={iconBtn} title="Edit">✏️</button>
                        </>
                    )}
                    {t.status === 'Approved' && t.billing_type === 'Billable' && (
                         <button onClick={() => handleConvertToInvoice(t.id)} style={{...actionBtnText, color: "#166534", background: "#dcfce7"}} title="Convert to Invoice">Create Invoice</button>
                    )}
                    {(t.status === 'Draft' || t.status === 'Approved') && (
                        <button onClick={() => handleCancel(t.id)} style={{...iconBtn, color:"#dc2626"}} title="Cancel">🚫</button>
                    )}
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
const actionBtnText = { background: "#f1f5f9", color: "#2563eb", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "500", padding: "5px 10px", borderRadius: "4px", marginRight: "5px" };

export default Timesheets;
