/**
 * QuoteDocument.js – Redesigned Print-friendly Quote Document (Zoho Books style)
 * Clean print layout, matching the redesign of the quote view container,
 * with editable organization details on top for customization before printing.
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

  // Editable org info
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
          const custRes = await apiRequest(`/customers/${res.quote.customer_id}`);
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
    return <div style={{ padding: "50px", textAlign: "center", fontFamily: "system-ui, -apple-system, sans-serif", color: "#667085" }}>Loading...</div>;
  }
  if (!quote) return null;

  const customerName = customer?.display_name || "Customer";
  const total = quote ? parseFloat(quote.total_amount) || 0 : 0;
  
  let totalWords = "";
  try {
    totalWords = require("number-to-words").toWords(Math.floor(total));
    totalWords = totalWords.charAt(0).toUpperCase() + totalWords.slice(1);
  } catch (e) {
    totalWords = total.toFixed(0);
  }

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "30px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#1d2939",
        lineHeight: "1.6",
      }}
    >
      {/* EDITABLE ORG INFO IN HEADER (HIDDEN WHEN PRINTED) */}
      <div
        className="print-hide"
        style={{
          marginBottom: "24px",
          border: "1px solid #eaecf0",
          borderRadius: "6px",
          padding: "16px 20px",
          background: "#f9fafb",
        }}
      >
        <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", fontWeight: "600", color: "#344054", textTransform: "uppercase", letterSpacing: "0.03em" }}>
          Edit Organization Information (Hidden in print)
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "16px", marginBottom: "12px" }}>
          <div>
            <label style={labelStyle}>Organization Name</label>
            <input
              type="text"
              value={orgInfo.name}
              onChange={(e) => setOrgInfo({ ...orgInfo, name: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Organization Address</label>
            <input
              type="text"
              value={orgInfo.address}
              onChange={(e) => setOrgInfo({ ...orgInfo, address: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <label style={labelStyle}>Country</label>
            <input
              type="text"
              value={orgInfo.country}
              onChange={(e) => setOrgInfo({ ...orgInfo, country: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={orgInfo.email}
              onChange={(e) => setOrgInfo({ ...orgInfo, email: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* PRINT AREA CONTAINER */}
      <div
        style={{
          border: "1px solid #d0d5dd",
          borderRadius: "4px",
          padding: "40px",
          background: "#ffffff",
          position: "relative",
        }}
      >
        {/* Company Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
          <div style={{ fontSize: "12px", color: "#475569" }}>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: "700", color: "#1d2939" }}>{orgInfo.name}</h3>
            <div style={{ margin: "2px 0" }}>{orgInfo.address}</div>
            <div style={{ margin: "2px 0" }}>{orgInfo.country}</div>
            <div style={{ margin: "2px 0" }}>{orgInfo.email}</div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "#1d2939", textTransform: "uppercase", letterSpacing: "0.02em" }}>
            Quote
          </div>
        </div>

        {/* Meta Box */}
        <div style={{ border: "1px solid #d0d5dd", borderRadius: "4px", overflow: "hidden", marginBottom: "24px" }}>
          
          <div style={{ display: "flex", borderBottom: "1px solid #d0d5dd" }}>
            <div style={{ flex: 1, borderRight: "1px solid #d0d5dd", padding: "12px 16px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <tbody>
                  <tr>
                    <td style={{ width: "110px", padding: "3px 0", color: "#667085", fontWeight: "500" }}>Quote Number</td>
                    <td style={{ padding: "3px 0", fontWeight: "600" }}>: {quote.quote_number}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "3px 0", color: "#667085", fontWeight: "500" }}>Quote Date</td>
                    <td style={{ padding: "3px 0" }}>: {new Date(quote.quote_date).toLocaleDateString("en-IN")}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "3px 0", color: "#667085", fontWeight: "500" }}>Expiry Date</td>
                    <td style={{ padding: "3px 0" }}>: {quote.expiry_date ? new Date(quote.expiry_date).toLocaleDateString("en-IN") : "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ flex: 1, padding: "12px 16px" }}></div>
          </div>

          <div style={{ background: "#f9fafb", padding: "8px 16px", borderBottom: "1px solid #d0d5dd", fontWeight: "600", color: "#344054", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.03em" }}>
            Bill To
          </div>
          
          <div style={{ padding: "14px 16px", fontSize: "13px", color: "#475569" }}>
            <div style={{ color: "#006ee6", fontWeight: "700", fontSize: "14px", marginBottom: "4px" }}>
              {customerName}
            </div>
            {customer?.email && <div style={{ margin: "2px 0" }}>{customer.email}</div>}
            {customer?.phone && <div style={{ margin: "2px 0" }}>{customer.phone}</div>}
          </div>

          {/* Items Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", borderTop: "1px solid #d0d5dd" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #d0d5dd" }}>
                <th style={{ ...thStyle, width: "30px", textAlign: "left" }}>#</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Item & Description</th>
                <th style={{ ...thStyle, textAlign: "center" }}>HSN/SAC</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Qty</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Rate</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Tax%</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const qty      = parseFloat(item.quantity)   || 0;
                const rate     = parseFloat(item.unit_price) || 0;
                const disc     = parseFloat(item.discount)   || 0;
                const discType = item.discount_type || "flat";
                const taxRate  = parseFloat(item.tax_rate)   || 0;
                let lineAmt = qty * rate;
                if (discType === "percent") lineAmt -= lineAmt * (disc / 100);
                else lineAmt -= disc;
                const taxAmt = lineAmt * (taxRate / 100);
                const lineTotal  = lineAmt + taxAmt;

                return (
                  <tr key={idx} style={{ borderBottom: "1px solid #d0d5dd" }}>
                    <td style={tdStyle}>{idx + 1}</td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: "600", color: "#344054" }}>{item.item_name || item.description || "—"}</div>
                      {item.item_name && item.description && item.description !== item.item_name && (
                        <div style={{ fontSize: "11px", color: "#667085", marginTop: "2px" }}>{item.description}</div>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center", color: "#667085" }}>{item.hsn_code || "—"}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {qty.toFixed(2)}{item.unit ? ` ${item.unit}` : ""}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{rate.toFixed(2)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {taxRate > 0 ? `${taxRate}%` : "—"}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600", color: "#1d2939" }}>
                      ₹{lineTotal.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer Words & Totals */}
          <div style={{ display: "flex", fontSize: "12px", background: "#ffffff" }}>
            
            <div style={{ flex: 1, borderRight: "1px solid #d0d5dd", padding: "16px" }}>
              <div style={{ color: "#667085", fontWeight: "500", marginBottom: "4px" }}>Total In Words</div>
              <div style={{ fontStyle: "italic", fontWeight: "700", color: "#344054", marginBottom: "20px" }}>
                Indian Rupee {totalWords} Only
              </div>
              <div style={{ color: "#667085", fontWeight: "500", marginBottom: "4px" }}>Notes</div>
              <div style={{ color: "#475569" }}>{quote.notes || "Looking forward for your business."}</div>
            </div>

            <div style={{ width: "320px", display: "flex", flexDirection: "column" }}>
              <div style={{ borderBottom: "1px solid #d0d5dd", padding: "16px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: "4px 0", color: "#667085", textAlign: "right", paddingRight: "16px" }}>Sub Total</td>
                      <td style={{ padding: "4px 0", textAlign: "right", fontWeight: "500", width: "100px" }}>
                        {total.toFixed(2)}
                      </td>
                    </tr>
                    <tr style={{ fontSize: "13px", fontWeight: "700" }}>
                      <td style={{ padding: "8px 0 4px", color: "#1d2939", textAlign: "right", paddingRight: "16px" }}>Total</td>
                      <td style={{ padding: "8px 0 4px", textAlign: "right", color: "#006ee6" }}>
                        ₹{total.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{ padding: "16px", flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", color: "#667085", fontWeight: "500" }}>
                Authorized Signature
              </div>
            </div>

          </div>
        </div>

        {quote.terms && (
          <div style={{ borderTop: "1px dashed #d0d5dd", paddingTop: "16px", fontSize: "11px", color: "#667085" }}>
            <strong>Terms &amp; Conditions:</strong>
            <p style={{ margin: "4px 0 0" }}>{quote.terms}</p>
          </div>
        )}
      </div>

      {/* Action Buttons (Print / Back) */}
      <div
        className="print-hide"
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "flex-end",
          marginTop: "24px",
        }}
      >
        <button
          onClick={() => navigate(`/quotes/${id}`)}
          style={{
            padding: "8px 16px",
            background: "#ffffff",
            color: "#344054",
            border: "1px solid #d0d5dd",
            borderRadius: "4px",
            fontSize: "13px",
            fontWeight: "500",
            cursor: "pointer",
          }}
        >
          Back to Quote
        </button>
        <button
          onClick={handlePrint}
          style={{
            padding: "8px 16px",
            background: "#006ee6",
            color: "#ffffff",
            border: "none",
            borderRadius: "4px",
            fontSize: "13px",
            fontWeight: "500",
            cursor: "pointer",
          }}
        >
          Print / PDF
        </button>
      </div>
    </div>
  );
}

const thStyle = {
  padding: "8px 12px",
  color: "#475569",
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase",
  borderBottom: "1px solid #d0d5dd",
  letterSpacing: "0.03em",
};

const tdStyle = {
  padding: "10px 12px",
  color: "#475569",
  verticalAlign: "top",
};

const labelStyle = {
  display: "block",
  fontSize: "12px",
  fontWeight: "600",
  color: "#344054",
  marginBottom: "4px",
};

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: "4px",
  border: "1px solid #d0d5dd",
  fontSize: "13px",
  boxSizing: "border-box",
  outline: "none",
  color: "#344054",
  background: "#ffffff",
};

export default QuoteDocument;
