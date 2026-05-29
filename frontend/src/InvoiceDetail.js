import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [fetching, setFetching] = useState(true);

  // Modals & Menu
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await apiRequest(`/invoices/${id}`);
        if (!res?.invoice) {
          toast.error("Invoice not found");
          navigate("/invoices");
          return;
        }
        setInvoice(res.invoice);
        setItems(res.items || []);
        if (res.invoice.customer_id) {
          const custRes = await apiRequest(`/customers/${res.invoice.customer_id}`);
          if (custRes?.customer) setCustomer(custRes.customer);
        }
      } catch (err) {
        toast.error("Failed to load invoice");
      } finally {
        setFetching(false);
      }
    };
    fetchInvoice();
  }, [id, navigate]);

  const changeStatus = async (newStatus) => {
    try {
      await apiRequest(`/invoices/${id}`, { method: "PUT", body: JSON.stringify({ status: newStatus }) });
      setInvoice({ ...invoice, status: newStatus });
      toast.success(`Invoice marked as ${newStatus}`);
    } catch (err) { toast.error("Failed to update status"); }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this invoice?")) return;
    try {
      await apiRequest(`/invoices/${id}`, { method: "DELETE" });
      toast.success("Invoice deleted");
      navigate("/invoices");
    } catch (err) { toast.error("Delete failed"); }
  };

  const openEmailModal = () => {
    setEmailSubject(`Invoice ${invoice.invoice_number || ""} from Thesis International College`);
    setEmailBody(`Dear ${customer?.display_name || "Customer"},\n\nPlease find your invoice attached.\n\nInvoice Number: ${invoice.invoice_number}\nTotal: ₹${parseFloat(invoice.total_amount).toFixed(2)}\n\nThank you for your business.\n\nRegards,\nThesis International College`);
    setShowEmailModal(true);
  };

  const sendEmailAndMarkSent = async () => {
    try {
      await apiRequest(`/invoices/${id}/send`, {
        method: "POST",
        body: JSON.stringify({ to: customer?.email || "", subject: emailSubject, body: emailBody }),
      });
      toast.success("Email sent!");
      setShowEmailModal(false);
      if (invoice.status === "draft") changeStatus("sent");
    } catch (err) { toast.error("Failed to send email"); }
  };

  const handleRecordPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) { toast.error("Enter a valid amount"); return; }
    try {
      const res = await apiRequest(`/invoices/${id}/payments`, {
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
      setInvoice({ ...invoice, balance_due: newBalance, status: newBalance <= 0 ? "paid" : "partially_paid" });
      setShowPaymentModal(false);
    } catch (err) { toast.error("Failed to record payment"); }
  };

  if (fetching) return <div style={{ padding: "50px", textAlign: "center" }}>Loading…</div>;
  if (!invoice) return null;

  const total = parseFloat(invoice.total_amount) || 0;
  const balanceDue = parseFloat(invoice.balance_due) || 0;
  let totalWords = "";
  try {
    totalWords = require("number-to-words").toWords(Math.floor(total));
    totalWords = totalWords.charAt(0).toUpperCase() + totalWords.slice(1);
  } catch (e) {
    totalWords = total.toFixed(0);
  }

  // Determine Ribbon color
  const statusColors = {
    draft: "#8e99a3",
    sent: "#f39c12",
    unpaid: "#e67e22",
    partially_paid: "#3498db",
    paid: "#2ecc71",
    overdue: "#e74c3c",
    cancelled: "#95a5a6",
  };
  const ribbonColor = statusColors[invoice.status] || statusColors.draft;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f9f9fb" }}>
      {/* Top Action Bar */}
      <div style={{ display: "flex", gap: "10px", padding: "15px 30px", background: "#fff", borderBottom: "1px solid #e2e8f0", alignItems: "center" }}>
        <h2 style={{ margin: "0 20px 0 0", fontSize: "18px" }}>{invoice.invoice_number || `INV-000${invoice.id}`}</h2>
        
        <button onClick={() => navigate(`/invoices/${id}/edit`)} style={actionBtn}>✎ Edit</button>
        <button onClick={openEmailModal} style={actionBtn}>✉ Send</button>
        <button onClick={() => window.print()} style={actionBtn}>📄 PDF/Print</button>
        <button onClick={() => setShowPaymentModal(true)} style={actionBtn}>💰 Record Payment</button>
        
        <div style={{ position: "relative" }}>
          <button onClick={() => setMenuOpen(!menuOpen)} style={actionBtn}>⋯</button>
          {menuOpen && (
            <div style={{ position: "absolute", top: "100%", right: 0, background: "#fff", border: "1px solid #ccc", borderRadius: "4px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)", zIndex: 10, minWidth: "120px" }}>
              <button onClick={() => { setMenuOpen(false); handleDelete(); }} style={{ display: "block", width: "100%", padding: "10px", border: "none", background: "none", textAlign: "left", cursor: "pointer", color: "red" }}>Delete</button>
            </div>
          )}
        </div>
      </div>

      {/* Document Area */}
      <div style={{ padding: "40px 20px", overflowY: "auto", flex: 1 }}>
        <div style={{ position: "relative", maxWidth: "800px", margin: "auto", background: "#fff", boxShadow: "0 0 10px rgba(0,0,0,0.1)", padding: "40px", fontFamily: "Arial, sans-serif", color: "#333" }}>
          
          {/* Ribbon */}
          <div style={{ position: "absolute", top: 0, left: 0, width: "110px", height: "110px", overflow: "hidden" }}>
            <div style={{ background: ribbonColor, color: "#fff", textAlign: "center", padding: "5px", transform: "rotate(-45deg)", position: "absolute", top: "20px", left: "-35px", width: "150px", fontWeight: "bold", fontSize: "13px", letterSpacing: "1px", textTransform: "capitalize" }}>
              {invoice.status?.replace("_", " ")}
            </div>
          </div>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
            <div style={{ fontSize: "13px", lineHeight: "1.5" }}>
              <h3 style={{ margin: "0 0 5px 0", fontSize: "18px" }}>Thesis International College</h3>
              <div>Jharkhand</div>
              <div>India</div>
              <div>91-9065329152</div>
              <div>pritishakumari555@gmail.com</div>
            </div>
            <div style={{ fontSize: "32px", color: "#333", alignSelf: "flex-end" }}>
              TAX INVOICE
            </div>
          </div>

          {/* Bordered Box Container */}
          <div style={{ border: "1px solid #a3a3a3" }}>
            
            {/* Meta Row */}
            <div style={{ display: "flex", borderBottom: "1px solid #a3a3a3" }}>
              <div style={{ width: "50%", borderRight: "1px solid #a3a3a3", padding: "10px", fontSize: "13px" }}>
                <table style={{ width: "100%" }}>
                  <tbody>
                    <tr><td style={{ width: "120px", padding: "3px 0" }}>#</td><td>: {invoice.invoice_number}</td></tr>
                    <tr><td style={{ padding: "3px 0" }}>Invoice Date</td><td>: {new Date(invoice.invoice_date).toLocaleDateString("en-IN")}</td></tr>
                    <tr><td style={{ padding: "3px 0" }}>Terms</td><td>: {invoice.terms || "Due on Receipt"}</td></tr>
                    <tr><td style={{ padding: "3px 0" }}>Due Date</td><td>: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("en-IN") : "—"}</td></tr>
                  </tbody>
                </table>
              </div>
              <div style={{ width: "50%" }}></div>
            </div>

            {/* Bill To */}
            <div style={{ background: "#f5f6f8", padding: "6px 10px", borderBottom: "1px solid #a3a3a3", fontSize: "13px", fontWeight: "bold" }}>
              Bill To
            </div>
            <div style={{ padding: "10px", borderBottom: "1px solid #a3a3a3", fontSize: "13px", minHeight: "60px" }}>
              <div style={{ color: "#2275d7", fontWeight: "bold", fontSize: "14px", marginBottom: "4px" }}>
                {customer?.display_name || "Customer"}
              </div>
              {customer?.email && <div>{customer.email}</div>}
              {customer?.phone && <div>{customer.phone}</div>}
            </div>

            {/* Items Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#fdfdfd" }}>
                  <th style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3", textAlign: "left" }}>#</th>
                  <th style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3", textAlign: "left" }}>Item & Description</th>
                  <th style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3", textAlign: "right" }}>Qty</th>
                  <th style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3", textAlign: "right" }}>Rate</th>
                  <th style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3", textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3" }}>{idx + 1}</td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3" }}>
                      {item.item_name || item.description || "—"}
                    </td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3", textAlign: "right" }}>
                      {parseFloat(item.quantity).toFixed(2)}
                    </td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3", textAlign: "right" }}>
                      {parseFloat(item.unit_price).toFixed(2)}
                    </td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3", textAlign: "right" }}>
                      {(parseFloat(item.quantity) * parseFloat(item.unit_price)).toFixed(2)}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} style={{ padding: "10px", borderBottom: "1px solid #a3a3a3", textAlign: "center" }}>No items</td></tr>
                )}
              </tbody>
            </table>

            {/* Footer Row */}
            <div style={{ display: "flex", fontSize: "13px" }}>
              {/* Left Side (Words & Notes) */}
              <div style={{ flex: 1, borderRight: "1px solid #a3a3a3", padding: "15px" }}>
                <div style={{ marginBottom: "5px" }}>Total In Words</div>
                <div style={{ fontStyle: "italic", fontWeight: "bold", marginBottom: "20px" }}>
                  Indian Rupee {totalWords} Only
                </div>
                <div style={{ marginBottom: "5px" }}>Notes</div>
                <div>{invoice.notes || "Thanks for your business."}</div>
              </div>
              
              {/* Right Side (Totals) */}
              <div style={{ width: "350px", display: "flex", flexDirection: "column" }}>
                <div style={{ borderBottom: "1px solid #a3a3a3", padding: "15px" }}>
                  <table style={{ width: "100%" }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: "4px 0", textAlign: "right", paddingRight: "20px" }}>Sub Total</td>
                        <td style={{ padding: "4px 0", textAlign: "right", width: "100px" }}>{total.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 0", textAlign: "right", paddingRight: "20px", fontWeight: "bold" }}>Total</td>
                        <td style={{ padding: "4px 0", textAlign: "right", fontWeight: "bold" }}>₹{total.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 0", textAlign: "right", paddingRight: "20px", fontWeight: "bold" }}>Balance Due</td>
                        <td style={{ padding: "4px 0", textAlign: "right", fontWeight: "bold" }}>₹{balanceDue.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {/* Signature */}
                <div style={{ padding: "15px", flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                  Authorized Signature
                </div>
              </div>
            </div>

          </div>

          <div style={{ textAlign: "right", marginTop: "15px", fontSize: "11px", color: "#666" }}>
            1
          </div>
        </div>
      </div>

      {/* Modals */}
      {showPaymentModal && (
        <div style={modalOverlay}><div style={{ ...modalBox, width: "450px" }}>
          <h3 style={{ marginTop: 0 }}>Record Payment</h3>
          <div style={{ marginBottom: "15px" }}><label>Amount</label>
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
            <input type="text" value={paymentReference} onChange={e => setPaymentReference(e.target.value)} style={inputStyle} /></div>
          <div style={{ marginBottom: "20px" }}><label>Notes</label>
            <textarea value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} rows={2} style={inputStyle} /></div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button onClick={() => setShowPaymentModal(false)} style={cancelBtnStyle}>Cancel</button>
            <button onClick={handleRecordPayment} style={primaryBtn}>Record Payment</button>
          </div>
        </div></div>
      )}

      {showEmailModal && (
        <div style={modalOverlay}><div style={modalBox}>
          <h3 style={{ marginTop: 0 }}>Send Invoice</h3>
          <div style={{ marginBottom: "15px" }}><label>To</label><input type="email" value={customer?.email || ""} readOnly style={{ ...inputStyle, background: "#eee" }} /></div>
          <div style={{ marginBottom: "15px" }}><label>Subject</label><input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} style={inputStyle} /></div>
          <div style={{ marginBottom: "20px" }}><label>Message</label><textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={5} style={inputStyle} /></div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button onClick={() => setShowEmailModal(false)} style={cancelBtnStyle}>Cancel</button>
            <button onClick={sendEmailAndMarkSent} style={primaryBtn}>Send</button>
          </div>
        </div></div>
      )}
    </div>
  );
}

const actionBtn = {
  background: "#f3f4f6", border: "1px solid #d1d5db", padding: "6px 12px", borderRadius: "4px",
  cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", gap: "5px"
};
const inputStyle = { width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc", boxSizing: "border-box" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" };
const cancelBtnStyle = { padding: "10px 20px", background: "#ccc", color: "#333", border: "none", borderRadius: "5px", cursor: "pointer" };
const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalBox = { background: "#fff", borderRadius: "8px", padding: "25px", width: "500px", maxWidth: "90%" };

export default InvoiceDetail;