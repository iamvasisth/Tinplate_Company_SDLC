import React from "react";
import { useNavigate } from "react-router-dom";

function ReportsCenter() {
  const navigate = useNavigate();

  const reportGroups = [
    {
      category: "Business Overview",
      reports: [
        { name: "Profit and Loss", desc: "View your income, expenses, and net profit.", path: "/reports/profit-loss" },
        { name: "Balance Sheet", desc: "A snapshot of your business's financial position (assets, liabilities, equity).", path: "/reports/balance-sheet" },
        { name: "Cash Flow Statement", desc: "Track money moving in and out of your business.", path: "/reports/cash-flow" },
      ]
    },
    {
      category: "Accountant",
      reports: [
        { name: "Trial Balance", desc: "View a summary of all your accounts and their balances.", path: "/reports/trial-balance" },
        { name: "Account Transactions", desc: "Detailed transactions for a specific account.", path: "#" },
        { name: "General Ledger", desc: "All transactions across all accounts.", path: "#" },
      ]
    },
    {
      category: "Receivables & Payables",
      reports: [
        { name: "Customer Aging", desc: "See which customers are taking a long time to pay.", path: "/reports/customer-aging" },
        { name: "Vendor Aging", desc: "Track unpaid bills and when they are due.", path: "/reports/vendor-aging" },
      ]
    },
    {
      category: "Taxes",
      reports: [
        { name: "GST Summary", desc: "Summary of GST collected and paid.", path: "#" },
      ]
    }
  ];

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "auto" }}>
      <h2 style={{ marginBottom: "30px", color: "#1e293b", fontSize: "28px" }}>Reports Center</h2>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
        {reportGroups.map((group, idx) => (
          <div key={idx}>
            <h3 style={{ borderBottom: "2px solid #e2e8f0", paddingBottom: "10px", marginBottom: "20px", color: "#475569" }}>{group.category}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
              {group.reports.map((report, rIdx) => (
                <div 
                  key={rIdx} 
                  onClick={() => report.path !== "#" ? navigate(report.path) : null}
                  style={{ 
                    background: "#fff", padding: "20px", borderRadius: "8px", 
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0",
                    cursor: report.path !== "#" ? "pointer" : "default",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    opacity: report.path !== "#" ? 1 : 0.6
                  }}
                  onMouseOver={e => {
                    if (report.path !== "#") {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                    }
                  }}
                  onMouseOut={e => {
                    if (report.path !== "#") {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
                    }
                  }}
                >
                  <h4 style={{ margin: "0 0 10px 0", color: "#2563eb", fontSize: "16px" }}>{report.name}</h4>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "14px", lineHeight: "1.5" }}>{report.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReportsCenter;
