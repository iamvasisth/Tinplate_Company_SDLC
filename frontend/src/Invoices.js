/**
 * Invoices.js – Invoice list with search/filter, expanded status badges,
 * inline expandable detail, send email modal, record payment modal.
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

const ORG_NAME = "Tinplate Computer Training Center";

const STATUS_COLORS = {
  draft:          { bg: "#e2e3e5", color: "#383d41" },
  sent:           { bg: "#fff3cd", color: "#856404" },
  unpaid:         { bg: "#ffeeba", color: "#856404" },
  partially_paid: { bg: "#d1ecf1", color: "#0c5460" },
  paid:           { bg: "#d4edda", color: "#155724" },
  overdue:        { bg: "#f8d7da", color: "#721c24" },
  cancelled:      { bg: "#e2e3e5", color: "#6c757d" },
};

function Invoices() {
  const navigate = useNavigate();
  const location = useLocation();

  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [expandedId, setExpandedId] = useState(null);
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [expandedItems, setExpandedItems] = useState([]);
  const [expandedLoading, setExpandedLoading] = useState(false);

  // Email modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const [menuOpenFor, setMenuOpenFor] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [invRes, custRes] = await Promise.all([
        apiRequest("/invoices"),
        apiRequest("/customers"),
      ]);
      setInvoices(invRes?.invoices || []);
      setCustomers(custRes?.customers || []);
    } catch (err) { toast.error("Failed to load invoices"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData, location.state?.refresh]);

  const getCustomerName = (customerId) => {
    if (!customerId) return "—";
    const cust = customers.find(c => c.id === customerId);
    return cust ? cust.display_name || [cust.first_name, cust.last_name].filter(Boolean).join(" ") || cust.email : "—";
  };

  const getCustomerById = (customerId) => customers.find(c => c.id === customerId) || {};

  const filteredInvoices = invoices.filter(inv => {
    const matchSearch = search === "" ||
      (inv.invoice_number || "").toLowerCase().includes(search.toLowerCase()) ||
      getCustomerName(inv.customer_id).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleExpand = async (invId) => {
    if (expandedId === invId) { setExpandedId(null); setExpandedInvoice(null); setExpandedItems([]); return; }
    setExpandedId(invId);
    setExpandedLoading(true);
    try {
      const res = await apiRequest(`/invoices/${invId}`);
      if (res?.invoice) { setExpandedInvoice(res.invoice); setExpandedItems(res.items || []); }
    } catch (err) { toast.error("Failed to load invoice details"); setExpandedId(null); }
    finally { setExpandedLoading(false); }
  };

  const changeStatus = async (invId, newStatus) => {
    try {
      await apiRequest(`/invoices/${invId}`, { method: "PUT", body: JSON.stringify({ status: newStatus }) });
      toast.success(`Invoice marked as ${newStatus}`);
      setInvoices(prev => prev.map(i => i.id === invId ? { ...i, status: newStatus } : i));
      if (expandedInvoice?.id === invId) setExpandedInvoice({ ...expandedInvoice, status: newStatus });
    } catch (err) { toast.error("Failed to update status"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this invoice?")) return;
    try {
      await apiRequest(`/invoices/${id}`, { method: "DELETE" });
      toast.success("Invoice deleted");
      if (expandedId === id) { setExpandedId(null); setExpandedInvoice(null); setExpandedItems([]); }
      fetchData();
    } catch (err) { toast.error("Delete failed"); }
  };

  const openEmailModal = (invoice) => {
    const cust = getCustomerById(invoice.customer_id);
    setEmailSubject(`Invoice ${invoice.invoice_number} from ${ORG_NAME}`);
    setEmailBody(`Dear ${cust.display_name || "Customer"},\n\nPlease find your invoice attached.\n\nInvoice Number: ${invoice.invoice_number}\nTotal: ₹${parseFloat(invoice.total_amount).toFixed(2)}\n\nThank you for your business.\n\nRegards,\n${ORG_NAME}`);
    setShowEmailModal(true);
  };

  const sendEmailAndMarkSent = async () => {
    if (!expandedInvoice) return;
    try {
      await apiRequest(`/invoices/${expandedInvoice.id}/send`, {
        method: "POST",
        body: JSON.stringify({ to: getCustomerById(expandedInvoice.customer_id).email || "", subject: emailSubject, body: emailBody }),
      });
      toast.success("Email sent & invoice marked as sent");
      setShowEmailModal(false);
      changeStatus(expandedInvoice.id, "sent");
    } catch (err) { toast.error("Failed to send email"); }
  };

  const handleRecordPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) { toast.error("Enter a valid amount"); return; }
    if (!expandedInvoice) return;
    try {
      const res = await apiRequest(`/invoices/${expandedInvoice.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: parseFloat(paymentAmount),
          payment_date: paymentDate,
          payment_mode: paymentMode,
          reference: paymentReference,
          notes: paymentNotes,
        }),
      });
      toast.success("Payment recorded");
      const newBalance = res.newBalanceDue;
      if (newBalance <= 0) changeStatus(expandedInvoice.id, "paid");
      setShowPaymentModal(false);
      setPaymentAmount(""); setPaymentReference(""); setPaymentNotes("");
    } catch (err) { toast.error("Failed to record payment"); }
  };

  const statusBadge = (status) => {
    const colors = STATUS_COLORS[status] || STATUS_COLORS.draft;
    return (
      <span style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "500", background: colors.bg, color: colors.color, textTransform: "capitalize" }}>
        {status?.replace("_", " ")}
      </span>
    );
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1100px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Invoices</h2>
        <button onClick={() => navigate("/invoices/new")} style={primaryBtn}>+ New Invoice</button>
      </div>

      {/* Search & Filter */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap" }}>
        <input type="text" placeholder="Search by invoice # or customer..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: "300px" }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, maxWidth: "170px" }}>
          <option value="all">All Status</option>
          <option value="draft">Draft</option><option value="sent">Sent</option>
          <option value="unpaid">Unpaid</option><option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option><option value="overdue">Overdue</option><option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? <p>Loading...</p> : filteredInvoices.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "gray" }}>
          <p>No invoices found.</p>
          <button onClick={() => navigate("/invoices/new")} style={{ ...primaryBtn, marginTop: "15px" }}>+ New Invoice</button>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={thStyle}>Invoice #</th><th style={thStyle}>Date</th>
              <th style={thStyle}>Customer</th><th style={thStyle}>Status</th><th style={thStyle}>Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map(inv => (
              <React.Fragment key={inv.id}>
                <tr style={{ borderBottom: "1px solid #e2e8f0", cursor: "pointer" }} onClick={() => toggleExpand(inv.id)}>
                  <td style={tdStyle}><span style={{ color: "#4a90e2", textDecoration: "underline" }}>{inv.invoice_number}</span></td>
                  <td style={tdStyle}>{new Date(inv.invoice_date).toLocaleDateString()}</td>
                  <td style={tdStyle}>{getCustomerName(inv.customer_id)}</td>
                  <td style={tdStyle}>{statusBadge(inv.status)}</td>
                  <td style={tdStyle}>₹{parseFloat(inv.total_amount).toFixed(2)}</td>
                </tr>

                {expandedId === inv.id && (
                  <tr><td colSpan={5} style={{ padding: 0 }}>
                    {expandedLoading ? (
                      <div style={{ padding: "20px", background: "#f9fafb", textAlign: "center" }}>Loading...</div>
                    ) : expandedInvoice ? (
                      <div style={{ padding: "20px 25px", background: "#fff", borderTop: "1px solid #e2e8f0", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.03)" }}>
                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
                          <button onClick={(e) => { e.stopPropagation(); openEmailModal(expandedInvoice); }} style={smallSecondaryBtn}>✉️ Send Email</button>
                          <button onClick={(e) => { e.stopPropagation(); setShowPaymentModal(true); }} style={{ ...smallSecondaryBtn, background: "#28a745", color: "#fff", border: "none" }}>💰 Record Payment</button>
                          {expandedInvoice.status !== "paid" && (
                            <button onClick={() => changeStatus(inv.id, "paid")} style={{ ...smallSecondaryBtn, background: "#d4edda", color: "#155724" }}>Mark Paid</button>
                          )}
                          {expandedInvoice.status !== "sent" && (
                            <button onClick={() => changeStatus(inv.id, "sent")} style={smallSecondaryBtn}>Mark Sent</button>
                          )}
                          <button onClick={() => navigate(`/invoices/${inv.id}`)} style={{ ...smallSecondaryBtn, border: "1px solid #4a90e2", color: "#4a90e2" }}>Edit</button>
                          <button onClick={() => navigate(`/invoices/${inv.id}/document`)} style={{ ...smallSecondaryBtn, border: "1px solid #28a745", color: "#28a745" }}>📄 Document</button>

                          <div style={{ position: "relative" }}>
                            <button onClick={(e) => { e.stopPropagation(); setMenuOpenFor(menuOpenFor === inv.id ? null : inv.id); }} style={smallSecondaryBtn}>⋯</button>
                            {menuOpenFor === inv.id && (
                              <div style={dropdownMenuStyle}>
                                <button style={menuItemStyle} onClick={() => { setMenuOpenFor(null); changeStatus(inv.id, "cancelled"); }}>❌ Cancel</button>
                                <button style={menuItemStyle} onClick={() => { setMenuOpenFor(null); handleDelete(inv.id); }}>🗑️ Delete</button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Invoice details */}
                        <div style={{ display: "flex", gap: "30px", marginBottom: "15px", fontSize: "14px" }}>
                          <div><strong>Customer:</strong> {getCustomerName(expandedInvoice.customer_id)}</div>
                          <div><strong>Date:</strong> {new Date(expandedInvoice.invoice_date).toLocaleDateString()}</div>
                          <div><strong>Due:</strong> {expandedInvoice.due_date ? new Date(expandedInvoice.due_date).toLocaleDateString() : "—"}</div>
                          <div><strong>Balance Due:</strong> <span style={{ color: parseFloat(expandedInvoice.balance_due) <= 0 ? "green" : "red" }}>₹{parseFloat(expandedInvoice.balance_due || 0).toFixed(2)}</span></div>
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
                            <span>Total</span><span>₹{parseFloat(expandedInvoice.total_amount).toFixed(2)}</span>
                          </div>
                        </div>
                        {expandedInvoice.notes && <div style={{ marginBottom: "10px", fontSize: "14px" }}><strong>Notes:</strong> {expandedInvoice.notes}</div>}
                        {expandedInvoice.terms && <div style={{ fontSize: "14px" }}><strong>Terms:</strong> {expandedInvoice.terms}</div>}
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
      {showEmailModal && expandedInvoice && (
        <div style={modalOverlay}><div style={modalBox}>
          <h3 style={{ marginTop: 0 }}>Send Invoice via Email</h3>
          <div style={{ marginBottom: "15px" }}><label><strong>To:</strong></label>
            <input type="email" value={getCustomerById(expandedInvoice.customer_id).email || ""} readOnly style={{ ...inputStyle, background: "#f9f9f9" }} /></div>
          <div style={{ marginBottom: "15px" }}><label><strong>Subject:</strong></label>
            <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} style={inputStyle} /></div>
          <div style={{ marginBottom: "20px" }}><label><strong>Message:</strong></label>
            <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={6} style={inputStyle} /></div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button onClick={() => setShowEmailModal(false)} style={cancelBtnStyle}>Cancel</button>
            <button onClick={sendEmailAndMarkSent} style={primaryBtn}>Send & Mark as Sent</button>
          </div>
        </div></div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && expandedInvoice && (
        <div style={modalOverlay}><div style={{ ...modalBox, width: "450px" }}>
          <h3 style={{ marginTop: 0 }}>Record Payment</h3>
          <div style={{ marginBottom: "15px" }}><label>Amount *</label>
            <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} style={inputStyle} /></div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
            <div style={{ flex: 1 }}><label>Date</label><input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} style={inputStyle} /></div>
            <div style={{ flex: 1 }}><label>Mode</label>
              <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} style={inputStyle}>
                <option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option><option value="cheque">Cheque</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: "15px" }}><label>Reference</label>
            <input type="text" value={paymentReference} onChange={e => setPaymentReference(e.target.value)} style={inputStyle} placeholder="Transaction ID / Cheque #" /></div>
          <div style={{ marginBottom: "20px" }}><label>Notes</label>
            <textarea value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} rows={2} style={inputStyle} /></div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button onClick={() => setShowPaymentModal(false)} style={cancelBtnStyle}>Cancel</button>
            <button onClick={handleRecordPayment} style={primaryBtn}>Record Payment</button>
          </div>
        </div></div>
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

export default Invoices;
