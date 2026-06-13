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
    <div style={{ background: "#ffffff", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      
      {/* Top Header / Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #eaecf0", background: "#ffffff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1d2939", display: "flex", alignItems: "center", cursor: "pointer" }}>
            All Received Payments
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#006ee6" strokeWidth="2.5" style={{ marginLeft: "6px" }}><polyline points="6 9 12 15 18 9"></polyline></svg>
          </h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ position: "relative" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#98a2b3" strokeWidth="2" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}>
              <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search in Payments Received ( / )"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: "6px 12px 6px 30px",
                borderRadius: "4px",
                border: "1px solid #d0d5dd",
                fontSize: "13px",
                width: "220px",
                outline: "none",
                background: "#f9fafb"
              }}
            />
          </div>
          
          <button 
            onClick={() => navigate("/payments-received/new")} 
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "#006ee6", color: "#fff", border: "none", borderRadius: "4px", padding: "6px 14px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
          >
            + New
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: "0 24px" }}>
        {loading ? (
          <div style={{ marginTop: "20px" }}><TableSkeleton columns={9} rows={5} /></div>
        ) : filteredPayments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#667085", background: "#f9fafb", borderRadius: "8px", marginTop: "24px", border: "1px dashed #d0d5dd" }}>
            <p style={{ margin: "0 0 16px 0", fontSize: "14px" }}>No payments recorded yet.</p>
            <button onClick={() => navigate("/payments-received/new")} style={{ background: "#006ee6", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "4px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>Record a Payment</button>
          </div>
        ) : (
          <div style={{ overflowX: "auto", marginTop: "16px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", color: "#344054" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #eaecf0" }}>
                  <th style={{ width: "40px", padding: "10px 12px", textAlign: "center" }}>
                    <input type="checkbox" style={{ margin: 0 }} />
                  </th>
                  <th style={thStyle}>DATE</th>
                  <th style={thStyle}>PAYMENT #</th>
                  <th style={thStyle}>REFERENCE NUMBER</th>
                  <th style={thStyle}>CUSTOMER NAME</th>
                  <th style={thStyle}>INVOICE#</th>
                  <th style={thStyle}>MODE</th>
                  <th style={{...thStyle, textAlign: "right"}}>AMOUNT</th>
                  <th style={{...thStyle, textAlign: "right"}}>UNUSED AMOUNT</th>
                  <th style={thStyle}>STATUS</th>
                  <th style={{...thStyle, textAlign: "center"}}>RECEIPT</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment, idx) => (
                  <tr key={payment.id} style={{ borderBottom: "1px solid #eaecf0", transition: "background 0.15s", background: idx % 2 === 0 ? "#ffffff" : "#fcfcfd" }} onMouseOver={e => e.currentTarget.style.background = "#f2f4f7"} onMouseOut={e => e.currentTarget.style.background = idx % 2 === 0 ? "#ffffff" : "#fcfcfd"}>
                    <td style={{ padding: "12px", textAlign: "center" }}><input type="checkbox" /></td>
                    <td style={tdStyle}>{new Date(payment.payment_date).toLocaleDateString("en-GB")}</td>
                    <td style={{...tdStyle, color: "#006ee6", cursor: "pointer"}} onClick={() => navigate(`/invoices/${payment.invoice_id}`)}>{payment.id}</td>
                    <td style={tdStyle}>{payment.reference || ""}</td>
                    <td style={tdStyle}>{payment.customer_name || ""}</td>
                    <td style={{...tdStyle, color: "#006ee6", cursor: "pointer"}} onClick={() => navigate(`/invoices/${payment.invoice_id}`)}>{payment.invoice_number || ""}</td>
                    <td style={{ ...tdStyle, textTransform: "capitalize" }}>{payment.payment_mode || "Cash"}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>₹{parseFloat(payment.amount).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>₹0.00</td>
                    <td style={{ ...tdStyle, textTransform: "uppercase", fontSize: "11px", color: "#667085" }}>{payment.status || "DRAFT"}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <button onClick={() => navigate(`/invoices/${payment.invoice_id}`)} style={{ background: "none", border: "none", color: "#006ee6", fontSize: "12px", cursor: "pointer", fontWeight: "500", textDecoration: "underline" }}>View Receipt</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle = { padding: "10px 12px", textAlign: "left", fontWeight: "600", color: "#667085", letterSpacing: "0.02em", whiteSpace: "nowrap" };
const tdStyle = { padding: "12px", whiteSpace: "nowrap" };

export default PaymentsReceived;
