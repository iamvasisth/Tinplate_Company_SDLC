import React, { useState, useEffect } from "react";
import { apiRequest } from "./api";
import { DetailSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function CashFlow() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = "/reports/cash-flow";
      const params = [];
      if (startDate) params.push(`start_date=${startDate}`);
      if (endDate) params.push(`end_date=${endDate}`);
      if (params.length > 0) url += "?" + params.join("&");

      const res = await apiRequest(url);
      setData(res);
    } catch (err) {
      toast.error("Failed to fetch Cash Flow Statement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExportCSV = () => {
    if (!data) {
      toast.error("No data to export");
      return;
    }
    
    let csv = "Activity,Amount (INR)\n";
    
    csv += "--- CASH FLOW FROM OPERATING ACTIVITIES ---\n";
    data.operating_activities.forEach(act => {
      csv += `"${act.description}",${parseFloat(act.amount).toFixed(2)}\n`;
    });
    
    csv += "\n--- CASH FLOW FROM INVESTING ACTIVITIES ---\n";
    csv += `"No investing activities recorded",0.00\n`;
    
    csv += "\n--- CASH FLOW FROM FINANCING ACTIVITIES ---\n";
    csv += `"No financing activities recorded",0.00\n`;
    
    csv += `\n"Net Cash Flow",${parseFloat(data.net_cash_flow).toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Cash_Flow_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1000px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Cash Flow Statement</h2>
        <div style={{ display: "flex", gap: "10px" }} className="print-hide">
          <button onClick={handleExportCSV} style={primaryBtn}>Download CSV</button>
          <button onClick={() => window.print()} style={secondaryBtn}>Print / Save PDF</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "15px", marginBottom: "30px", background: "#f8fafc", padding: "15px", borderRadius: "8px", border: "1px solid #e2e8f0", alignItems: "flex-end" }}>
        <div>
          <label style={labelStyle}>Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
        </div>
        <button onClick={fetchData} style={primaryBtn}>Refresh</button>
      </div>

      <div style={{ background: "#fff", padding: "40px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        {loading ? (
          <DetailSkeleton />
        ) : !data ? (
          <p style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>No data found.</p>
        ) : (
          <div>
            <h3 style={{ color: "#334155", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>Cash Flow from Operating Activities</h3>
            <table style={tableStyle}>
              <tbody>
                {data.operating_activities.map((act, idx) => (
                  <tr key={idx}>
                    <td style={tdStyle}>{act.description}</td>
                    <td style={{...tdStyle, textAlign: "right"}}>{parseFloat(act.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 style={{ color: "#334155", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px", marginTop: "30px" }}>Cash Flow from Investing Activities</h3>
            <table style={tableStyle}>
              <tbody>
                <tr>
                  <td style={{...tdStyle, color: "#64748b", fontStyle: "italic"}}>No investing activities recorded.</td>
                  <td style={{...tdStyle, textAlign: "right"}}>0.00</td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ color: "#334155", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px", marginTop: "30px" }}>Cash Flow from Financing Activities</h3>
            <table style={tableStyle}>
              <tbody>
                <tr>
                  <td style={{...tdStyle, color: "#64748b", fontStyle: "italic"}}>No financing activities recorded.</td>
                  <td style={{...tdStyle, textAlign: "right"}}>0.00</td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "20px", padding: "20px", marginTop: "40px", background: data.net_cash_flow >= 0 ? "#ecfdf5" : "#fef2f2", color: data.net_cash_flow >= 0 ? "#065f46" : "#991b1b", borderRadius: "8px" }}>
              <span>Net Cash Flow</span>
              <span>₹{parseFloat(data.net_cash_flow).toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = { padding: "8px", borderRadius: "4px", border: "1px solid #ccc" };
const labelStyle = { display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "12px", color: "#64748b" };
const primaryBtn = { padding: "8px 16px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", height: "35px" };
const secondaryBtn = { padding: "8px 16px", background: "#fff", color: "#333", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer", fontWeight: "500" };
const tableStyle = { width: "100%", borderCollapse: "collapse", marginBottom: "10px" };
const tdStyle = { padding: "10px 0", borderBottom: "1px solid #f1f5f9" };

export default CashFlow;
