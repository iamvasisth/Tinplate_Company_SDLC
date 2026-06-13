/**
 * VendorCreditDetail.js – High-Fidelity A4 Vendor Credit Document View
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
  Open:      { bg: "#cce5ff", color: "#004085" },
  Applied:   { bg: "#d4edda", color: "#155724" },
  Cancelled: { bg: "#f8d7da", color: "#721c24" },
};

function VendorCreditDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vc, setVC] = useState(null);
  const [items, setItems] = useState([]);
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  // Email modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Apply to Bill modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [availableBills, setAvailableBills] = useState([]);
  const [selectedBillId, setSelectedBillId] = useState("");
  const [amountToApply, setAmountToApply] = useState("");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const vcRes = await apiRequest(`/vendor-credits/${id}`);
      if (vcRes?.vendor_credit) {
        setVC(vcRes.vendor_credit);
        setItems(vcRes.items || []);

        if (vcRes.vendor_credit.vendor_id) {
          const vendorRes = await apiRequest(`/vendors/${vcRes.vendor_credit.vendor_id}`);
          if (vendorRes?.vendor) setVendor(vendorRes.vendor);
        }
      }
    } catch (err) {
      toast.error("Failed to load Vendor Credit details");
    } finally {
      setLoading(false);
    }
  };

  const loadUnpaidBills = async () => {
    if (!vc || !vc.vendor_id) return;
    try {
      const res = await apiRequest(`/bills`);
      if (res?.bills) {
        const unpaid = res.bills.filter(b => 
          String(b.vendor_id) === String(vc.vendor_id) && 
          b.status !== "paid" && 
          parseFloat(b.balance_due) > 0
        );
        setAvailableBills(unpaid);
      }
    } catch (err) {
      toast.error("Failed to load bills");
    }
  };

  const openApplyModal = () => {
    setAmountToApply(vc.remaining_amount);
    loadUnpaidBills();
    setShowApplyModal(true);
  };

  const handleApplyCredit = async () => {
    if (!selectedBillId) { toast.error("Please select a bill"); return; }
    if (!amountToApply || parseFloat(amountToApply) <= 0) { toast.error("Enter a valid amount"); return; }
    
    setApplying(true);
    try {
      await apiRequest(`/vendor-credits/${id}/apply-to-bill`, {
        method: "POST",
        body: JSON.stringify({
          bill_id: parseInt(selectedBillId),
          amount_to_apply: parseFloat(amountToApply)
        })
      });
      toast.success(`Successfully applied ₹${amountToApply}`);
      setShowApplyModal(false);
      fetchData(); // Reload VC to get updated remaining_amount and status
    } catch (err) {
      toast.error(err.message || "Failed to apply credit");
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <div style={{ padding: "40px" }}><FormSkeleton fields={5} /></div>;
  if (!vc) return <div style={{ padding: "40px", textAlign: "center" }}>Vendor Credit not found</div>;

  const openEmailModal = () => {
    setEmailTo(vendor?.email || "");
    setEmailSubject(`Vendor Credit ${vc.vendor_credit_number} from ${ORG_NAME}`);
    setEmailBody(`Dear ${vendor?.display_name || vendor?.company_name || "Vendor"},\n\nPlease find your Vendor Credit attached.\n\nVendor Credit Number: ${vc.vendor_credit_number}\nAmount: ₹${parseFloat(vc.total).toFixed(2)}\n\nThank you.\n\nRegards,\n${ORG_NAME}`);
    setShowEmailModal(true);
  };

  const sendEmail = async () => {
    if (!emailTo) { toast.error("Recipient email is required"); return; }
    setSendingEmail(true);
    try {
      await apiRequest(`/vendor-credits/${id}/send`, {
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

  const badgeColor = STATUS_COLORS[vc.status] || STATUS_COLORS.Draft;

  return (
    <div style={{ padding: "30px", background: "#f1f5f9", minHeight: "100vh" }}>
      {/* Top Action Bar */}
      <div className="no-print" style={{ maxWidth: "850px", margin: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", background: "#fff", padding: "15px 25px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <button onClick={() => navigate("/vendor-credits")} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#64748b" }}>←</button>
          <h2 style={{ margin: 0, fontSize: "20px" }}>{vc.vendor_credit_number}</h2>
          <span style={{ padding: "5px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: "600", background: badgeColor.bg, color: badgeColor.color, textTransform: "uppercase" }}>
            {vc.status}
          </span>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={openEmailModal} style={actionBtn}>✉️ Email</button>
          <button onClick={handlePrint} style={actionBtn}>🖨️ Print / PDF</button>
          
          {parseFloat(vc.applied_amount) === 0 && (
             <button onClick={() => navigate(`/vendor-credits/${id}/edit`)} style={actionBtn}>✏️ Edit</button>
          )}

          {vc.status !== "Cancelled" && parseFloat(vc.remaining_amount) > 0 && (
            <button onClick={openApplyModal} style={{ ...actionBtn, background: "#0c5460", color: "#fff", borderColor: "#0c5460" }}>➕ Apply to Bill</button>
          )}
        </div>
      </div>

      {/* A4 Document Container */}
      <div className="printable-a4" style={{ maxWidth: "850px", margin: "auto", background: "#fff", padding: "50px", boxShadow: "0 4px 15px rgba(0,0,0,0.1)", borderRadius: "2px", position: "relative" }}>
        
        {/* Watermark for Cancelled */}
        {vc.status === "Cancelled" && (
          <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%, -50%) rotate(-45deg)", fontSize: "100px", color: "rgba(255,0,0,0.1)", fontWeight: "bold", zIndex: 0, pointerEvents: "none" }}>
            CANCELLED
          </div>
        )}

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #333", paddingBottom: "20px", marginBottom: "30px", position: "relative", zIndex: 1 }}>
          <div>
            <h1 style={{ margin: "0 0 10px 0", color: "#333", fontSize: "28px" }}>VENDOR CREDIT</h1>
            <div style={{ fontSize: "14px", color: "#555" }}>
              <strong># {vc.vendor_credit_number}</strong><br />
              Date: {new Date(vc.vendor_credit_date).toLocaleDateString()}<br />
              {vc.reference_number && <>Ref: {vc.reference_number}</>}
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
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px", position: "relative", zIndex: 1 }}>
          <div style={{ width: "45%" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#777", textTransform: "uppercase", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>Vendor</h3>
            <div style={{ fontSize: "14px", color: "#333", lineHeight: "1.6" }}>
              <strong>{vendor?.display_name || vendor?.company_name || "—"}</strong><br />
              {vendor?.billing_address && <div style={{ whiteSpace: "pre-wrap" }}>{vendor.billing_address}</div>}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "30px", fontSize: "14px", position: "relative", zIndex: 1 }}>
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
                <td style={{ padding: "12px", textAlign: "right" }}>₹{parseFloat(item.rate).toFixed(2)}</td>
                <td style={{ padding: "12px", textAlign: "right", fontWeight: "bold" }}>₹{parseFloat(item.line_total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "30px", position: "relative", zIndex: 1 }}>
          <div style={{ width: "300px", fontSize: "14px" }}>
            <div style={calcRow}><span>SubTotal:</span> <span>₹{parseFloat(vc.subtotal).toFixed(2)}</span></div>
            {parseFloat(vc.discount_total) > 0 && <div style={calcRow}><span>Discount:</span> <span style={{ color: "red" }}>-₹{parseFloat(vc.discount_total).toFixed(2)}</span></div>}
            {parseFloat(vc.tax_total) > 0 && <div style={calcRow}><span>Tax:</span> <span>₹{parseFloat(vc.tax_total).toFixed(2)}</span></div>}
            <div style={{ ...calcRow, fontWeight: "bold", fontSize: "18px", borderTop: "2px solid #333", paddingTop: "10px", marginTop: "10px" }}>
              <span>Total:</span> <span>₹{parseFloat(vc.total).toFixed(2)}</span>
            </div>
            
            {parseFloat(vc.applied_amount) > 0 && (
                <div style={{ ...calcRow, color: "#28a745", fontWeight: "bold", marginTop: "10px" }}>
                    <span>Credits Applied:</span> <span>-₹{parseFloat(vc.applied_amount).toFixed(2)}</span>
                </div>
            )}
            
            <div style={{ ...calcRow, fontWeight: "bold", fontSize: "16px", background: "#f8f9fa", padding: "10px", marginTop: "10px", borderRadius: "5px" }}>
                <span>Remaining:</span> <span>₹{parseFloat(vc.remaining_amount).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        <div style={{ position: "relative", zIndex: 1 }}>
            {vc.reason && (
              <div style={{ marginBottom: "20px", fontSize: "13px", color: "#555" }}>
                <strong>Reason:</strong><br />
                <div style={{ marginTop: "5px", whiteSpace: "pre-wrap" }}>{vc.reason}</div>
              </div>
            )}
            {vc.notes && (
              <div style={{ marginBottom: "20px", fontSize: "13px", color: "#555" }}>
                <strong>Notes:</strong><br />
                <div style={{ marginTop: "5px", whiteSpace: "pre-wrap" }}>{vc.notes}</div>
              </div>
            )}
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ marginTop: 0 }}>Email Vendor Credit</h3>
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

      {/* Apply to Bill Modal */}
      {showApplyModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ marginTop: 0 }}>Apply Credit to Bill</h3>
            
            <div style={{ background: "#e2e8f0", padding: "10px 15px", borderRadius: "5px", marginBottom: "20px", display: "flex", justifyContent: "space-between" }}>
                <span>Available Credit:</span>
                <strong>₹{parseFloat(vc.remaining_amount).toFixed(2)}</strong>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label><strong>Select Unpaid Bill:</strong></label>
              <select value={selectedBillId} onChange={e => {
                  setSelectedBillId(e.target.value);
                  const bill = availableBills.find(b => String(b.id) === e.target.value);
                  if (bill) {
                      const maxAppliable = Math.min(parseFloat(vc.remaining_amount), parseFloat(bill.balance_due));
                      setAmountToApply(maxAppliable);
                  } else {
                      setAmountToApply(vc.remaining_amount);
                  }
              }} style={inputStyle}>
                  <option value="">— Select a Bill —</option>
                  {availableBills.map(bill => (
                      <option key={bill.id} value={bill.id}>
                          {bill.bill_number} (Date: {new Date(bill.bill_date).toLocaleDateString()}, Bal: ₹{parseFloat(bill.balance_due).toFixed(2)})
                      </option>
                  ))}
              </select>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label><strong>Amount to Apply (₹):</strong></label>
              <input type="number" min="0" step="0.01" value={amountToApply} onChange={e => setAmountToApply(e.target.value)} style={inputStyle} />
              <small style={{ color: "#64748b", display: "block", marginTop: "5px" }}>
                  Cannot exceed the bill balance or remaining credit.
              </small>
            </div>
            
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowApplyModal(false)} style={cancelBtnStyle} disabled={applying}>Cancel</button>
              <button onClick={handleApplyCredit} style={{ ...primaryBtn, background: "#28a745" }} disabled={applying}>
                {applying ? "Applying..." : "Apply Credit"}
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
const modalBox = { background: "#fff", borderRadius: "8px", padding: "25px", width: "500px", maxWidth: "90%", maxHeight: "80vh", overflow: "auto", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" };
const calcRow = { display: "flex", justifyContent: "space-between", padding: "5px 0" };

export default VendorCreditDetail;
