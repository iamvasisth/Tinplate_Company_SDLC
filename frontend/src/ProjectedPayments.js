import React, { useEffect, useState } from "react";
import { apiRequest } from "./api";
import { TableSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function ProjectedPayments() {
  const [data, setData] = useState({ bills: [], total_projected_payment: 0, projected_month: null, projected_year: null });
  const [loading, setLoading] = useState(true);

  const fetchProjectedPayments = async () => {
    try {
      setLoading(true);
      const res = await apiRequest("/accounts/projected-payments");
      if (res) {
        setData(res);
      }
    } catch (error) {
      toast.error("Failed to load projected payments");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectedPayments();
  }, []);

  const getMonthName = (monthNumber) => {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString("en-US", { month: "long" });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1100px", margin: "auto" }}>
      {/* Header Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "30px" }}>
        <div>
          <h2 style={{ margin: "0 0 8px 0", color: "#111827", fontSize: "24px" }}>Projected Payment</h2>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
            Unpaid and pending invoices projected for {" "}
            <span style={{ fontWeight: "600", color: "#374151" }}>
              {data.projected_month ? `${getMonthName(data.projected_month)} ${data.projected_year}` : "Next Month"}
            </span>
          </p>
        </div>
        
        <div style={{ textAlign: "right", background: "#f8fafc", padding: "15px 25px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <p style={{ margin: "0 0 4px 0", color: "#64748b", fontSize: "13px", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>Total Projected</p>
          <h3 style={{ margin: 0, color: "#0f172a", fontSize: "28px" }}>
            {formatCurrency(data.total_projected_payment)}
          </h3>
        </div>
      </div>

      {/* Table Section */}
      <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden", border: "1px solid #e2e8f0" }}>
        {loading ? (
          <div style={{ padding: "20px" }}>
            <TableSkeleton columns={7} rows={5} />
          </div>
        ) : data.bills.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b7280" }}>
            <svg style={{ margin: "auto", display: "block", marginBottom: "15px", color: "#9ca3af" }} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p style={{ margin: 0, fontSize: "16px" }}>No projected payments found.</p>
            <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>All current invoices are paid or written off.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Invoice Number</th>
                  <th style={thStyle}>Customer Name</th>
                  <th style={thStyle}>Due Date</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Total Amount</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Pending Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.bills.map((bill) => (
                  <tr key={bill.bill_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={tdStyle}>{new Date(bill.bill_date).toLocaleDateString()}</td>
                    <td style={{ ...tdStyle, color: "#2563eb", fontWeight: "500" }}>{bill.bill_number}</td>
                    <td style={tdStyle}>{bill.vendor_name || "—"}</td>
                    <td style={tdStyle}>{new Date(bill.due_date).toLocaleDateString()}</td>
                    <td style={tdStyle}>
                      <span style={{ 
                        padding: "4px 8px", 
                        borderRadius: "12px", 
                        fontSize: "12px", 
                        fontWeight: "500", 
                        background: "#fef3c7", 
                        color: "#92400e", 
                        textTransform: "uppercase" 
                      }}>
                        {bill.status}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", color: "#64748b" }}>{formatCurrency(bill.total_amount)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600", color: "#111827" }}>{formatCurrency(bill.pending_amount)}</td>
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

const thStyle = { padding: "14px 20px", color: "#64748b", fontWeight: "600", fontSize: "13px", textTransform: "uppercase" };
const tdStyle = { padding: "14px 20px", color: "#334155" };

export default ProjectedPayments;
