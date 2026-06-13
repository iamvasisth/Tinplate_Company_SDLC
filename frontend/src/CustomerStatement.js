import React, { useState, useEffect } from "react";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

function CustomerStatement({ customerId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchStatement = async () => {
    setLoading(true);
    try {
      let url = `/customers/${customerId}/statement`;
      const params = [];
      if (startDate) params.push(`start_date=${startDate}`);
      if (endDate) params.push(`end_date=${endDate}`);
      if (params.length > 0) url += "?" + params.join("&");

      const res = await apiRequest(url);
      setData(res);
    } catch (err) {
      toast.error("Failed to load customer statement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatement();
  }, [customerId]);

  const handleDownloadPDF = () => {
    let url = `${process.env.REACT_APP_API_URL || "http://localhost:5000/api"}/customers/${customerId}/statement/pdf?token=${localStorage.getItem("token")}`;
    if (startDate) url += `&from=${startDate}`;
    if (endDate) url += `&to=${endDate}`;
    window.open(url, "_blank");
  };

  const handleEmailStatement = async () => {
    try {
      const payload = { from: startDate, to_date: endDate };
      await apiRequest(`/customers/${customerId}/statement/send`, { method: "POST", body: JSON.stringify(payload) });
      toast.success("Statement sent successfully");
    } catch (err) {
      toast.error("Failed to send statement");
    }
  };

  if (loading) return <div style={{ padding: "20px", color: "#64748b" }}>Loading statement...</div>;
  if (!data) return <div style={{ padding: "20px", color: "#64748b" }}>Statement data not available.</div>;

  return (
    <div className="statement-container" style={{ background: "#fff", padding: "30px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
      <style>{`
        @media (max-width: 768px) {
          .statement-container { padding: 15px !important; }
          .statement-header { flex-direction: column; gap: 15px; }
          .statement-actions { flex-wrap: wrap; }
          .statement-filters { flex-direction: column; align-items: stretch !important; }
          .statement-filters > div { width: 100%; }
          .statement-filters input { width: 100%; box-sizing: border-box; }
        }
      `}</style>
      <div className="statement-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "30px" }}>
        <div>
          <h2 style={{ margin: "0 0 10px 0", color: "#1e293b" }}>Statement of Accounts</h2>
          <p style={{ margin: "0 0 5px 0", fontWeight: "600" }}>{data.customer.display_name || `${data.customer.first_name || ''} ${data.customer.last_name || ''}`.trim()}</p>
          <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>{data.customer.email}</p>
        </div>
        <div className="statement-actions print-hide" style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => window.print()} style={secondaryBtn}>Print</button>
          <button onClick={handleDownloadPDF} style={primaryBtn}>Download PDF</button>
          <button onClick={handleEmailStatement} style={secondaryBtn}>Email Statement</button>
        </div>
      </div>

      <div className="statement-filters print-hide" style={{ display: "flex", gap: "15px", marginBottom: "30px", background: "#f8fafc", padding: "15px", borderRadius: "8px", alignItems: "flex-end" }}>
        <div>
          <label style={labelStyle}>Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
        </div>
        <button onClick={fetchStatement} style={secondaryBtn}>Refresh</button>
      </div>

      <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
        <thead>
          <tr style={{ background: "#f1f5f9", textAlign: "left", borderBottom: "2px solid #cbd5e1" }}>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Transactions</th>
            <th style={thStyle}>Details</th>
            <th style={{...thStyle, textAlign: "right"}}>Amount (₹)</th>
            <th style={{...thStyle, textAlign: "right"}}>Payments (₹)</th>
            <th style={{...thStyle, textAlign: "right"}}>Balance (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={5} style={{...tdStyle, fontWeight: "600", color: "#475569"}}>Opening Balance</td>
            <td style={{...tdStyle, textAlign: "right", fontWeight: "600"}}>{parseFloat(data.opening_balance).toFixed(2)}</td>
          </tr>
          {data.transactions.length === 0 ? (
            <tr><td colSpan={6} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>No transactions in this period.</td></tr>
          ) : (
            data.transactions.map((t, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={tdStyle}>{new Date(t.date).toLocaleDateString("en-IN")}</td>
                <td style={tdStyle}>{t.type}</td>
                <td style={{...tdStyle, color: "#2563eb"}}>{t.reference}</td>
                <td style={{...tdStyle, textAlign: "right", color: "#dc2626"}}>{t.debit > 0 ? parseFloat(t.debit).toFixed(2) : ""}</td>
                <td style={{...tdStyle, textAlign: "right", color: "#065f46"}}>{t.credit > 0 ? parseFloat(t.credit).toFixed(2) : ""}</td>
                <td style={{...tdStyle, textAlign: "right", fontWeight: "500"}}>{parseFloat(t.balance).toFixed(2)}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr style={{ background: "#f8fafc", borderTop: "2px solid #94a3b8" }}>
            <td colSpan={5} style={{ padding: "15px", fontWeight: "bold", textAlign: "right" }}>Balance Due</td>
            <td style={{ padding: "15px", fontWeight: "bold", textAlign: "right", fontSize: "16px", color: data.closing_balance > 0 ? "#dc2626" : "#334155" }}>
              ₹{parseFloat(data.closing_balance).toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
      </div>
    </div>
  );
}

const inputStyle = { padding: "8px", borderRadius: "4px", border: "1px solid #ccc" };
const labelStyle = { display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "12px", color: "#64748b" };
const primaryBtn = { padding: "8px 16px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" };
const secondaryBtn = { padding: "8px 16px", background: "#fff", color: "#333", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer", fontWeight: "500" };
const thStyle = { padding: "12px 10px", color: "#334155" };
const tdStyle = { padding: "12px 10px" };

export default CustomerStatement;
