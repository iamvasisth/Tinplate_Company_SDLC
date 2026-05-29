import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

const ORG_NAME = "Tinplate Computer Training Center";
const ORG_ADDRESS1 = "2nd Floor, Thakur Pyare Singh Road";
const ORG_ADDRESS2 = "Jamshedpur - 831001";
const ORG_EMAIL = "india.technologyhelp88@gmail.com";

function InvoiceDocument() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [fetching, setFetching] = useState(true);

  const [orgInfo, setOrgInfo] = useState({
    name: ORG_NAME,
    address1: ORG_ADDRESS1,
    address2: ORG_ADDRESS2,
    email: ORG_EMAIL,
  });

  // ...fetch logic same as before...
  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await apiRequest(`/invoices/${id}`);
        if (!res?.invoice) {
          toast.error("Invoice not found");
          navigate("/invoices");
          return;
        }
        setInvoice(res.invoice);
        setItems(res.items || []);
        if (res.invoice.customer_id) {
          const custRes = await apiRequest(
            `/customers/${res.invoice.customer_id}`,
          );
          if (custRes?.customer) setCustomer(custRes.customer);
        }
      } catch (err) {
        toast.error("Failed to load invoice");
      } finally {
        setFetching(false);
      }
    };
    fetchInvoice();
  }, [id, navigate]);

  const handlePrint = () => window.print();

  if (fetching)
    return <div style={{ padding: "50px", textAlign: "center" }}>Loading…</div>;
  if (!invoice) return null;

  const customerName = customer?.display_name || "Customer";
  const total = parseFloat(invoice.total_amount) || 0;
  const balanceDue = parseFloat(invoice.balance_due) || total;

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "auto",
        padding: "30px",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        border: "1px solid #ddd",
      }}
    >
      {/* Editable org info */}
      <div
        style={{
          marginBottom: "20px",
          borderBottom: "1px solid #eee",
          paddingBottom: "15px",
        }}
      >
        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Organization Name</label>
            <input
              type="text"
              value={orgInfo.name}
              onChange={(e) => setOrgInfo({ ...orgInfo, name: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Address Line 1</label>
            <input
              type="text"
              value={orgInfo.address1}
              onChange={(e) =>
                setOrgInfo({ ...orgInfo, address1: e.target.value })
              }
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Address Line 2</label>
            <input
              type="text"
              value={orgInfo.address2}
              onChange={(e) =>
                setOrgInfo({ ...orgInfo, address2: e.target.value })
              }
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
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

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>{orgInfo.name}</h3>
          <p style={{ margin: "2px 0" }}>{orgInfo.address1}</p>
          <p style={{ margin: "2px 0" }}>{orgInfo.address2}</p>
          <p style={{ margin: "2px 0" }}>{orgInfo.email}</p>
        </div>
        <h1 style={{ margin: 0, fontSize: "28px" }}>TAX INVOICE</h1>
      </div>

      <div
        style={{
          borderTop: "2px solid #000",
          borderBottom: "2px solid #000",
          padding: "10px 0",
          marginBottom: "15px",
          display: "flex",
          gap: "40px",
          fontSize: "14px",
        }}
      >
        <div>
          <strong>#:</strong> INV-
          {invoice.invoice_number || `00000${invoice.id}`}
        </div>
        <div>
          <strong>Invoice Date:</strong>{" "}
          {new Date(invoice.invoice_date).toLocaleDateString("en-IN")}
        </div>
        <div>
          <strong>Terms:</strong> {invoice.payment_terms || "Due on Receipt"}
        </div>
        <div>
          <strong>Due Date:</strong>{" "}
          {invoice.due_date
            ? new Date(invoice.due_date).toLocaleDateString("en-IN")
            : "—"}
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <p>
          <strong>Bill To:</strong>
        </p>
        <p style={{ margin: "5px 0 0" }}>{customerName}</p>
        <p style={{ margin: "2px 0" }}>{customer?.address || ""}</p>
      </div>

      {/* Items Table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "15px",
          fontSize: "14px",
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
          {items.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
              <td style={tdStyle}>{idx + 1}</td>
              <td style={tdStyle}>{item.description || "—"}</td>
              <td style={tdStyle}>
                {(parseFloat(item.quantity) || 0).toFixed(2)}
              </td>
              <td style={tdStyle}>
                ₹{(parseFloat(item.unit_price) || 0).toFixed(2)}
              </td>
              <td style={tdStyle}>
                ₹
                {(
                  (parseFloat(item.quantity) || 0) *
                  (parseFloat(item.unit_price) || 0)
                ).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div
        style={{
          borderTop: "2px solid #000",
          paddingTop: "10px",
          textAlign: "right",
          marginBottom: "15px",
        }}
      >
        <p style={{ margin: "3px 0" }}>
          <strong>Sub Total:</strong> ₹{total.toFixed(2)}
        </p>
        <p style={{ margin: "3px 0" }}>
          <strong>Total:</strong> ₹{total.toFixed(2)}
        </p>
        <p style={{ margin: "3px 0" }}>
          <strong>Balance Due:</strong> ₹{balanceDue.toFixed(2)}
        </p>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <strong>Total in Words:</strong>
        <br />
        {(() => {
          try {
            return (
              require("number-to-words")
                .toWords(Math.floor(total))
                .charAt(0)
                .toUpperCase() +
              require("number-to-words").toWords(Math.floor(total)).slice(1) +
              " Only"
            );
          } catch {
            return "Indian Rupee " + total.toFixed(0) + " Only";
          }
        })()}
      </div>

      {invoice.notes && (
        <div style={{ marginBottom: "20px" }}>
          <strong>Notes:</strong>
          <p style={{ margin: "5px 0" }}>{invoice.notes}</p>
        </div>
      )}

      <div style={{ textAlign: "right", marginTop: "60px" }}>
        <p style={{ margin: 0 }}>Authorized Signature</p>
        <div
          style={{
            width: "200px",
            marginLeft: "auto",
            borderBottom: "1px solid #000",
            marginTop: "30px",
          }}
        ></div>
      </div>

      <div
        style={{
          borderTop: "2px solid #000",
          paddingTop: "10px",
          textAlign: "center",
          marginTop: "50px",
          fontSize: "13px",
        }}
      >
        POWERED BY {orgInfo.name}
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "flex-end",
          marginTop: "30px",
        }}
      >
        <button
          onClick={() => navigate(`/invoices/${id}`)}
          style={{
            padding: "10px 20px",
            background: "#f0f0f0",
            border: "1px solid #ccc",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Back to Invoice
        </button>
        <button
          onClick={handlePrint}
          style={{
            padding: "10px 20px",
            background: "#4a90e2",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "500",
          }}
        >
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

export default InvoiceDocument;
