/**
 * RecurringInvoiceDetail.js – View profile details and generation history
 */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { PageSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function RecurringInvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profRes, histRes] = await Promise.all([
        apiRequest(`/recurring-invoices/${id}`),
        apiRequest(`/recurring-invoices/${id}/generated-invoices`)
      ]);
      if (profRes?.recurring_invoice) setProfile(profRes.recurring_invoice);
      if (histRes?.invoices) setHistory(histRes.invoices);
    } catch (err) {
      toast.error("Failed to load details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleStatusChange = async (action) => {
    try {
      await apiRequest(`/recurring-invoices/${id}/${action}`, { method: "PATCH" });
      toast.success(`Profile ${action}d`);
      fetchData();
    } catch (err) { toast.error(err.message || "Failed to update status"); }
  };

  const handleGenerateNow = async () => {
    if (!window.confirm("Manually generate an invoice now? This will advance the next invoice date.")) return;
    try {
      const res = await apiRequest(`/recurring-invoices/${id}/generate-now`, { method: "POST" });
      toast.success("Invoice generated!");
      if (res.invoice_id) {
          navigate(`/invoices/${res.invoice_id}/document`);
      } else {
          fetchData();
      }
    } catch (err) { toast.error(err.message || "Generation failed"); }
  };

  if (loading) return <PageSkeleton />;
  if (!profile) return <div style={{ padding: "40px", textAlign: "center" }}>Not found</div>;

  const getStatusColor = (status) => {
    switch (status) {
      case "Active": return { bg: "#dcfce7", color: "#166534" };
      case "Paused": return { bg: "#fef3c7", color: "#92400e" };
      case "Stopped": return { bg: "#fee2e2", color: "#991b1b" };
      default: return { bg: "#f1f5f9", color: "#475569" };
    }
  };
  const badge = getStatusColor(profile.status);

  return (
    <div style={{ maxWidth: "1200px", margin: "auto", padding: "30px" }}>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "30px" }}>
        <div>
          <button onClick={() => navigate("/recurring-invoices")} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 0, marginBottom: "10px", fontSize: "14px" }}>← Back to Recurring Profiles</button>
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <h2 style={{ margin: 0, fontSize: "28px", color: "#1e293b" }}>{profile.profile_name}</h2>
            <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: "600", background: badge.bg, color: badge.color }}>
              {profile.status}
            </span>
          </div>
          <div style={{ marginTop: "5px", color: "#64748b", fontSize: "14px" }}>
            {profile.recurring_invoice_number} | {profile.customer_name}
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {profile.status === 'Active' && (
            <>
              <button onClick={handleGenerateNow} style={{...secondaryBtn, borderColor: "#2563eb", color: "#2563eb", background: "#eff6ff"}}>▶ Generate Now</button>
              <button onClick={() => handleStatusChange('pause')} style={secondaryBtn}>⏸ Pause</button>
            </>
          )}
          {profile.status === 'Paused' && (
            <button onClick={() => handleStatusChange('resume')} style={{...secondaryBtn, borderColor: "#166534", color: "#166534"}}>▶ Resume</button>
          )}
          {profile.status !== 'Stopped' && (
            <button onClick={() => handleStatusChange('stop')} style={{...secondaryBtn, color: "#dc2626"}}>⏹ Stop</button>
          )}
          <button onClick={() => navigate(`/recurring-invoices/${id}/edit`)} style={secondaryBtn}>✏️ Edit</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", marginBottom: "30px", gap: "30px" }}>
        {["overview", "generated history"].map(tab => (
          <div 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            style={{ 
              padding: "10px 0", cursor: "pointer", fontWeight: "500", fontSize: "15px",
              color: activeTab === tab ? "#2563eb" : "#64748b",
              borderBottom: activeTab === tab ? "2px solid #2563eb" : "2px solid transparent",
              textTransform: "capitalize"
            }}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "30px" }}>
          
          <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#334155" }}>Template Details</h3>
            
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "30px", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                  <th style={{ padding: "10px" }}>Item</th>
                  <th style={{ padding: "10px" }}>Qty</th>
                  <th style={{ padding: "10px" }}>Rate</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {profile.items && profile.items.map(item => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px" }}>
                      <div style={{ fontWeight: "500", color: "#1e293b" }}>{item.item_name}</div>
                      {item.description && <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{item.description}</div>}
                    </td>
                    <td style={{ padding: "10px" }}>{parseFloat(item.quantity)}</td>
                    <td style={{ padding: "10px" }}>₹{parseFloat(item.rate).toFixed(2)}</td>
                    <td style={{ padding: "10px", textAlign: "right", fontWeight: "500" }}>₹{parseFloat(item.line_total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ width: "250px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", color: "#475569" }}>
                  <span>Subtotal</span><span>₹{parseFloat(profile.subtotal).toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", color: "#475569" }}>
                  <span>Tax</span><span>₹{parseFloat(profile.tax_total).toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #cbd5e1", fontSize: "16px", fontWeight: "700", color: "#1e293b" }}>
                  <span>Total</span><span>₹{parseFloat(profile.total).toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            {profile.notes && (
                <div style={{ marginTop: "30px", fontSize: "14px" }}>
                    <strong>Notes:</strong><br/>
                    <div style={{ color: "#475569", marginTop: "5px" }}>{profile.notes}</div>
                </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <h4 style={{ margin: "0 0 15px 0", color: "#334155", fontSize: "15px" }}>Schedule Info</h4>
              <div style={{ display: "grid", gap: "10px", fontSize: "14px", color: "#475569" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Frequency</span><span style={{fontWeight:"600", color:"#1e293b"}}>{profile.frequency}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Start Date</span><span style={{fontWeight:"600", color:"#1e293b"}}>{profile.start_date ? new Date(profile.start_date).toLocaleDateString() : "—"}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>End Date</span><span style={{fontWeight:"600", color:"#1e293b"}}>{profile.end_date ? new Date(profile.end_date).toLocaleDateString() : "Never"}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "10px", borderTop: "1px dashed #cbd5e1", marginTop: "5px" }}>
                    <span>Next Invoice</span><span style={{fontWeight:"700", color:"#2563eb"}}>{profile.next_invoice_date ? new Date(profile.next_invoice_date).toLocaleDateString() : "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Last Generated</span><span style={{fontWeight:"500", color:"#1e293b"}}>{profile.last_invoice_date ? new Date(profile.last_invoice_date).toLocaleDateString() : "—"}</span>
                </div>
              </div>
            </div>
            
            <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: profile.auto_send_email ? "#166534" : "#475569" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: profile.auto_send_email ? "#166534" : "#cbd5e1" }}></div>
                    {profile.auto_send_email ? "Auto-sending emails to customer" : "Auto-send email is disabled"}
                </div>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === "generated history" && (
        <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <h3 style={{ margin: 0, color: "#334155" }}>Generated Invoices</h3>
          </div>
          
          {history.length === 0 ? <p style={{ color: "#64748b" }}>No invoices have been generated from this profile yet.</p> : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                  <th style={{ padding: "12px" }}>Invoice#</th>
                  <th style={{ padding: "12px" }}>Generated Date</th>
                  <th style={{ padding: "12px" }}>Status</th>
                  <th style={{ padding: "12px", textAlign: "right" }}>Total</th>
                  <th style={{ padding: "12px", textAlign: "right" }}>Balance Due</th>
                </tr>
              </thead>
              <tbody>
                {history.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px" }}><button onClick={() => navigate(`/invoices/${inv.id}/document`)} style={{ background:"none", border:"none", color:"#2563eb", cursor:"pointer", padding:0 }}>{inv.invoice_number}</button></td>
                    <td style={{ padding: "12px" }}>{new Date(inv.created_at).toLocaleString()}</td>
                    <td style={{ padding: "12px", textTransform: "capitalize" }}>{inv.status}</td>
                    <td style={{ padding: "12px", textAlign: "right" }}>₹{parseFloat(inv.total).toFixed(2)}</td>
                    <td style={{ padding: "12px", textAlign: "right" }}>₹{parseFloat(inv.balance_due).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

    </div>
  );
}

const secondaryBtn = { padding: "8px 16px", background: "#f8fafc", color: "#334155", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontWeight: "500", fontSize: "14px" };

export default RecurringInvoiceDetail;
