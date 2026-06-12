/**
 * Quotes.js – Quote list with search/filter, expanded status badges,
 * inline expandable detail, send email, convert to invoice.
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiRequest } from "./api";
import { TableSkeleton, DetailSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

const ORG_NAME = "Tinplate Computer Training Center";

const STATUS_COLORS = {
  draft:    { bg: "#e2e3e5", color: "#383d41" },
  sent:     { bg: "#fff3cd", color: "#856404" },
  accepted: { bg: "#d4edda", color: "#155724" },
  declined: { bg: "#f8d7da", color: "#721c24" },
  expired:  { bg: "#fce4ec", color: "#b71c1c" },
  invoiced: { bg: "#d1ecf1", color: "#0c5460" },
};

function Quotes() {
  const navigate = useNavigate();
  const location = useLocation();

  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [expandedId, setExpandedId] = useState(null);
  const [expandedQuote, setExpandedQuote] = useState(null);
  const [expandedItems, setExpandedItems] = useState([]);
  const [expandedLoading, setExpandedLoading] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [menuOpenFor, setMenuOpenFor] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [quotesRes, customersRes] = await Promise.all([
        apiRequest("/quotes"),
        apiRequest("/customers"),
      ]);
      setQuotes(Array.isArray(quotesRes?.quotes) ? quotesRes.quotes : []);
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

  // Filter quotes
  const filteredQuotes = quotes.filter(q => {
    const matchSearch = search === "" ||
      (q.quote_number || "").toLowerCase().includes(search.toLowerCase()) ||
      getCustomerName(q.customer_id).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleExpand = async (quoteId) => {
    if (expandedId === quoteId) { setExpandedId(null); setExpandedQuote(null); setExpandedItems([]); return; }
    setExpandedId(quoteId);
    setExpandedLoading(true);
    try {
      const res = await apiRequest(`/quotes/${quoteId}`);
      if (res?.quote) { setExpandedQuote(res.quote); setExpandedItems(res.items || []); }
    } catch (err) { toast.error("Failed to load quote details"); setExpandedId(null); }
    finally { setExpandedLoading(false); }
  };

  const changeStatus = async (quoteId, newStatus) => {
    try {
      await apiRequest(`/quotes/${quoteId}`, { method: "PUT", body: JSON.stringify({ status: newStatus }) });
      toast.success(`Quote marked as ${newStatus}`);
      setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: newStatus } : q));
      if (expandedQuote?.id === quoteId) setExpandedQuote({ ...expandedQuote, status: newStatus });
    } catch (err) { toast.error("Failed to update status"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this quote?")) return;
    try {
      await apiRequest(`/quotes/${id}`, { method: "DELETE" });
      toast.success("Quote deleted");
      if (expandedId === id) { setExpandedId(null); setExpandedQuote(null); setExpandedItems([]); }
      fetchData();
    } catch (err) { toast.error("Delete failed"); }
  };

  const handleConvertToInvoice = async (quoteId) => {
    if (!window.confirm("Convert this quote to an invoice?")) return;
    try {
      const res = await apiRequest(`/quotes/${quoteId}/convert-to-invoice`, { method: "POST" });
      if (res?.alreadyConverted) {
        toast("Already converted. Opening existing invoice.", { icon: "ℹ️" });
        navigate(`/invoices/${res.invoiceId}`);
        return;
      }
      toast.success("Quote converted to invoice!");
      setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: "invoiced" } : q));
      if (expandedQuote?.id === quoteId) setExpandedQuote(prev => ({ ...prev, status: "invoiced" }));
      navigate(`/invoices/${res.invoiceId}`);
    } catch (err) { toast.error("Conversion failed"); }
  };

  const handleConvertToSalesOrder = async (quoteId) => {
    if (!window.confirm("Convert this quote to a Sales Order?")) return;
    try {
      const res = await apiRequest(`/sales-orders/from-quote/${quoteId}`, { method: "POST" });
      if (res?.alreadyConverted) {
        toast("Already converted. Opening existing Sales Order.", { icon: "ℹ️" });
        navigate(`/sales-orders/${res.salesOrderId}/document`);
        return;
      }
      toast.success("Quote converted to Sales Order!");
      setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: "accepted" } : q));
      if (expandedQuote?.id === quoteId) setExpandedQuote(prev => ({ ...prev, status: "accepted" }));
      navigate(`/sales-orders/${res.salesOrderId}/document`);
    } catch (err) { toast.error("Conversion failed"); }
  };

  const openEmailModal = (quote) => {
    const cust = getCustomerById(quote.customer_id);
    setEmailSubject(`Quote ${quote.quote_number} from ${ORG_NAME}`);
    setEmailBody(`Dear ${cust.display_name || "Customer"},\n\nPlease find your quote attached.\n\nQuote Number: ${quote.quote_number}\nTotal: ₹${parseFloat(quote.total_amount).toFixed(2)}\n\nThank you for your business.\n\nRegards,\n${ORG_NAME}`);
    setShowEmailModal(true);
  };

  const sendEmailAndMarkSent = async () => {
    const quote = expandedQuote;
    if (!quote) return;
    try {
      await apiRequest(`/quotes/${quote.id}/send`, {
        method: "POST",
        body: JSON.stringify({ to: getCustomerById(quote.customer_id).email || "", subject: emailSubject, body: emailBody }),
      });
      toast.success("Email sent & quote marked as sent");
      setShowEmailModal(false);
      changeStatus(quote.id, "sent");
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
        <h2>All Quotes</h2>
        <button onClick={() => navigate("/quotes/new")} style={primaryBtn}>+ New Quote</button>
      </div>

      {/* Search & Filter */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap" }}>
        <input type="text" placeholder="Search by quote # or customer..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: "300px" }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, maxWidth: "160px" }}>
          <option value="all">All Status</option>
          <option value="draft">Draft</option><option value="sent">Sent</option>
          <option value="accepted">Accepted</option><option value="declined">Declined</option>
          <option value="expired">Expired</option><option value="invoiced">Invoiced</option>
        </select>
      </div>

      {loading ? <TableSkeleton columns={5} rows={4} /> : filteredQuotes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "gray" }}>
          <p>No quotes found.</p>
          <button onClick={() => navigate("/quotes/new")} style={{ ...primaryBtn, marginTop: "15px" }}>+ New Quote</button>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={thStyle}>Quote #</th><th style={thStyle}>Date</th>
              <th style={thStyle}>Customer</th><th style={thStyle}>Status</th><th style={thStyle}>Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuotes.map(q => (
              <React.Fragment key={q.id}>
                <tr style={{ borderBottom: "1px solid #e2e8f0", cursor: "pointer" }} onClick={() => toggleExpand(q.id)}>
                  <td style={tdStyle}><span style={{ color: "#4a90e2", textDecoration: "underline" }}>{q.quote_number}</span></td>
                  <td style={tdStyle}>{new Date(q.quote_date).toLocaleDateString()}</td>
                  <td style={tdStyle}>{getCustomerName(q.customer_id)}</td>
                  <td style={tdStyle}>{statusBadge(q.status)}</td>
                  <td style={tdStyle}>₹{parseFloat(q.total_amount).toFixed(2)}</td>
                </tr>

                {expandedId === q.id && (
                  <tr><td colSpan={5} style={{ padding: "0" }}>
                    {expandedLoading ? (
                      <div style={{ padding: "30px", background: "#f9fafb" }}>
                        <DetailSkeleton />
                      </div>
                    ) : expandedQuote ? (
                      <div style={{ padding: "20px 25px", background: "#fff", borderTop: "1px solid #e2e8f0", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.03)" }}>
                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
                          <button onClick={(e) => { e.stopPropagation(); openEmailModal(expandedQuote); }} style={smallSecondaryBtn}>✉️ Send Email</button>
                          {expandedQuote.status !== "sent" && <button onClick={() => changeStatus(q.id, "sent")} style={smallSecondaryBtn}>Mark Sent</button>}
                          {expandedQuote.status !== "accepted" && <button onClick={() => changeStatus(q.id, "accepted")} style={{ ...smallSecondaryBtn, background: "#d4edda", color: "#155724" }}>Accept</button>}
                          {expandedQuote.status !== "declined" && <button onClick={() => changeStatus(q.id, "declined")} style={{ ...smallSecondaryBtn, background: "#f8d7da", color: "#721c24" }}>Decline</button>}
                          {expandedQuote.status !== "declined" && expandedQuote.status !== "invoiced" && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleConvertToSalesOrder(q.id); }}
                                style={{ ...smallSecondaryBtn, background: "#17a2b8", color: "#fff", border: "none" }}
                              >
                                🔄 Convert to Sales Order
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleConvertToInvoice(q.id); }}
                                style={{ ...smallSecondaryBtn, background: "#28a745", color: "#fff", border: "none" }}
                              >
                                🔄 Convert to Invoice
                              </button>
                            </>
                          )}
                          {expandedQuote.status === "invoiced" && (
                            <span style={{ fontSize: "13px", color: "#0c5460", background: "#d1ecf1", padding: "6px 12px", borderRadius: "5px", fontWeight: "500" }}>
                              ✅ Invoiced
                            </span>
                          )}
                          <button onClick={() => navigate(`/quotes/${q.id}`)} style={{ ...smallSecondaryBtn, border: "1px solid #4a90e2", color: "#4a90e2" }}>Edit</button>
                          <button onClick={() => navigate(`/quotes/${q.id}/document`)} style={{ ...smallSecondaryBtn, border: "1px solid #28a745", color: "#28a745" }}>📄 Document</button>

                          <div style={{ position: "relative" }}>
                            <button onClick={() => setMenuOpenFor(menuOpenFor === q.id ? null : q.id)} style={smallSecondaryBtn}>⋯</button>
                            {menuOpenFor === q.id && (
                              <div style={dropdownMenuStyle}>
                                <button style={menuItemStyle} onClick={() => { setMenuOpenFor(null); handleDelete(q.id); }}>🗑️ Delete</button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quote details */}
                        <div style={{ display: "flex", gap: "30px", marginBottom: "15px", fontSize: "14px" }}>
                          <div><strong>Customer:</strong> {getCustomerName(expandedQuote.customer_id)}</div>
                          <div><strong>Date:</strong> {new Date(expandedQuote.quote_date).toLocaleDateString()}</div>
                          <div><strong>Expiry:</strong> {expandedQuote.expiry_date ? new Date(expandedQuote.expiry_date).toLocaleDateString() : "—"}</div>
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
                            <span>Total (₹)</span><span>₹{parseFloat(expandedQuote.total_amount).toFixed(2)}</span>
                          </div>
                        </div>
                        {expandedQuote.notes && <div style={{ marginBottom: "10px", fontSize: "14px" }}><strong>Notes:</strong> {expandedQuote.notes}</div>}
                        {expandedQuote.terms && <div style={{ fontSize: "14px" }}><strong>Terms:</strong> {expandedQuote.terms}</div>}
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
      {showEmailModal && expandedQuote && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ marginTop: 0 }}>Send Quote via Email</h3>
            <div style={{ marginBottom: "15px" }}><label><strong>To:</strong></label>
              <input type="email" value={getCustomerById(expandedQuote.customer_id).email || ""} readOnly style={{ ...inputStyle, background: "#f9f9f9" }} /></div>
            <div style={{ marginBottom: "15px" }}><label><strong>Subject:</strong></label>
              <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} style={inputStyle} /></div>
            <div style={{ marginBottom: "20px" }}><label><strong>Message:</strong></label>
              <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={6} style={inputStyle} /></div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowEmailModal(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={sendEmailAndMarkSent} style={primaryBtn}>Send & Mark as Sent</button>
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

export default Quotes;
