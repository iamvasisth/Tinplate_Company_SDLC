/**
 * Quotes.js – Inline expandable quote detail with three‑dot menu,
 * convert to invoice, and fixed customer name flicker.
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

const ORG_NAME = "Tinplate Computer Training Center";
const ORG_ADDRESS = "2nd Floor, Thakur Pyara Singh Road, Jamshedpur – 831001";
const ORG_EMAIL = "kumarrahulraj468@gmail.com";

function Quotes() {
  const navigate = useNavigate();
  const location = useLocation();

  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [expandedId, setExpandedId] = useState(null);
  const [expandedQuote, setExpandedQuote] = useState(null);
  const [expandedItems, setExpandedItems] = useState([]);
  const [expandedLoading, setExpandedLoading] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const [menuOpenFor, setMenuOpenFor] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [quotesRes, customersRes] = await Promise.all([
        apiRequest("/quotes"),
        apiRequest("/customers"),
      ]);
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

  const getCustomerById = (customerId) => {
    return customers.find((c) => c.id === customerId) || {};
  };

  const toggleExpand = async (quoteId) => {
    if (expandedId === quoteId) {
      setExpandedId(null);
      setExpandedQuote(null);
      setExpandedItems([]);
      return;
    }
    setExpandedId(quoteId);
    setExpandedLoading(true);
    try {
      const res = await apiRequest(`/quotes/${quoteId}`);
      if (res?.quote) {
        setExpandedQuote(res.quote);
        setExpandedItems(res.items || []);
      }
    } catch (err) {
      toast.error("Failed to load quote details");
      setExpandedId(null);
    } finally {
      setExpandedLoading(false);
    }
  };

  const changeStatus = async (quoteId, newStatus) => {
    try {
      await apiRequest(`/quotes/${quoteId}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(`Quote marked as ${newStatus}`);
      // Update local state instantly
      setQuotes((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, status: newStatus } : q)),
      );
      if (expandedQuote?.id === quoteId) {
        setExpandedQuote({ ...expandedQuote, status: newStatus });
      }
      // ❗ No fetchData() here – we trust the local update
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this quote?")) return;
    try {
      await apiRequest(`/quotes/${id}`, { method: "DELETE" });
      toast.success("Quote deleted");
      if (expandedId === id) {
        setExpandedId(null);
        setExpandedQuote(null);
        setExpandedItems([]);
      }
      fetchData(); // list changed → refresh
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const buildHtmlBody = (quote, items, customer) => {
    const custName = customer.display_name || "Customer";
    const itemsRows = items
      .map(
        (item) => `
          <tr>
            <td style="padding:8px; border-bottom:1px solid #ddd;">${item.description}</td>
            <td style="padding:8px; border-bottom:1px solid #ddd; text-align:center;">${item.quantity}</td>
            <td style="padding:8px; border-bottom:1px solid #ddd; text-align:right;">₹${parseFloat(item.unit_price).toFixed(2)}</td>
            <td style="padding:8px; border-bottom:1px solid #ddd; text-align:right;">₹${(parseFloat(item.quantity) * parseFloat(item.unit_price)).toFixed(2)}</td>
          </tr>`,
      )
      .join("");

    return `
      <div style="font-family:Arial,sans-serif; max-width:600px; margin:auto; border:1px solid #ddd; padding:20px;">
        <div style="text-align:right; margin-bottom:20px;">
          <h2 style="margin:0;">${ORG_NAME}</h2>
          <p style="margin:2px 0; font-size:12px;">${ORG_ADDRESS}</p>
          <p style="margin:2px 0; font-size:12px;">${ORG_EMAIL}</p>
        </div>
        <h3>Quote ${quote.quote_number}</h3>
        <p><strong>Date:</strong> ${new Date(quote.quote_date).toLocaleDateString()}</p>
        <p><strong>Customer:</strong> ${custName}</p>
        <p><strong>Status:</strong> ${quote.status}</p>
        
        <table style="width:100%; border-collapse:collapse; margin:20px 0;">
          <thead>
            <tr style="background:#f1f5f9; text-align:left;">
              <th style="padding:8px; border-bottom:2px solid #cbd5e1;">Item</th>
              <th style="padding:8px; border-bottom:2px solid #cbd5e1; text-align:center;">Qty</th>
              <th style="padding:8px; border-bottom:2px solid #cbd5e1; text-align:right;">Rate</th>
              <th style="padding:8px; border-bottom:2px solid #cbd5e1; text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
        
        <div style="text-align:right; font-size:16px; font-weight:bold; margin-top:10px;">
          Total: ₹${parseFloat(quote.total_amount).toFixed(2)}
        </div>
        
        ${quote.notes ? `<p><strong>Notes:</strong> ${quote.notes}</p>` : ""}
        ${quote.terms ? `<p><strong>Terms:</strong> ${quote.terms}</p>` : ""}
        
        <p style="margin-top:20px; font-size:12px; color:#555;">Thank you for your business!</p>
      </div>`;
  };

  const openEmailModal = (quote) => {
    const cust = getCustomerById(quote.customer_id);
    const custName = cust.display_name || "Customer";
    setEmailSubject(`Quote ${quote.quote_number} from ${ORG_NAME}`);
    // Plain text body – just a short message, no HTML table
    setEmailBody(
      `Dear ${custName},\n\n` +
        `Please find your quote attached.\n\n` +
        `Quote Number: ${quote.quote_number}\n` +
        `Total: ₹${parseFloat(quote.total_amount).toFixed(2)}\n\n` +
        `Thank you for your business.\n\n` +
        `Regards,\n${ORG_NAME}`,
    );
    setShowEmailModal(true);
  };

  const sendEmailAndMarkSent = async () => {
    const quote = expandedQuote;
    if (!quote) return;
    try {
      await apiRequest(`/quotes/${quote.id}/send`, {
        method: "POST",
        body: JSON.stringify({
          to: getCustomerById(quote.customer_id).email || "",
          subject: emailSubject,
          body: emailBody,
        }),
      });
      toast.success("Email sent & quote marked as sent");
      setShowEmailModal(false);
      changeStatus(quote.id, "sent");
    } catch (err) {
      toast.error("Failed to send email");
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
        <h2>All Quotes</h2>
        <button onClick={() => navigate("/quotes/new")} style={primaryBtn}>
          + New Quote
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : quotes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "gray" }}>
          <p>No quotes yet.</p>
          <button
            onClick={() => navigate("/quotes/new")}
            style={{ ...primaryBtn, marginTop: "15px" }}
          >
            + New Quote
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
              <th style={thStyle}>Quote #</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Total</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <React.Fragment key={q.id}>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={tdStyle}>
                    <span
                      style={{
                        color: "#4a90e2",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                      onClick={() => toggleExpand(q.id)}
                    >
                      {q.quote_number}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {new Date(q.quote_date).toLocaleDateString()}
                  </td>
                  <td style={tdStyle}>{getCustomerName(q.customer_id)}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "500",
                        background:
                          q.status === "accepted"
                            ? "#d4edda"
                            : q.status === "sent"
                              ? "#fff3cd"
                              : q.status === "declined"
                                ? "#f8d7da"
                                : "#e2e3e5",
                        color:
                          q.status === "accepted"
                            ? "#155724"
                            : q.status === "sent"
                              ? "#856404"
                              : q.status === "declined"
                                ? "#721c24"
                                : "#383d41",
                      }}
                    >
                      {q.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    ₹{parseFloat(q.total_amount).toFixed(2)}
                  </td>
                </tr>

                {expandedId === q.id && (
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
                          Loading quote details...
                        </div>
                      ) : expandedQuote ? (
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
                              onClick={() => openEmailModal(expandedQuote)}
                              style={smallSecondaryBtn}
                            >
                              ✉️ Send Email
                            </button>
                            <button
                              onClick={() => navigate(`/quotes/${q.id}/email`)}
                              style={{
                                ...smallSecondaryBtn,
                                background: "#f39c12",
                                color: "#fff",
                                border: "none",
                              }}
                            >
                              📧 Compose Email
                            </button>
                            {expandedQuote.status !== "sent" && (
                              <button
                                onClick={() => changeStatus(q.id, "sent")}
                                style={smallSecondaryBtn}
                              >
                                Mark as Sent
                              </button>
                            )}
                            {expandedQuote.status !== "accepted" && (
                              <button
                                onClick={() => changeStatus(q.id, "accepted")}
                                style={{
                                  ...smallSecondaryBtn,
                                  background: "#d4edda",
                                  color: "#155724",
                                }}
                              >
                                Mark as Accepted
                              </button>
                            )}
                            {expandedQuote.status !== "declined" && (
                              <button
                                onClick={() => changeStatus(q.id, "declined")}
                                style={{
                                  ...smallSecondaryBtn,
                                  background: "#f8d7da",
                                  color: "#721c24",
                                }}
                              >
                                Mark as Declined
                              </button>
                            )}
                            {expandedQuote.status === "accepted" && (
                              <button
                                onClick={async () => {
                                  try {
                                    await apiRequest(
                                      `/quotes/${q.id}/convert-to-invoice`,
                                      { method: "POST" },
                                    );
                                    toast.success("Quote converted to invoice");
                                    changeStatus(q.id, "invoiced");
                                  } catch (err) {
                                    toast.error("Conversion failed");
                                  }
                                }}
                                style={{
                                  ...smallSecondaryBtn,
                                  background: "#28a745",
                                  color: "#fff",
                                  border: "none",
                                }}
                              >
                                📄 Convert to Invoice
                              </button>
                            )}
                            <button
                              onClick={() => navigate(`/quotes/${q.id}`)}
                              style={{
                                ...smallSecondaryBtn,
                                border: "1px solid #4a90e2",
                                color: "#4a90e2",
                              }}
                            >
                              Full Edit
                            </button>
                            <button
                              onClick={() =>
                                navigate(`/quotes/${q.id}/document`)
                              }
                              style={{
                                ...smallSecondaryBtn,
                                border: "1px solid #28a745",
                                color: "#28a745",
                              }}
                            >
                              📄 View Document
                            </button>

                            <div style={{ position: "relative" }}>
                              <button
                                onClick={() =>
                                  setMenuOpenFor(
                                    menuOpenFor === q.id ? null : q.id,
                                  )
                                }
                                style={smallSecondaryBtn}
                              >
                                ⋯
                              </button>
                              {menuOpenFor === q.id && (
                                <div
                                  style={{
                                    ...dropdownMenuStyle,
                                    right: 0,
                                    top: "100%",
                                    width: "160px",
                                  }}
                                >
                                  <button
                                    style={menuItemStyle}
                                    onClick={() => {
                                      setMenuOpenFor(null);
                                      apiRequest("/quotes", {
                                        method: "POST",
                                        body: JSON.stringify({
                                          customer_id:
                                            expandedQuote.customer_id,
                                          quote_date: expandedQuote.quote_date,
                                          expiry_date:
                                            expandedQuote.expiry_date,
                                          status: "draft",
                                          notes: expandedQuote.notes,
                                          terms: expandedQuote.terms,
                                          items: expandedItems.map((i) => ({
                                            description: i.description,
                                            quantity: i.quantity,
                                            unit_price: i.unit_price,
                                            tax_rate: i.tax_rate,
                                          })),
                                        }),
                                      })
                                        .then(() => {
                                          toast.success("Quote cloned");
                                          fetchData();
                                        })
                                        .catch(() =>
                                          toast.error("Clone failed"),
                                        );
                                    }}
                                  >
                                    📋 Clone
                                  </button>
                                  <button
                                    style={menuItemStyle}
                                    onClick={() => {
                                      setMenuOpenFor(null);
                                      handleDelete(q.id);
                                    }}
                                  >
                                    🗑️ Delete
                                  </button>
                                  <button
                                    style={menuItemStyle}
                                    onClick={() => {
                                      setMenuOpenFor(null);
                                      toast("Project creation coming soon");
                                    }}
                                  >
                                    📂 Create Project
                                  </button>
                                </div>
                              )}
                            </div>
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
                              {getCustomerName(expandedQuote.customer_id)}
                            </div>
                            <div>
                              <strong>Date:</strong>{" "}
                              {new Date(
                                expandedQuote.quote_date,
                              ).toLocaleDateString()}
                            </div>
                            <div>
                              <strong>Expiry:</strong>{" "}
                              {expandedQuote.expiry_date
                                ? new Date(
                                    expandedQuote.expiry_date,
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
                                <th style={thStyle}>Item Details</th>
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
                                {parseFloat(expandedQuote.total_amount).toFixed(
                                  2,
                                )}
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
                              <span>Total (₹)</span>
                              <span>
                                ₹
                                {parseFloat(expandedQuote.total_amount).toFixed(
                                  2,
                                )}
                              </span>
                            </div>
                          </div>
                          {expandedQuote.notes && (
                            <div
                              style={{ marginBottom: "10px", fontSize: "14px" }}
                            >
                              <strong>Notes:</strong> {expandedQuote.notes}
                            </div>
                          )}
                          {expandedQuote.terms && (
                            <div style={{ fontSize: "14px" }}>
                              <strong>Terms:</strong> {expandedQuote.terms}
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

      {showEmailModal && expandedQuote && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "25px",
              width: "650px",
              maxWidth: "90%",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Send Quote via Email</h3>
            <div style={{ marginBottom: "15px" }}>
              <label>
                <strong>To:</strong>
              </label>
              <input
                type="email"
                value={getCustomerById(expandedQuote.customer_id).email || ""}
                readOnly
                style={{ ...inputStyle, background: "#f9f9f9" }}
              />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label>
                <strong>Subject:</strong>
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label>
                <strong>Message:</strong>
              </label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={6}
                style={inputStyle}
              />
            </div>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowEmailModal(false)}
                style={cancelBtnStyle}
              >
                Cancel
              </button>
              <button onClick={sendEmailAndMarkSent} style={primaryBtn}>
                Send & Mark as Sent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
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
const cancelBtnStyle = {
  padding: "10px 20px",
  background: "#ccc",
  color: "#333",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};
const inputStyle = {
  width: "100%",
  padding: "8px",
  borderRadius: "5px",
  border: "1px solid #ccc",
  boxSizing: "border-box",
};
const dropdownMenuStyle = {
  position: "absolute",
  right: 0,
  top: "100%",
  background: "#fff",
  borderRadius: "6px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  zIndex: 10,
  minWidth: "160px",
};
const menuItemStyle = {
  display: "block",
  width: "100%",
  padding: "8px 16px",
  border: "none",
  background: "none",
  textAlign: "left",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export default Quotes;
