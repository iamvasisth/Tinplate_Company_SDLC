/**
 * PurchaseOrderDetail.js – High-Fidelity A4 Purchase Order Document View
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
  Issued:    { bg: "#d4edda", color: "#155724" },
  Billed:    { bg: "#d1ecf1", color: "#0c5460" },
  Cancelled: { bg: "#f8d7da", color: "#721c24" },
};

function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPO] = useState(null);
  const [items, setItems] = useState([]);
  const [vendor, setVendor] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [salesperson, setSalesperson] = useState(null);
  const [project, setProject] = useState(null);
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
        const poRes = await apiRequest(`/purchase-orders/${id}`);
        if (poRes?.purchase_order) {
          const poData = poRes.purchase_order;
          setPO(poData);
          setItems(poRes.items || []);

          if (poData.vendor_id) {
            const vendRes = await apiRequest(`/vendors/${poData.vendor_id}`);
            if (vendRes?.vendor) setVendor(vendRes.vendor);
          }

          if (poData.customer_id) {
            const custRes = await apiRequest(`/customers/${poData.customer_id}`);
            if (custRes?.customer) setCustomer(custRes.customer);
          }

          if (poData.salesperson_id) {
            const spRes = await apiRequest(`/salespersons`);
            const foundSp = spRes?.salespersons?.find(s => String(s.id) === String(poData.salesperson_id));
            if (foundSp) setSalesperson(foundSp);
          }

          if (poData.project_id) {
            const projRes = await apiRequest(`/projects`);
            const foundProj = projRes?.projects?.find(p => String(p.id) === String(poData.project_id));
            if (foundProj) setProject(foundProj);
          }
        }
      } catch (err) {
        toast.error("Failed to load Purchase Order details");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div style={{ padding: "40px" }}><FormSkeleton fields={5} /></div>;
  if (!po) return <div style={{ padding: "40px", textAlign: "center" }}>Purchase Order not found</div>;

  const changeStatus = async (newStatus) => {
    try {
      await apiRequest(`/purchase-orders/${id}`, { method: "PUT", body: JSON.stringify({ status: newStatus }) });
      toast.success(`Marked as ${newStatus}`);
      setPO({ ...po, status: newStatus });
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleConvertToBill = async () => {
    if (!window.confirm("Convert this Purchase Order to a Bill?")) return;
    try {
      const res = await apiRequest(`/purchase-orders/${id}/convert-to-bill`, { method: "POST" });
      if (res?.alreadyConverted) {
        toast("Already converted. Opening existing bill.", { icon: "ℹ️" });
        navigate(`/bills/${res.billId}`);
        return;
      }
      toast.success("Converted to Bill!");
      setPO(prev => ({ ...prev, status: "Billed" }));
      navigate(`/bills/${res.billId}`);
    } catch (err) {
      toast.error("Conversion failed");
    }
  };

  const openEmailModal = () => {
    setEmailTo(vendor?.email || "");
    setEmailSubject(`Purchase Order ${po.purchase_order_number} from ${ORG_NAME}`);
    setEmailBody(`Dear ${vendor?.display_name || vendor?.company_name || "Vendor"},\n\nPlease find our Purchase Order attached.\n\nPurchase Order Number: ${po.purchase_order_number}\nTotal: ₹${parseFloat(po.total_amount).toFixed(2)}\n\nThank you.\n\nRegards,\n${ORG_NAME}`);
    setShowEmailModal(true);
  };

  const sendEmail = async () => {
    if (!emailTo) { toast.error("Recipient email is required"); return; }
    setSendingEmail(true);
    try {
      await apiRequest(`/purchase-orders/${id}/send`, {
        method: "POST",
        body: JSON.stringify({ to: emailTo, subject: emailSubject, body: emailBody })
      });
      toast.success("Email sent successfully!");
      setShowEmailModal(false);
      if (po.status === "Draft") changeStatus("Issued");
    } catch (err) {
      toast.error("Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const calcSubtotal = () => items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0), 0);
  const calcTotalDiscount = () => items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const disc = parseFloat(item.discount) || 0;
    if (item.discount_type === "percent") return sum + (qty * rate * disc / 100);
    return sum + disc;
  }, 0);
  const calcTotalTax = () => items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    let amt = qty * rate;
    const disc = parseFloat(item.discount) || 0;
    if (item.discount_type === "percent") amt -= amt * (disc / 100);
    else amt -= disc;
    return sum + (amt * ((parseFloat(item.tax_rate) || 0) / 100));
  }, 0);

  const subtotal = calcSubtotal();
  const totalDiscount = calcTotalDiscount();
  
  const totalCGST = items.reduce((sum, item) => sum + (parseFloat(item.cgst_amount) || 0), 0);
  const totalSGST = items.reduce((sum, item) => sum + (parseFloat(item.sgst_amount) || 0), 0);
  const totalIGST = items.reduce((sum, item) => sum + (parseFloat(item.igst_amount) || 0), 0);
  const totalTax = totalCGST + totalSGST + totalIGST || calcTotalTax();
  const grandTotal = parseFloat(po.total_amount) || (subtotal - totalDiscount + totalTax);

  const badgeColor = STATUS_COLORS[po.status] || STATUS_COLORS.Draft;

  return (
    <div style={{ padding: "30px", background: "#f1f5f9", minHeight: "100vh" }}>
      {/* Top Action Bar */}
      <div className="no-print" style={{ maxWidth: "850px", margin: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", background: "#fff", padding: "15px 25px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <button onClick={() => navigate("/purchase-orders")} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#64748b" }}>←</button>
          <h2 style={{ margin: 0, fontSize: "20px" }}>{po.purchase_order_number}</h2>
          <span style={{ padding: "5px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: "600", background: badgeColor.bg, color: badgeColor.color, textTransform: "uppercase" }}>
            {po.status}
          </span>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={openEmailModal} style={actionBtn}>✉️ Email</button>
          <button onClick={handlePrint} style={actionBtn}>🖨️ Print / PDF</button>
          <button onClick={() => navigate(`/purchase-orders/${id}/edit`)} style={actionBtn}>✏️ Edit</button>
          {po.status !== "Billed" && po.status !== "Cancelled" && (
            <button onClick={handleConvertToBill} style={{ ...actionBtn, background: "#28a745", color: "#fff", borderColor: "#28a745" }}>🔄 Convert to Bill</button>
          )}
          {po.status === "Draft" && <button onClick={() => changeStatus("Issued")} style={actionBtn}>Mark Issued</button>}
          {po.status !== "Cancelled" && <button onClick={() => changeStatus("Cancelled")} style={{ ...actionBtn, color: "#e74c3c" }}>Cancel</button>}
        </div>
      </div>

      {/* A4 Document Container */}
      <div className="printable-a4" style={{ maxWidth: "850px", margin: "auto", background: "#fff", padding: "50px", boxShadow: "0 4px 15px rgba(0,0,0,0.1)", borderRadius: "2px" }}>
        {/* Ribbon for status */}
        {po.status === "Cancelled" && (
          <div style={{ textAlign: "center", color: "#e74c3c", fontWeight: "bold", border: "2px dashed #e74c3c", padding: "10px", marginBottom: "20px", textTransform: "uppercase", letterSpacing: "2px" }}>
            CANCELLED
          </div>
        )}
        {po.status === "Billed" && (
          <div style={{ textAlign: "center", color: "#0c5460", background: "#d1ecf1", fontWeight: "bold", padding: "10px", marginBottom: "20px", textTransform: "uppercase", letterSpacing: "2px" }}>
            BILLED
          </div>
        )}

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #334155", paddingBottom: "20px", marginBottom: "30px" }}>
          <div>
            <h1 style={{ margin: "0 0 10px 0", color: "#333", fontSize: "28px" }}>PURCHASE ORDER</h1>
            <div style={{ fontSize: "14px", color: "#555" }}>
              <strong># {po.purchase_order_number}</strong><br />
              Date: {new Date(po.purchase_order_date).toLocaleDateString()}<br />
              {po.expected_delivery_date && <>Expected Delivery: {new Date(po.expected_delivery_date).toLocaleDateString()}<br /></>}
              {po.reference_number && <>Ref: {po.reference_number}</>}
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
            <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#777", textTransform: "uppercase", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>Vendor</h3>
            <div style={{ fontSize: "14px", color: "#333", lineHeight: "1.6" }}>
              <strong>{vendor?.display_name || vendor?.company_name || "—"}</strong><br />
              {vendor?.email && <>{vendor.email}<br /></>}
              {vendor?.phone && <>{vendor.phone}<br /></>}
              {vendor?.billing_address && <>{vendor.billing_address}<br /></>}
              {po.customer_gstin && <><strong>GSTIN:</strong> {po.customer_gstin}<br /></>}
            </div>
          </div>

          {customer && (
            <div style={{ width: "45%" }}>
              <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#777", textTransform: "uppercase", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>Deliver To</h3>
              <div style={{ fontSize: "14px", color: "#333", lineHeight: "1.6" }}>
                <strong>{customer.display_name || [customer.first_name, customer.last_name].filter(Boolean).join(' ') || "—"}</strong><br />
                {customer.email && <>{customer.email}<br /></>}
                {customer.phone && <>{customer.phone}<br /></>}
                {customer.shipping_address ? <>{customer.shipping_address}<br /></> : (customer.billing_address && <>{customer.billing_address}<br /></>)}
              </div>
            </div>
          )}
        </div>

        {/* Meta details row (Salesperson & Project) */}
        {(salesperson || project) && (
          <div style={{ display: "flex", gap: "30px", marginBottom: "30px", fontSize: "13px", color: "#555", background: "#f8fafc", padding: "10px 15px", borderRadius: "5px", border: "1px solid #e2e8f0" }}>
            {salesperson && (
              <div>
                <strong>Salesperson:</strong> {salesperson.name}
              </div>
            )}
            {project && (
              <div>
                <strong>Project:</strong> {project.project_name}
              </div>
            )}
          </div>
        )}

        {/* Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "30px", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#333", color: "#fff" }}>
              <th style={{ padding: "12px", textAlign: "left" }}>#</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Item & Description</th>
              <th style={{ padding: "12px", textAlign: "right" }}>Qty</th>
              <th style={{ padding: "12px", textAlign: "right" }}>Rate</th>
              {totalDiscount > 0 && <th style={{ padding: "12px", textAlign: "right" }}>Discount</th>}
              {totalTax > 0 && <th style={{ padding: "12px", textAlign: "right" }}>Tax %</th>}
              <th style={{ padding: "12px", textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const lineAmt = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
              let itemDiscount = parseFloat(item.discount) || 0;
              if (item.discount_type === "percent") itemDiscount = lineAmt * (itemDiscount / 100);
              const taxable = lineAmt - itemDiscount;
              const itemTax = taxable * ((parseFloat(item.tax_rate) || 0) / 100);
              return (
                <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px", textAlign: "left" }}>{idx + 1}</td>
                  <td style={{ padding: "12px", textAlign: "left" }}>
                    <strong>{item.item_name || "Item"}</strong>
                    {item.description && <div style={{ fontSize: "12px", color: "#777", marginTop: "4px" }}>{item.description}</div>}
                    {item.hsn_code && <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>HSN: {item.hsn_code}</div>}
                  </td>
                  <td style={{ padding: "12px", textAlign: "right" }}>{parseFloat(item.quantity).toFixed(2)}</td>
                  <td style={{ padding: "12px", textAlign: "right" }}>{parseFloat(item.rate).toFixed(2)}</td>
                  {totalDiscount > 0 && <td style={{ padding: "12px", textAlign: "right" }}>₹{itemDiscount.toFixed(2)}</td>}
                  {totalTax > 0 && <td style={{ padding: "12px", textAlign: "right" }}>{parseFloat(item.tax_rate).toFixed(0)}%</td>}
                  <td style={{ padding: "12px", textAlign: "right" }}>₹{(taxable + itemTax).toFixed(2)}</td>
                </tr>
              );
            })}
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

            {/* GST breakdown */}
            {po.gst_type === "intra_state" ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", color: "#475569" }}>
                  <span>CGST</span><span>+ ₹{totalCGST.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", color: "#475569" }}>
                  <span>SGST</span><span>+ ₹{totalSGST.toFixed(2)}</span>
                </div>
              </>
            ) : (
              totalIGST > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", color: "#475569" }}>
                  <span>IGST</span><span>+ ₹{totalIGST.toFixed(2)}</span>
                </div>
              )
            )}

            {totalTax > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "14px", color: "#2980b9", borderTop: "1px dashed #cbd5e1", marginTop: "4px" }}>
                <span>Total Tax</span><span>+ ₹{totalTax.toFixed(2)}</span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontSize: "18px", fontWeight: "bold", borderTop: "2px solid #333", marginTop: "5px" }}>
              <span>Total</span><span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        {po.notes && (
          <div style={{ marginBottom: "20px", fontSize: "13px", color: "#555" }}>
            <strong>Notes:</strong><br />
            <div style={{ marginTop: "5px", whiteSpace: "pre-wrap" }}>{po.notes}</div>
          </div>
        )}
        {po.terms_conditions && (
          <div style={{ marginBottom: "20px", fontSize: "13px", color: "#555" }}>
            <strong>Terms & Conditions:</strong><br />
            <div style={{ marginTop: "5px", whiteSpace: "pre-wrap" }}>{po.terms_conditions}</div>
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
            <h3 style={{ marginTop: 0 }}>Email Purchase Order</h3>
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

export default PurchaseOrderDetail;
