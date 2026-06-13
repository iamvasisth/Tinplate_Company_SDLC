import React, { useState, useEffect } from "react";
import { apiRequest } from "./api";
import { TableSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function CustomerAgingReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [asOfDate, setAsOfDate] = useState("");
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = "/reports/customer-aging";
      if (asOfDate) url += `?as_of_date=${asOfDate}`;

      const res = await apiRequest(url);
      setData(res?.customer_aging || []);
    } catch (err) {
      toast.error("Failed to fetch Customer Aging Report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = data.filter(c => c.customer_name.toLowerCase().includes(search.toLowerCase()));

  const totals = filteredData.reduce((acc, row) => ({
    current: acc.current + parseFloat(row.current),
    days_1_30: acc.days_1_30 + parseFloat(row.days_1_30),
    days_31_60: acc.days_31_60 + parseFloat(row.days_31_60),
    days_61_90: acc.days_61_90 + parseFloat(row.days_61_90),
    days_90_plus: acc.days_90_plus + parseFloat(row.days_90_plus),
    total_due: acc.total_due + parseFloat(row.total_due)
  }), { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_90_plus: 0, total_due: 0 });

  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      toast.error("No data to export");
      return;
    }
    
    let csv = "Customer Name,Current (INR),1-30 Days,31-60 Days,61-90 Days,90+ Days,Total Due (INR)\n";
    filteredData.forEach(row => {
      csv += `"${row.customer_name}",${parseFloat(row.current).toFixed(2)},${parseFloat(row.days_1_30).toFixed(2)},${parseFloat(row.days_31_60).toFixed(2)},${parseFloat(row.days_61_90).toFixed(2)},${parseFloat(row.days_90_plus).toFixed(2)},${parseFloat(row.total_due).toFixed(2)}\n`;
    });
    
    csv += `"Total",${totals.current.toFixed(2)},${totals.days_1_30.toFixed(2)},${totals.days_31_60.toFixed(2)},${totals.days_61_90.toFixed(2)},${totals.days_90_plus.toFixed(2)},${totals.total_due.toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Customer_Aging_As_Of_${asOfDate || 'today'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1200px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Customer Aging Details</h2>
        <div style={{ display: "flex", gap: "10px" }} className="print-hide">
          <button onClick={handleExportCSV} style={primaryBtn}>Download CSV</button>
          <button onClick={() => window.print()} style={secondaryBtn}>Print / Save PDF</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "15px", marginBottom: "30px", background: "#f8fafc", padding: "15px", borderRadius: "8px", border: "1px solid #e2e8f0", alignItems: "flex-end" }}>
        <div>
          <label style={labelStyle}>As of Date</label>
          <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Search Customer</label>
          <input type="text" placeholder="Name or email..." value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />
        </div>
        <button onClick={fetchData} style={primaryBtn}>Refresh</button>
      </div>

      <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflowX: "auto" }}>
        {loading ? (
          <TableSkeleton columns={7} rows={6} />
        ) : data.length === 0 ? (
          <p style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>No unpaid invoices found.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #cbd5e1", textAlign: "left" }}>
                <th style={thStyle}>Customer Name</th>
                <th style={{...thStyle, textAlign: "right"}}>Current</th>
                <th style={{...thStyle, textAlign: "right"}}>1-30 Days</th>
                <th style={{...thStyle, textAlign: "right"}}>31-60 Days</th>
                <th style={{...thStyle, textAlign: "right"}}>61-90 Days</th>
                <th style={{...thStyle, textAlign: "right"}}>90+ Days</th>
                <th style={{...thStyle, textAlign: "right", color: "#1e293b"}}>Total Due</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "20px" }}>No customers match your search.</td></tr>
              ) : (
                filteredData.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{...tdStyle, fontWeight: "500", color: "#2563eb"}}>{row.customer_name}</td>
                    <td style={{...tdStyle, textAlign: "right", color: row.current > 0 ? "#475569" : "#cbd5e1"}}>{parseFloat(row.current).toFixed(2)}</td>
                    <td style={{...tdStyle, textAlign: "right", color: row.days_1_30 > 0 ? "#ca8a04" : "#cbd5e1"}}>{parseFloat(row.days_1_30).toFixed(2)}</td>
                    <td style={{...tdStyle, textAlign: "right", color: row.days_31_60 > 0 ? "#ea580c" : "#cbd5e1"}}>{parseFloat(row.days_31_60).toFixed(2)}</td>
                    <td style={{...tdStyle, textAlign: "right", color: row.days_61_90 > 0 ? "#dc2626" : "#cbd5e1"}}>{parseFloat(row.days_61_90).toFixed(2)}</td>
                    <td style={{...tdStyle, textAlign: "right", color: row.days_90_plus > 0 ? "#991b1b" : "#cbd5e1", fontWeight: row.days_90_plus > 0 ? "bold" : "normal"}}>{parseFloat(row.days_90_plus).toFixed(2)}</td>
                    <td style={{...tdStyle, textAlign: "right", fontWeight: "bold", color: "#1e293b"}}>₹{parseFloat(row.total_due).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredData.length > 0 && (
              <tfoot>
                <tr style={{ background: "#f1f5f9", borderTop: "2px solid #94a3b8" }}>
                  <td style={{ padding: "15px", fontWeight: "bold", color: "#1e293b" }}>Total</td>
                  <td style={{ padding: "15px", fontWeight: "bold", textAlign: "right" }}>₹{totals.current.toFixed(2)}</td>
                  <td style={{ padding: "15px", fontWeight: "bold", textAlign: "right" }}>₹{totals.days_1_30.toFixed(2)}</td>
                  <td style={{ padding: "15px", fontWeight: "bold", textAlign: "right" }}>₹{totals.days_31_60.toFixed(2)}</td>
                  <td style={{ padding: "15px", fontWeight: "bold", textAlign: "right" }}>₹{totals.days_61_90.toFixed(2)}</td>
                  <td style={{ padding: "15px", fontWeight: "bold", textAlign: "right" }}>₹{totals.days_90_plus.toFixed(2)}</td>
                  <td style={{ padding: "15px", fontWeight: "bold", textAlign: "right", color: "#1e293b", fontSize: "16px" }}>₹{totals.total_due.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
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

export default CustomerAgingReport;
