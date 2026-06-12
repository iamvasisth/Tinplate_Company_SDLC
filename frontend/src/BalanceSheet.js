import React, { useState, useEffect } from "react";
import { apiRequest } from "./api";
import { DetailSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function BalanceSheet() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [endDate, setEndDate] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = "/reports/balance-sheet";
      if (endDate) url += `?end_date=${endDate}`;
      const res = await apiRequest(url);
      setData(res);
    } catch (err) {
      toast.error("Failed to fetch Balance Sheet");
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
    
    let csv = "Account Name,Balance (INR)\n";
    
    csv += "--- ASSETS ---\n";
    data.assets.accounts.forEach(acc => {
      csv += `"${acc.account_name}",${parseFloat(acc.balance).toFixed(2)}\n`;
    });
    csv += `"Total Assets",${parseFloat(data.assets.total).toFixed(2)}\n\n`;
    
    csv += "--- LIABILITIES ---\n";
    data.liabilities.accounts.forEach(acc => {
      csv += `"${acc.account_name}",${parseFloat(acc.balance).toFixed(2)}\n`;
    });
    csv += `"Total Liabilities",${parseFloat(data.liabilities.total).toFixed(2)}\n\n`;
    
    csv += "--- EQUITY ---\n";
    data.equity.accounts.forEach(acc => {
      csv += `"${acc.account_name}",${parseFloat(acc.balance).toFixed(2)}\n`;
    });
    csv += `"Total Equity",${parseFloat(data.equity.total).toFixed(2)}\n\n`;
    
    csv += `"Total Liabilities & Equity",${(parseFloat(data.liabilities.total) + parseFloat(data.equity.total)).toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Balance_Sheet_As_Of_${endDate || 'today'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1000px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Balance Sheet</h2>
        <div style={{ display: "flex", gap: "10px" }} className="print-hide">
          <button onClick={handleExportCSV} style={primaryBtn}>Download CSV</button>
          <button onClick={() => window.print()} style={secondaryBtn}>Print / Save PDF</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "15px", marginBottom: "30px", background: "#f8fafc", padding: "15px", borderRadius: "8px", border: "1px solid #e2e8f0", alignItems: "flex-end" }}>
        <div>
          <label style={labelStyle}>As of Date</label>
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
          <div style={{ display: "flex", gap: "40px" }}>
            
            {/* ASSETS SIDE */}
            <div style={{ flex: 1 }}>
              <h3 style={{ color: "#2563eb", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px" }}>Assets</h3>
              <table style={tableStyle}>
                <tbody>
                  {data.assets.accounts.map((acc, idx) => (
                    <tr key={idx}>
                      <td style={tdStyle}>{acc.account_name}</td>
                      <td style={{...tdStyle, textAlign: "right"}}>{parseFloat(acc.balance).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={totalStyle}>
                <span>Total Assets</span>
                <span>₹{parseFloat(data.assets.total).toFixed(2)}</span>
              </div>
            </div>

            {/* LIABILITIES & EQUITY SIDE */}
            <div style={{ flex: 1 }}>
              <h3 style={{ color: "#dc2626", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px" }}>Liabilities</h3>
              <table style={tableStyle}>
                <tbody>
                  {data.liabilities.accounts.map((acc, idx) => (
                    <tr key={idx}>
                      <td style={tdStyle}>{acc.account_name}</td>
                      <td style={{...tdStyle, textAlign: "right"}}>{parseFloat(acc.balance).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{...totalStyle, marginBottom: "30px"}}>
                <span>Total Liabilities</span>
                <span>₹{parseFloat(data.liabilities.total).toFixed(2)}</span>
              </div>

              <h3 style={{ color: "#065f46", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px" }}>Equity</h3>
              <table style={tableStyle}>
                <tbody>
                  {data.equity.accounts.map((acc, idx) => (
                    <tr key={idx}>
                      <td style={tdStyle}>{acc.account_name}</td>
                      <td style={{...tdStyle, textAlign: "right"}}>{parseFloat(acc.balance).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={totalStyle}>
                <span>Total Equity</span>
                <span>₹{parseFloat(data.equity.total).toFixed(2)}</span>
              </div>

              <div style={{...totalStyle, background: "#f1f5f9", padding: "15px", marginTop: "20px", borderRadius: "8px", borderTop: "none"}}>
                <span>Total Liabilities & Equity</span>
                <span>₹{(parseFloat(data.liabilities.total) + parseFloat(data.equity.total)).toFixed(2)}</span>
              </div>
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
const totalStyle = { display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "16px", padding: "10px 0", borderTop: "2px solid #cbd5e1" };

export default BalanceSheet;
