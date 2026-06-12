/**
 * SalesOrders.js – Sales Order list with search/filter, expanded status badges,
 * inline expandable detail, send email, convert to invoice.
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiRequest } from "./api";
import { TableSkeleton, DetailSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

const ORG_NAME = "Tinplate Computer Training Center";

const STATUS_COLORS = {
  draft:     { bg: "#e2e3e5", color: "#383d41" },
  confirmed: { bg: "#d4edda", color: "#155724" },
  invoiced:  { bg: "#d1ecf1", color: "#0c5460" },
  cancelled: { bg: "#f8d7da", color: "#721c24" },
};

function SalesOrders() {
  const navigate = useNavigate();
  const location = useLocation();

  const [salesOrders, setSalesOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [expandedId, setExpandedId] = useState(null);
  const [expandedSO, setExpandedSO] = useState(null);
  const [expandedItems, setExpandedItems] = useState([]);
  const [expandedLoading, setExpandedLoading] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [menuOpenFor, setMenuOpenFor] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [soRes, customersRes] = await Promise.all([
        apiRequest("/sales-orders"),
        apiRequest("/customers"),
      ]);
      setSalesOrders(Array.isArray(soRes?.sales_orders) ? soRes.sales_orders : []);
      setCustomers(Array.isArray(customersRes?.customers) ? customersRes.customers : []);
    } catch (err) { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData, location.state?.refresh]);

  const getCustomerName = (customerId) => {
    if (!customerId) return "—";
    const cust = customers.find(c => c.id === customerId);
    return cust ? cust.display_name || [cust.first_name, cust.last_name].filter(Boolean).join(" ") || cust.email : "—";
  };

  const getCustomerById = (customerId) => customers.find(c => c.id === customerId) || {};

  // Filter SOs
  const filteredSOs = salesOrders.filter(so => {
    const matchSearch = search === "" ||
      (so.sales_order_number || "").toLowerCase().includes(search.toLowerCase()) ||
      getCustomerName(so.customer_id).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || so.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleExpand = async (soId) => {
    if (expandedId === soId) { setExpandedId(null); setExpandedSO(null); setExpandedItems([]); return; }
    setExpandedId(soId);
    setExpandedLoading(true);
    try {
      const res = await apiRequest(`/sales-orders/${soId}`);
      if (res?.sales_order) { setExpandedSO(res.sales_order); setExpandedItems(res.items || []); }
    } catch (err) { toast.error("Failed to load details"); setExpandedId(null); }
    finally { setExpandedLoading(false); }
  };

  const changeStatus = async (soId, newStatus) => {
    try {
      await apiRequest(`/sales-orders/${soId}`, { method: "PUT", body: JSON.stringify({ status: newStatus }) });
      toast.success(`Marked as ${newStatus}`);
      setSalesOrders(prev => prev.map(s => s.id === soId ? { ...s, status: newStatus } : s));
      if (expandedSO?.id === soId) setExpandedSO({ ...expandedSO, status: newStatus });
    } catch (err) { toast.error("Failed to update status"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this sales order?")) return;
    try {
      await apiRequest(`/sales-orders/${id}`, { method: "DELETE" });
      toast.success("Sales Order deleted");
      if (expandedId === id) { setExpandedId(null); setExpandedSO(null); setExpandedItems([]); }
      fetchData();
    } catch (err) { toast.error("Delete failed"); }
  };

  const handleConvertToInvoice = async (soId) => {
    if (!window.confirm("Convert this Sales Order to an invoice?")) return;
    try {
      const res = await apiRequest(`/sales-orders/${soId}/convert-to-invoice`, { method: "POST" });
      if (res?.alreadyConverted) {
        toast("Already converted. Opening existing invoice.", { icon: "ℹ️" });
        navigate(`/invoices/${res.invoiceId}`);
        return;
      }
      toast.success("Sales Order converted to invoice!");
      setSalesOrders(prev => prev.map(s => s.id === soId ? { ...s, status: "invoiced" } : s));
      if (expandedSO?.id === soId) setExpandedSO(prev => ({ ...prev, status: "invoiced" }));
      navigate(`/invoices/${res.invoiceId}`);
    } catch (err) { toast.error("Conversion failed"); }
  };

  const handleConvertToDeliveryChallan = async (soId) => {
    if (!window.confirm("Convert this Sales Order to a Delivery Challan?")) return;
    try {
      const res = await apiRequest(`/delivery-challans/from-sales-order/${soId}`, { method: "POST" });
      if (res?.alreadyConverted) {
        toast("Already converted. Opening existing challan.", { icon: "ℹ️" });
        navigate(`/delivery-challans/${res.deliveryChallanId}/edit`);
        return;
      }
      toast.success("Sales Order converted to Delivery Challan!");
      navigate(`/delivery-challans/${res.deliveryChallanId}/edit`);
    } catch (err) { toast.error("Conversion failed"); }
  };

  const openEmailModal = (so) => {
    const cust = getCustomerById(so.customer_id);
    setEmailSubject(`Sales Order ${so.sales_order_number} from ${ORG_NAME}`);
    setEmailBody(`Dear ${cust.display_name || "Customer"},\n\nPlease find your Sales Order attached.\n\nSales Order Number: ${so.sales_order_number}\nTotal: ₹${parseFloat(so.total_amount).toFixed(2)}\n\nThank you for your business.\n\nRegards,\n${ORG_NAME}`);
    setShowEmailModal(true);
  };

  const sendEmailAndMarkSent = async () => {
    const so = expandedSO;
    if (!so) return;
    try {
      await apiRequest(`/sales-orders/${so.id}/send`, {
        method: "POST",
        body: JSON.stringify({ to: getCustomerById(so.customer_id).email || "", subject: emailSubject, body: emailBody }),
      });
      toast.success("Email sent!");
      setShowEmailModal(false);
      if (so.status === "draft") changeStatus(so.id, "confirmed");
    } catch (err) { toast.error("Failed to send email"); }
  };

  const statusBadge = (status) => {
    const colors = STATUS_COLORS[status] || STATUS_COLORS.draft;
    return (
      <span style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "500", background: colors.bg, color: colors.color, textTransform: "capitalize" }}>
        {status}
      </span>
    );
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1100px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>All Sales Orders</h2>
        <button onClick={() => navigate("/sales-orders/new")} style={primaryBtn}>+ New Sales Order</button>
      </div>

      {/* Search & Filter */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap" }}>
        <input type="text" placeholder="Search by SO # or customer..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: "300px" }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, maxWidth: "160px" }}>
          <option value="all">All Status</option>
          <option value="draft">Draft</option><option value="confirmed">Confirmed</option>
          <option value="invoiced">Invoiced</option><option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? <TableSkeleton columns={5} rows={4} /> : filteredSOs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "gray" }}>
          <p>No Sales Orders found.</p>
          <button onClick={() => navigate("/sales-orders/new")} style={{ ...primaryBtn, marginTop: "15px" }}>+ New Sales Order</button>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={thStyle}>Sales Order #</th><th style={thStyle}>Date</th>
              <th style={thStyle}>Customer</th><th style={thStyle}>Status</th><th style={thStyle}>Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredSOs.map(s => (
              <React.Fragment key={s.id}>
                <tr style={{ borderBottom: "1px solid #e2e8f0", cursor: "pointer" }} onClick={() => toggleExpand(s.id)}>
                  <td style={tdStyle}><span style={{ color: "#4a90e2", textDecoration: "underline" }}>{s.sales_order_number}</span></td>
                  <td style={tdStyle}>{new Date(s.sales_order_date).toLocaleDateString()}</td>
                  <td style={tdStyle}>{getCustomerName(s.customer_id)}</td>
                  <td style={tdStyle}>{statusBadge(s.status)}</td>
                  <td style={tdStyle}>₹{parseFloat(s.total_amount).toFixed(2)}</td>
                </tr>

                {expandedId === s.id && (
                  <tr><td colSpan={5} style={{ padding: "0" }}>
                    {expandedLoading ? (
                      <div style={{ padding: "30px", background: "#f9fafb" }}>
                        <DetailSkeleton />
                      </div>
                    ) : expandedSO ? (
                      <div style={{ padding: "20px 25px", background: "#fff", borderTop: "1px solid #e2e8f0", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.03)" }}>
                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
                          <button onClick={(e) => { e.stopPropagation(); openEmailModal(expandedSO); }} style={smallSecondaryBtn}>✉️ Send Email</button>
                          {expandedSO.status !== "confirmed" && expandedSO.status !== "invoiced" && <button onClick={() => changeStatus(s.id, "confirmed")} style={{ ...smallSecondaryBtn, background: "#d4edda", color: "#155724" }}>Confirm</button>}
                          {expandedSO.status !== "cancelled" && <button onClick={() => changeStatus(s.id, "cancelled")} style={{ ...smallSecondaryBtn, background: "#f8d7da", color: "#721c24" }}>Cancel</button>}
                          {expandedSO.status !== "cancelled" && expandedSO.status !== "invoiced" && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleConvertToDeliveryChallan(s.id); }}
                                style={{ ...smallSecondaryBtn, background: "#17a2b8", color: "#fff", border: "none" }}
                              >
                                🚚 Convert to Challan
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleConvertToInvoice(s.id); }}
                                style={{ ...smallSecondaryBtn, background: "#28a745", color: "#fff", border: "none" }}
                              >
                                🔄 Convert to Invoice
                              </button>
                            </>
                          )}
                          {expandedSO.status === "invoiced" && (
                            <span style={{ fontSize: "13px", color: "#0c5460", background: "#d1ecf1", padding: "6px 12px", borderRadius: "5px", fontWeight: "500" }}>
                              ✅ Invoiced
                            </span>
                          )}
                          <button onClick={() => navigate(`/sales-orders/${s.id}/edit`)} style={{ ...smallSecondaryBtn, border: "1px solid #4a90e2", color: "#4a90e2" }}>Edit</button>
                          <button onClick={() => navigate(`/sales-orders/${s.id}/document`)} style={{ ...smallSecondaryBtn, border: "1px solid #28a745", color: "#28a745" }}>📄 Document</button>

                          <div style={{ position: "relative" }}>
                            <button onClick={() => setMenuOpenFor(menuOpenFor === s.id ? null : s.id)} style={smallSecondaryBtn}>⋯</button>
                            {menuOpenFor === s.id && (
                              <div style={dropdownMenuStyle}>
                                <button style={menuItemStyle} onClick={() => { setMenuOpenFor(null); handleDelete(s.id); }}>🗑️ Delete</button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* SO details */}
                        <div style={{ display: "flex", gap: "30px", marginBottom: "15px", fontSize: "14px" }}>
                          <div><strong>Customer:</strong> {getCustomerName(expandedSO.customer_id)}</div>
                          <div><strong>Date:</strong> {new Date(expandedSO.sales_order_date).toLocaleDateString()}</div>
                          <div><strong>Shipment:</strong> {expandedSO.expected_shipment_date ? new Date(expandedSO.expected_shipment_date).toLocaleDateString() : "—"}</div>
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
                                <td style={tdStyle}>{item.unit_price}</td>
                                <td style={tdStyle}>₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}</td>
                              </tr>
                            )) : <tr><td colSpan={4} style={tdStyle}>No items</td></tr>}
                          </tbody>
                        </table>

                        <div style={{ marginBottom: "15px", fontSize: "14px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                            <span>Total (₹)</span><span>₹{parseFloat(expandedSO.total_amount).toFixed(2)}</span>
                          </div>
                        </div>
                        {expandedSO.notes && <div style={{ marginBottom: "10px", fontSize: "14px" }}><strong>Notes:</strong> {expandedSO.notes}</div>}
                        {expandedSO.terms && <div style={{ fontSize: "14px" }}><strong>Terms:</strong> {expandedSO.terms}</div>}
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
      {showEmailModal && expandedSO && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ marginTop: 0 }}>Send Sales Order via Email</h3>
            <div style={{ marginBottom: "15px" }}><label><strong>To:</strong></label>
              <input type="email" value={getCustomerById(expandedSO.customer_id).email || ""} readOnly style={{ ...inputStyle, background: "#f9f9f9" }} /></div>
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

export default SalesOrders;
