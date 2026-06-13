/**
 * PurchaseOrders.js – Purchase Order list with search/filter, expanded status badges,
 * inline expandable detail, send email, convert to bill.
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiRequest } from "./api";
import { TableSkeleton, DetailSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

const ORG_NAME = "Tinplate Computer Training Center";

const STATUS_COLORS = {
  Draft:     { bg: "#e2e3e5", color: "#383d41" },
  Issued:    { bg: "#d4edda", color: "#155724" },
  Billed:    { bg: "#d1ecf1", color: "#0c5460" },
  Cancelled: { bg: "#f8d7da", color: "#721c24" },
};

function PurchaseOrders() {
  const navigate = useNavigate();
  const location = useLocation();

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [expandedId, setExpandedId] = useState(null);
  const [expandedPO, setExpandedPO] = useState(null);
  const [expandedItems, setExpandedItems] = useState([]);
  const [expandedLoading, setExpandedLoading] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [menuOpenFor, setMenuOpenFor] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [poRes, vendorsRes] = await Promise.all([
        apiRequest("/purchase-orders"),
        apiRequest("/vendors"),
      ]);
      setPurchaseOrders(Array.isArray(poRes?.purchase_orders) ? poRes.purchase_orders : []);
      setVendors(Array.isArray(vendorsRes?.vendors) ? vendorsRes.vendors : []);
    } catch (err) { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData, location.state?.refresh]);

  const getVendorName = (vendorId) => {
    if (!vendorId) return "—";
    const vend = vendors.find(v => v.id === vendorId);
    return vend ? vend.display_name || vend.company_name || vend.email : "—";
  };

  const getVendorById = (vendorId) => vendors.find(v => v.id === vendorId) || {};

  // Filter POs
  const filteredPOs = purchaseOrders.filter(po => {
    const matchSearch = search === "" ||
      (po.purchase_order_number || "").toLowerCase().includes(search.toLowerCase()) ||
      getVendorName(po.vendor_id).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || po.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleExpand = async (poId) => {
    if (expandedId === poId) { setExpandedId(null); setExpandedPO(null); setExpandedItems([]); return; }
    setExpandedId(poId);
    setExpandedLoading(true);
    try {
      const res = await apiRequest(`/purchase-orders/${poId}`);
      if (res?.purchase_order) { setExpandedPO(res.purchase_order); setExpandedItems(res.items || []); }
    } catch (err) { toast.error("Failed to load details"); setExpandedId(null); }
    finally { setExpandedLoading(false); }
  };

  const changeStatus = async (poId, newStatus) => {
    try {
      await apiRequest(`/purchase-orders/${poId}`, { method: "PUT", body: JSON.stringify({ status: newStatus }) });
      toast.success(`Marked as ${newStatus}`);
      setPurchaseOrders(prev => prev.map(p => p.id === poId ? { ...p, status: newStatus } : p));
      if (expandedPO?.id === poId) setExpandedPO({ ...expandedPO, status: newStatus });
    } catch (err) { toast.error("Failed to update status"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this purchase order?")) return;
    try {
      await apiRequest(`/purchase-orders/${id}`, { method: "DELETE" });
      toast.success("Purchase Order deleted");
      if (expandedId === id) { setExpandedId(null); setExpandedPO(null); setExpandedItems([]); }
      fetchData();
    } catch (err) { toast.error("Delete failed"); }
  };

  const handleConvertToBill = async (poId) => {
    if (!window.confirm("Convert this Purchase Order to a Bill?")) return;
    try {
      const res = await apiRequest(`/purchase-orders/${poId}/convert-to-bill`, { method: "POST" });
      if (res?.alreadyConverted) {
        toast("Already converted. Opening existing bill.", { icon: "ℹ️" });
        navigate(`/bills/${res.billId}`);
        return;
      }
      toast.success("Purchase Order converted to Bill!");
      setPurchaseOrders(prev => prev.map(p => p.id === poId ? { ...p, status: "Billed" } : p));
      if (expandedPO?.id === poId) setExpandedPO(prev => ({ ...prev, status: "Billed" }));
      navigate(`/bills/${res.billId}`);
    } catch (err) { toast.error("Conversion failed"); }
  };

  const openEmailModal = (po) => {
    const vend = getVendorById(po.vendor_id);
    setEmailSubject(`Purchase Order ${po.purchase_order_number} from ${ORG_NAME}`);
    setEmailBody(`Dear ${vend.display_name || vend.company_name || "Vendor"},\n\nPlease find our Purchase Order attached.\n\nPurchase Order Number: ${po.purchase_order_number}\nTotal: ₹${parseFloat(po.total_amount).toFixed(2)}\n\nThank you.\n\nRegards,\n${ORG_NAME}`);
    setShowEmailModal(true);
  };

  const sendEmailAndMarkSent = async () => {
    const po = expandedPO;
    if (!po) return;
    try {
      await apiRequest(`/purchase-orders/${po.id}/send`, {
        method: "POST",
        body: JSON.stringify({ to: getVendorById(po.vendor_id).email || "", subject: emailSubject, body: emailBody }),
      });
      toast.success("Email sent!");
      setShowEmailModal(false);
      if (po.status === "Draft") changeStatus(po.id, "Issued");
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
        <h2>All Purchase Orders</h2>
        <button onClick={() => navigate("/purchase-orders/new")} style={primaryBtn}>+ New Purchase Order</button>
      </div>

      {/* Search & Filter */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap" }}>
        <input type="text" placeholder="Search by PO # or vendor..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: "300px" }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, maxWidth: "160px" }}>
          <option value="all">All Status</option>
          <option value="Draft">Draft</option><option value="Issued">Issued</option>
          <option value="Billed">Billed</option><option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? <TableSkeleton columns={5} rows={4} /> : filteredPOs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "gray" }}>
          <p>No Purchase Orders found.</p>
          <button onClick={() => navigate("/purchase-orders/new")} style={{ ...primaryBtn, marginTop: "15px" }}>+ New Purchase Order</button>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={thStyle}>Purchase Order #</th><th style={thStyle}>Date</th>
              <th style={thStyle}>Vendor</th><th style={thStyle}>Status</th><th style={thStyle}>Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredPOs.map(p => (
              <React.Fragment key={p.id}>
                <tr style={{ borderBottom: "1px solid #e2e8f0", cursor: "pointer" }} onClick={() => toggleExpand(p.id)}>
                  <td style={tdStyle}><span style={{ color: "#4a90e2", textDecoration: "underline" }}>{p.purchase_order_number}</span></td>
                  <td style={tdStyle}>{new Date(p.purchase_order_date).toLocaleDateString()}</td>
                  <td style={tdStyle}>{getVendorName(p.vendor_id)}</td>
                  <td style={tdStyle}>{statusBadge(p.status)}</td>
                  <td style={tdStyle}>₹{parseFloat(p.total_amount).toFixed(2)}</td>
                </tr>

                {expandedId === p.id && (
                  <tr><td colSpan={5} style={{ padding: "0" }}>
                    {expandedLoading ? (
                      <div style={{ padding: "30px", background: "#f9fafb" }}>
                        <DetailSkeleton />
                      </div>
                    ) : expandedPO ? (
                      <div style={{ padding: "20px 25px", background: "#fff", borderTop: "1px solid #e2e8f0", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.03)" }}>
                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
                          <button onClick={(e) => { e.stopPropagation(); openEmailModal(expandedPO); }} style={smallSecondaryBtn}>✉️ Send Email</button>
                          {expandedPO.status !== "Issued" && expandedPO.status !== "Billed" && <button onClick={() => changeStatus(p.id, "Issued")} style={{ ...smallSecondaryBtn, background: "#d4edda", color: "#155724" }}>Issue</button>}
                          {expandedPO.status !== "Cancelled" && <button onClick={() => changeStatus(p.id, "Cancelled")} style={{ ...smallSecondaryBtn, background: "#f8d7da", color: "#721c24" }}>Cancel</button>}
                          {expandedPO.status !== "Cancelled" && expandedPO.status !== "Billed" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleConvertToBill(p.id); }}
                              style={{ ...smallSecondaryBtn, background: "#28a745", color: "#fff", border: "none" }}
                            >
                              🔄 Convert to Bill
                            </button>
                          )}
                          {expandedPO.status === "Billed" && (
                            <span style={{ fontSize: "13px", color: "#0c5460", background: "#d1ecf1", padding: "6px 12px", borderRadius: "5px", fontWeight: "500" }}>
                              ✅ Billed
                            </span>
                          )}
                          <button onClick={() => navigate(`/purchase-orders/${p.id}/edit`)} style={{ ...smallSecondaryBtn, border: "1px solid #4a90e2", color: "#4a90e2" }}>Edit</button>
                          <button onClick={() => navigate(`/purchase-orders/${p.id}/document`)} style={{ ...smallSecondaryBtn, border: "1px solid #28a745", color: "#28a745" }}>📄 Document</button>

                          <div style={{ position: "relative" }}>
                            <button onClick={() => setMenuOpenFor(menuOpenFor === p.id ? null : p.id)} style={smallSecondaryBtn}>⋯</button>
                            {menuOpenFor === p.id && (
                              <div style={dropdownMenuStyle}>
                                <button style={menuItemStyle} onClick={() => { setMenuOpenFor(null); handleDelete(p.id); }}>🗑️ Delete</button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* PO details */}
                        <div style={{ display: "flex", gap: "30px", marginBottom: "15px", fontSize: "14px" }}>
                          <div><strong>Vendor:</strong> {getVendorName(expandedPO.vendor_id)}</div>
                          <div><strong>Date:</strong> {new Date(expandedPO.purchase_order_date).toLocaleDateString()}</div>
                          <div><strong>Delivery:</strong> {expandedPO.expected_delivery_date ? new Date(expandedPO.expected_delivery_date).toLocaleDateString() : "—"}</div>
                        </div>

                        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "15px", fontSize: "14px" }}>
                          <thead><tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                            <th style={thStyle}>Item</th><th style={thStyle}>Qty</th><th style={thStyle}>Rate</th><th style={thStyle}>Amount</th>
                          </tr></thead>
                          <tbody>
                            {expandedItems.length > 0 ? expandedItems.map((item, idx) => (
                              <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                <td style={tdStyle}>{item.item_name || item.description}</td>
                                <td style={tdStyle}>{item.quantity}</td>
                                <td style={tdStyle}>{item.rate}</td>
                                <td style={tdStyle}>₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)).toFixed(2)}</td>
                              </tr>
                            )) : <tr><td colSpan={4} style={tdStyle}>No items</td></tr>}
                          </tbody>
                        </table>

                        <div style={{ marginBottom: "15px", fontSize: "14px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                            <span>Total (₹)</span><span>₹{parseFloat(expandedPO.total_amount).toFixed(2)}</span>
                          </div>
                        </div>
                        {expandedPO.notes && <div style={{ marginBottom: "10px", fontSize: "14px" }}><strong>Notes:</strong> {expandedPO.notes}</div>}
                        {expandedPO.terms_conditions && <div style={{ fontSize: "14px" }}><strong>Terms:</strong> {expandedPO.terms_conditions}</div>}
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
      {showEmailModal && expandedPO && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ marginTop: 0 }}>Send Purchase Order via Email</h3>
            <div style={{ marginBottom: "15px" }}><label><strong>To:</strong></label>
              <input type="email" value={getVendorById(expandedPO.vendor_id).email || ""} readOnly style={{ ...inputStyle, background: "#f9f9f9" }} /></div>
            <div style={{ marginBottom: "15px" }}><label><strong>Subject:</strong></label>
              <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} style={inputStyle} /></div>
            <div style={{ marginBottom: "20px" }}><label><strong>Message:</strong></label>
              <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={6} style={inputStyle} /></div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowEmailModal(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={sendEmailAndMarkSent} style={primaryBtn}>Send</button>
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

export default PurchaseOrders;
