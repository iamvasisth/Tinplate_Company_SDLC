/**
 * QuoteDocument.js – Professional quote document (like Customer Statement)
 * Dependencies: apiRequest, react-router-dom, react-hot-toast
 */
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

const ORG_NAME = "Tinplate Computer Training Center";
const ORG_ADDRESS = "2nd Floor, Thakur Pyara Singh Road, Jamshedpur – 831001";
const ORG_EMAIL = "kumarrahulraj468@gmail.com";
const ORG_COUNTRY = "India";

function QuoteDocument() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quote, setQuote] = useState(null);
  const [items, setItems] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [fetching, setFetching] = useState(true);

  // Editable org info (same pattern as Customer Statement)
  const [orgInfo, setOrgInfo] = useState({
    name: ORG_NAME,
    address: ORG_ADDRESS,
    email: ORG_EMAIL,
    country: ORG_COUNTRY,
  });

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const res = await apiRequest(`/quotes/${id}`);
        if (!res?.quote) {
          toast.error("Quote not found");
          navigate("/quotes");
          return;
        }
        setQuote(res.quote);
        setItems(res.items || []);

        if (res.quote.customer_id) {
          const custRes = await apiRequest(
            `/customers/${res.quote.customer_id}`,
          );
          if (custRes?.customer) setCustomer(custRes.customer);
        }
      } catch (err) {
        toast.error("Failed to load quote");
      } finally {
        setFetching(false);
      }
    };
    fetchQuote();
  }, [id, navigate]);

  const handlePrint = () => window.print();

  if (fetching) {
    return <div style={{ padding: "50px", textAlign: "center" }}>Loading…</div>;
  }
  if (!quote) return null;

  const customerName = customer?.display_name || "Customer";

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "auto",
        padding: "30px",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      {/* Editable org info (exactly like Customer Statement) */}
      <div
        style={{
          marginBottom: "20px",
          borderBottom: "1px solid #eee",
          paddingBottom: "15px",
        }}
      >
        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={labelStyle}>Organization Name</label>
            <input
              type="text"
              value={orgInfo.name}
              onChange={(e) => setOrgInfo({ ...orgInfo, name: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label style={labelStyle}>Organization Address</label>
            <textarea
              value={orgInfo.address}
              onChange={(e) =>
                setOrgInfo({ ...orgInfo, address: e.target.value })
              }
              rows={2}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: "1 1 150px" }}>
            <label style={labelStyle}>Country</label>
            <input
              type="text"
              value={orgInfo.country}
              onChange={(e) =>
                setOrgInfo({ ...orgInfo, country: e.target.value })
              }
              style={inputStyle}
            />
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={orgInfo.email}
              onChange={(e) =>
                setOrgInfo({ ...orgInfo, email: e.target.value })
              }
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Company header (right aligned) */}
      <div style={{ textAlign: "right", marginBottom: "25px" }}>
        <h2 style={{ margin: 0 }}>{orgInfo.name}</h2>
        <p style={{ margin: "2px 0" }}>{orgInfo.address}</p>
        <p style={{ margin: "2px 0" }}>{orgInfo.country}</p>
        <p style={{ margin: "2px 0" }}>{orgInfo.email}</p>
      </div>

      <h1 style={{ marginBottom: "5px" }}>Quote</h1>
      <p style={{ margin: 0 }}>
        <strong>Quote Number:</strong> {quote.quote_number}
      </p>
      <p style={{ margin: "5px 0" }}>
        <strong>Date:</strong> {new Date(quote.quote_date).toLocaleDateString()}
      </p>
      <p style={{ margin: "0 0 20px" }}>
        <strong>To:</strong> {customerName}
      </p>

      {/* Items Table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "20px",
        }}
      >
        <thead>
          <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
            <th style={thStyle}>#</th>
            <th style={thStyle}>Item & Description</th>
            <th style={thStyle}>Qty</th>
            <th style={thStyle}>Rate</th>
            <th style={thStyle}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? (
            items.map((item, idx) => {
              const qty = parseFloat(item.quantity) || 0;
              const rate = parseFloat(item.unit_price) || 0;
              const amount = qty * rate;
              return (
                <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={tdStyle}>{idx + 1}</td>
                  <td style={tdStyle}>{item.description || "—"}</td>
                  <td style={tdStyle}>{qty.toFixed(2)}</td>
                  <td style={tdStyle}>₹{rate.toFixed(2)}</td>
                  <td style={tdStyle}>₹{amount.toFixed(2)}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={5} style={tdStyle}>
                No items
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "5px",
          }}
        >
          <span style={{ marginRight: "60px" }}>Sub Total</span>
          <span>₹{parseFloat(quote.total_amount).toFixed(2)}</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            fontWeight: "bold",
          }}
        >
          <span style={{ marginRight: "60px" }}>Total</span>
          <span>₹{parseFloat(quote.total_amount).toFixed(2)}</span>
        </div>
      </div>

      {/* Notes & Terms */}
      {quote.notes && (
        <div style={{ marginBottom: "10px" }}>
          <strong>Notes:</strong>
          <p style={{ margin: "5px 0" }}>{quote.notes}</p>
        </div>
      )}
      {quote.terms && (
        <div style={{ marginBottom: "20px" }}>
          <strong>Terms & Conditions:</strong>
          <p style={{ margin: "5px 0" }}>{quote.terms}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "flex-end",
          marginTop: "30px",
        }}
      >
        <button onClick={() => navigate(`/quotes/${id}`)} style={secondaryBtn}>
          Back to Quote
        </button>
        <button onClick={handlePrint} style={primaryBtn}>
          Print / PDF
        </button>
      </div>
    </div>
  );
}

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
const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "500",
  marginBottom: "5px",
  color: "#333",
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
  padding: "10px 20px",
  background: "#f0f0f0",
  color: "#333",
  border: "1px solid #ccc",
  borderRadius: "5px",
  cursor: "pointer",
};

export default QuoteDocument;
