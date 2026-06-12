import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { TableSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function PaymentsReceived() {
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
      const res = await apiRequest("/payments");
      setPayments(res?.payments || []);
    } catch (err) {
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const term = search.toLowerCase();
    const custName = p.customer_name?.toLowerCase() || "";
    const invNum = p.invoice_number?.toLowerCase() || "";
    const ref = p.reference?.toLowerCase() || "";
    return custName.includes(term) || invNum.includes(term) || ref.includes(term);
  });

  return (
    <div style={{ padding: "30px", maxWidth: "1200px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Payments Received</h2>
        <button onClick={() => navigate("/payments-received/new")} style={primaryBtn}>+ New</button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search by customer, invoice, or reference..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: "400px" }}
        />
      </div>

      {loading ? (
        <TableSkeleton columns={9} rows={5} />
      ) : filteredPayments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px", color: "gray", background: "#f9fafb", borderRadius: "8px" }}>
          <p>No payments recorded yet.</p>
          <button onClick={() => navigate("/payments-received/new")} style={secondaryBtn}>Record a Payment</button>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <thead>
              <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Payment #</th>
                <th style={thStyle}>Reference Number</th>
                <th style={thStyle}>Customer Name</th>
                <th style={thStyle}>Invoice #</th>
                <th style={thStyle}>Mode</th>
                <th style={{...thStyle, textAlign: "right"}}>Amount</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(payment => (
                <tr key={payment.id} style={{ borderBottom: "1px solid #e2e8f0", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#f8fafc"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                  <td style={tdStyle}>{new Date(payment.payment_date).toLocaleDateString("en-IN")}</td>
                  <td style={tdStyle}>PAY-{String(payment.id).padStart(5, '0')}</td>
                  <td style={tdStyle}>{payment.reference || "—"}</td>
                  <td style={tdStyle}>{payment.customer_name || "—"}</td>
                  <td onClick={() => navigate(`/invoices/${payment.invoice_id}`)} style={{...tdStyle, color: "#2563eb", cursor: "pointer"}}>{payment.invoice_number || "—"}</td>
                  <td style={{ ...tdStyle, textTransform: "capitalize" }}>{payment.payment_mode || "Cash"}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600" }}>₹{parseFloat(payment.amount).toFixed(2)}</td>
                  <td style={{ ...tdStyle, textTransform: "capitalize" }}>
                    <span style={{ padding: "4px 8px", background: "#d1fae5", color: "#065f46", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
                      {payment.status || "Received"}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => navigate(`/invoices/${payment.invoice_id}`)} style={{ border: "none", background: "none", color: "#2563eb", cursor: "pointer" }}>View Invoice</button>
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

export default PaymentsReceived;
