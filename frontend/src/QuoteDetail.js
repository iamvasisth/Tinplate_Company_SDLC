import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { DetailSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

const STATUS_COLORS = {
  draft:    { bg: "#f1f5f9", color: "#475569", label: "DRAFT" },
  sent:     { bg: "#fffbeb", color: "#b45309", label: "SENT" },
  accepted: { bg: "#ecfdf5", color: "#047857", label: "ACCEPTED" },
  declined: { bg: "#fef2f2", color: "#b91c1c", label: "DECLINED" },
  expired:  { bg: "#fff1f2", color: "#be123c", label: "EXPIRED" },
  invoiced: { bg: "#f0fdfa", color: "#0f766e", label: "INVOICED" },
};

function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Selected quote details
  const [quote, setQuote] = useState(null);
  const [items, setItems] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [converting, setConverting] = useState(false);
  const [invoicedId, setInvoicedId] = useState(null);

  // Master list state
  const [quotes, setQuotes] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Menu dropdowns
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [convertMenuOpen, setConvertMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [sortSubMenuOpen, setSortSubMenuOpen] = useState(false);
  const [exportSubMenuOpen, setExportSubMenuOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [sortBy, setSortBy] = useState("quote_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [activeTab, setActiveTab] = useState("Details");
  const [statusFilter, setStatusFilter] = useState("all");
  const [favoriteView, setFavoriteView] = useState(() => localStorage.getItem("favQuoteView") || null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");

  // Fetch Master list (Quotes + Customers) once
  const fetchMasterList = useCallback(async () => {
    try {
      setListLoading(true);
      const [quotesRes, customersRes] = await Promise.all([
        apiRequest("/quotes"),
        apiRequest("/customers"),
      ]);
      setQuotes(Array.isArray(quotesRes?.quotes) ? quotesRes.quotes : []);
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

  useEffect(() => {
    const fav = localStorage.getItem("favQuoteView");
    if (fav) {
      setStatusFilter(fav);
    }
  }, []);

  // Fetch active quote details
  useEffect(() => {
    const fetchQuoteDetails = async () => {
      try {
        setFetching(true);
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
        toast.error("Failed to load quote details");
      } finally {
        setFetching(false);
      }
    };
    fetchQuoteDetails();
  }, [id, navigate]);

  const getCustomerName = (customerId) => {
    if (!customerId) return "—";
    const cust = customersList.find((c) => c.id === customerId);
    return cust
      ? cust.display_name ||
          [cust.first_name, cust.last_name].filter(Boolean).join(" ") ||
          cust.email
      : "—";
  };

  const changeStatus = async (newStatus) => {
    try {
      await apiRequest(`/quotes/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      setQuote((prev) => ({ ...prev, status: newStatus }));
      setQuotes((prev) =>
        prev.map((q) => (q.id === parseInt(id) ? { ...q, status: newStatus } : q))
      );
      toast.success(`Quote marked as ${newStatus}`);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleConvertToInvoice = async () => {
    if (!window.confirm("Convert this quote to an invoice? A new draft invoice will be created.")) return;
    setConverting(true);
    setConvertMenuOpen(false);
    try {
      const res = await apiRequest(`/quotes/${id}/convert-to-invoice`, { method: "POST" });
      if (res?.alreadyConverted) {
        toast("This quote was already converted. Opening existing invoice.", { icon: "ℹ️" });
        navigate(`/invoices/${res.invoiceId}`);
        return;
      }
      toast.success("Quote converted to invoice successfully!");
      setQuote((prev) => ({ ...prev, status: "invoiced" }));
      setQuotes((prev) =>
        prev.map((q) => (q.id === parseInt(id) ? { ...q, status: "invoiced" } : q))
      );
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
    setConvertMenuOpen(false);
    try {
      const res = await apiRequest(`/sales-orders/from-quote/${id}`, { method: "POST" });
      if (res?.alreadyConverted) {
        toast("Already converted. Opening existing Sales Order.", { icon: "ℹ️" });
        navigate(`/sales-orders/${res.salesOrderId}/document`);
        return;
      }
      toast.success("Quote converted to Sales Order!");
      setQuote((prev) => ({ ...prev, status: "accepted" }));
      setQuotes((prev) =>
        prev.map((q) => (q.id === parseInt(id) ? { ...q, status: "accepted" } : q))
      );
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
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const openEmailModal = () => {
    setEmailTo(customer?.email || "");
    setEmailSubject(`Quote ${quote.quote_number || ""} from Thesis International College`);
    setEmailBody(
      `Dear ${customer?.display_name || "Customer"},\n\nPlease find your quote attached.\n\nQuote Number: ${quote.quote_number}\nTotal: ₹${parseFloat(quote.total_amount).toFixed(2)}\n\nThank you for your business.\n\nRegards,\nThesis International College`
    );
    setShowEmailModal(true);
  };

  const sendEmailAndMarkSent = async () => {
    try {
      await apiRequest(`/quotes/${id}/send`, {
        method: "POST",
        body: JSON.stringify({ to: emailTo, subject: emailSubject, body: emailBody }),
      });
      toast.success("Email sent!");
      setShowEmailModal(false);
      if (quote.status === "draft") {
        changeStatus("sent");
      }
    } catch (err) {
      toast.error("Failed to send email");
    }
  };

  // Filter left list quotes
  const filteredListQuotes = quotes.filter((q) => {
    if (statusFilter !== "all" && q.status !== statusFilter) {
      return false;
    }
    const customerName = getCustomerName(q.customer_id).toLowerCase();
    const qNumber = (q.quote_number || "").toLowerCase();
    const qRef = (q.reference_number || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return customerName.includes(query) || qNumber.includes(query) || qRef.includes(query);
  });

  // Sort left list quotes
  const sortedListQuotes = [...filteredListQuotes].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (sortBy === "customer_name") {
      aVal = getCustomerName(a.customer_id).toLowerCase();
      bVal = getCustomerName(b.customer_id).toLowerCase();
    } else if (sortBy === "total_amount") {
      aVal = parseFloat(a.total_amount) || 0;
      bVal = parseFloat(b.total_amount) || 0;
    } else if (sortBy === "quote_date") {
      aVal = new Date(a.quote_date).getTime();
      bVal = new Date(b.quote_date).getTime();
    } else if (sortBy === "quote_number") {
      aVal = (a.quote_number || "").toLowerCase();
      bVal = (b.quote_number || "").toLowerCase();
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const handleExportCSV = () => {
    const headers = ["Quote Number", "Customer Name", "Date", "Expiry Date", "Amount", "Status"];
    const rows = sortedListQuotes.map(q => [
      q.quote_number,
      getCustomerName(q.customer_id),
      new Date(q.quote_date).toLocaleDateString("en-GB"),
      q.expiry_date ? new Date(q.expiry_date).toLocaleDateString("en-GB") : "",
      q.total_amount,
      q.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `quotes_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Quotes exported as CSV successfully!");
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sortedListQuotes, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `quotes_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Quotes exported as JSON successfully!");
  };

  const total = quote ? parseFloat(quote.total_amount) || 0 : 0;
  let totalWords = "";
  if (quote) {
    try {
      totalWords = require("number-to-words").toWords(Math.floor(total));
      totalWords = totalWords.charAt(0).toUpperCase() + totalWords.slice(1);
    } catch (e) {
      totalWords = total.toFixed(0);
    }
  }

  // Diagonal Ribbon status background color
  const ribbonColors = {
    draft:    "#94a3b8",
    sent:     "#f59e0b",
    accepted: "#10b981",
    declined: "#ef4444",
    expired:  "#f43f5e",
    invoiced: "#0d9488",
  };
  const ribbonColor = quote ? ribbonColors[quote.status] || ribbonColors.draft : ribbonColors.draft;

  const isInvoiced = quote?.status === "invoiced";
  const isDeclined = quote?.status === "declined";
  const canConvert = !isInvoiced && !isDeclined;

  const getFilterLabel = (filter) => {
    switch (filter) {
      case "all": return "All Quotes";
      case "draft": return "Draft Quotes";
      case "pending_approval": return "Pending Approval Quotes";
      case "approved": return "Approved Quotes";
      case "sent": return "Sent Quotes";
      case "customer_viewed": return "Customer Viewed Quotes";
      case "accepted": return "Accepted Quotes";
      case "invoiced": return "Invoiced Quotes";
      case "declined": return "Declined Quotes";
      case "expired": return "Expired Quotes";
      default: return "All Quotes";
    }
  };

  const allViews = [
    { key: "all", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "pending_approval", label: "Pending Approval" },
    { key: "approved", label: "Approved" },
    { key: "sent", label: "Sent" },
    { key: "customer_viewed", label: "Customer Viewed" },
    { key: "accepted", label: "Accepted" },
    { key: "invoiced", label: "Invoiced" },
    { key: "declined", label: "Declined" },
    { key: "expired", label: "Expired" },
  ];

  const filteredViews = allViews.filter(v => v.label.toLowerCase().includes(filterSearch.toLowerCase()));

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", background: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif", overflow: "hidden" }}>
      
      {/* LEFT COMPACT LIST PANE */}
      <div
        className="print-hide"
        style={{
          width: "350px",
          minWidth: "350px",
          borderRight: "1px solid #eaecf0",
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {/* Left header pane layout */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #eaecf0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", position: "relative" }}>
            <span 
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              style={{ fontSize: "14px", fontWeight: "600", color: "#1d2939", display: "flex", alignItems: "center", gap: "4px" }}
            >
              {getFilterLabel(statusFilter)}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: statusDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </span>

            {statusDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: "100%",
                  marginTop: "8px",
                  background: "#ffffff",
                  border: "1px solid #eaecf0",
                  borderRadius: "8px",
                  boxShadow: "0 10px 30px rgba(16, 24, 40, 0.08)",
                  zIndex: 1000,
                  width: "240px",
                  padding: "10px 0",
                }}
              >
                {/* Search views */}
                <div style={{ padding: "0 12px 10px 12px", borderBottom: "1px solid #f2f4f7" }}>
                  <div style={{ position: "relative", width: "100%" }}>
                    <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", display: "flex" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                    </span>
                    <input
                      type="text"
                      placeholder="Search views..."
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px 10px 6px 30px",
                        borderRadius: "6px",
                        border: "1px solid #d0d5dd",
                        fontSize: "13px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>

                {/* Views List */}
                <div style={{ maxHeight: "200px", overflowY: "auto", padding: "4px 0" }}>
                  {filteredViews.length === 0 ? (
                    <div style={{ padding: "12px 16px", color: "#667085", fontSize: "13px", textAlign: "center" }}>No views found</div>
                  ) : (
                    filteredViews.map(view => {
                      const isSelected = statusFilter === view.key;
                      const isFav = favoriteView === view.key;
                      return (
                        <div
                          key={view.key}
                          onClick={(e) => {
                            e.stopPropagation();
                            setStatusFilter(view.key);
                            setStatusDropdownOpen(false);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 16px",
                            background: isSelected ? "#f0f6ff" : "transparent",
                            cursor: "pointer",
                            fontSize: "13px",
                            color: isSelected ? "#006ee6" : "#344054",
                            fontWeight: isSelected ? "500" : "400",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = "#f9fafb";
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <span>{view.label}</span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              const newFav = isFav ? null : view.key;
                              setFavoriteView(newFav);
                              if (newFav) {
                                localStorage.setItem("favQuoteView", newFav);
                                toast.success(`"${view.label}" set as default view`);
                              } else {
                                localStorage.removeItem("favQuoteView");
                                toast.success("Default view cleared");
                              }
                            }}
                            style={{ color: isFav ? "#f59e0b" : "#d0d5dd", fontSize: "14px", cursor: "pointer", padding: "2px 6px" }}
                          >
                            {isFav ? "★" : "☆"}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Bottom Custom View Button */}
                <div style={{ padding: "8px 16px 4px", borderTop: "1px solid #f2f4f7" }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setStatusDropdownOpen(false); toast("Custom views feature coming soon"); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "none",
                      border: "none",
                      color: "#006ee6",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "500",
                      padding: 0,
                      outline: "none",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="16"></line>
                      <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    New Custom View
                  </button>
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={() => navigate("/quotes/new")}
              style={{
                width: "28px",
                height: "28px",
                background: "#006ee6",
                border: "none",
                borderRadius: "4px",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="New Quote"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            
            {/* Three Dots More Menu */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                style={{
                  width: "28px",
                  height: "28px",
                  background: "#ffffff",
                  border: "1px solid #d0d5dd",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#344054" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="12" cy="5" r="1"></circle>
                  <circle cx="12" cy="19" r="1"></circle>
                </svg>
              </button>

              {moreMenuOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "100%",
                    marginTop: "6px",
                    background: "#ffffff",
                    border: "1px solid #eaecf0",
                    borderRadius: "6px",
                    boxShadow: "0 10px 30px rgba(16, 24, 40, 0.08)",
                    zIndex: 1000,
                    minWidth: "220px",
                    padding: "4px 0",
                  }}
                >
                  {/* Sort By Option */}
                  <div
                    style={{ position: "relative" }}
                    onMouseEnter={() => { setSortSubMenuOpen(true); setHoveredItem("sort"); }}
                    onMouseLeave={() => { setSortSubMenuOpen(false); setHoveredItem(null); }}
                  >
                    <button
                      style={{
                        ...dropdownItemBtn,
                        background: hoveredItem === "sort" ? "#006ee6" : "transparent",
                        color: hoveredItem === "sort" ? "#ffffff" : "#344054",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "8px" }}>
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <polyline points="19 12 12 19 5 12"></polyline>
                      </svg>
                      Sort by
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginLeft: "auto" }}>
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </button>
                    
                    {/* Sort Submenu */}
                    {sortSubMenuOpen && (
                      <div
                        style={{
                          position: "absolute",
                          left: "calc(100% + 2px)",
                          top: 0,
                          background: "#ffffff",
                          border: "1px solid #eaecf0",
                          borderRadius: "6px",
                          boxShadow: "0 10px 30px rgba(16, 24, 40, 0.08)",
                          zIndex: 1001,
                          minWidth: "180px",
                          padding: "4px 0",
                        }}
                        onMouseEnter={() => { setSortSubMenuOpen(true); setHoveredItem("sort"); }}
                        onMouseLeave={() => { setSortSubMenuOpen(false); setHoveredItem(null); }}
                      >
                        <button
                          onClick={() => { setSortBy("quote_date"); setSortOrder("desc"); setMoreMenuOpen(false); }}
                          style={{ ...dropdownItemBtn, background: hoveredItem === "sort_date_desc" ? "#f4f5f7" : "transparent" }}
                          onMouseEnter={() => setHoveredItem("sort_date_desc")}
                          onMouseLeave={() => setHoveredItem("sort")}
                        >
                          Date (Newest first)
                        </button>
                        <button
                          onClick={() => { setSortBy("quote_date"); setSortOrder("asc"); setMoreMenuOpen(false); }}
                          style={{ ...dropdownItemBtn, background: hoveredItem === "sort_date_asc" ? "#f4f5f7" : "transparent" }}
                          onMouseEnter={() => setHoveredItem("sort_date_asc")}
                          onMouseLeave={() => setHoveredItem("sort")}
                        >
                          Date (Oldest first)
                        </button>
                        <button
                          onClick={() => { setSortBy("quote_number"); setSortOrder("asc"); setMoreMenuOpen(false); }}
                          style={{ ...dropdownItemBtn, background: hoveredItem === "sort_num_asc" ? "#f4f5f7" : "transparent" }}
                          onMouseEnter={() => setHoveredItem("sort_num_asc")}
                          onMouseLeave={() => setHoveredItem("sort")}
                        >
                          Quote Number (A-Z)
                        </button>
                        <button
                          onClick={() => { setSortBy("customer_name"); setSortOrder("asc"); setMoreMenuOpen(false); }}
                          style={{ ...dropdownItemBtn, background: hoveredItem === "sort_cust_asc" ? "#f4f5f7" : "transparent" }}
                          onMouseEnter={() => setHoveredItem("sort_cust_asc")}
                          onMouseLeave={() => setHoveredItem("sort")}
                        >
                          Customer Name (A-Z)
                        </button>
                        <button
                          onClick={() => { setSortBy("total_amount"); setSortOrder("desc"); setMoreMenuOpen(false); }}
                          style={{ ...dropdownItemBtn, background: hoveredItem === "sort_amt_desc" ? "#f4f5f7" : "transparent" }}
                          onMouseEnter={() => setHoveredItem("sort_amt_desc")}
                          onMouseLeave={() => setHoveredItem("sort")}
                        >
                          Amount (High to Low)
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Import Quotes */}
                  <button
                    onClick={() => { setMoreMenuOpen(false); toast("Import functionality coming soon"); }}
                    style={{
                      ...dropdownItemBtn,
                      background: hoveredItem === "import" ? "#f4f5f7" : "transparent",
                    }}
                    onMouseEnter={() => setHoveredItem("import")}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "8px", color: "#006ee6" }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Import Quotes
                  </button>

                  {/* Export Option */}
                  <div
                    style={{ position: "relative" }}
                    onMouseEnter={() => { setExportSubMenuOpen(true); setHoveredItem("export"); }}
                    onMouseLeave={() => { setExportSubMenuOpen(false); setHoveredItem(null); }}
                  >
                    <button
                      style={{
                        ...dropdownItemBtn,
                        background: hoveredItem === "export" ? "#f4f5f7" : "transparent",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "8px", color: "#006ee6" }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      Export
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginLeft: "auto" }}>
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </button>

                    {/* Export Submenu */}
                    {exportSubMenuOpen && (
                      <div
                        style={{
                          position: "absolute",
                          left: "calc(100% + 2px)",
                          top: 0,
                          background: "#ffffff",
                          border: "1px solid #eaecf0",
                          borderRadius: "6px",
                          boxShadow: "0 10px 30px rgba(16, 24, 40, 0.08)",
                          zIndex: 1001,
                          minWidth: "180px",
                          padding: "4px 0",
                        }}
                        onMouseEnter={() => { setExportSubMenuOpen(true); setHoveredItem("export"); }}
                        onMouseLeave={() => { setExportSubMenuOpen(false); setHoveredItem(null); }}
                      >
                        <button
                          onClick={() => { handleExportCSV(); setMoreMenuOpen(false); }}
                          style={{ ...dropdownItemBtn, background: hoveredItem === "export_csv" ? "#f4f5f7" : "transparent" }}
                          onMouseEnter={() => setHoveredItem("export_csv")}
                          onMouseLeave={() => setHoveredItem("export")}
                        >
                          Export as CSV
                        </button>
                        <button
                          onClick={() => { handleExportJSON(); setMoreMenuOpen(false); }}
                          style={{ ...dropdownItemBtn, background: hoveredItem === "export_json" ? "#f4f5f7" : "transparent" }}
                          onMouseEnter={() => setHoveredItem("export_json")}
                          onMouseLeave={() => setHoveredItem("export")}
                        >
                          Export as JSON
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Preferences */}
                  <button
                    onClick={() => { setMoreMenuOpen(false); toast("Preferences loaded"); }}
                    style={{
                      ...dropdownItemBtn,
                      background: hoveredItem === "preferences" ? "#f4f5f7" : "transparent",
                      borderTop: "1px solid #f1f5f9",
                    }}
                    onMouseEnter={() => setHoveredItem("preferences")}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "8px", color: "#667085" }}>
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                    Preferences
                  </button>

                  {/* Manage Custom Fields */}
                  <button
                    onClick={() => { setMoreMenuOpen(false); toast("Custom fields manager opened"); }}
                    style={{
                      ...dropdownItemBtn,
                      background: hoveredItem === "custom_fields" ? "#f4f5f7" : "transparent",
                    }}
                    onMouseEnter={() => setHoveredItem("custom_fields")}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "8px", color: "#667085" }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="9" y1="3" x2="9" y2="21"></line>
                    </svg>
                    Manage Custom Fields
                  </button>

                  {/* Refresh List */}
                  <button
                    onClick={() => { setMoreMenuOpen(false); fetchMasterList(); }}
                    style={{
                      ...dropdownItemBtn,
                      background: hoveredItem === "refresh" ? "#f4f5f7" : "transparent",
                      borderTop: "1px solid #f1f5f9",
                    }}
                    onMouseEnter={() => setHoveredItem("refresh")}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "8px", color: "#667085" }}>
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                    </svg>
                    Refresh List
                  </button>

                  {/* Reset Column Width */}
                  <button
                    onClick={() => { setMoreMenuOpen(false); toast("Column widths reset"); }}
                    style={{
                      ...dropdownItemBtn,
                      background: hoveredItem === "reset" ? "#f4f5f7" : "transparent",
                    }}
                    onMouseEnter={() => setHoveredItem("reset")}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "8px", color: "#667085" }}>
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                      <polyline points="16 3 21 8 16 8"></polyline>
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                      <polyline points="8 21 3 16 8 16"></polyline>
                    </svg>
                    Reset Column Width
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search inside left list */}
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #eaecf0" }}>
          <div style={{ position: "relative", width: "100%" }}>
            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", display: "flex" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search in Quotes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px 8px 32px",
                borderRadius: "4px",
                border: "1px solid #d0d5dd",
                fontSize: "12px",
                outline: "none",
                boxSizing: "border-box",
                color: "#344054",
              }}
            />
          </div>
        </div>

        {/* Compact Quotes List */}
        <div style={{ flex: 1, overflowY: "auto", background: "#fcfcfd" }}>
          {listLoading ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#667085", fontSize: "13px" }}>Loading list...</div>
          ) : sortedListQuotes.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#667085", fontSize: "13px" }}>No quotes found</div>
          ) : (
            sortedListQuotes.map((q) => {
              const isSelected = String(q.id) === String(id);
              const statusColor = STATUS_COLORS[q.status] || STATUS_COLORS.draft;
              return (
                <div
                  key={q.id}
                  onClick={() => navigate(`/quotes/${q.id}`)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #eaecf0",
                    cursor: "pointer",
                    background: isSelected ? "#f0f6ff" : "#ffffff",
                    borderLeft: isSelected ? "3px solid #006ee6" : "3px solid transparent",
                    transition: "all 0.1s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontWeight: "500", fontSize: "13px", color: isSelected ? "#006ee6" : "#344054", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>
                      {getCustomerName(q.customer_id)}
                    </span>
                    <span style={{ fontWeight: "600", fontSize: "13px", color: "#1d2939" }}>
                      ₹{parseFloat(q.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", color: "#667085" }}>
                      {q.quote_number} &bull; {new Date(q.quote_date).toLocaleDateString("en-GB")}
                    </span>
                    <span style={{ fontSize: "10px", fontWeight: "600", color: statusColor.color, textTransform: "uppercase" }}>
                      {q.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANE (QUOTE DETAILS) */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", background: "#ffffff", overflow: "hidden" }}>
        {fetching ? (
          <div style={{ padding: "40px" }}><DetailSkeleton /></div>
        ) : !quote ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#667085" }}>Failed to load quote detail.</div>
        ) : (
          <>
            {/* Top Toolbar */}
            <div className="print-hide" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", borderBottom: "1px solid #eaecf0", background: "#ffffff" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#1d2939", margin: 0 }}>
                {quote.quote_number}
              </h2>
              
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {/* Edit Action */}
                <button
                  onClick={() => navigate(`/quotes/${id}/edit`)}
                  style={toolbarBtnStyle}
                  title="Edit"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  Edit
                </button>

                {/* Email composer trigger */}
                <button onClick={openEmailModal} style={toolbarBtnStyle}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  Send
                </button>

                {/* Print action */}
                <button onClick={() => window.print()} style={toolbarBtnStyle}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                  </svg>
                  PDF/Print
                </button>

                {/* Convert Dropdown Menu */}
                {canConvert && (
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={() => { setConvertMenuOpen(!convertMenuOpen); setMoreMenuOpen(false); }}
                      style={{ ...toolbarBtnStyle, background: "#006ee6", color: "#ffffff", border: "none" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="17 1 21 5 17 9"></polyline>
                        <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                        <polyline points="7 23 3 19 7 15"></polyline>
                        <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                      </svg>
                      Convert
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "2px" }}>
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                    {convertMenuOpen && (
                      <div style={dropdownMenuContent}>
                        <button
                          onClick={handleConvertToInvoice}
                          disabled={converting}
                          style={dropdownItemBtn}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "8px" }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                          </svg>
                          Convert to Invoice
                        </button>
                        <button
                          onClick={handleConvertToSalesOrder}
                          disabled={converting}
                          style={dropdownItemBtn}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "8px" }}>
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <path d="M16 10a4 4 0 0 1-8 0"></path>
                          </svg>
                          Convert to Sales Order
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* View Invoice button if converted */}
                {isInvoiced && (
                  <button
                    onClick={() => invoicedId ? navigate(`/invoices/${invoicedId}`) : navigate("/invoices")}
                    style={{ ...toolbarBtnStyle, background: "#0f766e", color: "#ffffff", border: "none" }}
                  >
                    View Invoice
                  </button>
                )}

                {/* More Action Menu */}
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => { setMoreMenuOpen(!moreMenuOpen); setConvertMenuOpen(false); }}
                    style={toolbarBtnStyle}
                  >
                    ⋯
                  </button>
                  {moreMenuOpen && (
                    <div style={{ ...dropdownMenuContent, minWidth: "160px" }}>
                      {quote.status !== "accepted" && (
                        <button onClick={() => { setMoreMenuOpen(false); changeStatus("accepted"); }} style={dropdownItemBtn}>
                          Mark Accepted
                        </button>
                      )}
                      {quote.status !== "declined" && (
                        <button onClick={() => { setMoreMenuOpen(false); changeStatus("declined"); }} style={dropdownItemBtn}>
                          Mark Declined
                        </button>
                      )}
                      {quote.status !== "sent" && (
                        <button onClick={() => { setMoreMenuOpen(false); changeStatus("sent"); }} style={dropdownItemBtn}>
                          Mark Sent
                        </button>
                      )}
                      <button
                        onClick={() => { setMoreMenuOpen(false); handleDelete(); }}
                        style={{ ...dropdownItemBtn, color: "#dc2626", borderTop: "1px solid #f1f5f9" }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Close Pane Button */}
                <button
                  onClick={() => navigate("/quotes")}
                  style={{
                    border: "none",
                    background: "none",
                    padding: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#667085",
                    marginLeft: "4px",
                  }}
                  title="Close Detail"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>

            {/* WHAT'S NEXT Banner */}
            {(quote.status === "draft" || quote.status === "sent") && (
              <div className="print-hide" style={{ padding: "12px 24px", background: "#f0f9ff", borderBottom: "1px solid #bae6fd", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "13px", color: "#0369a1", fontWeight: "500" }}>
                  <strong>WHAT'S NEXT?</strong> Go ahead and email this quote to your customer or simply mark it as sent.
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={openEmailModal}
                    style={{
                      padding: "5px 12px",
                      background: "#006ee6",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "500",
                      cursor: "pointer",
                    }}
                  >
                    Send Quote
                  </button>
                  <button
                    onClick={() => changeStatus("sent")}
                    style={{
                      padding: "5px 12px",
                      background: "#ffffff",
                      color: "#344054",
                      border: "1px solid #d0d5dd",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "500",
                      cursor: "pointer",
                    }}
                  >
                    Mark As Sent
                  </button>
                </div>
              </div>
            )}

            {/* Tabs Bar */}
            <div className="print-hide" style={{ display: "flex", borderBottom: "1px solid #eaecf0", padding: "0 24px", background: "#ffffff" }}>
              <button
                onClick={() => setActiveTab("Details")}
                style={{
                  padding: "12px 16px",
                  border: "none",
                  background: "none",
                  fontSize: "13px",
                  fontWeight: activeTab === "Details" ? "600" : "500",
                  color: activeTab === "Details" ? "#006ee6" : "#667085",
                  borderBottom: activeTab === "Details" ? "2px solid #006ee6" : "2px solid transparent",
                  cursor: "pointer",
                }}
              >
                Quote Details
              </button>
              <button
                onClick={() => setActiveTab("Logs")}
                style={{
                  padding: "12px 16px",
                  border: "none",
                  background: "none",
                  fontSize: "13px",
                  fontWeight: activeTab === "Logs" ? "600" : "500",
                  color: activeTab === "Logs" ? "#006ee6" : "#667085",
                  borderBottom: activeTab === "Logs" ? "2px solid #006ee6" : "2px solid transparent",
                  cursor: "pointer",
                }}
              >
                Activity Logs
              </button>
            </div>

            {/* Tab content area */}
            <div style={{ flex: 1, padding: "24px", overflowY: "auto", background: "#f8fafc" }}>
              
              {activeTab === "Details" ? (
                /* REDESIGNED INVOICE/DOCUMENT PREVIEW */
                <div
                  style={{
                    position: "relative",
                    maxWidth: "800px",
                    margin: "0 auto 40px",
                    background: "#ffffff",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                    border: "1px solid #eaecf0",
                    padding: "40px",
                    boxSizing: "border-box",
                    color: "#1d2939",
                    fontSize: "13px",
                    lineHeight: "1.6",
                  }}
                >
                  {/* Diagonal Ribbon Status */}
                  <div style={{ position: "absolute", top: 0, left: 0, width: "110px", height: "110px", overflow: "hidden" }}>
                    <div
                      style={{
                        background: ribbonColor,
                        color: "#ffffff",
                        textAlign: "center",
                        padding: "5px 0",
                        transform: "rotate(-45deg)",
                        position: "absolute",
                        top: "24px",
                        left: "-32px",
                        width: "140px",
                        fontWeight: "600",
                        fontSize: "10px",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      }}
                    >
                      {quote.status?.replace("_", " ")}
                    </div>
                  </div>

                  {/* Document Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", marginTop: "10px" }}>
                    <div style={{ fontSize: "12px", color: "#475569" }}>
                      <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: "700", color: "#1d2939" }}>Thesis International College</h3>
                      <div style={{ margin: "2px 0" }}>Jharkhand</div>
                      <div style={{ margin: "2px 0" }}>India</div>
                      <div style={{ margin: "2px 0" }}>91-9065329152</div>
                      <div style={{ margin: "2px 0" }}>pritishakumari555@gmail.com</div>
                    </div>
                    <div style={{ fontSize: "28px", fontWeight: "700", color: "#1d2939", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                      Quote
                    </div>
                  </div>

                  {/* Bordered Box details container */}
                  <div style={{ border: "1px solid #d0d5dd", borderRadius: "4px", overflow: "hidden", marginBottom: "24px" }}>
                    
                    {/* Meta Row */}
                    <div style={{ display: "flex", borderBottom: "1px solid #d0d5dd" }}>
                      <div style={{ flex: 1, borderRight: "1px solid #d0d5dd", padding: "12px 16px" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
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

                    {/* Bill To Header */}
                    <div style={{ background: "#f9fafb", padding: "8px 16px", borderBottom: "1px solid #d0d5dd", fontWeight: "600", color: "#344054", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                      Bill To
                    </div>
                    
                    {/* Bill To Customer detail */}
                    <div style={{ padding: "14px 16px", fontSize: "13px", color: "#475569" }}>
                      <div style={{ color: "#006ee6", fontWeight: "700", fontSize: "14px", marginBottom: "6px" }}>
                        {customer?.display_name || "Customer"}
                      </div>
                      {customer?.email && <div style={{ margin: "2px 0" }}>{customer.email}</div>}
                      {customer?.phone && <div style={{ margin: "2px 0" }}>{customer.phone}</div>}
                    </div>

                    {/* Items Table */}
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", borderTop: "1px solid #d0d5dd" }}>
                      <thead>
                        <tr style={{ background: "#f9fafb", borderBottom: "1px solid #d0d5dd" }}>
                          <th style={{ ...docThStyle, width: "30px", textAlign: "left" }}>#</th>
                          <th style={{ ...docThStyle, textAlign: "left" }}>Item & Description</th>
                          <th style={{ ...docThStyle, textAlign: "center" }}>HSN/SAC</th>
                          <th style={{ ...docThStyle, textAlign: "right" }}>Qty</th>
                          <th style={{ ...docThStyle, textAlign: "right" }}>Rate</th>
                          <th style={{ ...docThStyle, textAlign: "right" }}>Disc</th>
                          <th style={{ ...docThStyle, textAlign: "right" }}>Tax%</th>
                          <th style={{ ...docThStyle, textAlign: "right" }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.length > 0 ? (
                          items.map((item, idx) => {
                            const qty = parseFloat(item.quantity) || 0;
                            const rate = parseFloat(item.unit_price) || 0;
                            const disc = parseFloat(item.discount) || 0;
                            const discType = item.discount_type || "flat";
                            const taxRate = parseFloat(item.tax_rate) || 0;
                            let lineAmt = qty * rate;
                            if (discType === "percent") {
                              lineAmt -= lineAmt * (disc / 100);
                            } else {
                              lineAmt -= disc;
                            }
                            const taxAmt = lineAmt * (taxRate / 100);
                            const lineTotal = lineAmt + taxAmt;

                            return (
                              <tr key={idx} style={{ borderBottom: "1px solid #d0d5dd" }}>
                                <td style={docTdStyle}>{idx + 1}</td>
                                <td style={docTdStyle}>
                                  <div style={{ fontWeight: "600", color: "#344054" }}>{item.item_name || item.description || "—"}</div>
                                  {item.item_name && item.description && item.description !== item.item_name && (
                                    <div style={{ fontSize: "11px", color: "#667085", marginTop: "2px" }}>{item.description}</div>
                                  )}
                                </td>
                                <td style={{ ...docTdStyle, textAlign: "center", color: "#667085" }}>{item.hsn_code || "—"}</td>
                                <td style={{ ...docTdStyle, textAlign: "right" }}>
                                  {qty.toFixed(2)}{item.unit ? ` ${item.unit}` : ""}
                                </td>
                                <td style={{ ...docTdStyle, textAlign: "right" }}>{rate.toFixed(2)}</td>
                                <td style={{ ...docTdStyle, textAlign: "right", color: "#dc2626" }}>
                                  {disc > 0 ? (discType === "percent" ? `${disc}%` : `₹${disc.toFixed(2)}`) : "—"}
                                </td>
                                <td style={{ ...docTdStyle, textAlign: "right" }}>
                                  {taxRate > 0 ? `${taxRate}%` : "—"}
                                </td>
                                <td style={{ ...docTdStyle, textAlign: "right", fontWeight: "600", color: "#1d2939" }}>
                                  ₹{lineTotal.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={8} style={{ ...docTdStyle, textAlign: "center", padding: "20px" }}>No items in this quote</td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Footer Row (Words & Totals) */}
                    <div style={{ display: "flex", fontSize: "12px", background: "#ffffff" }}>
                      
                      {/* Left: Words, Notes */}
                      <div style={{ flex: 1, borderRight: "1px solid #d0d5dd", padding: "16px" }}>
                        <div style={{ color: "#667085", fontWeight: "500", marginBottom: "4px" }}>Total In Words</div>
                        <div style={{ fontStyle: "italic", fontWeight: "700", color: "#344054", marginBottom: "20px" }}>
                          Indian Rupee {totalWords} Only
                        </div>
                        <div style={{ color: "#667085", fontWeight: "500", marginBottom: "4px" }}>Notes</div>
                        <div style={{ color: "#475569" }}>{quote.notes || "Looking forward for your business."}</div>
                      </div>

                      {/* Right: Subtotal & Grand Total */}
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
                        {/* Signature block */}
                        <div style={{ padding: "16px", flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", color: "#667085", fontWeight: "500" }}>
                          Authorized Signature
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Expiry / Terms note at bottom of preview */}
                  {quote.terms && (
                    <div style={{ borderTop: "1px dashed #d0d5dd", paddingTop: "16px", fontSize: "11px", color: "#667085" }}>
                      <strong>Terms &amp; Conditions:</strong>
                      <p style={{ margin: "4px 0 0" }}>{quote.terms}</p>
                    </div>
                  )}
                </div>
              ) : (
                /* ACTIVITY LOGS TAB */
                <div style={{ maxWidth: "800px", margin: "auto", background: "#ffffff", padding: "30px", border: "1px solid #eaecf0", borderRadius: "6px" }}>
                  <h3 style={{ fontSize: "15px", fontWeight: "600", margin: "0 0 16px" }}>Activity History</h3>
                  <div style={{ position: "relative", borderLeft: "2px solid #e2e8f0", marginLeft: "10px", paddingLeft: "20px" }}>
                    <div style={{ marginBottom: "20px", position: "relative" }}>
                      <div style={logDotStyle}></div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>Quote marked as {quote.status.toUpperCase()}</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>Status changed in the system &bull; Today</div>
                    </div>
                    <div style={{ marginBottom: "20px", position: "relative" }}>
                      <div style={logDotStyle}></div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>Quote Created</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>
                        Quote {quote.quote_number} generated on {new Date(quote.quote_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </>
        )}
      </div>

      {/* Send Email Modal overlay */}
      {showEmailModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1c2434" }}>Send Quote via Email</h3>
              <button
                onClick={() => setShowEmailModal(false)}
                style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: "#667085" }}
              >
                &times;
              </button>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={modalLabelStyle}>To</label>
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                style={modalInputStyle}
              />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={modalLabelStyle}>Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                style={modalInputStyle}
              />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={modalLabelStyle}>Message</label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={6}
                style={modalInputStyle}
              />
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowEmailModal(false)}
                style={{
                  padding: "8px 16px",
                  background: "#ffffff",
                  color: "#344054",
                  border: "1px solid #d0d5dd",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              >
                Cancel
              </button>
              <button
                onClick={sendEmailAndMarkSent}
                style={{
                  padding: "8px 16px",
                  background: "#006ee6",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              >
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sidebar Buttons / Styles
const toolbarBtnStyle = {
  padding: "6px 12px",
  background: "#ffffff",
  color: "#344054",
  border: "1px solid #d0d5dd",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: "500",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  outline: "none",
};

const dropdownMenuContent = {
  position: "absolute",
  right: 0,
  top: "100%",
  marginTop: "4px",
  background: "#ffffff",
  border: "1px solid #eaecf0",
  borderRadius: "6px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  zIndex: 100,
  minWidth: "180px",
  overflow: "hidden",
  padding: "4px 0",
};

const dropdownItemBtn = {
  display: "flex",
  alignItems: "center",
  width: "100%",
  padding: "8px 16px",
  border: "none",
  background: "none",
  textAlign: "left",
  cursor: "pointer",
  fontSize: "13px",
  color: "#344054",
  outline: "none",
  transition: "background 0.1s ease",
};

const docThStyle = {
  padding: "8px 12px",
  color: "#475569",
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase",
  borderBottom: "1px solid #d0d5dd",
  letterSpacing: "0.03em",
};

const docTdStyle = {
  padding: "10px 12px",
  color: "#475569",
  verticalAlign: "top",
};

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(15, 23, 42, 0.4)",
  backdropFilter: "blur(2px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalBox = {
  background: "#ffffff",
  borderRadius: "8px",
  padding: "24px",
  width: "550px",
  maxWidth: "90%",
  boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
};

const modalLabelStyle = {
  display: "block",
  fontSize: "12px",
  fontWeight: "600",
  color: "#344054",
  marginBottom: "4px",
};

const modalInputStyle = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: "4px",
  border: "1px solid #d0d5dd",
  fontSize: "13px",
  boxSizing: "border-box",
  outline: "none",
  color: "#344054",
};

const logDotStyle = {
  position: "absolute",
  left: "-25px",
  top: "4px",
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  background: "#006ee6",
  border: "2px solid #ffffff",
  boxShadow: "0 0 0 2px #bfdbfe",
};


export default QuoteDetail;
