/**
 * VendorCredits.js – Vendor Credits list with search/filter, expanded status badges,
 * inline expandable detail, send email, delete, apply to bill.
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

function VendorCredits() {
  const navigate = useNavigate();
  const location = useLocation();

  const [vendorCredits, setVendorCredits] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [expandedId, setExpandedId] = useState(null);
  const [expandedVC, setExpandedVC] = useState(null);
  const [expandedItems, setExpandedItems] = useState([]);
  const [expandedLoading, setExpandedLoading] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [menuOpenFor, setMenuOpenFor] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [vcRes, vendorRes] = await Promise.all([
        apiRequest("/vendor-credits"),
        apiRequest("/vendors"),
      ]);
      setVendorCredits(Array.isArray(vcRes?.vendor_credits) ? vcRes.vendor_credits : []);
      setVendors(Array.isArray(vendorRes?.vendors) ? vendorRes.vendors : []);
    } catch (err) { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData, location.state?.refresh]);

  const getVendorName = (vendorId) => {
    if (!vendorId) return "—";
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor ? vendor.display_name || vendor.company_name || vendor.email : "—";
  };

  const getVendorById = (vendorId) => vendors.find(v => v.id === vendorId) || {};

  // Filter VCs
  const filteredVCs = vendorCredits.filter(vc => {
    const matchSearch = search === "" ||
      (vc.vendor_credit_number || "").toLowerCase().includes(search.toLowerCase()) ||
      getVendorName(vc.vendor_id).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || vc.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleExpand = async (vcId) => {
    if (expandedId === vcId) { setExpandedId(null); setExpandedVC(null); setExpandedItems([]); return; }
    setExpandedId(vcId);
    setExpandedLoading(true);
    try {
      const res = await apiRequest(`/vendor-credits/${vcId}`);
      if (res?.vendor_credit) { setExpandedVC(res.vendor_credit); setExpandedItems(res.items || []); }
    } catch (err) { toast.error("Failed to load details"); setExpandedId(null); }
    finally { setExpandedLoading(false); }
  };

  const cancelVC = async (vcId) => {
    if (!window.confirm("Cancel this Vendor Credit?")) return;
    try {
      await apiRequest(`/vendor-credits/${vcId}/cancel`, { method: "PATCH" });
      toast.success("Vendor Credit cancelled");
      setVendorCredits(prev => prev.map(p => p.id === vcId ? { ...p, status: "Cancelled" } : p));
      if (expandedVC?.id === vcId) setExpandedVC({ ...expandedVC, status: "Cancelled" });
    } catch (err) { toast.error(err.message || "Failed to cancel"); }
  };

  const markOpen = async (vcId) => {
    try {
      await apiRequest(`/vendor-credits/${vcId}`, { method: "PUT", body: JSON.stringify({ status: "Open" }) });
      toast.success("Marked as Open");
      setVendorCredits(prev => prev.map(p => p.id === vcId ? { ...p, status: "Open" } : p));
      if (expandedVC?.id === vcId) setExpandedVC({ ...expandedVC, status: "Open" });
    } catch (err) { toast.error("Failed to update status"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this Vendor Credit?")) return;
    try {
      await apiRequest(`/vendor-credits/${id}`, { method: "DELETE" });
      toast.success("Vendor Credit deleted");
      if (expandedId === id) { setExpandedId(null); setExpandedVC(null); setExpandedItems([]); }
      fetchData();
    } catch (err) { toast.error(err.message || "Delete failed"); }
  };

  const openEmailModal = (vc) => {
    const vendor = getVendorById(vc.vendor_id);
    setEmailSubject(`Vendor Credit ${vc.vendor_credit_number} from ${ORG_NAME}`);
    setEmailBody(`Dear ${vendor.display_name || vendor.company_name || "Vendor"},\n\nPlease find the attached Vendor Credit for your records.\n\nVendor Credit Number: ${vc.vendor_credit_number}\nAmount: ₹${parseFloat(vc.total).toFixed(2)}\n\nThank you.\n\nRegards,\n${ORG_NAME}`);
    setShowEmailModal(true);
  };

  const sendEmail = async () => {
    const vc = expandedVC;
    if (!vc) return;
    try {
      await apiRequest(`/vendor-credits/${vc.id}/send`, {
        method: "POST",
        body: JSON.stringify({ to: getVendorById(vc.vendor_id).email || "", subject: emailSubject, body: emailBody }),
      });
      toast.success("Email sent!");
      setShowEmailModal(false);
      if (vc.status === "Draft") markOpen(vc.id);
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
        <h2>All Vendor Credits</h2>
        <button onClick={() => navigate("/vendor-credits/new")} style={primaryBtn}>+ New Vendor Credit</button>
      </div>

      {/* Search & Filter */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap" }}>
        <input type="text" placeholder="Search by VC # or vendor..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: "300px" }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, maxWidth: "160px" }}>
          <option value="all">All Status</option>
          <option value="Draft">Draft</option><option value="Open">Open</option>
          <option value="Applied">Applied</option><option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? <TableSkeleton columns={6} rows={4} /> : filteredVCs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "gray" }}>
          <p>No Vendor Credits found.</p>
          <button onClick={() => navigate("/vendor-credits/new")} style={{ ...primaryBtn, marginTop: "15px" }}>+ New Vendor Credit</button>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={thStyle}>VC #</th><th style={thStyle}>Date</th>
              <th style={thStyle}>Vendor</th><th style={thStyle}>Status</th><th style={thStyle}>Total</th><th style={thStyle}>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {filteredVCs.map(p => (
              <React.Fragment key={p.id}>
                <tr style={{ borderBottom: "1px solid #e2e8f0", cursor: "pointer" }} onClick={() => toggleExpand(p.id)}>
                  <td style={tdStyle}><span style={{ color: "#4a90e2", textDecoration: "underline" }}>{p.vendor_credit_number}</span></td>
                  <td style={tdStyle}>{new Date(p.vendor_credit_date).toLocaleDateString()}</td>
                  <td style={tdStyle}>{getVendorName(p.vendor_id)}</td>
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
                    ) : expandedVC ? (
                      <div style={{ padding: "20px 25px", background: "#fff", borderTop: "1px solid #e2e8f0", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.03)" }}>
                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
                          <button onClick={(e) => { e.stopPropagation(); openEmailModal(expandedVC); }} style={smallSecondaryBtn}>✉️ Send Email</button>
                          
                          {expandedVC.status === "Draft" && (
                            <button onClick={() => markOpen(p.id)} style={{ ...smallSecondaryBtn, background: "#cce5ff", color: "#004085" }}>Mark as Open</button>
                          )}
                          
                          {expandedVC.status !== "Cancelled" && parseFloat(expandedVC.applied_amount) === 0 && (
                            <button onClick={() => cancelVC(p.id)} style={{ ...smallSecondaryBtn, background: "#f8d7da", color: "#721c24" }}>Cancel</button>
                          )}

                          {expandedVC.status !== "Cancelled" && parseFloat(expandedVC.remaining_amount) > 0 && (
                             <button onClick={() => navigate(`/vendor-credits/${p.id}/document`)} style={{ ...smallSecondaryBtn, background: "#0c5460", color: "#fff", border: "none" }}>➕ Apply to Bill</button>
                          )}

                          {parseFloat(expandedVC.applied_amount) === 0 && (
                              <button onClick={() => navigate(`/vendor-credits/${p.id}/edit`)} style={{ ...smallSecondaryBtn, border: "1px solid #4a90e2", color: "#4a90e2" }}>Edit</button>
                          )}

                          <button onClick={() => navigate(`/vendor-credits/${p.id}/document`)} style={{ ...smallSecondaryBtn, border: "1px solid #28a745", color: "#28a745" }}>📄 Document</button>

                          {parseFloat(expandedVC.applied_amount) === 0 && (
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

                        {/* VC details */}
                        <div style={{ display: "flex", gap: "30px", marginBottom: "15px", fontSize: "14px" }}>
                          <div><strong>Vendor:</strong> {getVendorName(expandedVC.vendor_id)}</div>
                          <div><strong>Date:</strong> {new Date(expandedVC.vendor_credit_date).toLocaleDateString()}</div>
                          <div><strong>Reference #:</strong> {expandedVC.reference_number || "—"}</div>
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
                                    <span>SubTotal</span><span>₹{parseFloat(expandedVC.subtotal).toFixed(2)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                    <span>Applied Amount</span><span style={{ color: "#d9534f" }}>-₹{parseFloat(expandedVC.applied_amount).toFixed(2)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", borderTop: "1px solid #ccc", paddingTop: "4px" }}>
                                    <span>Remaining</span><span>₹{parseFloat(expandedVC.remaining_amount).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {expandedVC.reason && <div style={{ marginBottom: "10px", fontSize: "14px" }}><strong>Reason:</strong> {expandedVC.reason}</div>}
                        {expandedVC.notes && <div style={{ marginBottom: "10px", fontSize: "14px" }}><strong>Notes:</strong> {expandedVC.notes}</div>}
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
      {showEmailModal && expandedVC && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ marginTop: 0 }}>Send Vendor Credit via Email</h3>
            <div style={{ marginBottom: "15px" }}><label><strong>To:</strong></label>
              <input type="email" value={getVendorById(expandedVC.vendor_id).email || ""} readOnly style={{ ...inputStyle, background: "#f9f9f9" }} /></div>
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

export default VendorCredits;
