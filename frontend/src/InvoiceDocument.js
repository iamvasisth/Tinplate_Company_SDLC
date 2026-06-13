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
        className="print-hide"
        style={{
          marginBottom: "20px",
          borderBottom: "1px solid #eee",
          paddingBottom: "15px",
        }}
      >
        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle} className="print-label">Organization Name</label>
            <input
              type="text"
              value={orgInfo.name}
              onChange={(e) => setOrgInfo({ ...orgInfo, name: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle} className="print-label">Address Line 1</label>
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
            <label style={labelStyle} className="print-label">Address Line 2</label>
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
            <label style={labelStyle} className="print-label">Email</label>
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

      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between" }}>
        <div>
          <p style={{ margin: 0 }}>
            <strong>Bill To:</strong>
          </p>
          <p style={{ margin: "5px 0 0" }}>{customerName}</p>
          <p style={{ margin: "2px 0" }}>{customer?.address || ""}</p>
          {invoice.customer_gstin && <p style={{ margin: "2px 0" }}><strong>GSTIN:</strong> {invoice.customer_gstin}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0 }}><strong>Place of Supply:</strong></p>
          <p style={{ margin: "5px 0 0" }}>{invoice.place_of_supply || "—"}</p>
          <p style={{ margin: "10px 0 0" }}><strong>GST Type:</strong></p>
          <p style={{ margin: "5px 0 0" }}>{invoice.gst_type === "intra_state" ? "Intra-State (CGST & SGST)" : invoice.gst_type === "inter_state" ? "Inter-State (IGST)" : "—"}</p>
        </div>
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
            <th style={{ ...thStyle, textAlign: "center" }}>HSN/SAC</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Qty</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Rate</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Taxable</th>
            {invoice.gst_type === "intra_state" ? (
              <>
                <th style={{ ...thStyle, textAlign: "right" }}>CGST</th>
                <th style={{ ...thStyle, textAlign: "right" }}>SGST</th>
              </>
            ) : invoice.gst_type === "inter_state" ? (
              <th style={{ ...thStyle, textAlign: "right" }}>IGST</th>
            ) : (
              <th style={{ ...thStyle, textAlign: "right" }}>Tax</th>
            )}
            <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const qty      = parseFloat(item.quantity)   || 0;
            const rate     = parseFloat(item.unit_price) || 0;
            const disc     = parseFloat(item.discount)   || 0;
            const discType = item.discount_type || "flat";
            let taxable = parseFloat(item.taxable_value) || 0;
            if (!taxable) {
              taxable = qty * rate;
              if (discType === "percent") taxable -= taxable * (disc / 100);
              else taxable -= disc;
            }

            const cgstAmt = parseFloat(item.cgst_amount) || 0;
            const sgstAmt = parseFloat(item.sgst_amount) || 0;
            const igstAmt = parseFloat(item.igst_amount) || 0;
            const fallbackTaxAmt = taxable * ((parseFloat(item.tax_rate) || 0) / 100);
            const rowTotal = taxable + cgstAmt + sgstAmt + igstAmt + (cgstAmt===0 && igstAmt===0 && item.tax_rate > 0 ? fallbackTaxAmt : 0);

            return (
              <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={tdStyle}>{idx + 1}</td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: "500" }}>{item.item_name || item.description || "—"}</div>
                  {item.item_name && item.description && item.description !== item.item_name && (
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{item.description}</div>
                  )}
                </td>
                <td style={{ ...tdStyle, textAlign: "center", color: "#64748b" }}>
                  {item.hsn_code || "—"}
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  {qty.toFixed(2)}{item.unit ? ` ${item.unit}` : ""}
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  ₹{rate.toFixed(2)}
                  {disc > 0 && <div style={{ fontSize: "10px", color: "#dc2626" }}>- {discType === "percent" ? `${disc}%` : `₹${disc.toFixed(2)}`}</div>}
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>₹{taxable.toFixed(2)}</td>

                {invoice.gst_type === "intra_state" ? (
                  <>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <div>{cgstAmt.toFixed(2)}</div>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>({parseFloat(item.cgst_rate || 0)}%)</div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <div>{sgstAmt.toFixed(2)}</div>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>({parseFloat(item.sgst_rate || 0)}%)</div>
                    </td>
                  </>
                ) : invoice.gst_type === "inter_state" ? (
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                      <div>{igstAmt.toFixed(2)}</div>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>({parseFloat(item.igst_rate || 0)}%)</div>
                  </td>
                ) : (
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                      {fallbackTaxAmt.toFixed(2)}
                      <div style={{ fontSize: "10px", color: "#64748b" }}>({parseFloat(item.tax_rate || 0)}%)</div>
                  </td>
                )}

                <td style={{ ...tdStyle, textAlign: "right", fontWeight: "500" }}>₹{rowTotal.toFixed(2)}</td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr><td colSpan={10} style={{ ...tdStyle, textAlign: "center", color: "#999" }}>No items</td></tr>
          )}
        </tbody>
      </table>

      {/* GST Summary Table */}
      <div style={{ marginBottom: "20px" }}>
        <h4 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>GST Summary</h4>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ padding: "8px" }}>Taxable Amount</th>
              <th style={{ padding: "8px", textAlign: "right" }}>CGST Amount</th>
              <th style={{ padding: "8px", textAlign: "right" }}>SGST Amount</th>
              <th style={{ padding: "8px", textAlign: "right" }}>IGST Amount</th>
              <th style={{ padding: "8px", textAlign: "right" }}>Total Tax</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              let totalTaxable = 0, totalCGST = 0, totalSGST = 0, totalIGST = 0, totalTax = 0;
              items.forEach(item => {
                const qty      = parseFloat(item.quantity)   || 0;
                const rate     = parseFloat(item.unit_price) || 0;
                const disc     = parseFloat(item.discount)   || 0;
                const discType = item.discount_type || "flat";
                let taxable = parseFloat(item.taxable_value) || 0;
                if (!taxable) {
                  taxable = qty * rate;
                  if (discType === "percent") taxable -= taxable * (disc / 100);
                  else taxable -= disc;
                }
                const cgstAmt = parseFloat(item.cgst_amount) || 0;
                const sgstAmt = parseFloat(item.sgst_amount) || 0;
                const igstAmt = parseFloat(item.igst_amount) || 0;
                const fallbackTaxAmt = taxable * ((parseFloat(item.tax_rate) || 0) / 100);
                
                totalTaxable += taxable;
                totalCGST += cgstAmt;
                totalSGST += sgstAmt;
                totalIGST += igstAmt;
                if (cgstAmt === 0 && igstAmt === 0 && (parseFloat(item.tax_rate) || 0) > 0) {
                  totalTax += fallbackTaxAmt;
                } else {
                  totalTax += cgstAmt + sgstAmt + igstAmt;
                }
              });
              return (
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "8px" }}>₹{totalTaxable.toFixed(2)}</td>
                  <td style={{ padding: "8px", textAlign: "right" }}>₹{totalCGST.toFixed(2)}</td>
                  <td style={{ padding: "8px", textAlign: "right" }}>₹{totalSGST.toFixed(2)}</td>
                  <td style={{ padding: "8px", textAlign: "right" }}>₹{totalIGST.toFixed(2)}</td>
                  <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold" }}>₹{totalTax.toFixed(2)}</td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>

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
        className="print-hide"
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
