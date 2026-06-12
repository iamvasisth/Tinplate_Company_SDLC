/**
 * DeliveryChallans.js – Delivery Challans list with search/filter, expanded status badges,
 * inline expandable detail, send email, mark delivered, convert to invoice.
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiRequest } from "./api";
import { TableSkeleton, DetailSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

const ORG_NAME = "Tinplate Computer Training Center";

const STATUS_COLORS = {
  Draft:     { bg: "#e2e3e5", color: "#383d41" },
  Delivered: { bg: "#d4edda", color: "#155724" },
  Cancelled: { bg: "#f8d7da", color: "#721c24" },
};

function DeliveryChallans() {
  const navigate = useNavigate();
  const location = useLocation();

  const [challans, setChallans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [expandedId, setExpandedId] = useState(null);
  const [expandedDC, setExpandedDC] = useState(null);
  const [expandedItems, setExpandedItems] = useState([]);
  const [expandedLoading, setExpandedLoading] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [menuOpenFor, setMenuOpenFor] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dcRes, custRes] = await Promise.all([
        apiRequest("/delivery-challans"),
        apiRequest("/customers"),
      ]);
      setChallans(Array.isArray(dcRes?.delivery_challans) ? dcRes.delivery_challans : []);
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

  // Filter DCs
  const filteredDCs = challans.filter(dc => {
    const matchSearch = search === "" ||
      (dc.delivery_challan_number || "").toLowerCase().includes(search.toLowerCase()) ||
      getCustomerName(dc.customer_id).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || dc.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleExpand = async (dcId) => {
    if (expandedId === dcId) { setExpandedId(null); setExpandedDC(null); setExpandedItems([]); return; }
    setExpandedId(dcId);
    setExpandedLoading(true);
    try {
      const res = await apiRequest(`/delivery-challans/${dcId}`);
      if (res?.delivery_challan) { setExpandedDC(res.delivery_challan); setExpandedItems(res.items || []); }
    } catch (err) { toast.error("Failed to load details"); setExpandedId(null); }
    finally { setExpandedLoading(false); }
  };

  const markDelivered = async (dcId) => {
    if (!window.confirm("Mark as Delivered? This will officially reduce stock from inventory. This action cannot be undone.")) return;
    try {
      const res = await apiRequest(`/delivery-challans/${dcId}/mark-delivered`, { method: "PATCH" });
      if (res?.message) {
          toast.success(res.message);
          setChallans(prev => prev.map(p => p.id === dcId ? { ...p, status: "Delivered", stock_reduced: true } : p));
          if (expandedDC?.id === dcId) setExpandedDC({ ...expandedDC, status: "Delivered", stock_reduced: true });
      }
    } catch (err) { 
        toast.error(err.message || "Failed to mark delivered"); 
    }
  };

  const cancelDC = async (dcId) => {
    if (!window.confirm("Cancel this delivery challan?")) return;
    try {
      await apiRequest(`/delivery-challans/${dcId}/cancel`, { method: "PATCH" });
      toast.success("Delivery Challan cancelled");
      setChallans(prev => prev.map(p => p.id === dcId ? { ...p, status: "Cancelled" } : p));
      if (expandedDC?.id === dcId) setExpandedDC({ ...expandedDC, status: "Cancelled" });
    } catch (err) { toast.error(err.message || "Failed to cancel"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this Delivery Challan?")) return;
    try {
      await apiRequest(`/delivery-challans/${id}`, { method: "DELETE" });
      toast.success("Delivery Challan deleted");
      if (expandedId === id) { setExpandedId(null); setExpandedDC(null); setExpandedItems([]); }
      fetchData();
    } catch (err) { toast.error(err.message || "Delete failed"); }
  };

  const handleConvertToInvoice = async (dcId) => {
    if (!window.confirm("Convert this Delivery Challan to an Invoice?")) return;
    try {
      const res = await apiRequest(`/delivery-challans/${dcId}/convert-to-invoice`, { method: "POST" });
      if (res?.alreadyConverted) {
        toast("Already converted. Opening existing invoice.", { icon: "ℹ️" });
        navigate(`/invoices/${res.invoiceId}`);
        return;
      }
      toast.success("Delivery Challan converted to Invoice!");
      navigate(`/invoices/${res.invoiceId}`);
    } catch (err) { toast.error("Conversion failed"); }
  };

  const openEmailModal = (dc) => {
    const cust = getCustomerById(dc.customer_id);
    setEmailSubject(`Delivery Challan ${dc.delivery_challan_number} from ${ORG_NAME}`);
    setEmailBody(`Dear ${cust.display_name || cust.company_name || "Customer"},\n\nPlease find the attached Delivery Challan for your recent order.\n\nChallan Number: ${dc.delivery_challan_number}\n\nThank you.\n\nRegards,\n${ORG_NAME}`);
    setShowEmailModal(true);
  };

  const sendEmail = async () => {
    const dc = expandedDC;
    if (!dc) return;
    try {
      await apiRequest(`/delivery-challans/${dc.id}/send`, {
        method: "POST",
        body: JSON.stringify({ to: getCustomerById(dc.customer_id).email || "", subject: emailSubject, body: emailBody }),
      });
      toast.success("Email sent!");
      setShowEmailModal(false);
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
        <h2>All Delivery Challans</h2>
        <button onClick={() => navigate("/delivery-challans/new")} style={primaryBtn}>+ New Delivery Challan</button>
      </div>

      {/* Search & Filter */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap" }}>
        <input type="text" placeholder="Search by Challan # or customer..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: "300px" }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, maxWidth: "160px" }}>
          <option value="all">All Status</option>
          <option value="Draft">Draft</option><option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? <TableSkeleton columns={5} rows={4} /> : filteredDCs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "gray" }}>
          <p>No Delivery Challans found.</p>
          <button onClick={() => navigate("/delivery-challans/new")} style={{ ...primaryBtn, marginTop: "15px" }}>+ New Delivery Challan</button>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={thStyle}>Challan #</th><th style={thStyle}>Date</th>
              <th style={thStyle}>Customer</th><th style={thStyle}>Status</th><th style={thStyle}>Ref #</th>
            </tr>
          </thead>
          <tbody>
            {filteredDCs.map(p => (
              <React.Fragment key={p.id}>
                <tr style={{ borderBottom: "1px solid #e2e8f0", cursor: "pointer" }} onClick={() => toggleExpand(p.id)}>
                  <td style={tdStyle}><span style={{ color: "#4a90e2", textDecoration: "underline" }}>{p.delivery_challan_number}</span></td>
                  <td style={tdStyle}>{new Date(p.challan_date).toLocaleDateString()}</td>
                  <td style={tdStyle}>{getCustomerName(p.customer_id)}</td>
                  <td style={tdStyle}>{statusBadge(p.status)}</td>
                  <td style={tdStyle}>{p.reference_number || "—"}</td>
                </tr>

                {expandedId === p.id && (
                  <tr><td colSpan={5} style={{ padding: "0" }}>
                    {expandedLoading ? (
                      <div style={{ padding: "30px", background: "#f9fafb" }}>
                        <DetailSkeleton />
                      </div>
                    ) : expandedDC ? (
                      <div style={{ padding: "20px 25px", background: "#fff", borderTop: "1px solid #e2e8f0", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.03)" }}>
                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
                          <button onClick={(e) => { e.stopPropagation(); openEmailModal(expandedDC); }} style={smallSecondaryBtn}>✉️ Send Email</button>
                          
                          {expandedDC.status !== "Delivered" && expandedDC.status !== "Cancelled" && (
                            <button onClick={() => markDelivered(p.id)} style={{ ...smallSecondaryBtn, background: "#d4edda", color: "#155724" }}>✅ Mark Delivered</button>
                          )}
                          
                          {expandedDC.status !== "Cancelled" && !expandedDC.stock_reduced && (
                            <button onClick={() => cancelDC(p.id)} style={{ ...smallSecondaryBtn, background: "#f8d7da", color: "#721c24" }}>Cancel</button>
                          )}
                          
                          {expandedDC.status !== "Cancelled" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleConvertToInvoice(p.id); }}
                              style={{ ...smallSecondaryBtn, background: "#0c5460", color: "#fff", border: "none" }}
                            >
                              🔄 Convert to Invoice
                            </button>
                          )}

                          {!expandedDC.stock_reduced && (
                              <button onClick={() => navigate(`/delivery-challans/${p.id}/edit`)} style={{ ...smallSecondaryBtn, border: "1px solid #4a90e2", color: "#4a90e2" }}>Edit</button>
                          )}

                          <button onClick={() => navigate(`/delivery-challans/${p.id}/document`)} style={{ ...smallSecondaryBtn, border: "1px solid #28a745", color: "#28a745" }}>📄 Document</button>

                          {!expandedDC.stock_reduced && (
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

                        {/* DC details */}
                        <div style={{ display: "flex", gap: "30px", marginBottom: "15px", fontSize: "14px" }}>
                          <div><strong>Customer:</strong> {getCustomerName(expandedDC.customer_id)}</div>
                          <div><strong>Date:</strong> {new Date(expandedDC.challan_date).toLocaleDateString()}</div>
                          <div><strong>Sales Order:</strong> {expandedDC.sales_order_id ? `#${expandedDC.sales_order_id}` : "—"}</div>
                        </div>
                        {expandedDC.delivery_address && (
                            <div style={{ marginBottom: "15px", fontSize: "14px" }}>
                                <strong>Delivery Address:</strong> {expandedDC.delivery_address}
                            </div>
                        )}

                        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "15px", fontSize: "14px" }}>
                          <thead><tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                            <th style={thStyle}>Item</th><th style={thStyle}>Description</th><th style={{...thStyle, width:"100px", textAlign:"right"}}>Qty</th>
                          </tr></thead>
                          <tbody>
                            {expandedItems.length > 0 ? expandedItems.map((item, idx) => (
                              <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                <td style={tdStyle}>{item.item_name || "—"}</td>
                                <td style={tdStyle}>{item.description || "—"}</td>
                                <td style={{...tdStyle, textAlign:"right"}}>{parseFloat(item.quantity).toFixed(2)} {item.unit || ''}</td>
                              </tr>
                            )) : <tr><td colSpan={3} style={tdStyle}>No items</td></tr>}
                          </tbody>
                        </table>

                        {expandedDC.notes && <div style={{ marginBottom: "10px", fontSize: "14px" }}><strong>Notes:</strong> {expandedDC.notes}</div>}
                        {expandedDC.terms_conditions && <div style={{ fontSize: "14px" }}><strong>Terms:</strong> {expandedDC.terms_conditions}</div>}
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
      {showEmailModal && expandedDC && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ marginTop: 0 }}>Send Delivery Challan via Email</h3>
            <div style={{ marginBottom: "15px" }}><label><strong>To:</strong></label>
              <input type="email" value={getCustomerById(expandedDC.customer_id).email || ""} readOnly style={{ ...inputStyle, background: "#f9f9f9" }} /></div>
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

export default DeliveryChallans;
