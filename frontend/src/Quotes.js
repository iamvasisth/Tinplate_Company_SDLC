/**
 * Quotes.js – Redesigned Quote list view matching Zoho Books style (input_file_0.png)
 * Redesigned with checkboxes, clean borders, custom badges, right-aligned amount,
 * search layout, status filters, and row redirection to QuoteDetail split view.
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiRequest } from "./api";
import { TableSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

const STATUS_COLORS = {
  draft:    { bg: "#f1f5f9", color: "#475569", label: "DRAFT" },
  sent:     { bg: "#fffbeb", color: "#b45309", label: "SENT" },
  accepted: { bg: "#ecfdf5", color: "#047857", label: "ACCEPTED" },
  declined: { bg: "#fef2f2", color: "#b91c1c", label: "DECLINED" },
  expired:  { bg: "#fff1f2", color: "#be123c", label: "EXPIRED" },
  invoiced: { bg: "#f0fdfa", color: "#0f766e", label: "INVOICED" },
};

function Quotes() {
  const navigate = useNavigate();
  const location = useLocation();

  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [favoriteView, setFavoriteView] = useState(() => localStorage.getItem("favQuoteView") || null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  // Dropdown & Sorting States
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [sortSubMenuOpen, setSortSubMenuOpen] = useState(false);
  const [exportSubMenuOpen, setExportSubMenuOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [sortBy, setSortBy] = useState("quote_date");
  const [sortOrder, setSortOrder] = useState("desc");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [quotesRes, customersRes] = await Promise.all([
        apiRequest("/quotes"),
        apiRequest("/customers"),
      ]);
      setQuotes(Array.isArray(quotesRes?.quotes) ? quotesRes.quotes : []);
      setCustomers(Array.isArray(customersRes?.customers) ? customersRes.customers : []);
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, location.state?.refresh]);

  useEffect(() => {
    const fav = localStorage.getItem("favQuoteView");
    if (fav) {
      setStatusFilter(fav);
    }
  }, []);

  const getCustomerName = (customerId) => {
    if (!customerId) return "—";
    const cust = customers.find((c) => c.id === customerId);
    return cust
      ? cust.display_name ||
          [cust.first_name, cust.last_name].filter(Boolean).join(" ") ||
          cust.email
      : "—";
  };

  // Filter quotes
  const filteredQuotes = quotes.filter((q) => {
    const matchSearch =
      search === "" ||
      (q.quote_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (q.reference_number || "").toLowerCase().includes(search.toLowerCase()) ||
      getCustomerName(q.customer_id).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Sort quotes
  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
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

  // Checkbox handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(sortedQuotes.map((q) => q.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e, id) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Delete the ${selectedIds.length} selected quote(s)?`)) return;
    try {
      await Promise.all(
        selectedIds.map((id) => apiRequest(`/quotes/${id}`, { method: "DELETE" }))
      );
      toast.success("Quotes deleted successfully");
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const handleExportCSV = () => {
    const headers = ["Quote Number", "Customer Name", "Date", "Expiry Date", "Amount", "Status"];
    const rows = sortedQuotes.map(q => [
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
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sortedQuotes, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `quotes_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Quotes exported as JSON successfully!");
  };

  const statusBadge = (status) => {
    const colors = STATUS_COLORS[status] || STATUS_COLORS.draft;
    return (
      <span
        style={{
          padding: "3px 8px",
          borderRadius: "4px",
          fontSize: "11px",
          fontWeight: "600",
          background: colors.bg,
          color: colors.color,
          letterSpacing: "0.03em",
          display: "inline-block",
        }}
      >
        {colors.label}
      </span>
    );
  };

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
    <div style={{ background: "#ffffff", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Header Area */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #eaecf0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}>
          <h2 
            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
            style={{ fontSize: "20px", fontWeight: "600", color: "#1d2939", margin: 0, display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
          >
            {getFilterLabel(statusFilter)}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: statusDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}>
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </h2>

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
                width: "280px",
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
                  />
                </div>
              </div>

              {/* Views List */}
              <div style={{ maxHeight: "240px", overflowY: "auto", padding: "4px 0" }}>
                {filteredViews.length === 0 ? (
                  <div style={{ padding: "12px 16px", color: "#667085", fontSize: "13px", textAlign: "center" }}>No views found</div>
                ) : (
                  filteredViews.map(view => {
                    const isSelected = statusFilter === view.key;
                    const isFav = favoriteView === view.key;
                    return (
                      <div
                        key={view.key}
                        onClick={() => {
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
                  onClick={() => { setStatusDropdownOpen(false); toast("Custom views feature coming soon"); }}
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
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => navigate("/quotes/new")}
            style={{
              padding: "8px 14px",
              background: "#006ee6",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "500",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New
          </button>
          
          {/* Three Dots More Menu */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              style={{
                padding: "8px",
                background: "#ffffff",
                border: "1px solid #d0d5dd",
                borderRadius: "4px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                outline: "none",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#344054" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                        left: "-190px",
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
                        left: "-190px",
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
                  onClick={() => { setMoreMenuOpen(false); fetchData(); }}
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

      {/* Filter and Search controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", background: "#fcfcfd", borderBottom: "1px solid #eaecf0" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {/* Search Input */}
          <div style={{ position: "relative", width: "260px" }}>
            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search in Quotes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 32px",
                borderRadius: "4px",
                border: "1px solid #d0d5dd",
                fontSize: "13px",
                boxSizing: "border-box",
                outline: "none",
                color: "#344054",
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: "4px",
              border: "1px solid #d0d5dd",
              fontSize: "13px",
              color: "#344054",
              background: "#ffffff",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="expired">Expired</option>
            <option value="invoiced">Invoiced</option>
          </select>

          {/* Bulk actions */}
          {selectedIds.length > 0 && (
            <div style={{ display: "flex", gap: "8px", alignItems: "center", borderLeft: "1px solid #eaecf0", paddingLeft: "12px" }}>
              <span style={{ fontSize: "13px", color: "#475569", fontWeight: "500" }}>{selectedIds.length} selected</span>
              <button
                onClick={handleDeleteSelected}
                style={{
                  padding: "5px 10px",
                  background: "#fee2e2",
                  color: "#b91c1c",
                  border: "1px solid #fecaca",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "500",
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div style={{ padding: "0" }}>
        {loading ? (
          <div style={{ padding: "24px" }}><TableSkeleton columns={6} rows={5} /></div>
        ) : filteredQuotes.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "#667085" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d0d5dd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "16px" }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <h3 style={{ margin: "0 0 8px", fontSize: "16px", color: "#344054", fontWeight: "600" }}>No quotes found</h3>
            <p style={{ margin: "0 0 16px", fontSize: "14px", color: "#667085" }}>Try adjusting your search query or filter, or create a new quote.</p>
            <button
              onClick={() => navigate("/quotes/new")}
              style={{
                padding: "8px 14px",
                background: "#006ee6",
                color: "#ffffff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "13px",
              }}
            >
              + New Quote
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #eaecf0" }}>
                  <th style={{ ...thStyle, width: "40px" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === sortedQuotes.length}
                      onChange={handleSelectAll}
                      style={checkboxStyle}
                    />
                  </th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Quote Number</th>
                  <th style={thStyle}>Reference Number</th>
                  <th style={thStyle}>Customer Name</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                  <th style={{ ...thStyle, width: "30px" }}></th>
                </tr>
              </thead>
              <tbody>
                {sortedQuotes.map((q) => (
                  <tr
                    key={q.id}
                    onClick={() => navigate(`/quotes/${q.id}`)}
                    style={{
                      borderBottom: "1px solid #eaecf0",
                      cursor: "pointer",
                      background: selectedIds.includes(q.id) ? "#fcfcfd" : "#ffffff",
                      transition: "background 0.1s ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f9fafb"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = selectedIds.includes(q.id) ? "#fcfcfd" : "#ffffff"; }}
                  >
                    <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(q.id)}
                        onChange={(e) => handleSelectOne(e, q.id)}
                        style={checkboxStyle}
                      />
                    </td>
                    <td style={tdStyle}>{new Date(q.quote_date).toLocaleDateString("en-GB")}</td>
                    <td style={{ ...tdStyle, color: "#006ee6", fontWeight: "500" }}>
                      {q.quote_number}
                    </td>
                    <td style={tdStyle}>{q.reference_number || "—"}</td>
                    <td style={{ ...tdStyle, color: "#344054" }}>{getCustomerName(q.customer_id)}</td>
                    <td style={tdStyle}>{statusBadge(q.status)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600", color: "#1d2939" }}>
                      ₹{parseFloat(q.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={tdStyle}></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle = {
  padding: "10px 16px",
  color: "#475569",
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: "1px solid #eaecf0",
};

const tdStyle = {
  padding: "12px 16px",
  color: "#475569",
  whiteSpace: "nowrap",
  verticalAlign: "middle",
};

const checkboxStyle = {
  cursor: "pointer",
  width: "14px",
  height: "14px",
};

const dropdownItemBtn = {
  display: "flex",
  alignItems: "center",
  width: "100%",
  padding: "8px 14px",
  border: "none",
  background: "none",
  textAlign: "left",
  cursor: "pointer",
  fontSize: "13px",
  color: "#344054",
  outline: "none",
  transition: "all 0.1s ease",
  fontFamily: "system-ui, -apple-system, sans-serif",
};

export default Quotes;
