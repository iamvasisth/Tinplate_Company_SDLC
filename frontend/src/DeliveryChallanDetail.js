/**
 * DeliveryChallanDetail.js – High-Fidelity A4 Delivery Challan Document View
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
  Draft:     { bg: "#e2e3e5", color: "#383d41" },
  Delivered: { bg: "#d4edda", color: "#155724" },
  Cancelled: { bg: "#f8d7da", color: "#721c24" },
};

function DeliveryChallanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dc, setDC] = useState(null);
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
        const dcRes = await apiRequest(`/delivery-challans/${id}`);
        if (dcRes?.delivery_challan) {
          setDC(dcRes.delivery_challan);
          setItems(dcRes.items || []);

          if (dcRes.delivery_challan.customer_id) {
            const custRes = await apiRequest(`/customers/${dcRes.delivery_challan.customer_id}`);
            if (custRes?.customer) setCustomer(custRes.customer);
          }
        }
      } catch (err) {
        toast.error("Failed to load Delivery Challan details");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div style={{ padding: "40px" }}><FormSkeleton fields={5} /></div>;
  if (!dc) return <div style={{ padding: "40px", textAlign: "center" }}>Delivery Challan not found</div>;

  const markDelivered = async () => {
    if (!window.confirm("Mark as Delivered? This will officially reduce stock from inventory. This action cannot be undone.")) return;
    try {
      const res = await apiRequest(`/delivery-challans/${id}/mark-delivered`, { method: "PATCH" });
      if (res?.message) {
          toast.success(res.message);
          setDC({ ...dc, status: "Delivered", stock_reduced: true });
      }
    } catch (err) {
      toast.error(err.message || "Failed to mark delivered");
    }
  };

  const handleConvertToInvoice = async () => {
    if (!window.confirm("Convert this Delivery Challan to an Invoice?")) return;
    try {
      const res = await apiRequest(`/delivery-challans/${id}/convert-to-invoice`, { method: "POST" });
      if (res?.alreadyConverted) {
        toast("Already converted. Opening existing invoice.", { icon: "ℹ️" });
        navigate(`/invoices/${res.invoiceId}`);
        return;
      }
      toast.success("Converted to Invoice!");
      navigate(`/invoices/${res.invoiceId}`);
    } catch (err) {
      toast.error("Conversion failed");
    }
  };

  const openEmailModal = () => {
    setEmailTo(customer?.email || "");
    setEmailSubject(`Delivery Challan ${dc.delivery_challan_number} from ${ORG_NAME}`);
    setEmailBody(`Dear ${customer?.display_name || customer?.company_name || "Customer"},\n\nPlease find the attached Delivery Challan for your recent order.\n\nChallan Number: ${dc.delivery_challan_number}\n\nThank you.\n\nRegards,\n${ORG_NAME}`);
    setShowEmailModal(true);
  };

  const sendEmail = async () => {
    if (!emailTo) { toast.error("Recipient email is required"); return; }
    setSendingEmail(true);
    try {
      await apiRequest(`/delivery-challans/${id}/send`, {
        method: "POST",
        body: JSON.stringify({ to: emailTo, subject: emailSubject, body: emailBody })
      });
      toast.success("Email sent successfully!");
      setShowEmailModal(false);
    } catch (err) {
      toast.error("Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const badgeColor = STATUS_COLORS[dc.status] || STATUS_COLORS.Draft;

  return (
    <div style={{ padding: "30px", background: "#f1f5f9", minHeight: "100vh" }}>
      {/* Top Action Bar */}
      <div className="no-print" style={{ maxWidth: "850px", margin: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", background: "#fff", padding: "15px 25px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <button onClick={() => navigate("/delivery-challans")} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#64748b" }}>←</button>
          <h2 style={{ margin: 0, fontSize: "20px" }}>{dc.delivery_challan_number}</h2>
          <span style={{ padding: "5px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: "600", background: badgeColor.bg, color: badgeColor.color, textTransform: "uppercase" }}>
            {dc.status}
          </span>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={openEmailModal} style={actionBtn}>✉️ Email</button>
          <button onClick={handlePrint} style={actionBtn}>🖨️ Print / PDF</button>
          
          {!dc.stock_reduced && (
             <button onClick={() => navigate(`/delivery-challans/${id}/edit`)} style={actionBtn}>✏️ Edit</button>
          )}

          {dc.status !== "Delivered" && dc.status !== "Cancelled" && (
            <button onClick={markDelivered} style={{ ...actionBtn, background: "#d4edda", color: "#155724", borderColor: "#c3e6cb" }}>✅ Mark Delivered</button>
          )}

          {dc.status !== "Cancelled" && (
            <button onClick={handleConvertToInvoice} style={{ ...actionBtn, background: "#0c5460", color: "#fff", borderColor: "#0c5460" }}>🔄 Convert to Invoice</button>
          )}
        </div>
      </div>

      {/* A4 Document Container */}
      <div className="printable-a4" style={{ maxWidth: "850px", margin: "auto", background: "#fff", padding: "50px", boxShadow: "0 4px 15px rgba(0,0,0,0.1)", borderRadius: "2px" }}>
        {/* Ribbon for status */}
        {dc.status === "Cancelled" && (
          <div style={{ textAlign: "center", color: "#e74c3c", fontWeight: "bold", border: "2px dashed #e74c3c", padding: "10px", marginBottom: "20px", textTransform: "uppercase", letterSpacing: "2px" }}>
            CANCELLED
          </div>
        )}
        {dc.stock_reduced && (
          <div className="print-hide" style={{ textAlign: "center", color: "#155724", background: "#d4edda", fontWeight: "bold", padding: "10px", marginBottom: "20px", textTransform: "uppercase", letterSpacing: "2px" }}>
            DELIVERED
          </div>
        )}

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #333", paddingBottom: "20px", marginBottom: "30px" }}>
          <div>
            <h1 style={{ margin: "0 0 10px 0", color: "#333", fontSize: "28px" }}>DELIVERY CHALLAN</h1>
            <div style={{ fontSize: "14px", color: "#555" }}>
              <strong># {dc.delivery_challan_number}</strong><br />
              Date: {new Date(dc.challan_date).toLocaleDateString()}<br />
              {dc.delivery_date && <>Delivery Date: {new Date(dc.delivery_date).toLocaleDateString()}<br /></>}
              {dc.reference_number && <>Ref: {dc.reference_number}</>}
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
            <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#777", textTransform: "uppercase", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>Ship To</h3>
            <div style={{ fontSize: "14px", color: "#333", lineHeight: "1.6" }}>
              <strong>{customer?.display_name || customer?.company_name || "—"}</strong><br />
              {dc.delivery_address ? (
                <div style={{ whiteSpace: "pre-wrap" }}>{dc.delivery_address}</div>
              ) : (
                <>
                  {customer?.email && <>{customer.email}<br /></>}
                  {customer?.phone && <>{customer.phone}<br /></>}
                  {customer?.billing_address && <>{customer.billing_address}<br /></>}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "30px", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#333", color: "#fff" }}>
              <th style={{ padding: "12px", textAlign: "left" }}>#</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Item & Description</th>
              <th style={{ padding: "12px", textAlign: "right" }}>Quantity</th>
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
                <td style={{ padding: "12px", textAlign: "right", fontWeight: "bold" }}>
                    {parseFloat(item.quantity).toFixed(2)} {item.unit || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer Notes */}
        {dc.notes && (
          <div style={{ marginBottom: "20px", fontSize: "13px", color: "#555" }}>
            <strong>Notes:</strong><br />
            <div style={{ marginTop: "5px", whiteSpace: "pre-wrap" }}>{dc.notes}</div>
          </div>
        )}
        {dc.terms_conditions && (
          <div style={{ marginBottom: "20px", fontSize: "13px", color: "#555" }}>
            <strong>Terms & Conditions:</strong><br />
            <div style={{ marginTop: "5px", whiteSpace: "pre-wrap" }}>{dc.terms_conditions}</div>
          </div>
        )}

        <div style={{ marginTop: "80px", display: "flex", justifyContent: "space-between", color: "#333", fontSize: "14px" }}>
          <div style={{ textAlign: "center" }}>
              <div>_________________________</div>
              <div style={{ marginTop: "10px" }}>Received By</div>
          </div>
          <div style={{ textAlign: "center" }}>
              <div>_________________________</div>
              <div style={{ marginTop: "10px" }}>Authorized Signature</div>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ marginTop: 0 }}>Email Delivery Challan</h3>
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

export default DeliveryChallanDetail;
