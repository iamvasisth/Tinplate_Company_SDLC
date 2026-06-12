import React, { useState, useEffect } from "react";
import { apiRequest } from "./api";
import { TableSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function TrialBalance() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = "/reports/trial-balance";
      const params = [];
      if (startDate) params.push(`start_date=${startDate}`);
      if (endDate) params.push(`end_date=${endDate}`);
      if (params.length > 0) url += "?" + params.join("&");

      const res = await apiRequest(url);
      setData(res?.accounts || []);
    } catch (err) {
      toast.error("Failed to fetch Trial Balance");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportCSV = () => {
    if (!data || data.length === 0) {
      toast.error("No data to export");
      return;
    }
    
    let csv = "Account Code,Account Name,Debit (INR),Credit (INR)\n";
    data.forEach(row => {
      csv += `"${row.account_code || ''}","${row.account_name}",${parseFloat(row.total_debit).toFixed(2)},${parseFloat(row.total_credit).toFixed(2)}\n`;
    });
    
    const tDebit = data.reduce((sum, row) => sum + (parseFloat(row.total_debit) || 0), 0);
    const tCredit = data.reduce((sum, row) => sum + (parseFloat(row.total_credit) || 0), 0);
    csv += `"","Total",${tDebit.toFixed(2)},${tCredit.toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Trial_Balance_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalDebit = data.reduce((sum, row) => sum + (parseFloat(row.total_debit) || 0), 0);
  const totalCredit = data.reduce((sum, row) => sum + (parseFloat(row.total_credit) || 0), 0);

  return (
    <div style={{ padding: "30px", maxWidth: "1000px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Trial Balance</h2>
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

      <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        {loading ? (
          <TableSkeleton columns={4} rows={6} />
        ) : data.length === 0 ? (
          <p style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>No data found for this period.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #cbd5e1", textAlign: "left" }}>
                <th style={thStyle}>Account Code</th>
                <th style={thStyle}>Account Name</th>
                <th style={{...thStyle, textAlign: "right"}}>Debit (₹)</th>
                <th style={{...thStyle, textAlign: "right"}}>Credit (₹)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={tdStyle}>{row.account_code || "—"}</td>
                  <td style={tdStyle}>{row.account_name}</td>
                  <td style={{...tdStyle, textAlign: "right", color: "#065f46", fontWeight: parseFloat(row.total_debit) > 0 ? "600" : "400"}}>{parseFloat(row.total_debit).toFixed(2)}</td>
                  <td style={{...tdStyle, textAlign: "right", color: "#dc2626", fontWeight: parseFloat(row.total_credit) > 0 ? "600" : "400"}}>{parseFloat(row.total_credit).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f1f5f9", borderTop: "2px solid #94a3b8" }}>
                <td colSpan={2} style={{ padding: "15px", fontWeight: "bold", textAlign: "right" }}>Total</td>
                <td style={{ padding: "15px", fontWeight: "bold", textAlign: "right", color: "#065f46" }}>₹{totalDebit.toFixed(2)}</td>
                <td style={{ padding: "15px", fontWeight: "bold", textAlign: "right", color: "#dc2626" }}>₹{totalCredit.toFixed(2)}</td>
              </tr>
              {Math.abs(totalDebit - totalCredit) > 0.01 && (
                <tr>
                  <td colSpan={4} style={{ padding: "15px", textAlign: "right", color: "#dc2626", fontWeight: "bold" }}>
                    Difference: ₹{Math.abs(totalDebit - totalCredit).toFixed(2)} (Out of Balance)
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

const inputStyle = { padding: "8px", borderRadius: "4px", border: "1px solid #ccc" };
const labelStyle = { display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "12px", color: "#64748b" };
const primaryBtn = { padding: "8px 16px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", height: "35px" };
const secondaryBtn = { padding: "8px 16px", background: "#fff", color: "#333", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer", fontWeight: "500" };
const thStyle = { padding: "12px 10px", color: "#334155" };
const tdStyle = { padding: "12px 10px" };

export default TrialBalance;
