/**
 * InvoiceDetail.js – High-Fidelity Zoho-style Split Master-Detail view for Invoices
 */
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { DetailSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

const ORG_NAME = "Thesis International College";
const ORG_ADDRESS = "Jharkhand, India";
const ORG_PHONE = "91-9065329152";
const ORG_EMAIL = "pritishakumari555@gmail.com";

const STATUS_COLORS = {
  draft:          { bg: "#f1f5f9", color: "#475569", label: "DRAFT" },
  sent:           { bg: "#fffbeb", color: "#b45309", label: "SENT" },
  unpaid:         { bg: "#fffbeb", color: "#b45309", label: "UNPAID" },
  partially_paid: { bg: "#eff6ff", color: "#1d4ed8", label: "PARTIALLY PAID" },
  paid:           { bg: "#f0fdf4", color: "#15803d", label: "PAID" },
  overdue:        { bg: "#fef2f2", color: "#b91c1c", label: "OVERDUE" },
  cancelled:      { bg: "#f1f5f9", color: "#475569", label: "CANCELLED" },
};

function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Selected Invoice details
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [fetching, setFetching] = useState(true);

  // Master list state
  const [invoicesList, setInvoicesList] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Menu dropdowns
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [sortBy] = useState("invoice_date");
  const sortOrder = "desc";
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");

  // Fetch Master list
  const fetchMasterList = useCallback(async () => {
    try {
      setListLoading(true);
      const [invRes, customersRes] = await Promise.all([
        apiRequest("/invoices"),
        apiRequest("/customers")
      ]);
      setInvoicesList(Array.isArray(invRes?.invoices) ? invRes.invoices : []);
      setCustomersList(Array.isArray(customersRes?.customers) ? customersRes.customers : []);
    } catch (err) {
      console.error("Failed to load list data", err);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMasterList();
  }, [fetchMasterList]);

  // Fetch active invoice details
  useEffect(() => {
    const fetchInvoiceDetails = async () => {
      try {
        setFetching(true);
        const res = await apiRequest(`/invoices/${id}`);
        if (!res?.invoice) {
          toast.error("Invoice not found");
          navigate("/invoices");
          return;
        }
        setInvoice(res.invoice);
        setItems(res.items || []);
        if (res.invoice.customer_id) {
          const custRes = await apiRequest(`/customers/${res.invoice.customer_id}`);
          if (custRes?.customer) setCustomer(custRes.customer);
        }
      } catch (err) {
        toast.error("Failed to load Invoice details");
      } finally {
        setFetching(false);
      }
    };
    fetchInvoiceDetails();
  }, [id, navigate]);

  const getCustomerName = (customerId) => {
    if (!customerId) return "—";
    const cust = customersList.find((c) => c.id === customerId);
    return cust ? cust.display_name || [cust.first_name, cust.last_name].filter(Boolean).join(" ") || cust.email : "—";
  };

  const changeStatus = async (newStatus) => {
    try {
      await apiRequest(`/invoices/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      setInvoice((prev) => ({ ...prev, status: newStatus }));
      setInvoicesList((prev) =>
        prev.map((s) => (s.id === parseInt(id) ? { ...s, status: newStatus } : s))
      );
      toast.success(`Invoice marked as ${newStatus}`);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this invoice?")) return;
    try {
      await apiRequest(`/invoices/${id}`, { method: "DELETE" });
      toast.success("Invoice deleted");
      navigate("/invoices");
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const openEmailModal = () => {
    setEmailTo(customer?.email || "");
    setEmailSubject(`Invoice ${invoice.invoice_number || ""} from ${ORG_NAME}`);
    setEmailBody(
      `Dear ${customer?.display_name || "Customer"},\n\nPlease find your invoice attached.\n\nInvoice Number: ${invoice.invoice_number}\nTotal: ₹${parseFloat(invoice.total_amount).toFixed(2)}\n\nThank you for your business.\n\nRegards,\n${ORG_NAME}`
    );
    setShowEmailModal(true);
  };

  const sendEmailAndMarkSent = async () => {
    if (!emailTo) { toast.error("Recipient email is required"); return; }
    setSendingEmail(true);
    try {
      await apiRequest(`/invoices/${id}/send`, {
        method: "POST",
        body: JSON.stringify({ to: emailTo, subject: emailSubject, body: emailBody }),
      });
      toast.success("Email sent!");
      setShowEmailModal(false);
      if (invoice.status === "draft") {
        changeStatus("sent");
      }
    } catch (err) {
      toast.error("Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) { toast.error("Enter a valid amount"); return; }
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
      const newBalance = res.newBalanceDue;
      const newStatus = newBalance <= 0 ? "paid" : "partially_paid";
      setInvoice({ ...invoice, balance_due: newBalance, status: newStatus });
      setInvoicesList((prev) => prev.map((s) => (s.id === parseInt(id) ? { ...s, status: newStatus, balance_due: newBalance } : s)));
      setShowPaymentModal(false);
    } catch (err) { toast.error("Failed to record payment"); }
  };

  // Filter left list
  const filteredList = invoicesList.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) {
      return false;
    }
    const customerName = getCustomerName(s.customer_id).toLowerCase();
    const invNumber = (s.invoice_number || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return customerName.includes(query) || invNumber.includes(query);
  });

  // Sort left list
  const sortedList = [...filteredList].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (sortBy === "customer_name") {
      aVal = getCustomerName(a.customer_id).toLowerCase();
      bVal = getCustomerName(b.customer_id).toLowerCase();
    } else if (sortBy === "total") {
      aVal = parseFloat(a.total_amount) || 0;
      bVal = parseFloat(b.total_amount) || 0;
    } else if (sortBy === "invoice_date") {
      aVal = new Date(a.invoice_date).getTime();
      bVal = new Date(b.invoice_date).getTime();
    } else if (sortBy === "invoice_number") {
      aVal = (a.invoice_number || "").toLowerCase();
      bVal = (b.invoice_number || "").toLowerCase();
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const getFilterLabel = (filter) => {
    switch (filter) {
      case "all": return "All Invoices";
      case "draft": return "Draft";
      case "sent": return "Sent";
      case "unpaid": return "Unpaid";
      case "partially_paid": return "Partially Paid";
      case "paid": return "Paid";
      case "overdue": return "Overdue";
      case "cancelled": return "Cancelled";
      default: return "All Invoices";
    }
  };

  const listViews = [
    { key: "all", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "sent", label: "Sent" },
    { key: "unpaid", label: "Unpaid" },
    { key: "partially_paid", label: "Partially Paid" },
    { key: "paid", label: "Paid" },
    { key: "overdue", label: "Overdue" },
    { key: "cancelled", label: "Cancelled" },
  ];

  const filteredViews = listViews.filter(v => v.label.toLowerCase().includes(filterSearch.toLowerCase()));

  // Render numbers to words
  let totalWords = "";
  try {
    const total = parseFloat(invoice?.total_amount) || 0;
    totalWords = require("number-to-words").toWords(Math.floor(total));
    totalWords = totalWords.charAt(0).toUpperCase() + totalWords.slice(1);
  } catch (e) {
    totalWords = invoice ? parseFloat(invoice.total_amount).toFixed(0) : "";
  }

  const ribbonColor = STATUS_COLORS[invoice?.status]?.bg || STATUS_COLORS.draft.bg;
  const ribbonTextColor = STATUS_COLORS[invoice?.status]?.color || STATUS_COLORS.draft.color;

  return (
    <div className="invoice-split-container" style={{ display: "flex", height: "100vh", background: "#ffffff", fontFamily: "system-ui, -apple-system, sans-serif", overflow: "hidden" }}>
      
      {/* Styles Injection */}
      <style dangerouslySetInnerHTML={{__html: `
        .toolbar-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid #d0d5dd; background: #ffffff; border-radius: 6px; font-size: 12px; font-weight: 500; color: #344054; cursor: pointer; transition: all 0.15s ease; outline: none; }
        .toolbar-btn:hover { background: #f9fafb; border-color: #98a2b3; }
        .dropdown-item { display: flex; align-items: center; width: 100%; padding: 8px 14px; border: none; background: none; text-align: left; cursor: pointer; font-size: 13px; color: #344054; outline: none; transition: background 0.1s ease; }
        .dropdown-item:hover { background: #f4f5f7; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(16, 24, 40, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; backdrop-filter: blur(4px); }
        .modal-box { background: #fff; border-radius: 12px; padding: 24px; width: 450px; max-width: 90%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
        .input-style { width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid #d0d5dd; font-size: 14px; box-sizing: border-box; outline: none; margin-bottom: 16px; }
        .primary-btn { padding: 10px 20px; background: #0ba5ec; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; }
        .cancel-btn { padding: 10px 16px; background: transparent; color: #344054; border: 1px solid #d0d5dd; border-radius: 6px; cursor: pointer; font-weight: 500; margin-right: 12px; }
        
        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; }
          body * { visibility: hidden; }
          
          .printable-a4, .printable-a4 * { visibility: visible; }
          
          .printable-a4 { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            max-width: 100% !important;
            box-sizing: border-box !important;
            margin: 0 !important; 
            padding: 0 !important; 
            box-shadow: none !important; 
            background: #ffffff !important;
          }
          
          .print-hide { display: none !important; }
          
          /* Reset scrollable wrappers to static for printing so content doesn't get cut off */
          .invoice-split-container, .right-pane, .scroll-area {
            height: auto !important;
            overflow: visible !important;
            position: static !important;
            display: block !important;
          }
        }
      `}} />

      {/* LEFT PANE (INVOICES LIST) */}
      <div className="print-hide" style={{ width: "350px", borderRight: "1px solid #eaecf0", display: "flex", flexDirection: "column", height: "100%" }}>
        
        {/* Header toolbar */}
        <div style={{ padding: "16px", borderBottom: "1px solid #eaecf0", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
          <div>
            <h3 
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              style={{ fontSize: "15px", fontWeight: "600", color: "#1d2939", margin: 0, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
            >
              {getFilterLabel(statusFilter)}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="2" style={{ transform: statusDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </h3>

            {statusDropdownOpen && (
              <div style={{ position: "absolute", left: "16px", top: "100%", marginTop: "4px", background: "#ffffff", border: "1px solid #eaecf0", borderRadius: "8px", boxShadow: "0 10px 30px rgba(16, 24, 40, 0.08)", zIndex: 1000, width: "240px", padding: "8px 0" }}>
                <div style={{ padding: "0 12px 8px 12px", borderBottom: "1px solid #f2f4f7" }}>
                  <input
                    type="text"
                    placeholder="Search views..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    style={{ width: "100%", padding: "6px 8px", borderRadius: "4px", border: "1px solid #d0d5dd", fontSize: "12px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {filteredViews.map(view => (
                    <div
                      key={view.key}
                      onClick={() => { setStatusFilter(view.key); setStatusDropdownOpen(false); }}
                      style={{ padding: "8px 16px", background: statusFilter === view.key ? "#f0f9ff" : "transparent", cursor: "pointer", fontSize: "13px", color: statusFilter === view.key ? "#0ba5ec" : "#344054" }}
                    >
                      {view.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            <button 
              onClick={() => navigate("/invoices/new")}
              style={{ padding: "6px 10px", background: "#0ba5ec", color: "#ffffff", border: "none", borderRadius: "4px", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}
            >
              + New
            </button>
          </div>
        </div>

        {/* Search inside left list */}
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #eaecf0" }}>
          <div style={{ position: "relative", width: "100%" }}>
            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", display: "flex" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </span>
            <input
              type="text"
              placeholder="Search in Invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", padding: "8px 10px 8px 32px", borderRadius: "4px", border: "1px solid #d0d5dd", fontSize: "12px", outline: "none", boxSizing: "border-box", color: "#344054" }}
            />
          </div>
        </div>

        {/* Compact List */}
        <div style={{ flex: 1, overflowY: "auto", background: "#fcfcfd" }}>
          {listLoading ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#667085", fontSize: "13px" }}>Loading list...</div>
          ) : sortedList.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#667085", fontSize: "13px" }}>No invoices found</div>
          ) : (
            sortedList.map((s) => {
              const isSelected = String(s.id) === String(id);
              const statusColor = STATUS_COLORS[s.status] || STATUS_COLORS.draft;
              return (
                <div
                  key={s.id}
                  onClick={() => navigate(`/invoices/${s.id}/document`)}
                  style={{
                    padding: "12px 16px", borderBottom: "1px solid #eaecf0", cursor: "pointer",
                    background: isSelected ? "#f0f9ff" : "#ffffff", borderLeft: isSelected ? "3px solid #0ba5ec" : "3px solid transparent",
                    transition: "all 0.1s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontWeight: "500", fontSize: "13px", color: isSelected ? "#0ba5ec" : "#344054", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>
                      {getCustomerName(s.customer_id)}
                    </span>
                    <span style={{ fontWeight: "600", fontSize: "13px", color: "#1d2939" }}>
                      ₹{parseFloat(s.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", color: "#667085" }}>
                      {s.invoice_number} &bull; {new Date(s.invoice_date).toLocaleDateString("en-GB")}
                    </span>
                    <span style={{ fontSize: "10px", fontWeight: "600", color: statusColor.color, textTransform: "uppercase" }}>
                      {s.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANE (DOCUMENT DETAILS) */}
      <div className="right-pane" style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", background: "#f2f4f7", overflow: "hidden" }}>
        {fetching ? (
          <div style={{ padding: "40px" }}><DetailSkeleton /></div>
        ) : !invoice ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#667085" }}>Failed to load Invoice details.</div>
        ) : (
          <>
            {/* Top Toolbar */}
            <div className="print-hide" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", borderBottom: "1px solid #eaecf0", background: "#ffffff" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#1d2939", margin: 0 }}>
                {invoice.invoice_number}
              </h2>
              
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button onClick={() => navigate(`/invoices/${id}/edit`)} className="toolbar-btn" title="Edit">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> Edit
                </button>

                <button onClick={openEmailModal} className="toolbar-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> Send
                </button>

                <button onClick={() => window.print()} className="toolbar-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg> PDF/Print
                </button>

                <button onClick={() => setShowPaymentModal(true)} style={{ padding: "6px 12px", background: "#0ba5ec", color: "#ffffff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> Record Payment
                </button>

                {/* More Menu */}
                <div style={{ position: "relative" }}>
                  <button onClick={() => { setMoreMenuOpen(!moreMenuOpen); }} className="toolbar-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                  </button>
                  {moreMenuOpen && (
                    <div style={{ position: "absolute", right: 0, top: "100%", marginTop: "6px", background: "#ffffff", border: "1px solid #eaecf0", borderRadius: "8px", boxShadow: "0 10px 30px rgba(16, 24, 40, 0.08)", zIndex: 1000, minWidth: "150px", padding: "6px 0" }}>
                      <button onClick={() => { setMoreMenuOpen(false); changeStatus("cancelled"); }} className="dropdown-item">Mark as Cancelled</button>
                      <button onClick={() => { setMoreMenuOpen(false); handleDelete(); }} className="dropdown-item" style={{ color: "#d92d20" }}>Delete</button>
                    </div>
                  )}
                </div>

                <button onClick={() => navigate("/invoices")} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "20px", color: "#98a2b3", marginLeft: "8px" }}>&times;</button>
              </div>
            </div>

            {/* Document Scrollable Area */}
            <div className="scroll-area" style={{ flex: 1, overflowY: "auto", padding: "32px", display: "flex", justifyContent: "center" }}>
              
              {/* Document Container */}
              <div className="printable-a4" style={{ width: "800px", background: "#ffffff", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)", position: "relative", minHeight: "1123px", padding: "48px" }}>
                
                {/* Diagonal Status Ribbon */}
                <div className="print-hide" style={{ position: "absolute", top: 0, left: 0, width: "130px", height: "130px", overflow: "hidden", zIndex: 10 }}>
                  <div style={{ background: ribbonColor, color: ribbonTextColor, textAlign: "center", padding: "6px", transform: "rotate(-45deg)", position: "absolute", top: "25px", left: "-35px", width: "170px", fontWeight: "700", fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", border: `1px solid ${ribbonTextColor}` }}>
                    {invoice.status?.replace("_", " ")}
                  </div>
                </div>

                {/* Document Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                  <div style={{ fontSize: "12px", lineHeight: "1.5", color: "#344054" }}>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "#1d2939", fontWeight: "700" }}>{ORG_NAME}</h3>
                    <div>{ORG_ADDRESS}</div>
                    <div>{ORG_PHONE}</div>
                    <div>{ORG_EMAIL}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "28px", fontWeight: "400", color: "#475569", letterSpacing: "1px", textTransform: "uppercase", marginTop: "16px" }}>
                      TAX INVOICE
                    </div>
                  </div>
                </div>

                {/* The Bordered Box Container */}
                <div style={{ border: "1px solid #d0d5dd", borderRadius: "2px" }}>
                  
                  {/* First Section: Invoice Meta */}
                  <div style={{ display: "flex", borderBottom: "1px solid #d0d5dd", fontSize: "12px" }}>
                    <div style={{ flex: 1, padding: "12px 16px", borderRight: "1px solid #d0d5dd" }}>
                      <table style={{ width: "100%", color: "#344054" }}>
                        <tbody>
                          <tr><td style={{ width: "120px", padding: "4px 0" }}>#</td><td style={{ fontWeight: "500", padding: "4px 0" }}>: {invoice.invoice_number}</td></tr>
                          <tr><td style={{ padding: "4px 0" }}>Invoice Date</td><td style={{ padding: "4px 0" }}>: {new Date(invoice.invoice_date).toLocaleDateString("en-GB")}</td></tr>
                          <tr><td style={{ padding: "4px 0" }}>Terms</td><td style={{ padding: "4px 0" }}>: {invoice.terms || "Due on Receipt"}</td></tr>
                          {invoice.due_date && <tr><td style={{ padding: "4px 0" }}>Due Date</td><td style={{ padding: "4px 0" }}>: {new Date(invoice.due_date).toLocaleDateString("en-GB")}</td></tr>}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ flex: 1, padding: "12px 16px" }}>
                    </div>
                  </div>

                  {/* Second Section: Bill To & GST Details */}
                  <div style={{ display: "flex", borderBottom: "1px solid #d0d5dd", fontSize: "12px" }}>
                    <div style={{ flex: 1, padding: "12px 16px", borderRight: "1px solid #d0d5dd" }}>
                      <div style={{ fontWeight: "600", color: "#1d2939", marginBottom: "8px" }}>Bill To</div>
                      <div style={{ color: "#0ba5ec", fontWeight: "600", marginBottom: "4px" }}>{customer?.display_name || "Customer"}</div>
                      {customer?.email && <div style={{ color: "#344054" }}>{customer.email}</div>}
                      {customer?.phone && <div style={{ color: "#344054" }}>{customer.phone}</div>}
                      {invoice.customer_gstin && <div style={{ marginTop: "8px", fontWeight: "600", color: "#1d2939" }}>GSTIN: {invoice.customer_gstin}</div>}
                    </div>
                    <div style={{ flex: 1, padding: "12px 16px" }}>
                      <div style={{ fontWeight: "600", color: "#1d2939", marginBottom: "8px" }}>GST Details</div>
                      <table style={{ width: "100%", color: "#344054" }}>
                        <tbody>
                          <tr><td style={{ width: "120px", padding: "4px 0" }}>Place Of Supply</td><td style={{ padding: "4px 0" }}>: {invoice.place_of_supply || "—"}</td></tr>
                          <tr><td style={{ padding: "4px 0" }}>GST Type</td><td style={{ padding: "4px 0" }}>: {invoice.gst_type === "intra_state" ? "Intra-State (CGST+SGST)" : invoice.gst_type === "inter_state" ? "Inter-State (IGST)" : "—"}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Third Section: Items Table */}
                  <div style={{ borderBottom: "1px solid #d0d5dd" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                      <thead>
                        <tr style={{ background: "#ffffff", borderBottom: "1px solid #d0d5dd" }}>
                          <th style={{ padding: "10px 12px", textAlign: "left", width: "40px", fontWeight: "600", color: "#1d2939" }}>#</th>
                          <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: "600", color: "#1d2939" }}>Item & Description</th>
                          <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: "600", color: "#1d2939" }}>HSN/SAC</th>
                          <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: "600", color: "#1d2939" }}>Qty</th>
                          <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: "600", color: "#1d2939" }}>Rate</th>
                          <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: "600", color: "#1d2939" }}>Taxable</th>
                          {invoice.gst_type === "intra_state" ? (
                            <>
                              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: "600", color: "#1d2939" }}>CGST</th>
                              <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: "600", color: "#1d2939" }}>SGST</th>
                            </>
                          ) : invoice.gst_type === "inter_state" ? (
                            <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: "600", color: "#1d2939" }}>IGST</th>
                          ) : (
                            <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: "600", color: "#1d2939" }}>Tax</th>
                          )}
                          <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: "600", color: "#1d2939" }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.length > 0 ? items.map((item, idx) => {
                          const qty      = parseFloat(item.quantity)   || 0;
                          const rate     = parseFloat(item.unit_price) || parseFloat(item.rate) || 0;
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
                            <tr key={idx} style={{ borderBottom: "1px solid #eaecf0" }}>
                              <td style={{ padding: "12px", color: "#475569", verticalAlign: "top" }}>{idx + 1}</td>
                              <td style={{ padding: "12px", verticalAlign: "top" }}>
                                <div style={{ fontWeight: "600", color: "#1d2939" }}>{item.item_name || item.description || "—"}</div>
                                {item.item_name && item.description && item.description !== item.item_name && (
                                  <div style={{ color: "#667085", marginTop: "2px" }}>{item.description}</div>
                                )}
                              </td>
                              <td style={{ padding: "12px", textAlign: "center", color: "#475569", verticalAlign: "top" }}>{item.hsn_code || "—"}</td>
                              <td style={{ padding: "12px", textAlign: "right", color: "#475569", verticalAlign: "top" }}>{qty.toFixed(2)}{item.unit ? ` ${item.unit}` : ""}</td>
                              <td style={{ padding: "12px", textAlign: "right", color: "#475569", verticalAlign: "top" }}>
                                {rate.toFixed(2)}
                                {disc > 0 && <div style={{ fontSize: "10px", color: "#d92d20", marginTop: "2px" }}>- {discType === "percent" ? `${disc}%` : `₹${disc.toFixed(2)}`}</div>}
                              </td>
                              <td style={{ padding: "12px", textAlign: "right", color: "#475569", verticalAlign: "top" }}>{taxable.toFixed(2)}</td>
                              
                              {invoice.gst_type === "intra_state" ? (
                                <>
                                  <td style={{ padding: "12px", textAlign: "right", color: "#475569", verticalAlign: "top" }}>
                                    <div>{cgstAmt.toFixed(2)}</div><div style={{ fontSize: "10px", color: "#98a2b3" }}>({parseFloat(item.cgst_rate || 0)}%)</div>
                                  </td>
                                  <td style={{ padding: "12px", textAlign: "right", color: "#475569", verticalAlign: "top" }}>
                                    <div>{sgstAmt.toFixed(2)}</div><div style={{ fontSize: "10px", color: "#98a2b3" }}>({parseFloat(item.sgst_rate || 0)}%)</div>
                                  </td>
                                </>
                              ) : invoice.gst_type === "inter_state" ? (
                                <td style={{ padding: "12px", textAlign: "right", color: "#475569", verticalAlign: "top" }}>
                                  <div>{igstAmt.toFixed(2)}</div><div style={{ fontSize: "10px", color: "#98a2b3" }}>({parseFloat(item.igst_rate || 0)}%)</div>
                                </td>
                              ) : (
                                <td style={{ padding: "12px", textAlign: "right", color: "#475569", verticalAlign: "top" }}>
                                  <div>{fallbackTaxAmt.toFixed(2)}</div><div style={{ fontSize: "10px", color: "#98a2b3" }}>({parseFloat(item.tax_rate || 0)}%)</div>
                                </td>
                              )}
                              
                              <td style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: "#1d2939", verticalAlign: "top" }}>
                                {rowTotal.toFixed(2)}
                              </td>
                            </tr>
                          );
                        }) : (
                          <tr><td colSpan={10} style={{ padding: "20px", textAlign: "center", color: "#667085" }}>No items</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Fourth Section: Totals and Notes */}
                  <div style={{ display: "flex", fontSize: "12px", minHeight: "150px" }}>
                    <div style={{ flex: 1, padding: "16px", borderRight: "1px solid #d0d5dd" }}>
                      <div style={{ marginBottom: "20px" }}>
                        <div style={{ color: "#344054", marginBottom: "4px" }}>Total In Words</div>
                        <div style={{ fontWeight: "600", fontStyle: "italic", color: "#1d2939" }}>
                          Indian Rupee {totalWords} Only
                        </div>
                      </div>
                      {invoice.notes && (
                        <div>
                          <div style={{ color: "#344054", marginBottom: "4px" }}>Notes</div>
                          <div style={{ color: "#344054", lineHeight: "1.5" }}>{invoice.notes}</div>
                        </div>
                      )}
                    </div>

                    <div style={{ width: "300px", display: "flex", flexDirection: "column" }}>
                      <div style={{ padding: "16px", flex: 1 }}>
                        <table style={{ width: "100%", color: "#344054" }}>
                          <tbody>
                            <tr>
                              <td style={{ padding: "6px 0", textAlign: "right" }}>Sub Total</td>
                              <td style={{ padding: "6px 0", textAlign: "right", fontWeight: "500" }}>{parseFloat(invoice.total_amount).toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: "6px 0", textAlign: "right", fontWeight: "600", color: "#1d2939" }}>Total</td>
                              <td style={{ padding: "6px 0", textAlign: "right", fontWeight: "600", color: "#1d2939" }}>₹{parseFloat(invoice.total_amount).toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: "6px 0", textAlign: "right", fontWeight: "600", color: "#1d2939" }}>Balance Due</td>
                              <td style={{ padding: "6px 0", textAlign: "right", fontWeight: "600", color: "#1d2939" }}>₹{parseFloat(invoice.balance_due).toFixed(2)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div style={{ borderTop: "1px solid #d0d5dd", padding: "16px", textAlign: "center", marginTop: "auto" }}>
                        <div style={{ height: "40px" }}></div>
                        <div style={{ color: "#667085" }}>Authorized Signature</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* RECORD PAYMENT MODAL */}
            {showPaymentModal && (
              <div className="modal-overlay">
                <div className="modal-box">
                  <h3 style={{ marginTop: 0, color: "#1d2939", fontSize: "18px", marginBottom: "20px" }}>Record Payment</h3>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#344054" }}>Amount Received</label>
                    <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="input-style" />
                  </div>
                  <div style={{ display: "flex", gap: "16px" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#344054" }}>Payment Date</label>
                      <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="input-style" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#344054" }}>Payment Mode</label>
                      <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className="input-style" style={{ appearance: "auto" }}>
                        <option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option>
                        <option value="upi">UPI</option><option value="cheque">Cheque</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#344054" }}>Reference#</label>
                    <input type="text" value={paymentReference} onChange={e => setPaymentReference(e.target.value)} className="input-style" placeholder="e.g. Transaction ID" />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#344054" }}>Notes (Internal)</label>
                    <textarea value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} rows={2} className="input-style" />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                    <button onClick={() => setShowPaymentModal(false)} className="cancel-btn">Cancel</button>
                    <button onClick={handleRecordPayment} className="primary-btn">Record Payment</button>
                  </div>
                </div>
              </div>
            )}

            {/* SEND EMAIL MODAL */}
            {showEmailModal && (
              <div className="modal-overlay">
                <div className="modal-box" style={{ width: "500px" }}>
                  <h3 style={{ marginTop: 0, color: "#1d2939", fontSize: "18px", marginBottom: "20px" }}>Send Invoice to Customer</h3>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#344054" }}>To</label>
                    <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} className="input-style" />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#344054" }}>Subject</label>
                    <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="input-style" />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#344054" }}>Message</label>
                    <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={6} className="input-style" style={{ resize: "vertical" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                    <button onClick={() => setShowEmailModal(false)} className="cancel-btn" disabled={sendingEmail}>Cancel</button>
                    <button onClick={sendEmailAndMarkSent} className="primary-btn" disabled={sendingEmail}>
                      {sendingEmail ? "Sending..." : "Send Email"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default InvoiceDetail;