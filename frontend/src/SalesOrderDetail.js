/**
 * SalesOrderDetail.js – High-Fidelity A4 Sales Order Document View
 */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { FormSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

const ORG_NAME = "Tinplate Computer Training Center";
const ORG_ADDRESS = "2nd Floor, Thakur Pyara Singh Road, Jamshedpur – 831001";
const ORG_EMAIL = "kumarrahulraj468@gmail.com";
const ORG_COUNTRY = "India";

const STATUS_COLORS = {
  draft:     { bg: "#e2e3e5", color: "#383d41" },
  confirmed: { bg: "#d4edda", color: "#155724" },
  invoiced:  { bg: "#d1ecf1", color: "#0c5460" },
  cancelled: { bg: "#f8d7da", color: "#721c24" },
};

function SalesOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [so, setSO] = useState(null);
  const [items, setItems] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  // Email modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const soRes = await apiRequest(`/sales-orders/${id}`);
        if (soRes?.sales_order) {
          setSO(soRes.sales_order);
          setItems(soRes.items || []);

          if (soRes.sales_order.customer_id) {
            const custRes = await apiRequest(`/customers/${soRes.sales_order.customer_id}`);
            if (custRes?.customer) setCustomer(custRes.customer);
          }
        }
      } catch (err) {
        toast.error("Failed to load Sales Order details");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div style={{ padding: "40px" }}><FormSkeleton fields={5} /></div>;
  if (!so) return <div style={{ padding: "40px", textAlign: "center" }}>Sales Order not found</div>;

  const changeStatus = async (newStatus) => {
    try {
      await apiRequest(`/sales-orders/${id}`, { method: "PUT", body: JSON.stringify({ status: newStatus }) });
      toast.success(`Marked as ${newStatus}`);
      setSO({ ...so, status: newStatus });
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleConvertToInvoice = async () => {
    if (!window.confirm("Convert this Sales Order to an Invoice?")) return;
    try {
      const res = await apiRequest(`/sales-orders/${id}/convert-to-invoice`, { method: "POST" });
      if (res?.alreadyConverted) {
        toast("Already converted. Opening existing invoice.", { icon: "ℹ️" });
        navigate(`/invoices/${res.invoiceId}`);
        return;
      }
      toast.success("Converted to Invoice!");
      setSO(prev => ({ ...prev, status: "invoiced" }));
      navigate(`/invoices/${res.invoiceId}`);
    } catch (err) {
      toast.error("Conversion failed");
    }
  };

  const openEmailModal = () => {
    setEmailTo(customer?.email || "");
    setEmailSubject(`Sales Order ${so.sales_order_number} from ${ORG_NAME}`);
    setEmailBody(`Dear ${customer?.display_name || "Customer"},\n\nPlease find your Sales Order attached.\n\nSales Order Number: ${so.sales_order_number}\nTotal: ₹${parseFloat(so.total_amount).toFixed(2)}\n\nThank you for your business.\n\nRegards,\n${ORG_NAME}`);
    setShowEmailModal(true);
  };

  const sendEmail = async () => {
    if (!emailTo) { toast.error("Recipient email is required"); return; }
    setSendingEmail(true);
    try {
      await apiRequest(`/sales-orders/${id}/send`, {
        method: "POST",
        body: JSON.stringify({ to: emailTo, subject: emailSubject, body: emailBody })
      });
      toast.success("Email sent successfully!");
      setShowEmailModal(false);
      if (so.status === "draft") changeStatus("confirmed");
    } catch (err) {
      toast.error("Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const calcSubtotal = () => items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0);
  const calcTotalDiscount = () => items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.unit_price) || 0;
    const disc = parseFloat(item.discount) || 0;
    if (item.discount_type === "percent") return sum + (qty * rate * disc / 100);
    return sum + disc;
  }, 0);
  const calcTotalTax = () => items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.unit_price) || 0;
    let amt = qty * rate;
    const disc = parseFloat(item.discount) || 0;
    if (item.discount_type === "percent") amt -= amt * (disc / 100);
    else amt -= disc;
    return sum + (amt * ((parseFloat(item.tax_rate) || 0) / 100));
  }, 0);

  const subtotal = calcSubtotal();
  const totalDiscount = calcTotalDiscount();
  const totalTax = calcTotalTax();
  const grandTotal = parseFloat(so.total_amount) || (subtotal - totalDiscount + totalTax);

  const badgeColor = STATUS_COLORS[so.status] || STATUS_COLORS.draft;

  return (
    <div style={{ padding: "30px", background: "#f1f5f9", minHeight: "100vh" }}>
      {/* Top Action Bar */}
      <div className="no-print" style={{ maxWidth: "850px", margin: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", background: "#fff", padding: "15px 25px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <button onClick={() => navigate("/sales-orders")} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#64748b" }}>←</button>
          <h2 style={{ margin: 0, fontSize: "20px" }}>{so.sales_order_number}</h2>
          <span style={{ padding: "5px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: "600", background: badgeColor.bg, color: badgeColor.color, textTransform: "uppercase" }}>
            {so.status}
          </span>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={openEmailModal} style={actionBtn}>✉️ Email</button>
          <button onClick={handlePrint} style={actionBtn}>🖨️ Print / PDF</button>
          <button onClick={() => navigate(`/sales-orders/${id}/edit`)} style={actionBtn}>✏️ Edit</button>
          {so.status !== "invoiced" && so.status !== "cancelled" && (
            <button onClick={handleConvertToInvoice} style={{ ...actionBtn, background: "#28a745", color: "#fff", borderColor: "#28a745" }}>🔄 Convert to Invoice</button>
          )}
          {so.status === "draft" && <button onClick={() => changeStatus("confirmed")} style={actionBtn}>Mark Confirmed</button>}
          {so.status !== "cancelled" && <button onClick={() => changeStatus("cancelled")} style={{ ...actionBtn, color: "#e74c3c" }}>Cancel</button>}
        </div>
      </div>

      {/* A4 Document Container */}
      <div className="printable-a4" style={{ maxWidth: "850px", margin: "auto", background: "#fff", padding: "50px", boxShadow: "0 4px 15px rgba(0,0,0,0.1)", borderRadius: "2px" }}>
        {/* Ribbon for status */}
        {so.status === "cancelled" && (
          <div style={{ textAlign: "center", color: "#e74c3c", fontWeight: "bold", border: "2px dashed #e74c3c", padding: "10px", marginBottom: "20px", textTransform: "uppercase", letterSpacing: "2px" }}>
            CANCELLED
          </div>
        )}
        {so.status === "invoiced" && (
          <div style={{ textAlign: "center", color: "#0c5460", background: "#d1ecf1", fontWeight: "bold", padding: "10px", marginBottom: "20px", textTransform: "uppercase", letterSpacing: "2px" }}>
            INVOICED
          </div>
        )}

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #333", paddingBottom: "20px", marginBottom: "30px" }}>
          <div>
            <h1 style={{ margin: "0 0 10px 0", color: "#333", fontSize: "28px" }}>SALES ORDER</h1>
            <div style={{ fontSize: "14px", color: "#555" }}>
              <strong># {so.sales_order_number}</strong><br />
              Date: {new Date(so.sales_order_date).toLocaleDateString()}<br />
              {so.expected_shipment_date && <>Expected Shipment: {new Date(so.expected_shipment_date).toLocaleDateString()}<br /></>}
              {so.reference_number && <>Ref: {so.reference_number}</>}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: "14px", color: "#555" }}>
            <h2 style={{ margin: "0 0 5px 0", color: "#333", fontSize: "18px" }}>{ORG_NAME}</h2>
            <div>{ORG_ADDRESS}</div>
            <div>{ORG_COUNTRY}</div>
            <div>{ORG_EMAIL}</div>
          </div>
        </div>

        {/* Addresses */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px" }}>
          <div style={{ width: "45%" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#777", textTransform: "uppercase", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>Bill To</h3>
            <div style={{ fontSize: "14px", color: "#333", lineHeight: "1.6" }}>
              <strong>{customer?.display_name || "—"}</strong><br />
              {customer?.company_name && <>{customer.company_name}<br /></>}
              {customer?.email && <>{customer.email}<br /></>}
              {customer?.phone && <>{customer.phone}<br /></>}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "30px", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#333", color: "#fff" }}>
              <th style={{ padding: "12px", textAlign: "left" }}>#</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Item & Description</th>
              <th style={{ padding: "12px", textAlign: "right" }}>Qty</th>
              <th style={{ padding: "12px", textAlign: "right" }}>Rate</th>
              <th style={{ padding: "12px", textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "12px", textAlign: "left" }}>{idx + 1}</td>
                <td style={{ padding: "12px", textAlign: "left" }}>
                  <strong>{item.item_name || "Item"}</strong>
                  {item.description && <div style={{ fontSize: "12px", color: "#777", marginTop: "4px" }}>{item.description}</div>}
                </td>
                <td style={{ padding: "12px", textAlign: "right" }}>{parseFloat(item.quantity).toFixed(2)}</td>
                <td style={{ padding: "12px", textAlign: "right" }}>{parseFloat(item.unit_price).toFixed(2)}</td>
                <td style={{ padding: "12px", textAlign: "right" }}>₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Box */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "40px" }}>
          <div style={{ width: "350px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "14px" }}>
              <span>Sub Total</span><span>₹{subtotal.toFixed(2)}</span>
            </div>
            {totalDiscount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "14px", color: "#e74c3c" }}>
                <span>Discount</span><span>- ₹{totalDiscount.toFixed(2)}</span>
              </div>
            )}
            {totalTax > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "14px", color: "#2980b9" }}>
                <span>Tax</span><span>+ ₹{totalTax.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontSize: "18px", fontWeight: "bold", borderTop: "2px solid #333", marginTop: "5px" }}>
              <span>Total</span><span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        {so.notes && (
          <div style={{ marginBottom: "20px", fontSize: "13px", color: "#555" }}>
            <strong>Notes:</strong><br />
            <div style={{ marginTop: "5px", whiteSpace: "pre-wrap" }}>{so.notes}</div>
          </div>
        )}
        {so.terms && (
          <div style={{ marginBottom: "20px", fontSize: "13px", color: "#555" }}>
            <strong>Terms & Conditions:</strong><br />
            <div style={{ marginTop: "5px", whiteSpace: "pre-wrap" }}>{so.terms}</div>
          </div>
        )}

        <div style={{ marginTop: "60px", textAlign: "right", color: "#333", fontSize: "14px" }}>
          <div>_________________________</div>
          <div style={{ marginTop: "10px" }}>Authorized Signature</div>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ marginTop: 0 }}>Email Sales Order</h3>
            <div style={{ marginBottom: "15px" }}>
              <label><strong>To:</strong></label>
              <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label><strong>Subject:</strong></label>
              <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label><strong>Message:</strong></label>
              <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={6} style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowEmailModal(false)} style={cancelBtnStyle} disabled={sendingEmail}>Cancel</button>
              <button onClick={sendEmail} style={primaryBtn} disabled={sendingEmail}>
                {sendingEmail ? "Sending..." : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable-a4, .printable-a4 * { visibility: visible; }
          .printable-a4 { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; padding: 0; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}

const actionBtn = { padding: "8px 15px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "5px", cursor: "pointer", fontSize: "13px", fontWeight: "500", color: "#334155" };
const inputStyle = { width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc", boxSizing: "border-box", fontSize: "14px" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "500" };
const cancelBtnStyle = { padding: "10px 20px", background: "#ccc", color: "#333", border: "none", borderRadius: "5px", cursor: "pointer" };
const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalBox = { background: "#fff", borderRadius: "8px", padding: "25px", width: "600px", maxWidth: "90%", maxHeight: "80vh", overflow: "auto", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" };

export default SalesOrderDetail;
