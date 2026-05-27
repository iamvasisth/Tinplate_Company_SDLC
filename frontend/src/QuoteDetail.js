/**
 * QuoteDetail.js – Full-featured View / Edit quote page with Brevo SMTP integration
 * Dependencies: apiRequest, react-router-dom, react-hot-toast
 */
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

const ORG_NAME = "Tinplate Computer Training Center";

function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Quote fields
  const [customerId, setCustomerId] = useState("");
  const [quoteNumber, setQuoteNumber] = useState("");
  const [quoteDate, setQuoteDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [status, setStatus] = useState("draft");
  const [customerNotes, setCustomerNotes] = useState("");
  const [terms, setTerms] = useState("");

  // Items
  const [items, setItems] = useState([]);

  // Price adjustments
  const [discountPercent, setDiscountPercent] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [taxType, setTaxType] = useState("none");
  const [taxPercent, setTaxPercent] = useState("0");
  const [adjustment, setAdjustment] = useState("0");

  // Customers list for dropdown
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Email modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // Fetch customers for dropdown
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await apiRequest("/customers");
        // Handle both { customers: [...] } and direct array
        setCustomers(res?.customers || res || []);
      } catch (err) {
        toast.error("Failed to load customers");
      }
    };
    fetchCustomers();
  }, []);

  // Fetch quote data
  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const res = await apiRequest(`/quotes/${id}`);
        if (!res?.quote) {
          toast.error("Quote not found");
          navigate("/quotes");
          return;
        }
        const q = res.quote;
        setCustomerId(q.customer_id ? String(q.customer_id) : "");
        setQuoteNumber(q.quote_number || "");
        setQuoteDate(q.quote_date ? q.quote_date.slice(0, 10) : "");
        setExpiryDate(q.expiry_date ? q.expiry_date.slice(0, 10) : "");
        setStatus(q.status || "draft");
        setCustomerNotes(q.notes || "");
        setTerms(q.terms || "");

        const quoteItems = res.items || [];
        if (quoteItems.length > 0) {
          setItems(
            quoteItems.map((item) => ({
              description: item.description || "",
              quantity: item.quantity || 1,
              unit_price: item.unit_price || 0,
              tax_rate: item.tax_rate || 0,
            })),
          );
        } else {
          setItems([
            { description: "", quantity: 1, unit_price: 0, tax_rate: 0 },
          ]);
        }
      } catch (err) {
        toast.error("Failed to load quote");
        navigate("/quotes");
      } finally {
        setFetching(false);
      }
    };
    fetchQuote();
  }, [id, navigate]);

  // Item helpers
  const addItem = () => {
    setItems([
      ...items,
      { description: "", quantity: 1, unit_price: 0, tax_rate: 0 },
    ]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  // Calculations
  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0),
    0,
  );
  const discountVal =
    discountPercent > 0
      ? subtotal * (parseFloat(discountPercent) / 100)
      : parseFloat(discountAmount) || 0;
  const afterDiscount = subtotal - discountVal;
  const taxVal =
    taxType !== "none" && afterDiscount > 0
      ? afterDiscount * (parseFloat(taxPercent) / 100)
      : 0;
  const adjustmentVal = parseFloat(adjustment) || 0;
  const grandTotal = afterDiscount + taxVal + adjustmentVal;

  useEffect(() => {
    if (discountPercent > 0) {
      setDiscountAmount(
        (subtotal * (parseFloat(discountPercent) / 100)).toFixed(2),
      );
    }
  }, [discountPercent, subtotal]);

  // Save changes
  const handleSave = async () => {
    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }
    setLoading(true);
    try {
      await apiRequest(`/quotes/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          customer_id: parseInt(customerId),
          quote_date: quoteDate,
          expiry_date: expiryDate || null,
          status,
          notes: customerNotes,
          terms,
          items: items.map((item) => ({
            ...item,
            quantity: parseFloat(item.quantity) || 0,
            unit_price: parseFloat(item.unit_price) || 0,
            tax_rate: parseFloat(item.tax_rate) || 0,
          })),
        }),
      });
      toast.success("Quote updated");
    } catch (err) {
      toast.error("Failed to update quote");
    } finally {
      setLoading(false);
    }
  };

  // Quick status change
  const changeStatus = async (newStatus) => {
    setLoading(true);
    try {
      await apiRequest(`/quotes/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      setStatus(newStatus);
      toast.success(`Quote marked as ${newStatus}`);
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!window.confirm("Delete this quote?")) return;
    try {
      await apiRequest(`/quotes/${id}`, { method: "DELETE" });
      toast.success("Quote deleted");
      navigate("/quotes");
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  // Helper to safely get customer info
  const getCustomer = () => {
    const custId = parseInt(customerId);
    return customers.find((c) => c.id === custId) || {};
  };

  if (fetching) {
    return (
      <div style={{ padding: "50px", textAlign: "center" }}>
        Loading quote...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "900px", margin: "auto", padding: "30px" }}>
      {/* Header with status badge and delete */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2>Quote {quoteNumber}</h2>
        <div>
          <span
            style={{
              padding: "6px 12px",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: "500",
              background:
                status === "accepted"
                  ? "#d4edda"
                  : status === "sent"
                    ? "#fff3cd"
                    : status === "declined"
                      ? "#f8d7da"
                      : "#e2e3e5",
              color:
                status === "accepted"
                  ? "#155724"
                  : status === "sent"
                    ? "#856404"
                    : status === "declined"
                      ? "#721c24"
                      : "#383d41",
              marginRight: "15px",
            }}
          >
            {status.toUpperCase()}
          </span>
          <button onClick={handleDelete} style={deleteBtnStyle}>
            Delete
          </button>
        </div>
      </div>

      {/* Status workflow buttons */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "25px",
          flexWrap: "wrap",
        }}
      >
        {/* Quick send email via modal */}
        <button
          onClick={() => {
            const customer = getCustomer();
            setEmailSubject(`Quote ${quoteNumber} from ${ORG_NAME}`);
            setEmailBody(
              `Dear ${customer.display_name || "Customer"},\n\nPlease find your quote attached.\n\nQuote Number: ${quoteNumber}\nTotal: ₹${grandTotal.toFixed(2)}\n\nThank you for your business.\n\nRegards,\n${ORG_NAME}`,
            );
            setShowEmailModal(true);
          }}
          style={secondaryBtn}
        >
          ✉️ Send Email
        </button>

        {/* Dedicated Gmail‑style composer */}
        <button
          onClick={() => navigate(`/quotes/${id}/email`)}
          style={{
            ...secondaryBtn,
            background: "#f39c12",
            color: "#fff",
            border: "none",
          }}
        >
          📧 Compose Email
        </button>

        {status !== "sent" && (
          <button onClick={() => changeStatus("sent")} style={secondaryBtn}>
            Mark as Sent
          </button>
        )}
        {status !== "accepted" && (
          <button
            onClick={() => changeStatus("accepted")}
            style={{ ...secondaryBtn, background: "#d4edda", color: "#155724" }}
          >
            Mark as Accepted
          </button>
        )}
        {status !== "declined" && (
          <button
            onClick={() => changeStatus("declined")}
            style={{ ...secondaryBtn, background: "#f8d7da", color: "#721c24" }}
          >
            Mark as Declined
          </button>
        )}
        {status === "accepted" && (
          <button
            onClick={() => toast("Convert to invoice coming soon")}
            style={primaryBtn}
          >
            Convert to Invoice
          </button>
        )}
      </div>

      {/* Customer Dropdown */}
      <div style={{ marginBottom: "15px" }}>
        <label>
          <strong>Customer</strong>
        </label>
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          style={inputStyle}
        >
          <option value="">Select customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.display_name ||
                [c.first_name, c.last_name].filter(Boolean).join(" ") ||
                c.email}
            </option>
          ))}
        </select>
      </div>

      {/* Dates */}
      <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
        <div style={{ flex: 1 }}>
          <label>
            <strong>Quote Date</strong>
          </label>
          <input
            type="date"
            value={quoteDate}
            onChange={(e) => setQuoteDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>
            <strong>Expiry Date</strong>
          </label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Items Table */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <h3 style={{ margin: 0 }}>Items</h3>
        <button onClick={addItem} style={secondaryBtn}>
          + Add New Row
        </button>
      </div>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "15px",
        }}
      >
        <thead>
          <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
            <th style={thStyle}>Item Details</th>
            <th style={thStyle}>Quantity</th>
            <th style={thStyle}>Rate</th>
            <th style={thStyle}>Tax %</th>
            <th style={thStyle}>Amount</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
              <td style={tdStyle}>
                <input
                  type="text"
                  placeholder="Item description"
                  value={item.description}
                  onChange={(e) =>
                    updateItem(idx, "description", e.target.value)
                  }
                  style={inputStyle}
                />
              </td>
              <td style={tdStyle}>
                <input
                  type="number"
                  min="0"
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                  style={{ ...inputStyle, width: "70px" }}
                />
              </td>
              <td style={tdStyle}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_price}
                  onChange={(e) =>
                    updateItem(idx, "unit_price", e.target.value)
                  }
                  style={{ ...inputStyle, width: "100px" }}
                />
              </td>
              <td style={tdStyle}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={item.tax_rate}
                  onChange={(e) => updateItem(idx, "tax_rate", e.target.value)}
                  style={{ ...inputStyle, width: "60px" }}
                />
              </td>
              <td style={tdStyle}>
                ₹
                {(
                  (parseFloat(item.quantity) || 0) *
                  (parseFloat(item.unit_price) || 0)
                ).toFixed(2)}
              </td>
              <td style={tdStyle}>
                {items.length > 1 && (
                  <button onClick={() => removeItem(idx)} style={deleteItemBtn}>
                    ✕
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Customer Notes */}
      <div style={{ marginBottom: "15px" }}>
        <label>
          <strong>Customer Notes</strong>
        </label>
        <textarea
          value={customerNotes}
          onChange={(e) => setCustomerNotes(e.target.value)}
          rows={2}
          style={inputStyle}
          placeholder="Looking forward for your business."
        />
      </div>

      {/* Totals & Adjustments */}
      <div
        style={{
          background: "#f9fafb",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <span>Sub Total</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <span>Discount</span>
          <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
            <input
              type="number"
              min="0"
              max="100"
              value={discountPercent}
              onChange={(e) => {
                setDiscountPercent(e.target.value);
                if (e.target.value === "0") setDiscountAmount("0");
              }}
              style={{ ...inputStyle, width: "60px" }}
            />
            <span>%</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={discountAmount}
              onChange={(e) => {
                setDiscountAmount(e.target.value);
                setDiscountPercent("0");
              }}
              style={{ ...inputStyle, width: "80px" }}
            />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <span>Tax</span>
          <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
            <select
              value={taxType}
              onChange={(e) => setTaxType(e.target.value)}
              style={{ ...inputStyle, width: "80px" }}
            >
              <option value="none">None</option>
              <option value="tds">TDS</option>
              <option value="tcs">TCS</option>
            </select>
            {taxType !== "none" && (
              <input
                type="number"
                min="0"
                max="100"
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
                style={{ ...inputStyle, width: "60px" }}
              />
            )}
            {taxType !== "none" && <span>%</span>}
            <span style={{ marginLeft: "10px" }}>₹{taxVal.toFixed(2)}</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <span>Adjustment</span>
          <input
            type="number"
            value={adjustment}
            onChange={(e) => setAdjustment(e.target.value)}
            style={{ ...inputStyle, width: "80px" }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: "bold",
            fontSize: "16px",
            marginTop: "10px",
            borderTop: "1px solid #ddd",
            paddingTop: "10px",
          }}
        >
          <span>Total (₹)</span>
          <span>₹{grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div style={{ marginBottom: "15px" }}>
        <label>
          <strong>Terms & Conditions</strong>
        </label>
        <textarea
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          rows={3}
          style={inputStyle}
          placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
        />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
        <button onClick={() => navigate("/quotes")} style={cancelBtnStyle}>
          Back to List
        </button>
        <button onClick={handleSave} disabled={loading} style={primaryBtn}>
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* ===== SEND EMAIL MODAL ===== */}
      {showEmailModal && (
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
              width: "500px",
              maxWidth: "90%",
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
                value={getCustomer().email || ""}
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
              <button
                onClick={() => navigate(`/quotes/${id}/document`)}
                style={{
                  ...secondaryBtn,
                  border: "1px solid #28a745",
                  color: "#28a745",
                }}
              >
                📄 View Document
              </button>
              <button
                onClick={() => {
                  const customer = getCustomer();
                  const mailto = `mailto:${customer.email || ""}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
                  window.open(mailto);
                  setShowEmailModal(false);
                  toast.success("Email client opened");
                }}
                style={secondaryBtn}
              >
                Send Only
              </button>
              <button
                onClick={async () => {
                  try {
                    await apiRequest(`/quotes/${id}/send`, {
                      method: "POST",
                      body: JSON.stringify({
                        to: getCustomer().email || "",
                        subject: emailSubject,
                        body: emailBody,
                      }),
                    });
                    changeStatus("sent");
                    setShowEmailModal(false);
                    toast.success("Email sent & quote marked as sent");
                  } catch (err) {
                    toast.error("Failed to send email");
                  }
                }}
                style={primaryBtn}
              >
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
const inputStyle = {
  width: "100%",
  padding: "8px",
  borderRadius: "5px",
  border: "1px solid #ccc",
  boxSizing: "border-box",
};
const primaryBtn = {
  padding: "10px 20px",
  background: "#4a90e2",
  color: "#fff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
  fontWeight: "500",
};
const secondaryBtn = {
  padding: "8px 14px",
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
const deleteItemBtn = {
  background: "red",
  color: "#fff",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  padding: "4px 8px",
};
const deleteBtnStyle = {
  padding: "8px 16px",
  background: "#e74c3c",
  color: "#fff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};

export default QuoteDetail;
