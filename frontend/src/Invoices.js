/**
 * Invoices.js – Redesigned Invoices List UI (Zoho Books style)
 * Modernized with an empty-state flowchart, bulk actions, and clean filter controls.
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiRequest } from "./api";
import { TableSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

const STATUS_COLORS = {
  draft:          { bg: "#f1f5f9", color: "#475569", label: "DRAFT" },
  sent:           { bg: "#fffbeb", color: "#b45309", label: "SENT" },
  unpaid:         { bg: "#fffbeb", color: "#b45309", label: "UNPAID" },
  partially_paid: { bg: "#eff6ff", color: "#1d4ed8", label: "PARTIALLY PAID" },
  paid:           { bg: "#f0fdf4", color: "#15803d", label: "PAID" },
  overdue:        { bg: "#fef2f2", color: "#b91c1c", label: "OVERDUE" },
  cancelled:      { bg: "#f1f5f9", color: "#475569", label: "CANCELLED" },
};

function Invoices() {
  const navigate = useNavigate();
  const location = useLocation();

  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search and Filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  
  // Selection
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Menus
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [sortSubMenuOpen, setSortSubMenuOpen] = useState(false);
  const [exportSubMenuOpen, setExportSubMenuOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [sortBy, setSortBy] = useState("invoice_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [favoriteView, setFavoriteView] = useState(() => localStorage.getItem("favInvoiceView") || null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [invRes, customersRes] = await Promise.all([
        apiRequest("/invoices"),
        apiRequest("/customers"),
      ]);
      setInvoices(Array.isArray(invRes?.invoices) ? invRes.invoices : []);
      setCustomers(Array.isArray(customersRes?.customers) ? customersRes.customers : []);
    } catch (err) { 
      toast.error("Failed to load Invoices"); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData, location.state?.refresh]);

  useEffect(() => {
    const fav = localStorage.getItem("favInvoiceView");
    if (fav) {
      setStatusFilter(fav);
    }
  }, []);

  const getCustomerName = (customerId) => {
    if (!customerId) return "—";
    const cust = customers.find(c => c.id === customerId);
    return cust ? cust.display_name || [cust.first_name, cust.last_name].filter(Boolean).join(" ") || cust.email : "—";
  };

  // Filter Invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchSearch = search === "" ||
      (inv.invoice_number || "").toLowerCase().includes(search.toLowerCase()) ||
      getCustomerName(inv.customer_id).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Sort Invoices
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
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

  // Selection helpers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(sortedInvoices.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e, id) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Delete the ${selectedIds.length} selected Invoices?`)) return;
    try {
      await Promise.all(selectedIds.map(id => apiRequest(`/invoices/${id}`, { method: "DELETE" })));
      toast.success("Invoices deleted successfully");
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      toast.error("Failed to delete selected Invoices");
    }
  };

  const handleExportCSV = () => {
    const headers = ["Invoice Number", "Customer Name", "Date", "Status", "Amount", "Balance Due"];
    const rows = sortedInvoices.map(inv => [
      inv.invoice_number,
      getCustomerName(inv.customer_id),
      new Date(inv.invoice_date).toLocaleDateString("en-GB"),
      inv.status,
      inv.total_amount,
      inv.balance_due
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `invoices_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Invoices exported as CSV!");
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sortedInvoices, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `invoices_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Invoices exported as JSON!");
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
      case "all": return "All Invoices";
      case "draft": return "Draft Invoices";
      case "sent": return "Sent Invoices";
      case "unpaid": return "Unpaid Invoices";
      case "partially_paid": return "Partially Paid Invoices";
      case "paid": return "Paid Invoices";
      case "overdue": return "Overdue Invoices";
      case "cancelled": return "Cancelled Invoices";
      default: return "All Invoices";
    }
  };

  const allViews = [
    { key: "all", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "sent", label: "Sent" },
    { key: "unpaid", label: "Unpaid" },
    { key: "partially_paid", label: "Partially Paid" },
    { key: "paid", label: "Paid" },
    { key: "overdue", label: "Overdue" },
    { key: "cancelled", label: "Cancelled" },
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#98a2b3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  </span>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search Views"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    style={{
                      width: "100%", padding: "8px 10px 8px 30px", borderRadius: "6px", border: "1px solid #d0d5dd",
                      fontSize: "13px", boxSizing: "border-box", outline: "none"
                    }}
                  />
                </div>
              </div>

              {/* List of views */}
              <div style={{ maxHeight: "250px", overflowY: "auto", padding: "8px 0" }}>
                <div style={{ padding: "4px 16px", fontSize: "11px", fontWeight: "600", color: "#98a2b3", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                  Default Views
                </div>
                {filteredViews.length > 0 ? filteredViews.map(view => (
                  <div 
                    key={view.key}
                    onClick={() => { setStatusFilter(view.key); setStatusDropdownOpen(false); }}
                    onMouseEnter={() => setHoveredItem(view.key)}
                    onMouseLeave={() => setHoveredItem(null)}
                    style={{
                      padding: "8px 16px", fontSize: "14px", color: "#344054", cursor: "pointer",
                      background: statusFilter === view.key ? "#f9fafb" : (hoveredItem === view.key ? "#f9fafb" : "transparent"),
                      display: "flex", justifyContent: "space-between", alignItems: "center"
                    }}
                  >
                    <span>{view.label}</span>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      {statusFilter === view.key && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ba5ec" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      )}
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          const newFav = favoriteView === view.key ? null : view.key;
                          setFavoriteView(newFav);
                          if(newFav) localStorage.setItem("favInvoiceView", newFav);
                          else localStorage.removeItem("favInvoiceView");
                        }}
                        style={{ color: favoriteView === view.key ? "#f59e0b" : "#d0d5dd" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={favoriteView === view.key ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div style={{ padding: "8px 16px", fontSize: "13px", color: "#667085" }}>No views found</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button 
            onClick={() => navigate("/invoices/new")} 
            style={{ background: "#0ba5ec", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 14px", fontSize: "14px", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            New
          </button>
          
          {/* More actions dropdown */}
          <div style={{ position: "relative" }}>
            <button 
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              style={{ background: "#f9fafb", border: "1px solid #eaecf0", borderRadius: "6px", padding: "8px", cursor: "pointer", display: "flex", alignItems: "center", color: "#344054" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
            </button>
            {moreMenuOpen && (
              <div style={{ position: "absolute", right: 0, top: "100%", marginTop: "8px", background: "#fff", border: "1px solid #eaecf0", borderRadius: "8px", boxShadow: "0 10px 30px rgba(16, 24, 40, 0.08)", zIndex: 1000, width: "220px", padding: "8px 0" }}>
                
                {/* Sort Submenu */}
                <div 
                  onMouseEnter={() => setSortSubMenuOpen(true)}
                  onMouseLeave={() => setSortSubMenuOpen(false)}
                  style={{ position: "relative" }}
                >
                  <div style={{ padding: "8px 16px", fontSize: "14px", color: "#344054", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }} onMouseEnter={(e) => e.currentTarget.style.background="#f9fafb"} onMouseLeave={(e) => e.currentTarget.style.background="transparent"}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6l3 -3l3 3"></path><path d="M6 3v18"></path><path d="M15 18l3 3l3 -3"></path><path d="M18 21v-18"></path></svg>
                      Sort by
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#98a2b3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </div>
                  
                  {sortSubMenuOpen && (
                    <div style={{ position: "absolute", right: "100%", top: 0, marginRight: "4px", background: "#fff", border: "1px solid #eaecf0", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", width: "180px", padding: "8px 0" }}>
                      {[
                        { key: "invoice_date", label: "Date" },
                        { key: "invoice_number", label: "Invoice Number" },
                        { key: "customer_name", label: "Customer Name" },
                        { key: "total", label: "Amount" }
                      ].map(opt => (
                        <div key={opt.key} onClick={() => { setSortBy(opt.key); setSortOrder(sortBy === opt.key && sortOrder === "asc" ? "desc" : "asc"); setMoreMenuOpen(false); setSortSubMenuOpen(false); }} style={{ padding: "8px 16px", fontSize: "14px", color: "#344054", cursor: "pointer", display: "flex", justifyContent: "space-between" }} onMouseEnter={(e) => e.currentTarget.style.background="#f9fafb"} onMouseLeave={(e) => e.currentTarget.style.background="transparent"}>
                          {opt.label}
                          {sortBy === opt.key && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ba5ec" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points={sortOrder === "asc" ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}></polyline></svg>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Export Submenu */}
                <div 
                  onMouseEnter={() => setExportSubMenuOpen(true)}
                  onMouseLeave={() => setExportSubMenuOpen(false)}
                  style={{ position: "relative" }}
                >
                  <div style={{ padding: "8px 16px", fontSize: "14px", color: "#344054", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }} onMouseEnter={(e) => e.currentTarget.style.background="#f9fafb"} onMouseLeave={(e) => e.currentTarget.style.background="transparent"}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      Export
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#98a2b3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </div>
                  
                  {exportSubMenuOpen && (
                    <div style={{ position: "absolute", right: "100%", top: 0, marginRight: "4px", background: "#fff", border: "1px solid #eaecf0", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", width: "150px", padding: "8px 0" }}>
                      <div onClick={() => { handleExportCSV(); setMoreMenuOpen(false); setExportSubMenuOpen(false); }} style={{ padding: "8px 16px", fontSize: "14px", color: "#344054", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.background="#f9fafb"} onMouseLeave={(e) => e.currentTarget.style.background="transparent"}>Export as CSV</div>
                      <div onClick={() => { handleExportJSON(); setMoreMenuOpen(false); setExportSubMenuOpen(false); }} style={{ padding: "8px 16px", fontSize: "14px", color: "#344054", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.background="#f9fafb"} onMouseLeave={(e) => e.currentTarget.style.background="transparent"}>Export as JSON</div>
                    </div>
                  )}
                </div>

                <div style={{ height: "1px", background: "#eaecf0", margin: "4px 0" }}></div>
                <div onClick={() => { fetchData(); setMoreMenuOpen(false); }} style={{ padding: "8px 16px", fontSize: "14px", color: "#344054", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }} onMouseEnter={(e) => e.currentTarget.style.background="#f9fafb"} onMouseLeave={(e) => e.currentTarget.style.background="transparent"}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                  Refresh List
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ padding: "0" }}>
        
        {/* Table View */}
        {loading ? (
          <div style={{ padding: "24px" }}><TableSkeleton columns={7} rows={6} /></div>
        ) : invoices.length === 0 ? (
          // EMPTY STATE
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", textAlign: "center" }}>
            <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "16px", marginBottom: "30px", border: "1px dashed #cbd5e1", maxWidth: "450px" }}>
              <div style={{ fontSize: "40px", marginBottom: "15px" }}>🧾</div>
              <h3 style={{ fontSize: "18px", color: "#0f172a", margin: "0 0 10px 0" }}>Start billing your customers!</h3>
              <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 20px 0", lineHeight: "1.5" }}>
                Create professional invoices, send them to your customers, and get paid faster.
              </p>
              <button 
                onClick={() => navigate("/invoices/new")} 
                style={{ background: "#0ba5ec", color: "#fff", border: "none", borderRadius: "6px", padding: "10px 20px", fontSize: "14px", fontWeight: "600", cursor: "pointer", display: "inline-block" }}
              >
                CREATE INVOICE
              </button>
            </div>

            {/* Lifecycle Flowchart */}
            <div style={{ maxWidth: "800px", margin: "0 auto" }}>
              <p style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "20px" }}>Life cycle of an Invoice</p>
              
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ padding: "12px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "13px", color: "#334155", fontWeight: "500" }}>Create Invoice</div>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                
                <div style={{ padding: "12px 16px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", fontSize: "13px", color: "#0369a1", fontWeight: "500" }}>Send to Customer</div>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                
                <div style={{ padding: "12px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", fontSize: "13px", color: "#15803d", fontWeight: "500" }}>Get Paid</div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Bulk Actions Bar */}
            <div style={{ padding: "12px 24px", background: selectedIds.length > 0 ? "#f9fafb" : "#fff", borderBottom: "1px solid #eaecf0", display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: "60px", transition: "background 0.2s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ position: "relative", width: "240px" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#98a2b3", display: "flex" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px 8px 36px", borderRadius: "6px", border: "1px solid #d0d5dd", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>
              
              {selectedIds.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "14px", color: "#475569", fontWeight: "500" }}>{selectedIds.length} selected</span>
                  <button onClick={handleDeleteSelected} style={{ background: "#fff", border: "1px solid #d0d5dd", borderRadius: "6px", padding: "6px 12px", color: "#b91c1c", fontSize: "13px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    Delete
                  </button>
                </div>
              )}
            </div>

            {/* Data Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #eaecf0", background: "#f9fafb" }}>
                    <th style={{ padding: "12px 24px", width: "40px", textAlign: "left" }}>
                      <input 
                        type="checkbox" 
                        checked={sortedInvoices.length > 0 && selectedIds.length === sortedInvoices.length}
                        onChange={handleSelectAll}
                        style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#0ba5ec" }}
                      />
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#667085", textTransform: "uppercase", letterSpacing: "0.05em" }}>Date</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#667085", textTransform: "uppercase", letterSpacing: "0.05em" }}>Invoice #</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#667085", textTransform: "uppercase", letterSpacing: "0.05em" }}>Customer Name</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#667085", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#667085", textTransform: "uppercase", letterSpacing: "0.05em" }}>Due Date</th>
                    <th style={{ padding: "12px 24px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "#667085", textTransform: "uppercase", letterSpacing: "0.05em" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInvoices.length > 0 ? sortedInvoices.map(inv => (
                    <tr 
                      key={inv.id} 
                      onClick={() => navigate(`/invoices/${inv.id}/document`)}
                      style={{ borderBottom: "1px solid #eaecf0", cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "16px 24px" }} onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(inv.id)}
                          onChange={(e) => handleSelectOne(e, inv.id)}
                          style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#0ba5ec" }}
                        />
                      </td>
                      <td style={{ padding: "16px 16px", fontSize: "14px", color: "#475569" }}>
                        {new Date(inv.invoice_date).toLocaleDateString("en-GB", { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td style={{ padding: "16px 16px", fontSize: "14px", fontWeight: "500", color: "#0ba5ec" }}>
                        {inv.invoice_number}
                      </td>
                      <td style={{ padding: "16px 16px", fontSize: "14px", color: "#1d2939", fontWeight: "500" }}>
                        {getCustomerName(inv.customer_id)}
                      </td>
                      <td style={{ padding: "16px 16px" }}>
                        {statusBadge(inv.status)}
                      </td>
                      <td style={{ padding: "16px 16px", fontSize: "14px", color: "#475569" }}>
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-GB", { day: '2-digit', month: '2-digit', year: 'numeric' }) : "—"}
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right", fontSize: "14px", fontWeight: "600", color: "#1d2939" }}>
                        ₹{parseFloat(inv.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>
                        No invoices found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Invoices;
