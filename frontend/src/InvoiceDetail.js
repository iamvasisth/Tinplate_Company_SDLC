/**
 * InvoiceDetail.js – Full-featured View / Edit invoice with Record Payment modal
 * Dependencies: apiRequest, react-router-dom, react-hot-toast
 */
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

const ORG_NAME = "Tinplate Computer Training Center";

function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Invoice fields
  const [customerId, setCustomerId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [balanceDue, setBalanceDue] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  // Items
  const [items, setItems] = useState([]);

  // Customers list for dropdown
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Email modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // Three-dot menu
  const [menuOpen, setMenuOpen] = useState(false);

  // Fetch customers for dropdown
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await apiRequest("/customers");
        setCustomers(res?.customers || res || []);
      } catch (err) {
        toast.error("Failed to load customers");
      }
    };
    fetchCustomers();
  }, []);

  // Fetch invoice data
  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await apiRequest(`/invoices/${id}`);
        if (!res?.invoice) {
          toast.error("Invoice not found");
          navigate("/invoices");
          return;
        }
        const inv = res.invoice;
        setCustomerId(inv.customer_id ? String(inv.customer_id) : "");
        setInvoiceNumber(inv.invoice_number || "");
        setInvoiceDate(inv.invoice_date ? inv.invoice_date.slice(0, 10) : "");
        setDueDate(inv.due_date ? inv.due_date.slice(0, 10) : "");
        setStatus(inv.status || "draft");
        setNotes(inv.notes || "");
        setTerms(inv.terms || "");
        setBalanceDue(parseFloat(inv.balance_due) || 0);
        setTotalAmount(parseFloat(inv.total_amount) || 0);

        const invoiceItems = res.items || [];
        if (invoiceItems.length > 0) {
          setItems(
            invoiceItems.map((item) => ({
              id: item.id,
              description: item.description || "",
              quantity: item.quantity || 1,
              unit_price: item.unit_price || 0,
              tax_rate: item.tax_rate || 0,
            })),
          );
        } else {
          setItems([
            { description: "", quantity: 1, unit_price: 0, tax_rate: 0 },
          ]);
        }
      } catch (err) {
        toast.error("Failed to load invoice");
        navigate("/invoices");
      } finally {
        setFetching(false);
      }
    };
    fetchInvoice();
  }, [id, navigate]);

  // Item helpers
  const addItem = () => {
    setItems([
      ...items,
      { description: "", quantity: 1, unit_price: 0, tax_rate: 0 },
    ]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  // Calculations
  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0),
    0,
  );
  const grandTotal = subtotal; // can be extended with tax/discount

  // Save changes
  const handleSave = async () => {
    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }
    setLoading(true);
    try {
      await apiRequest(`/invoices/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          customer_id: parseInt(customerId),
          invoice_date: invoiceDate,
          due_date: dueDate || null,
          status,
          notes,
          terms,
          items: items.map((item) => ({
            ...item,
            quantity: parseFloat(item.quantity) || 0,
            unit_price: parseFloat(item.unit_price) || 0,
            tax_rate: parseFloat(item.tax_rate) || 0,
          })),
        }),
      });
      toast.success("Invoice updated");
    } catch (err) {
      toast.error("Failed to update invoice");
    } finally {
      setLoading(false);
    }
  };

  // Quick status change
  const changeStatus = async (newStatus) => {
    setLoading(true);
    try {
      await apiRequest(`/invoices/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      setStatus(newStatus);
      toast.success(`Invoice marked as ${newStatus}`);
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!window.confirm("Delete this invoice?")) return;
    try {
      await apiRequest(`/invoices/${id}`, { method: "DELETE" });
      toast.success("Invoice deleted");
      navigate("/invoices", { state: { refresh: Date.now() }, replace: true });
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  // Clone
  const handleClone = async () => {
    try {
      await apiRequest("/invoices", {
        method: "POST",
        body: JSON.stringify({
          customer_id: parseInt(customerId),
          invoice_date: invoiceDate,
          due_date: dueDate,
          status: "draft",
          notes,
          terms,
          items: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
          })),
        }),
      });
      toast.success("Invoice cloned");
      navigate("/invoices", { state: { refresh: Date.now() }, replace: true });
    } catch (err) {
      toast.error("Clone failed");
    }
  };

  // Helper to get customer info
  const getCustomer = () => {
    const custId = parseInt(customerId);
    return customers.find((c) => c.id === custId) || {};
  };

  // Open email modal
  const openEmailModal = () => {
    const cust = getCustomer();
    setEmailSubject(`Invoice ${invoiceNumber} from ${ORG_NAME}`);
    setEmailBody(
      `Dear ${cust.display_name || "Customer"},\n\nPlease find your invoice attached.\n\nInvoice Number: ${invoiceNumber}\nTotal: ₹${totalAmount.toFixed(2)}\n\nThank you for your business.\n\nRegards,\n${ORG_NAME}`,
    );
    setShowEmailModal(true);
  };

  const sendEmailAndMarkSent = async () => {
    try {
      await apiRequest(`/invoices/${id}/send`, {
        method: "POST",
        body: JSON.stringify({
          to: getCustomer().email || "",
          subject: emailSubject,
          body: emailBody,
        }),
      });
      setShowEmailModal(false);
      changeStatus("sent");
      toast.success("Email sent & invoice marked as sent");
    } catch (err) {
      toast.error("Failed to send email");
    }
  };

  // Record payment handler
  const handleRecordPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest(`/invoices/${id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: parseFloat(paymentAmount),
          payment_date: paymentDate,
          payment_mode: paymentMode,
          reference: paymentReference,
          notes: paymentNotes,
        }),
      });
      toast.success("Payment recorded");
      // Update local state
      const newBalance = res.newBalanceDue;
      setBalanceDue(newBalance);
      if (newBalance <= 0) setStatus("paid");
      // Reset form
      setShowPaymentModal(false);
      setPaymentAmount("");
      setPaymentReference("");
      setPaymentNotes("");
    } catch (err) {
      toast.error("Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div style={{ padding: "50px", textAlign: "center" }}>
        Loading invoice...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "900px", margin: "auto", padding: "30px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2>Invoice {invoiceNumber}</h2>
        <div>
          <span
            style={{
              padding: "6px 12px",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: "500",
              background:
                status === "paid"
                  ? "#d4edda"
                  : status === "sent"
                    ? "#fff3cd"
                    : status === "overdue"
                      ? "#f8d7da"
                      : "#e2e3e5",
              color:
                status === "paid"
                  ? "#155724"
                  : status === "sent"
                    ? "#856404"
                    : status === "overdue"
                      ? "#721c24"
                      : "#383d41",
              marginRight: "15px",
            }}
          >
            {status.toUpperCase()}
          </span>
          <button onClick={handleDelete} style={deleteBtnStyle}>
            Delete
          </button>
        </div>
      </div>

      {/* Summary line */}
      <div
        style={{
          background: "#f9fafb",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "20px",
          display: "flex",
          gap: "30px",
        }}
      >
        <div>
          <strong>Total:</strong> ₹{totalAmount.toFixed(2)}
        </div>
        <div>
          <strong>Balance Due:</strong>{" "}
          <span style={{ color: balanceDue <= 0 ? "green" : "red" }}>
            ₹{balanceDue.toFixed(2)}
          </span>
        </div>
        <div>
          <strong>Status:</strong> {status}
        </div>
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "25px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button onClick={openEmailModal} style={secondaryBtn}>
          ✉️ Send Email
        </button>
        <button
          onClick={() => setShowPaymentModal(true)}
          style={{
            ...secondaryBtn,
            background: "#28a745",
            color: "#fff",
            border: "none",
          }}
        >
          💰 Record Payment
        </button>
        <button
          onClick={() => navigate(`/invoices/${id}/document`)}
          style={{
            ...secondaryBtn,
            border: "1px solid #28a745",
            color: "#28a745",
          }}
        >
          📄 View Document
        </button>

        {/* Three-dot menu */}
        <div style={{ position: "relative" }}>
          <button onClick={() => setMenuOpen(!menuOpen)} style={secondaryBtn}>
            ⋯
          </button>
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "100%",
                background: "#fff",
                borderRadius: "6px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                zIndex: 10,
                minWidth: "160px",
              }}
            >
              <button
                style={menuItemStyle}
                onClick={() => {
                  setMenuOpen(false);
                  handleClone();
                }}
              >
                📋 Clone
              </button>
              <button
                style={menuItemStyle}
                onClick={() => {
                  setMenuOpen(false);
                  handleDelete();
                }}
              >
                🗑️ Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Customer Dropdown */}
      <div style={{ marginBottom: "15px" }}>
        <label>
          <strong>Customer</strong>
        </label>
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          style={inputStyle}
        >
          <option value="">Select customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.display_name ||
                [c.first_name, c.last_name].filter(Boolean).join(" ") ||
                c.email}
            </option>
          ))}
        </select>
      </div>

      {/* Dates */}
      <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
        <div style={{ flex: 1 }}>
          <label>
            <strong>Invoice Date</strong>
          </label>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>
            <strong>Due Date</strong>
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Items Table */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <h3 style={{ margin: 0 }}>Items</h3>
        <button onClick={addItem} style={secondaryBtn}>
          + Add New Row
        </button>
      </div>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "15px",
        }}
      >
        <thead>
          <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
            <th style={thStyle}>Description</th>
            <th style={thStyle}>Qty</th>
            <th style={thStyle}>Unit Price</th>
            <th style={thStyle}>Tax %</th>
            <th style={thStyle}>Total</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
              <td style={tdStyle}>
                <input
                  type="text"
                  placeholder="Item description"
                  value={item.description}
                  onChange={(e) =>
                    updateItem(idx, "description", e.target.value)
                  }
                  style={inputStyle}
                />
              </td>
              <td style={tdStyle}>
                <input
                  type="number"
                  min="0"
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                  style={{ ...inputStyle, width: "70px" }}
                />
              </td>
              <td style={tdStyle}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_price}
                  onChange={(e) =>
                    updateItem(idx, "unit_price", e.target.value)
                  }
                  style={{ ...inputStyle, width: "100px" }}
                />
              </td>
              <td style={tdStyle}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={item.tax_rate}
                  onChange={(e) => updateItem(idx, "tax_rate", e.target.value)}
                  style={{ ...inputStyle, width: "60px" }}
                />
              </td>
              <td style={tdStyle}>
                ₹
                {(
                  (parseFloat(item.quantity) || 0) *
                  (parseFloat(item.unit_price) || 0)
                ).toFixed(2)}
              </td>
              <td style={tdStyle}>
                {items.length > 1 && (
                  <button onClick={() => removeItem(idx)} style={deleteItemBtn}>
                    ✕
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Notes & Terms */}
      <div style={{ marginBottom: "15px" }}>
        <label>
          <strong>Notes</strong>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          style={inputStyle}
          placeholder="Additional notes..."
        />
      </div>
      <div style={{ marginBottom: "20px" }}>
        <label>
          <strong>Terms & Conditions</strong>
        </label>
        <textarea
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          rows={2}
          style={inputStyle}
          placeholder="Terms and conditions..."
        />
      </div>

      {/* Totals */}
      <div
        style={{
          background: "#f9fafb",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: "bold",
          }}
        >
          <span>Total</span>
          <span>₹{grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
        <button onClick={() => navigate("/invoices")} style={cancelBtnStyle}>
          Back to List
        </button>
        <button onClick={handleSave} disabled={loading} style={primaryBtn}>
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* ===== SEND EMAIL MODAL ===== */}
      {showEmailModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "25px",
              width: "500px",
              maxWidth: "90%",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Send Invoice via Email</h3>
            <div style={{ marginBottom: "15px" }}>
              <label>
                <strong>To:</strong>
              </label>
              <input
                type="email"
                value={getCustomer().email || ""}
                readOnly
                style={{ ...inputStyle, background: "#f9f9f9" }}
              />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label>
                <strong>Subject:</strong>
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label>
                <strong>Message:</strong>
              </label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={6}
                style={inputStyle}
              />
            </div>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowEmailModal(false)}
                style={cancelBtnStyle}
              >
                Cancel
              </button>
              <button onClick={sendEmailAndMarkSent} style={primaryBtn}>
                Send & Mark as Sent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== RECORD PAYMENT MODAL ===== */}
      {showPaymentModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "25px",
              width: "450px",
              maxWidth: "90%",
            }}
          >
            <h3>Record Payment</h3>
            <div style={{ marginBottom: "15px" }}>
              <label>Amount *</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
              <div style={{ flex: 1 }}>
                <label>Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  style={inputStyle}
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label>Reference</label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                style={inputStyle}
                placeholder="Transaction ID / Cheque #"
              />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label>Notes</label>
              <textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={2}
                style={inputStyle}
              />
            </div>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowPaymentModal(false)}
                style={cancelBtnStyle}
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={loading}
                style={primaryBtn}
              >
                {loading ? "Saving..." : "Record Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
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
  padding: "8px 14px",
  background: "#f0f0f0",
  color: "#333",
  border: "1px solid #ccc",
  borderRadius: "5px",
  cursor: "pointer",
  fontSize: "13px",
};
const cancelBtnStyle = {
  padding: "10px 20px",
  background: "#ccc",
  color: "#333",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};
const deleteItemBtn = {
  background: "red",
  color: "#fff",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  padding: "4px 8px",
};
const deleteBtnStyle = {
  padding: "8px 16px",
  background: "#e74c3c",
  color: "#fff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};
const menuItemStyle = {
  display: "block",
  width: "100%",
  padding: "8px 16px",
  border: "none",
  background: "none",
  textAlign: "left",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export default InvoiceDetail;