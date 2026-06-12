/**
 * CreditNotes.js – Credit Notes list with search/filter, expanded status badges,
 * inline expandable detail, send email, delete, apply to invoice.
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiRequest } from "./api";
import { TableSkeleton, DetailSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

const ORG_NAME = "Tinplate Computer Training Center";

const STATUS_COLORS = {
  Draft:     { bg: "#e2e3e5", color: "#383d41" },
  Open:      { bg: "#cce5ff", color: "#004085" },
  Applied:   { bg: "#d4edda", color: "#155724" },
  Cancelled: { bg: "#f8d7da", color: "#721c24" },
};

function CreditNotes() {
  const navigate = useNavigate();
  const location = useLocation();

  const [creditNotes, setCreditNotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [expandedId, setExpandedId] = useState(null);
  const [expandedCN, setExpandedCN] = useState(null);
  const [expandedItems, setExpandedItems] = useState([]);
  const [expandedLoading, setExpandedLoading] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [menuOpenFor, setMenuOpenFor] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [cnRes, custRes] = await Promise.all([
        apiRequest("/credit-notes"),
        apiRequest("/customers"),
      ]);
      setCreditNotes(Array.isArray(cnRes?.credit_notes) ? cnRes.credit_notes : []);
      setCustomers(Array.isArray(custRes?.customers) ? custRes.customers : []);
    } catch (err) { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData, location.state?.refresh]);

  const getCustomerName = (customerId) => {
    if (!customerId) return "—";
    const cust = customers.find(c => c.id === customerId);
    return cust ? cust.display_name || cust.company_name || cust.email : "—";
  };

  const getCustomerById = (customerId) => customers.find(c => c.id === customerId) || {};

  // Filter CNs
  const filteredCNs = creditNotes.filter(cn => {
    const matchSearch = search === "" ||
      (cn.credit_note_number || "").toLowerCase().includes(search.toLowerCase()) ||
      getCustomerName(cn.customer_id).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || cn.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleExpand = async (cnId) => {
    if (expandedId === cnId) { setExpandedId(null); setExpandedCN(null); setExpandedItems([]); return; }
    setExpandedId(cnId);
    setExpandedLoading(true);
    try {
      const res = await apiRequest(`/credit-notes/${cnId}`);
      if (res?.credit_note) { setExpandedCN(res.credit_note); setExpandedItems(res.items || []); }
    } catch (err) { toast.error("Failed to load details"); setExpandedId(null); }
    finally { setExpandedLoading(false); }
  };

  const cancelCN = async (cnId) => {
    if (!window.confirm("Cancel this Credit Note?")) return;
    try {
      await apiRequest(`/credit-notes/${cnId}/cancel`, { method: "PATCH" });
      toast.success("Credit Note cancelled");
      setCreditNotes(prev => prev.map(p => p.id === cnId ? { ...p, status: "Cancelled" } : p));
      if (expandedCN?.id === cnId) setExpandedCN({ ...expandedCN, status: "Cancelled" });
    } catch (err) { toast.error(err.message || "Failed to cancel"); }
  };

  const markOpen = async (cnId) => {
    try {
      await apiRequest(`/credit-notes/${cnId}`, { method: "PUT", body: JSON.stringify({ status: "Open" }) });
      toast.success("Marked as Open");
      setCreditNotes(prev => prev.map(p => p.id === cnId ? { ...p, status: "Open" } : p));
      if (expandedCN?.id === cnId) setExpandedCN({ ...expandedCN, status: "Open" });
    } catch (err) { toast.error("Failed to update status"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this Credit Note?")) return;
    try {
      await apiRequest(`/credit-notes/${id}`, { method: "DELETE" });
      toast.success("Credit Note deleted");
      if (expandedId === id) { setExpandedId(null); setExpandedCN(null); setExpandedItems([]); }
      fetchData();
    } catch (err) { toast.error(err.message || "Delete failed"); }
  };

  const openEmailModal = (cn) => {
    const cust = getCustomerById(cn.customer_id);
    setEmailSubject(`Credit Note ${cn.credit_note_number} from ${ORG_NAME}`);
    setEmailBody(`Dear ${cust.display_name || cust.company_name || "Customer"},\n\nPlease find the attached Credit Note for your account.\n\nCredit Note Number: ${cn.credit_note_number}\nAmount: ₹${parseFloat(cn.total).toFixed(2)}\n\nThank you.\n\nRegards,\n${ORG_NAME}`);
    setShowEmailModal(true);
  };

  const sendEmail = async () => {
    const cn = expandedCN;
    if (!cn) return;
    try {
      await apiRequest(`/credit-notes/${cn.id}/send`, {
        method: "POST",
        body: JSON.stringify({ to: getCustomerById(cn.customer_id).email || "", subject: emailSubject, body: emailBody }),
      });
      toast.success("Email sent!");
      setShowEmailModal(false);
      if (cn.status === "Draft") markOpen(cn.id);
    } catch (err) { toast.error("Failed to send email"); }
  };

  const statusBadge = (status) => {
    const colors = STATUS_COLORS[status] || STATUS_COLORS.Draft;
    return (
      <span style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "500", background: colors.bg, color: colors.color, textTransform: "capitalize" }}>
        {status}
      </span>
    );
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1100px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>All Credit Notes</h2>
        <button onClick={() => navigate("/credit-notes/new")} style={primaryBtn}>+ New Credit Note</button>
      </div>

      {/* Search & Filter */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap" }}>
        <input type="text" placeholder="Search by CN # or customer..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: "300px" }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, maxWidth: "160px" }}>
          <option value="all">All Status</option>
          <option value="Draft">Draft</option><option value="Open">Open</option>
          <option value="Applied">Applied</option><option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? <TableSkeleton columns={6} rows={4} /> : filteredCNs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "gray" }}>
          <p>No Credit Notes found.</p>
          <button onClick={() => navigate("/credit-notes/new")} style={{ ...primaryBtn, marginTop: "15px" }}>+ New Credit Note</button>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={thStyle}>CN #</th><th style={thStyle}>Date</th>
              <th style={thStyle}>Customer</th><th style={thStyle}>Status</th><th style={thStyle}>Total</th><th style={thStyle}>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {filteredCNs.map(p => (
              <React.Fragment key={p.id}>
                <tr style={{ borderBottom: "1px solid #e2e8f0", cursor: "pointer" }} onClick={() => toggleExpand(p.id)}>
                  <td style={tdStyle}><span style={{ color: "#4a90e2", textDecoration: "underline" }}>{p.credit_note_number}</span></td>
                  <td style={tdStyle}>{new Date(p.credit_note_date).toLocaleDateString()}</td>
                  <td style={tdStyle}>{getCustomerName(p.customer_id)}</td>
                  <td style={tdStyle}>{statusBadge(p.status)}</td>
                  <td style={tdStyle}>₹{parseFloat(p.total).toFixed(2)}</td>
                  <td style={tdStyle}>₹{parseFloat(p.remaining_amount).toFixed(2)}</td>
                </tr>

                {expandedId === p.id && (
                  <tr><td colSpan={6} style={{ padding: "0" }}>
                    {expandedLoading ? (
                      <div style={{ padding: "30px", background: "#f9fafb" }}>
                        <DetailSkeleton />
                      </div>
                    ) : expandedCN ? (
                      <div style={{ padding: "20px 25px", background: "#fff", borderTop: "1px solid #e2e8f0", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.03)" }}>
                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
                          <button onClick={(e) => { e.stopPropagation(); openEmailModal(expandedCN); }} style={smallSecondaryBtn}>✉️ Send Email</button>
                          
                          {expandedCN.status === "Draft" && (
                            <button onClick={() => markOpen(p.id)} style={{ ...smallSecondaryBtn, background: "#cce5ff", color: "#004085" }}>Mark as Open</button>
                          )}
                          
                          {expandedCN.status !== "Cancelled" && parseFloat(expandedCN.applied_amount) === 0 && (
                            <button onClick={() => cancelCN(p.id)} style={{ ...smallSecondaryBtn, background: "#f8d7da", color: "#721c24" }}>Cancel</button>
                          )}

                          {expandedCN.status !== "Cancelled" && parseFloat(expandedCN.remaining_amount) > 0 && (
                             <button onClick={() => navigate(`/credit-notes/${p.id}/document`)} style={{ ...smallSecondaryBtn, background: "#0c5460", color: "#fff", border: "none" }}>➕ Apply to Invoice</button>
                          )}

                          {parseFloat(expandedCN.applied_amount) === 0 && (
                              <button onClick={() => navigate(`/credit-notes/${p.id}/edit`)} style={{ ...smallSecondaryBtn, border: "1px solid #4a90e2", color: "#4a90e2" }}>Edit</button>
                          )}

                          <button onClick={() => navigate(`/credit-notes/${p.id}/document`)} style={{ ...smallSecondaryBtn, border: "1px solid #28a745", color: "#28a745" }}>📄 Document</button>

                          {parseFloat(expandedCN.applied_amount) === 0 && (
                              <div style={{ position: "relative" }}>
                                <button onClick={() => setMenuOpenFor(menuOpenFor === p.id ? null : p.id)} style={smallSecondaryBtn}>⋯</button>
                                {menuOpenFor === p.id && (
                                  <div style={dropdownMenuStyle}>
                                    <button style={menuItemStyle} onClick={() => { setMenuOpenFor(null); handleDelete(p.id); }}>🗑️ Delete</button>
                                  </div>
                                )}
                              </div>
                          )}
                        </div>

                        {/* CN details */}
                        <div style={{ display: "flex", gap: "30px", marginBottom: "15px", fontSize: "14px" }}>
                          <div><strong>Customer:</strong> {getCustomerName(expandedCN.customer_id)}</div>
                          <div><strong>Date:</strong> {new Date(expandedCN.credit_note_date).toLocaleDateString()}</div>
                          <div><strong>Reference #:</strong> {expandedCN.reference_number || "—"}</div>
                        </div>

                        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "15px", fontSize: "14px" }}>
                          <thead><tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                            <th style={thStyle}>Item</th><th style={thStyle}>Description</th><th style={{...thStyle, textAlign:"right"}}>Qty</th><th style={{...thStyle, textAlign:"right"}}>Rate</th><th style={{...thStyle, textAlign:"right"}}>Amount</th>
                          </tr></thead>
                          <tbody>
                            {expandedItems.length > 0 ? expandedItems.map((item, idx) => (
                              <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                <td style={tdStyle}>{item.item_name || "—"}</td>
                                <td style={tdStyle}>{item.description || "—"}</td>
                                <td style={{...tdStyle, textAlign:"right"}}>{parseFloat(item.quantity).toFixed(2)}</td>
                                <td style={{...tdStyle, textAlign:"right"}}>₹{parseFloat(item.rate).toFixed(2)}</td>
                                <td style={{...tdStyle, textAlign:"right"}}>₹{parseFloat(item.line_total).toFixed(2)}</td>
                              </tr>
                            )) : <tr><td colSpan={5} style={tdStyle}>No items</td></tr>}
                          </tbody>
                        </table>

                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "15px", fontSize: "14px" }}>
                            <div style={{ width: "250px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                    <span>SubTotal</span><span>₹{parseFloat(expandedCN.subtotal).toFixed(2)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                    <span>Applied Amount</span><span style={{ color: "#d9534f" }}>-₹{parseFloat(expandedCN.applied_amount).toFixed(2)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", borderTop: "1px solid #ccc", paddingTop: "4px" }}>
                                    <span>Remaining</span><span>₹{parseFloat(expandedCN.remaining_amount).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {expandedCN.reason && <div style={{ marginBottom: "10px", fontSize: "14px" }}><strong>Reason:</strong> {expandedCN.reason}</div>}
                        {expandedCN.notes && <div style={{ marginBottom: "10px", fontSize: "14px" }}><strong>Notes:</strong> {expandedCN.notes}</div>}
                      </div>
                    ) : <div style={{ padding: "20px", background: "#f9fafb", textAlign: "center" }}>Failed to load details.</div>}
                  </td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}

      {/* Send Email Modal */}
      {showEmailModal && expandedCN && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ marginTop: 0 }}>Send Credit Note via Email</h3>
            <div style={{ marginBottom: "15px" }}><label><strong>To:</strong></label>
              <input type="email" value={getCustomerById(expandedCN.customer_id).email || ""} readOnly style={{ ...inputStyle, background: "#f9f9f9" }} /></div>
            <div style={{ marginBottom: "15px" }}><label><strong>Subject:</strong></label>
              <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} style={inputStyle} /></div>
            <div style={{ marginBottom: "20px" }}><label><strong>Message:</strong></label>
              <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={6} style={inputStyle} /></div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowEmailModal(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={sendEmail} style={primaryBtn}>Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = { padding: "10px", borderBottom: "2px solid #cbd5e1", whiteSpace: "nowrap" };
const tdStyle = { padding: "10px" };
const inputStyle = { width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc", boxSizing: "border-box" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "500" };
const smallSecondaryBtn = { padding: "6px 12px", background: "#f0f0f0", color: "#333", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer", fontSize: "13px" };
const cancelBtnStyle = { padding: "10px 20px", background: "#ccc", color: "#333", border: "none", borderRadius: "5px", cursor: "pointer" };
const dropdownMenuStyle = { position: "absolute", right: 0, top: "100%", background: "#fff", borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 10, minWidth: "140px" };
const menuItemStyle = { display: "block", width: "100%", padding: "8px 16px", border: "none", background: "none", textAlign: "left", cursor: "pointer", whiteSpace: "nowrap" };
const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalBox = { background: "#fff", borderRadius: "8px", padding: "25px", width: "600px", maxWidth: "90%", maxHeight: "80vh", overflow: "auto", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" };

export default CreditNotes;
