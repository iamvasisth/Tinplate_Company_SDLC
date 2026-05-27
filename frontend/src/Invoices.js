/**
 * Invoices.js – Invoices listing with inline expandable detail
 * Dependencies: apiRequest, react-router-dom, react-hot-toast
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

function Invoices() {
  const navigate = useNavigate();
  const location = useLocation();

  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [expandedId, setExpandedId] = useState(null);
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [expandedItems, setExpandedItems] = useState([]);
  const [expandedLoading, setExpandedLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [invRes, custRes] = await Promise.all([
        apiRequest("/invoices"),
        apiRequest("/customers"),
      ]);
      setInvoices(invRes?.invoices || invRes || []);
      setCustomers(custRes?.customers || custRes || []);
    } catch (err) {
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, location.state?.refresh]);

  const getCustomerName = (customerId) => {
    if (!customerId) return "—";
    const cust = customers.find((c) => c.id === customerId);
    return cust
      ? cust.display_name ||
          [cust.first_name, cust.last_name].filter(Boolean).join(" ") ||
          cust.email
      : "—";
  };

  const toggleExpand = async (invId) => {
    if (expandedId === invId) {
      setExpandedId(null);
      setExpandedInvoice(null);
      setExpandedItems([]);
      return;
    }
    setExpandedId(invId);
    setExpandedLoading(true);
    try {
      const res = await apiRequest(`/invoices/${invId}`);
      if (res?.invoice) {
        setExpandedInvoice(res.invoice);
        setExpandedItems(res.items || []);
      }
    } catch (err) {
      toast.error("Failed to load invoice details");
      setExpandedId(null);
    } finally {
      setExpandedLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this invoice?")) return;
    try {
      await apiRequest(`/invoices/${id}`, { method: "DELETE" });
      toast.success("Invoice deleted");
      if (expandedId === id) {
        setExpandedId(null);
        setExpandedInvoice(null);
        setExpandedItems([]);
      }
      fetchData();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1100px", margin: "auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2>Invoices</h2>
        <button onClick={() => navigate("/invoices/new")} style={primaryBtn}>
          + New Invoice
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : invoices.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "gray" }}>
          <p>No invoices yet.</p>
          <button
            onClick={() => navigate("/invoices/new")}
            style={{ ...primaryBtn, marginTop: "15px" }}
          >
            + New Invoice
          </button>
        </div>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
          }}
        >
          <thead>
            <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={thStyle}>Invoice #</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <React.Fragment key={inv.id}>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={tdStyle}>
                    <span
                      style={{
                        color: "#4a90e2",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                      onClick={() => toggleExpand(inv.id)}
                    >
                      {inv.invoice_number}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {new Date(inv.invoice_date).toLocaleDateString()}
                  </td>
                  <td style={tdStyle}>{getCustomerName(inv.customer_id)}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "500",
                        background:
                          inv.status === "paid"
                            ? "#d4edda"
                            : inv.status === "sent"
                              ? "#fff3cd"
                              : inv.status === "overdue"
                                ? "#f8d7da"
                                : "#e2e3e5",
                        color:
                          inv.status === "paid"
                            ? "#155724"
                            : inv.status === "sent"
                              ? "#856404"
                              : inv.status === "overdue"
                                ? "#721c24"
                                : "#383d41",
                      }}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    ₹{parseFloat(inv.total_amount).toFixed(2)}
                  </td>
                </tr>

                {expandedId === inv.id && (
                  <tr>
                    <td colSpan={5} style={{ padding: "0" }}>
                      {expandedLoading ? (
                        <div
                          style={{
                            padding: "20px",
                            background: "#f9fafb",
                            textAlign: "center",
                          }}
                        >
                          Loading...
                        </div>
                      ) : expandedInvoice ? (
                        <div
                          style={{
                            padding: "20px 25px",
                            background: "#fff",
                            borderTop: "1px solid #e2e8f0",
                            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.03)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: "10px",
                              marginBottom: "20px",
                              flexWrap: "wrap",
                              alignItems: "center",
                            }}
                          >
                            <button
                              onClick={() => navigate(`/invoices/${inv.id}`)}
                              style={smallSecondaryBtn}
                            >
                              Full Edit
                            </button>
                            <button
                              onClick={() => handleDelete(inv.id)}
                              style={deleteBtnStyle}
                            >
                              Delete
                            </button>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: "30px",
                              marginBottom: "15px",
                              fontSize: "14px",
                            }}
                          >
                            <div>
                              <strong>Customer:</strong>{" "}
                              {getCustomerName(expandedInvoice.customer_id)}
                            </div>
                            <div>
                              <strong>Date:</strong>{" "}
                              {new Date(
                                expandedInvoice.invoice_date,
                              ).toLocaleDateString()}
                            </div>
                            <div>
                              <strong>Due:</strong>{" "}
                              {expandedInvoice.due_date
                                ? new Date(
                                    expandedInvoice.due_date,
                                  ).toLocaleDateString()
                                : "—"}
                            </div>
                          </div>
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              marginBottom: "15px",
                              fontSize: "14px",
                            }}
                          >
                            <thead>
                              <tr
                                style={{
                                  background: "#f1f5f9",
                                  textAlign: "left",
                                }}
                              >
                                <th style={thStyle}>Item</th>
                                <th style={thStyle}>Qty</th>
                                <th style={thStyle}>Rate</th>
                                <th style={thStyle}>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {expandedItems.length > 0 ? (
                                expandedItems.map((item, idx) => (
                                  <tr
                                    key={idx}
                                    style={{
                                      borderBottom: "1px solid #e2e8f0",
                                    }}
                                  >
                                    <td style={tdStyle}>{item.description}</td>
                                    <td style={tdStyle}>{item.quantity}</td>
                                    <td style={tdStyle}>{item.unit_price}</td>
                                    <td style={tdStyle}>
                                      ₹
                                      {(
                                        (parseFloat(item.quantity) || 0) *
                                        (parseFloat(item.unit_price) || 0)
                                      ).toFixed(2)}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={4} style={tdStyle}>
                                    No items
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                          <div
                            style={{ marginBottom: "15px", fontSize: "14px" }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span>Sub Total</span>
                              <span>
                                ₹
                                {parseFloat(
                                  expandedInvoice.total_amount,
                                ).toFixed(2)}
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginTop: "5px",
                                fontWeight: "bold",
                              }}
                            >
                              <span>Total</span>
                              <span>
                                ₹
                                {parseFloat(
                                  expandedInvoice.total_amount,
                                ).toFixed(2)}
                              </span>
                            </div>
                          </div>
                          {expandedInvoice.notes && (
                            <div
                              style={{ marginBottom: "10px", fontSize: "14px" }}
                            >
                              <strong>Notes:</strong> {expandedInvoice.notes}
                            </div>
                          )}
                          {expandedInvoice.terms && (
                            <div style={{ fontSize: "14px" }}>
                              <strong>Terms:</strong> {expandedInvoice.terms}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: "20px",
                            background: "#f9fafb",
                            textAlign: "center",
                          }}
                        >
                          Failed to load details.
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle = {
  padding: "10px",
  borderBottom: "2px solid #cbd5e1",
  whiteSpace: "nowrap",
};
const tdStyle = { padding: "10px" };
const primaryBtn = {
  padding: "10px 20px",
  background: "#4a90e2",
  color: "#fff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
  fontWeight: "500",
};
const smallSecondaryBtn = {
  padding: "6px 12px",
  background: "#f0f0f0",
  color: "#333",
  border: "1px solid #ccc",
  borderRadius: "5px",
  cursor: "pointer",
  fontSize: "13px",
};
const deleteBtnStyle = {
  padding: "6px 12px",
  background: "#e74c3c",
  color: "#fff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
  fontSize: "13px",
};

export default Invoices;
