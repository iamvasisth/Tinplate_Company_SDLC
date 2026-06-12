import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { DetailSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quote, setQuote] = useState(null);
  const [items, setItems] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [converting, setConverting] = useState(false);
  const [invoicedId, setInvoicedId] = useState(null); // ID of linked invoice after conversion

  // Modals & Menu
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

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

  const changeStatus = async (newStatus) => {
    try {
      await apiRequest(`/quotes/${id}`, { method: "PUT", body: JSON.stringify({ status: newStatus }) });
      setQuote({ ...quote, status: newStatus });
      toast.success(`Quote marked as ${newStatus}`);
    } catch (err) { toast.error("Failed to update status"); }
  };

  const handleConvertToInvoice = async () => {
    if (!window.confirm("Convert this quote to an invoice? A new draft invoice will be created.")) return;
    setConverting(true);
    try {
      const res = await apiRequest(`/quotes/${id}/convert-to-invoice`, { method: "POST" });
      if (res?.alreadyConverted) {
        toast("This quote was already converted. Opening existing invoice.", { icon: "ℹ️" });
        navigate(`/invoices/${res.invoiceId}`);
        return;
      }
      toast.success("Quote converted to invoice successfully!");
      setQuote(prev => ({ ...prev, status: "invoiced" }));
      setInvoicedId(res.invoiceId);
      navigate(`/invoices/${res.invoiceId}`);
    } catch (err) {
      toast.error("Failed to convert quote to invoice");
    } finally {
      setConverting(false);
    }
  };

  const handleConvertToSalesOrder = async () => {
    if (!window.confirm("Convert this quote to a Sales Order?")) return;
    setConverting(true);
    try {
      const res = await apiRequest(`/sales-orders/from-quote/${id}`, { method: "POST" });
      if (res?.alreadyConverted) {
        toast("Already converted. Opening existing Sales Order.", { icon: "ℹ️" });
        navigate(`/sales-orders/${res.salesOrderId}/document`);
        return;
      }
      toast.success("Quote converted to Sales Order!");
      setQuote(prev => ({ ...prev, status: "accepted" }));
      navigate(`/sales-orders/${res.salesOrderId}/document`);
    } catch (err) {
      toast.error("Failed to convert quote to Sales Order");
    } finally {
      setConverting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this quote?")) return;
    try {
      await apiRequest(`/quotes/${id}`, { method: "DELETE" });
      toast.success("Quote deleted");
      navigate("/quotes");
    } catch (err) { toast.error("Delete failed"); }
  };

  const openEmailModal = () => {
    setEmailSubject(`Quote ${quote.quote_number || ""} from Thesis International College`);
    setEmailBody(`Dear ${customer?.display_name || "Customer"},\n\nPlease find your quote attached.\n\nQuote Number: ${quote.quote_number}\nTotal: ₹${parseFloat(quote.total_amount).toFixed(2)}\n\nThank you for your business.\n\nRegards,\nThesis International College`);
    setShowEmailModal(true);
  };

  const sendEmailAndMarkSent = async () => {
    try {
      await apiRequest(`/quotes/${id}/send`, {
        method: "POST",
        body: JSON.stringify({ to: customer?.email || "", subject: emailSubject, body: emailBody }),
      });
      toast.success("Email sent!");
      setShowEmailModal(false);
      if (quote.status === "draft") changeStatus("sent");
    } catch (err) { toast.error("Failed to send email"); }
  };

  if (fetching) return (
    <div style={{ padding: "30px", maxWidth: "1200px", margin: "auto" }}>
      <DetailSkeleton />
    </div>
  );
  if (!quote) return null;

  const total = parseFloat(quote.total_amount) || 0;
  let totalWords = "";
  try {
    totalWords = require("number-to-words").toWords(Math.floor(total));
    totalWords = totalWords.charAt(0).toUpperCase() + totalWords.slice(1);
  } catch (e) {
    totalWords = total.toFixed(0);
  }

  // Determine Ribbon color
  const statusColors = {
    draft:    "#8e99a3",
    sent:     "#f39c12",
    accepted: "#2ecc71",
    declined: "#e74c3c",
    expired:  "#c0392b",
    invoiced: "#3498db",
  };
  const ribbonColor = statusColors[quote.status] || statusColors.draft;

  const isInvoiced = quote.status === "invoiced";
  const isDeclined = quote.status === "declined";
  const canConvert = !isInvoiced && !isDeclined;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f9f9fb" }}>
      {/* Top Action Bar */}
      <div className="print-hide" style={{ display: "flex", gap: "10px", padding: "15px 30px", background: "#fff", borderBottom: "1px solid #e2e8f0", alignItems: "center" }}>
        <h2 style={{ margin: "0 20px 0 0", fontSize: "18px" }}>{quote.quote_number || `QT-000${quote.id}`}</h2>
        
        <button onClick={() => navigate(`/quotes/${id}/edit`)} style={actionBtn}>✎ Edit</button>
        <button onClick={openEmailModal} style={actionBtn}>✉ Send</button>
        <button onClick={() => window.print()} style={actionBtn}>📄 PDF/Print</button>
        
        {/* Convert to Invoice button – shown unless declined */}
        {canConvert && (
          <button
            onClick={handleConvertToInvoice}
            disabled={converting}
            style={{ ...actionBtn, background: "#2ecc71", color: "#fff", border: "none", opacity: converting ? 0.7 : 1 }}
          >
            {converting ? "⏳ Converting..." : "🔄 Convert to Invoice"}
          </button>
        )}
        {canConvert && (
          <button
            onClick={handleConvertToSalesOrder}
            disabled={converting}
            style={{ ...actionBtn, background: "#17a2b8", color: "#fff", border: "none", opacity: converting ? 0.7 : 1 }}
          >
            {converting ? "⏳ Converting..." : "🔄 Convert to Sales Order"}
          </button>
        )}
        {isInvoiced && (
          <button
            onClick={() => invoicedId ? navigate(`/invoices/${invoicedId}`) : navigate("/invoices")}
            style={{ ...actionBtn, background: "#3498db", color: "#fff", border: "none" }}
          >
            📄 View Invoice
          </button>
        )}
        
        <div style={{ position: "relative" }}>
          <button onClick={() => setMenuOpen(!menuOpen)} style={actionBtn}>⋯</button>
          {menuOpen && (
            <div style={{ position: "absolute", top: "100%", right: 0, background: "#fff", border: "1px solid #ccc", borderRadius: "4px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)", zIndex: 10, minWidth: "160px" }}>
              {quote.status !== "accepted" && <button onClick={() => { setMenuOpen(false); changeStatus("accepted"); }} style={dropdownItemBtn}>Mark Accepted</button>}
              {quote.status !== "declined" && <button onClick={() => { setMenuOpen(false); changeStatus("declined"); }} style={dropdownItemBtn}>Mark Declined</button>}
              <button onClick={() => { setMenuOpen(false); handleDelete(); }} style={{ ...dropdownItemBtn, color: "red", borderTop: "1px solid #eee" }}>Delete</button>
            </div>
          )}
        </div>
      </div>

      {/* Document Area */}
      <div style={{ padding: "40px 20px", overflowY: "auto", flex: 1 }}>
        <div style={{ position: "relative", maxWidth: "800px", margin: "auto", background: "#fff", boxShadow: "0 0 10px rgba(0,0,0,0.1)", padding: "40px", fontFamily: "Arial, sans-serif", color: "#333" }}>
          
          {/* Ribbon */}
          <div style={{ position: "absolute", top: 0, left: 0, width: "110px", height: "110px", overflow: "hidden" }}>
            <div style={{ background: ribbonColor, color: "#fff", textAlign: "center", padding: "5px", transform: "rotate(-45deg)", position: "absolute", top: "20px", left: "-35px", width: "150px", fontWeight: "bold", fontSize: "13px", letterSpacing: "1px", textTransform: "capitalize" }}>
              {quote.status?.replace("_", " ")}
            </div>
          </div>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
            <div style={{ fontSize: "13px", lineHeight: "1.5" }}>
              <h3 style={{ margin: "0 0 5px 0", fontSize: "18px" }}>Thesis International College</h3>
              <div>Jharkhand</div>
              <div>India</div>
              <div>91-9065329152</div>
              <div>pritishakumari555@gmail.com</div>
            </div>
            <div style={{ fontSize: "32px", color: "#333", alignSelf: "flex-end" }}>
              QUOTE
            </div>
          </div>

          {/* Bordered Box Container */}
          <div style={{ border: "1px solid #a3a3a3" }}>
            
            {/* Meta Row */}
            <div style={{ display: "flex", borderBottom: "1px solid #a3a3a3" }}>
              <div style={{ width: "50%", borderRight: "1px solid #a3a3a3", padding: "10px", fontSize: "13px" }}>
                <table style={{ width: "100%" }}>
                  <tbody>
                    <tr><td style={{ width: "120px", padding: "3px 0" }}>#</td><td>: {quote.quote_number}</td></tr>
                    <tr><td style={{ padding: "3px 0" }}>Quote Date</td><td>: {new Date(quote.quote_date).toLocaleDateString("en-IN")}</td></tr>
                    <tr><td style={{ padding: "3px 0" }}>Expiry Date</td><td>: {quote.expiry_date ? new Date(quote.expiry_date).toLocaleDateString("en-IN") : "—"}</td></tr>
                  </tbody>
                </table>
              </div>
              <div style={{ width: "50%" }}></div>
            </div>

            {/* Bill To */}
            <div style={{ background: "#f5f6f8", padding: "6px 10px", borderBottom: "1px solid #a3a3a3", fontSize: "13px", fontWeight: "bold" }}>
              Bill To
            </div>
            <div style={{ padding: "10px", borderBottom: "1px solid #a3a3a3", fontSize: "13px", minHeight: "60px" }}>
              <div style={{ color: "#2275d7", fontWeight: "bold", fontSize: "14px", marginBottom: "4px" }}>
                {customer?.display_name || "Customer"}
              </div>
              {customer?.email && <div>{customer.email}</div>}
              {customer?.phone && <div>{customer.phone}</div>}
            </div>

            {/* Items Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#fdfdfd" }}>
                  <th style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3", textAlign: "left" }}>#</th>
                  <th style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3", textAlign: "left" }}>Item & Description</th>
                  <th style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3", textAlign: "center" }}>HSN/SAC</th>
                  <th style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3", textAlign: "right" }}>Qty</th>
                  <th style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3", textAlign: "right" }}>Rate</th>
                  <th style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3", textAlign: "right" }}>Disc</th>
                  <th style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3", textAlign: "right" }}>Tax%</th>
                  <th style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3", textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? items.map((item, idx) => {
                  const qty  = parseFloat(item.quantity)   || 0;
                  const rate = parseFloat(item.unit_price) || 0;
                  const disc = parseFloat(item.discount)   || 0;
                  const discType = item.discount_type || "flat";
                  const taxRate  = parseFloat(item.tax_rate) || 0;
                  let lineAmt = qty * rate;
                  if (discType === "percent") lineAmt -= lineAmt * (disc / 100);
                  else lineAmt -= disc;
                  const taxAmt = lineAmt * (taxRate / 100);
                  const total  = lineAmt + taxAmt;

                  return (
                    <tr key={idx}>
                      <td style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3" }}>{idx + 1}</td>
                      <td style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3" }}>
                        <div style={{ fontWeight: "500" }}>{item.item_name || item.description || "—"}</div>
                        {item.item_name && item.description && item.description !== item.item_name && (
                          <div style={{ fontSize: "12px", color: "#64748b" }}>{item.description}</div>
                        )}
                      </td>
                      <td style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3", textAlign: "center", color: "#64748b" }}>
                        {item.hsn_code || "—"}
                      </td>
                      <td style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3", textAlign: "right" }}>
                        {qty.toFixed(2)}{item.unit ? ` ${item.unit}` : ""}
                      </td>
                      <td style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3", textAlign: "right" }}>
                        {rate.toFixed(2)}
                      </td>
                      <td style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3", textAlign: "right", color: "#dc2626" }}>
                        {disc > 0 ? (discType === "percent" ? `${disc}%` : `₹${disc.toFixed(2)}`) : "—"}
                      </td>
                      <td style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3", textAlign: "right" }}>
                        {taxRate > 0 ? `${taxRate}%` : "—"}
                      </td>
                      <td style={{ padding: "8px 10px", borderBottom: "1px solid #a3a3a3", textAlign: "right", fontWeight: "500" }}>
                        ₹{total.toFixed(2)}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={8} style={{ padding: "10px", borderBottom: "1px solid #a3a3a3", textAlign: "center" }}>No items</td></tr>
                )}
              </tbody>
            </table>

            {/* Footer Row */}
            <div style={{ display: "flex", fontSize: "13px" }}>
              {/* Left Side (Words & Notes) */}
              <div style={{ flex: 1, borderRight: "1px solid #a3a3a3", padding: "15px" }}>
                <div style={{ marginBottom: "5px" }}>Total In Words</div>
                <div style={{ fontStyle: "italic", fontWeight: "bold", marginBottom: "20px" }}>
                  Indian Rupee {totalWords} Only
                </div>
                <div style={{ marginBottom: "5px" }}>Notes</div>
                <div>{quote.notes || "Looking forward for your business."}</div>
              </div>
              
              {/* Right Side (Totals) */}
              <div style={{ width: "350px", display: "flex", flexDirection: "column" }}>
                <div style={{ borderBottom: "1px solid #a3a3a3", padding: "15px" }}>
                  <table style={{ width: "100%" }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: "4px 0", textAlign: "right", paddingRight: "20px" }}>Sub Total</td>
                        <td style={{ padding: "4px 0", textAlign: "right", width: "100px" }}>{total.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 0", textAlign: "right", paddingRight: "20px", fontWeight: "bold" }}>Total</td>
                        <td style={{ padding: "4px 0", textAlign: "right", fontWeight: "bold" }}>₹{total.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {/* Signature */}
                <div style={{ padding: "15px", flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                  Authorized Signature
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Modals */}
      {showEmailModal && (
        <div style={modalOverlay}><div style={modalBox}>
          <h3 style={{ marginTop: 0 }}>Send Quote</h3>
          <div style={{ marginBottom: "15px" }}><label>To</label><input type="email" value={customer?.email || ""} readOnly style={{ ...inputStyle, background: "#eee" }} /></div>
          <div style={{ marginBottom: "15px" }}><label>Subject</label><input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} style={inputStyle} /></div>
          <div style={{ marginBottom: "20px" }}><label>Message</label><textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={5} style={inputStyle} /></div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button onClick={() => setShowEmailModal(false)} style={cancelBtnStyle}>Cancel</button>
            <button onClick={sendEmailAndMarkSent} style={primaryBtn}>Send</button>
          </div>
        </div></div>
      )}
    </div>
  );
}

const actionBtn = {
  background: "#f3f4f6", border: "1px solid #d1d5db", padding: "6px 12px", borderRadius: "4px",
  cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", gap: "5px"
};
const dropdownItemBtn = { display: "block", width: "100%", padding: "10px 15px", border: "none", background: "none", textAlign: "left", cursor: "pointer", fontSize: "14px" };
const inputStyle = { width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc", boxSizing: "border-box" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" };
const cancelBtnStyle = { padding: "10px 20px", background: "#ccc", color: "#333", border: "none", borderRadius: "5px", cursor: "pointer" };
const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalBox = { background: "#fff", borderRadius: "8px", padding: "25px", width: "500px", maxWidth: "90%" };

export default QuoteDetail;
