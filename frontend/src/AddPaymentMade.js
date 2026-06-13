import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { FormSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function AddPaymentMade() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [bills, setBills] = useState([]);

  const [vendorId, setVendorId] = useState("");
  const [billId, setBillId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState("Bank Transfer");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    Promise.all([fetchVendors(), fetchBills()]).finally(() => setFetching(false));
  }, []);

  const fetchVendors = async () => {
    try {
      const res = await apiRequest("/vendors");
      setVendors(res?.vendors || []);
    } catch (err) {
      toast.error("Failed to load vendors");
    }
  };

  const fetchBills = async () => {
    try {
      const res = await apiRequest("/bills");
      setBills(res?.bills || []);
    } catch (err) {
      toast.error("Failed to load bills");
    }
  };

  const selectedBill = bills.find(b => b.id === parseInt(billId));
  const maxAmount = selectedBill ? parseFloat(selectedBill.balance_due) : 0;

  // Filter bills to only show unpaid/partially paid bills for the selected vendor
  const availableBills = bills.filter(b => 
    b.vendor_id === parseInt(vendorId) && 
    parseFloat(b.balance_due) > 0 && 
    b.status !== "draft"
  );

  const handleSave = async (e) => {
    e.preventDefault();

    if (!vendorId) return toast.error("Please select a vendor");
    if (!billId) return toast.error("Please select a bill");
    
    const payAmount = parseFloat(amount);
    if (!payAmount || payAmount <= 0) return toast.error("Amount must be greater than 0");
    if (payAmount > maxAmount) return toast.error(`Amount cannot exceed the balance due of ₹${maxAmount}`);

    setLoading(true);
    try {
      const payload = {
        vendor_id: vendorId,
        bill_id: billId,
        amount: payAmount,
        payment_date: paymentDate,
        payment_mode: paymentMode,
        reference_number: referenceNumber,
        notes
      };

      await apiRequest("/payments-made", { method: "POST", body: JSON.stringify(payload) });
      toast.success("Payment recorded successfully");
      navigate("/payments-made");
    } catch (err) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div style={{ padding: "30px", maxWidth: "800px", margin: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2>Record Payment Made</h2>
          <button onClick={() => navigate("/payments-made")} style={secondaryBtn}>Back to List</button>
        </div>
        <FormSkeleton fields={4} />
      </div>
    );
  }

  return (
    <div style={{ padding: "30px", maxWidth: "800px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Record Payment Made</h2>
        <button onClick={() => navigate("/payments-made")} style={secondaryBtn}>Back to List</button>
      </div>

      <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <form onSubmit={handleSave}>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label style={labelStyle}>Vendor *</label>
              <select value={vendorId} onChange={e => { setVendorId(e.target.value); setBillId(""); setAmount(""); }} style={inputStyle} required>
                <option value="">Select Vendor</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.display_name || v.first_name || v.email}</option>
                ))}
              </select>
            </div>
            
            {vendorId && (
              <div>
                <label style={labelStyle}>Bill *</label>
                <select value={billId} onChange={e => {
                  setBillId(e.target.value);
                  const b = availableBills.find(x => x.id === parseInt(e.target.value));
                  if (b) setAmount(b.balance_due);
                }} style={inputStyle} required>
                  <option value="">Select Bill</option>
                  {availableBills.map(b => (
                    <option key={b.id} value={b.id}>{b.bill_number} (Due: ₹{b.balance_due})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {selectedBill && (
            <div style={{ background: "#f8fafc", padding: "15px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "20px", display: "flex", justifyContent: "space-between" }}>
              <div>
                <p style={{ margin: "0 0 5px 0", color: "#64748b", fontSize: "12px" }}>Bill Total</p>
                <p style={{ margin: 0, fontWeight: "600", fontSize: "16px" }}>₹{parseFloat(selectedBill.total).toFixed(2)}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: "0 0 5px 0", color: "#64748b", fontSize: "12px" }}>Balance Due</p>
                <p style={{ margin: 0, fontWeight: "bold", fontSize: "16px", color: "#dc2626" }}>₹{parseFloat(selectedBill.balance_due).toFixed(2)}</p>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label style={labelStyle}>Payment Amount (₹) *</label>
              <input type="number" step="0.01" min="0.01" max={maxAmount} value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} required disabled={!billId} />
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
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
                <option value="Card">Card</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Reference Number</label>
              <input type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: "30px" }}>
            <label style={labelStyle}>Notes (Internal)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={inputStyle}></textarea>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" onClick={() => navigate("/payments-made")} style={secondaryBtn}>Cancel</button>
            <button type="submit" disabled={loading || !billId} style={{...primaryBtn, opacity: (loading || !billId) ? 0.5 : 1}}>
              {loading ? "Saving..." : "Save Payment"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

const inputStyle = { width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" };
const labelStyle = { display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px", color: "#334155" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" };
const secondaryBtn = { padding: "10px 20px", background: "#f1f5f9", color: "#333", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer" };

export default AddPaymentMade;
