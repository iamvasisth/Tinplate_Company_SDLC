/**
 * Quotes.js – Quotes listing page with real customer names
 * Dependencies: apiRequest, react-router-dom, react-hot-toast
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

function Quotes() {
  const navigate = useNavigate();

  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [quotesRes, customersRes] = await Promise.all([
        apiRequest("/quotes"),
        apiRequest("/customers"),
      ]);

      // Handle both response formats
      const quotesList = quotesRes?.quotes || quotesRes || [];
      const customersList = customersRes?.customers || customersRes || [];

      setQuotes(Array.isArray(quotesList) ? quotesList : []);
      setCustomers(Array.isArray(customersList) ? customersList : []);
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getCustomerName = (customerId) => {
    if (!customerId) return "—";
    const cust = customers.find((c) => c.id === customerId);
    return cust
      ? cust.display_name || [cust.first_name, cust.last_name].filter(Boolean).join(" ") || cust.email
      : "—";
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this quote?")) return;
    try {
      await apiRequest(`/quotes/${id}`, { method: "DELETE" });
      toast.success("Quote deleted");
      fetchData();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1100px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Quotes</h2>
        <button onClick={() => navigate("/quotes/new")} style={primaryBtn}>
          + New Quote
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : quotes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "gray" }}>
          <p>No quotes yet. Create your first quote to get started.</p>
          <button onClick={() => navigate("/quotes/new")} style={{ ...primaryBtn, marginTop: "15px" }}>
            + New Quote
          </button>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={thStyle}>Quote #</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Total</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={tdStyle}>{q.quote_number}</td>
                <td style={tdStyle}>{new Date(q.quote_date).toLocaleDateString()}</td>
                <td style={tdStyle}>{getCustomerName(q.customer_id)}</td>
                <td style={tdStyle}>
                  <span style={{
                    padding: "4px 8px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "500",
                    background: q.status === "accepted" ? "#d4edda" : q.status === "sent" ? "#fff3cd" : q.status === "declined" ? "#f8d7da" : "#e2e3e5",
                    color: q.status === "accepted" ? "#155724" : q.status === "sent" ? "#856404" : q.status === "declined" ? "#721c24" : "#383d41",
                  }}>
                    {q.status}
                  </span>
                </td>
                <td style={tdStyle}>₹{parseFloat(q.total_amount).toFixed(2)}</td>
                <td style={tdStyle}>
                  <button onClick={() => navigate(`/quotes/${q.id}`)} style={editBtnStyle}>View</button>
                  <button onClick={() => handleDelete(q.id)} style={deleteBtnStyle}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle = { padding: "10px", borderBottom: "2px solid #cbd5e1", whiteSpace: "nowrap" };
const tdStyle = { padding: "10px" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "500" };
const editBtnStyle = { padding: "5px 10px", background: "orange", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "5px" };
const deleteBtnStyle = { padding: "5px 10px", background: "red", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" };

export default Quotes;