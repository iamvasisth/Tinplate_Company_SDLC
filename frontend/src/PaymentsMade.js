import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { TableSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function PaymentsMade() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await apiRequest("/payments-made");
      setPayments(res?.payments || []);
    } catch (err) {
      toast.error("Failed to load payments made");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payment? The bill balance will be restored.")) return;
    try {
      await apiRequest(`/payments-made/${id}`, { method: "DELETE" });
      toast.success("Payment deleted");
      fetchPayments();
    } catch (err) {
      toast.error(err.message || "Failed to delete payment");
    }
  };

  const filteredPayments = payments.filter(p => {
    const term = search.toLowerCase();
    const vName = p.vendor_name?.toLowerCase() || "";
    const bNum = p.bill_number?.toLowerCase() || "";
    const rNum = p.reference_number?.toLowerCase() || "";
    return vName.includes(term) || bNum.includes(term) || rNum.includes(term);
  });

  return (
    <div style={{ padding: "30px", maxWidth: "1200px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Payments Made</h2>
        <button onClick={() => navigate("/payments-made/new")} style={primaryBtn}>+ Record Payment</button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <input 
          type="text" 
          placeholder="Search by vendor, bill, or reference..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          style={{ ...inputStyle, maxWidth: "400px" }} 
        />
      </div>

      {loading ? (
        <TableSkeleton columns={9} rows={5} />
      ) : payments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px", color: "gray", background: "#f9fafb", borderRadius: "8px" }}>
          <p>No payments made found.</p>
          <button onClick={() => navigate("/payments-made/new")} style={secondaryBtn}>Record Payment</button>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <thead>
              <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Payment #</th>
                <th style={thStyle}>Reference Number</th>
                <th style={thStyle}>Vendor Name</th>
                <th style={thStyle}>Bill #</th>
                <th style={thStyle}>Mode</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(payment => (
                <tr key={payment.id} style={{ borderBottom: "1px solid #e2e8f0", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#f8fafc"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                  <td style={tdStyle}>{new Date(payment.payment_date).toLocaleDateString("en-IN")}</td>
                  <td style={tdStyle}>PAY-{payment.id.toString().padStart(5, '0')}</td>
                  <td style={tdStyle}>{payment.reference_number || "—"}</td>
                  <td style={{ ...tdStyle, color: "#2563eb", fontWeight: "500" }}>{payment.vendor_name || "—"}</td>
                  <td style={tdStyle}>{payment.bill_number || "—"}</td>
                  <td style={tdStyle}>{payment.payment_mode || "—"}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600", color: "#334155" }}>₹{parseFloat(payment.amount).toFixed(2)}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: "4px 8px", background: "#d1fae5", color: "#065f46", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
                      Paid
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => handleDelete(payment.id)} style={{...actionBtn, color: "#dc2626"}}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle = { padding: "12px", borderBottom: "2px solid #cbd5e1" };
const tdStyle = { padding: "12px" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" };
const secondaryBtn = { padding: "10px 20px", background: "#f1f5f9", color: "#333", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer" };
const inputStyle = { width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" };
const actionBtn = { background: "none", border: "none", color: "#2563eb", cursor: "pointer", marginRight: "10px", fontWeight: "500" };

export default PaymentsMade;
