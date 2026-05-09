/**
 * QuoteEmail.js – Streamlined email composer for a quote
 * Dependencies: apiRequest, react-router-dom, react-hot-toast
 */
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

const ORG_NAME = "Tinplate Computer Training Center";
const ORG_EMAIL = "kumarrahulraj468@gmail.com";

function QuoteEmail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Quote data
  const [quote, setQuote] = useState(null);
  const [customer, setCustomer] = useState(null);

  // Email fields
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Fetch quote and customer
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiRequest(`/quotes/${id}`);
        if (!res?.quote) {
          toast.error("Quote not found");
          navigate("/quotes");
          return;
        }
        const q = res.quote;
        setQuote(q);

        // Fetch customer
        if (q.customer_id) {
          const custRes = await apiRequest(`/customers/${q.customer_id}`);
          if (custRes?.customer) {
            setCustomer(custRes.customer);
            setTo(custRes.customer.email || "");
          }
        }

        // Pre‑fill subject and body
        setSubject(`Quote ${q.quote_number} - awaiting your approval`);
        const customerName = customer?.display_name || "Customer";
        setBody(
          `Dear ${customerName},\n\n` +
          `Thank you for considering ${ORG_NAME}. We have prepared a quote for you.\n\n` +
          `Quote Number: ${q.quote_number}\n` +
          `Date: ${new Date(q.quote_date).toLocaleDateString()}\n` +
          `Total: ₹${parseFloat(q.total_amount).toFixed(2)}\n\n` +
          `Please review the attached quote and let us know if you have any questions.\n\n` +
          `Best regards,\n${ORG_NAME}`
        );
      } catch (err) {
        toast.error("Failed to load quote data");
        navigate("/quotes");
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  // Send email
  const handleSend = async () => {
  if (!to) {
    toast.error("Recipient email is required");
    return;
  }

  setLoading(true);
  try {
    await apiRequest(`/quotes/${id}/send`, {
      method: "POST",
      body: JSON.stringify({
        to,
        subject,
        body,
        // cc, bcc can be added if you implement them
      }),
    });
    toast.success("Email sent & quote marked as sent");
    navigate(`/quotes/${id}`);
  } catch (err) {
    toast.error("Failed to send email");
  } finally {
    setLoading(false);
  }
};

  if (fetching) {
    return <div style={{ padding: "50px", textAlign: "center" }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: "700px", margin: "auto", padding: "30px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
        <h2 style={{ margin: 0 }}>Email To {customer?.display_name || "Customer"}</h2>
        <button onClick={() => navigate(`/quotes/${id}`)} style={backBtn}>
          ← Back to Quote
        </button>
      </div>

      {/* Quote info card */}
      <div style={infoCardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ margin: "0 0 5px", fontWeight: "500", color: "#555" }}>
              {quote?.quote_number || "QT-000001"}
            </p>
            <p style={{ margin: 0, color: "#888", fontSize: "14px" }}>
              Date: {quote?.quote_date ? new Date(quote.quote_date).toLocaleDateString() : "—"}
            </p>
          </div>
          <button
            onClick={() => window.open(`/quotes/${id}`, '_blank')}
            style={viewQuoteBtn}
          >
            VIEW QUOTE
          </button>
        </div>
      </div>

      {/* Email fields */}
      <div style={{ marginTop: "25px" }}>
        <div style={fieldRowStyle}>
          <label style={labelStyle}>To</label>
          <input
            type="email"
            value={to}
            onChange={e => setTo(e.target.value)}
            style={inputStyle}
            placeholder="recipient@example.com"
          />
        </div>

        <div style={fieldRowStyle}>
          <label style={labelStyle}>Subject</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={10}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          />
        </div>
      </div>

      {/* Attachment placeholder */}
      <div style={attachmentCard}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px" }}>📎</span>
          <p style={{ margin: 0, fontWeight: "500", color: "#555" }}>Add a Quote PDF</p>
        </div>
        <button onClick={() => toast("PDF generation coming soon")} style={smallBtn}>
          Attach
        </button>
      </div>

      {/* Sign‑off */}
      <div style={{ margin: "25px 0", color: "#555" }}>
        <p style={{ margin: 0 }}>Regards,</p>
        <p style={{ margin: "2px 0", fontWeight: "500" }}>{ORG_EMAIL}</p>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
        <button onClick={() => navigate(`/quotes/${id}`)} style={cancelBtnStyle}>
          Cancel
        </button>
        <button onClick={handleSend} disabled={loading} style={primaryBtn}>
          {loading ? "Sending..." : "✉️ Send"}
        </button>
      </div>
    </div>
  );
}

// Styles
const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "5px",
  border: "1px solid #ccc",
  fontSize: "14px",
  boxSizing: "border-box",
};

const labelStyle = {
  width: "80px",
  fontWeight: "500",
  color: "#333",
  marginBottom: "0",
};

const fieldRowStyle = {
  display: "flex",
  alignItems: "center",
  marginBottom: "15px",
  gap: "10px",
};

const infoCardStyle = {
  background: "#f8f9fa",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "15px 20px",
};

const viewQuoteBtn = {
  padding: "8px 18px",
  background: "#fff",
  border: "1px solid #4a90e2",
  borderRadius: "5px",
  color: "#4a90e2",
  fontWeight: "500",
  cursor: "pointer",
  fontSize: "13px",
};

const attachmentCard = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "#f8f9fa",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "12px 20px",
  marginTop: "15px",
};

const smallBtn = {
  padding: "6px 14px",
  background: "#fff",
  border: "1px solid #ccc",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "13px",
};

const primaryBtn = {
  padding: "10px 24px",
  background: "#4a90e2",
  color: "#fff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
  fontWeight: "500",
};

const cancelBtnStyle = {
  padding: "10px 24px",
  background: "#ccc",
  color: "#333",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};

const backBtn = {
  padding: "8px 14px",
  background: "#f0f0f0",
  border: "1px solid #ccc",
  borderRadius: "5px",
  cursor: "pointer",
  fontSize: "14px",
};

export default QuoteEmail;