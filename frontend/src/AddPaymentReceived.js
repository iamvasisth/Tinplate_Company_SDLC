import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { FormSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function AddPaymentReceived() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  
  const [customerId, setCustomerId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    // Fetch customers on load
    apiRequest("/customers")
      .then(res => setCustomers(res?.customers || []))
      .catch(() => toast.error("Failed to load customers"))
      .finally(() => setFetching(false));
  }, []);

  useEffect(() => {
    if (customerId) {
      // Fetch invoices for this customer
      apiRequest("/invoices")
        .then(res => {
          if (res?.invoices) {
             const custInvoices = res.invoices.filter(i => 
               String(i.customer_id) === String(customerId) && 
               Number(i.balance_due) > 0
             );
             setInvoices(custInvoices);
          }
        })
        .catch(() => toast.error("Failed to load invoices"));
    } else {
      setInvoices([]);
    }
    setInvoiceId("");
    setAmount("");
  }, [customerId]);

  useEffect(() => {
    if (invoiceId) {
      const inv = invoices.find(i => String(i.id) === String(invoiceId));
      if (inv) {
        setAmount(inv.balance_due);
      }
    } else {
      setAmount("");
    }
  }, [invoiceId, invoices]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!invoiceId) return toast.error("Please select an invoice");
    if (!amount || parseFloat(amount) <= 0) return toast.error("Please enter a valid amount");
    
    const inv = invoices.find(i => String(i.id) === String(invoiceId));
    if (inv && parseFloat(amount) > parseFloat(inv.balance_due)) {
       return toast.error(`Amount cannot exceed balance due (₹${parseFloat(inv.balance_due).toFixed(2)})`);
    }

    setLoading(true);
    try {
      await apiRequest(`/invoices/${invoiceId}/payments`, {
        method: "POST",
        body: JSON.stringify({
          customer_id: parseInt(customerId),
          amount: parseFloat(amount),
          payment_date: paymentDate,
          payment_mode: paymentMode,
          reference: reference,
          notes: notes
        }),
      });
      toast.success("Payment recorded successfully");
      navigate("/payments-received");
    } catch (err) {
      toast.error("Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div style={{ maxWidth: "800px", margin: "auto", padding: "30px" }}>
        <h2 style={{ marginBottom: "25px" }}>Record Payment Received</h2>
        <FormSkeleton fields={4} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "auto", padding: "30px" }}>
      <h2 style={{ marginBottom: "25px" }}>Record Payment Received</h2>
      
      <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <form onSubmit={handleSave}>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label style={labelStyle}>Customer *</label>
              <select value={customerId} onChange={e => setCustomerId(e.target.value)} style={inputStyle} required>
                <option value="">Select customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.display_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={labelStyle}>Invoice *</label>
              <select value={invoiceId} onChange={e => setInvoiceId(e.target.value)} style={inputStyle} required disabled={!customerId}>
                <option value="">Select invoice</option>
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {invoiceId && (() => {
            const selectedInv = invoices.find(i => String(i.id) === String(invoiceId));
            if (!selectedInv) return null;
            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px", background: "#f8fafc", padding: "15px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                <div>
                  <label style={{...labelStyle, color: "#64748b"}}>Invoice Total</label>
                  <div style={{ fontSize: "16px", fontWeight: "bold", color: "#334155" }}>₹{parseFloat(selectedInv.total_amount).toFixed(2)}</div>
                </div>
                <div>
                  <label style={{...labelStyle, color: "#64748b"}}>Current Balance Due</label>
                  <div style={{ fontSize: "16px", fontWeight: "bold", color: "#dc2626" }}>₹{parseFloat(selectedInv.balance_due).toFixed(2)}</div>
                </div>
              </div>
            );
          })()}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label style={labelStyle}>Amount Received (₹) *</label>
              <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Payment Date *</label>
              <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} style={inputStyle} required />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label style={labelStyle}>Payment Mode</label>
              <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} style={inputStyle}>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="credit_card">Credit Card</option>
                <option value="upi">UPI</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Reference Number</label>
              <input type="text" value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g., Transaction ID" style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: "30px" }}>
            <label style={labelStyle}>Notes (Internal)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={inputStyle}></textarea>
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
            <button type="button" onClick={() => navigate("/payments-received")} style={cancelBtn}>Cancel</button>
            <button type="submit" disabled={loading} style={primaryBtn}>{loading ? "Saving..." : "Save Payment"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle = { width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" };
const labelStyle = { display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px", color: "#334155" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" };
const cancelBtn = { padding: "10px 20px", background: "#f1f5f9", color: "#333", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer" };

export default AddPaymentReceived;
