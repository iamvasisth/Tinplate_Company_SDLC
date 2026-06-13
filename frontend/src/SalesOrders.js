/**
 * SalesOrders.js – Redesigned Sales Orders List UI (Zoho Books style)
 * Modernized with an empty-state flowchart, bulk actions, and clean filter controls.
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiRequest } from "./api";
import { TableSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

const STATUS_COLORS = {
  draft:     { bg: "#f1f5f9", color: "#475569", label: "DRAFT" },
  confirmed: { bg: "#ecfdf5", color: "#047857", label: "CONFIRMED" },
  invoiced:  { bg: "#f0fdfa", color: "#0f766e", label: "INVOICED" },
  cancelled: { bg: "#fef2f2", color: "#b91c1c", label: "CANCELLED" },
};

function SalesOrders() {
  const navigate = useNavigate();
  const location = useLocation();

  const [salesOrders, setSalesOrders] = useState([]);
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
  const [sortBy, setSortBy] = useState("sales_order_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [favoriteView, setFavoriteView] = useState(() => localStorage.getItem("favSOView") || null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [soRes, customersRes] = await Promise.all([
        apiRequest("/sales-orders"),
        apiRequest("/customers"),
      ]);
      setSalesOrders(Array.isArray(soRes?.sales_orders) ? soRes.sales_orders : []);
      setCustomers(Array.isArray(customersRes?.customers) ? customersRes.customers : []);
    } catch (err) { 
      toast.error("Failed to load Sales Orders"); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData, location.state?.refresh]);

  useEffect(() => {
    const fav = localStorage.getItem("favSOView");
    if (fav) {
      setStatusFilter(fav);
    }
  }, []);

  const getCustomerName = (customerId) => {
    if (!customerId) return "—";
    const cust = customers.find(c => c.id === customerId);
    return cust ? cust.display_name || [cust.first_name, cust.last_name].filter(Boolean).join(" ") || cust.email : "—";
  };

  // Filter Sales Orders
  const filteredSOs = salesOrders.filter(so => {
    const matchSearch = search === "" ||
      (so.sales_order_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (so.reference_number || "").toLowerCase().includes(search.toLowerCase()) ||
      getCustomerName(so.customer_id).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || so.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Sort Sales Orders
  const sortedSOs = [...filteredSOs].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (sortBy === "customer_name") {
      aVal = getCustomerName(a.customer_id).toLowerCase();
      bVal = getCustomerName(b.customer_id).toLowerCase();
    } else if (sortBy === "total") {
      aVal = parseFloat(a.total) || 0;
      bVal = parseFloat(b.total) || 0;
    } else if (sortBy === "sales_order_date") {
      aVal = new Date(a.sales_order_date).getTime();
      bVal = new Date(b.sales_order_date).getTime();
    } else if (sortBy === "sales_order_number") {
      aVal = (a.sales_order_number || "").toLowerCase();
      bVal = (b.sales_order_number || "").toLowerCase();
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Selection helpers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(sortedSOs.map(s => s.id));
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
    if (!window.confirm(`Delete the ${selectedIds.length} selected Sales Orders?`)) return;
    try {
      await Promise.all(selectedIds.map(id => apiRequest(`/sales-orders/${id}`, { method: "DELETE" })));
      toast.success("Sales Orders deleted successfully");
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      toast.error("Failed to delete selected Sales Orders");
    }
  };

  const handleExportCSV = () => {
    const headers = ["Sales Order Number", "Customer Name", "Date", "Reference#", "Amount", "Status", "Delivery Method"];
    const rows = sortedSOs.map(s => [
      s.sales_order_number,
      getCustomerName(s.customer_id),
      new Date(s.sales_order_date).toLocaleDateString("en-GB"),
      s.reference_number || "",
      s.total,
      s.status,
      s.delivery_method || ""
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Sales Orders exported as CSV!");
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sortedSOs, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `sales_orders_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Sales Orders exported as JSON!");
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
      case "all": return "All Sales Orders";
      case "draft": return "Draft Sales Orders";
      case "confirmed": return "Confirmed Sales Orders";
      case "invoiced": return "Invoiced Sales Orders";
      case "cancelled": return "Cancelled Sales Orders";
      default: return "All Sales Orders";
    }
  };

  const allViews = [
    { key: "all", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "confirmed", label: "Confirmed" },
    { key: "invoiced", label: "Invoiced" },
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
                              localStorage.setItem("favSOView", newFav);
                              toast.success(`"${view.label}" set as default view`);
                            } else {
                              localStorage.removeItem("favSOView");
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
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => navigate("/sales-orders/new")}
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
                        left: "-180px",
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
                        onClick={() => { setSortBy("sales_order_date"); setSortOrder("desc"); setMoreMenuOpen(false); }}
                        style={{ ...dropdownItemBtn, background: hoveredItem === "sort_date_desc" ? "#f4f5f7" : "transparent" }}
                        onMouseEnter={() => setHoveredItem("sort_date_desc")}
                        onMouseLeave={() => setHoveredItem("sort")}
                      >
                        Date (Newest first)
                      </button>
                      <button
                        onClick={() => { setSortBy("sales_order_date"); setSortOrder("asc"); setMoreMenuOpen(false); }}
                        style={{ ...dropdownItemBtn, background: hoveredItem === "sort_date_asc" ? "#f4f5f7" : "transparent" }}
                        onMouseEnter={() => setHoveredItem("sort_date_asc")}
                        onMouseLeave={() => setHoveredItem("sort")}
                      >
                        Date (Oldest first)
                      </button>
                      <button
                        onClick={() => { setSortBy("sales_order_number"); setSortOrder("asc"); setMoreMenuOpen(false); }}
                        style={{ ...dropdownItemBtn, background: hoveredItem === "sort_num_asc" ? "#f4f5f7" : "transparent" }}
                        onMouseEnter={() => setHoveredItem("sort_num_asc")}
                        onMouseLeave={() => setHoveredItem("sort")}
                      >
                        Order Number (A-Z)
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
                        onClick={() => { setSortBy("total"); setSortOrder("desc"); setMoreMenuOpen(false); }}
                        style={{ ...dropdownItemBtn, background: hoveredItem === "sort_amt_desc" ? "#f4f5f7" : "transparent" }}
                        onMouseEnter={() => setHoveredItem("sort_amt_desc")}
                        onMouseLeave={() => setHoveredItem("sort")}
                      >
                        Amount (High to Low)
                      </button>
                    </div>
                  )}
                </div>

                {/* Import Sales Orders */}
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
                  Import Sales Orders
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
                        left: "-180px",
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", background: "#fcfcfd", borderBottom: "1px solid #eaecf0" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {/* Search Input */}
          <div style={{ position: "relative", width: "280px" }}>
            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search in Sales Orders..."
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

          {/* Status Filter Dropdown */}
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
            <option value="confirmed">Confirmed</option>
            <option value="invoiced">Invoiced</option>
            <option value="cancelled">Cancelled</option>
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

      {/* Main content pane */}
      <div style={{ padding: "0" }}>
        {loading ? (
          <div style={{ padding: "24px" }}><TableSkeleton columns={6} rows={5} /></div>
        ) : salesOrders.length === 0 ? (
          /* Zoho empty state splash block */
          <div style={{ padding: "40px 24px", maxWidth: "1000px", margin: "0 auto", color: "#1d2939" }}>
            
            {/* Tour card */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              background: "#ffffff",
              border: "1px solid #eaecf0",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 4px 16px rgba(16, 24, 40, 0.04)",
              marginBottom: "40px",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{
                position: "relative",
                width: "140px",
                height: "85px",
                background: "#f2f4f7",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                border: "1px solid #e4e7ec"
              }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  background: "#047857",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(4, 120, 87, 0.3)"
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff">
                    <path d="M8 5v14l11-7z"></path>
                  </svg>
                </div>
                {/* Small Zoho logo text */}
                <div style={{ position: "absolute", bottom: "6px", left: "8px", fontSize: "10px", fontWeight: "600", color: "#98a2b3" }}>Zoho Books</div>
              </div>
              <div>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: "600", color: "#1d2939" }}>Learn how to create a new sales order</h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#667085" }}>Watch a quick 2-minute video overview of the sales order lifecycle and operations.</p>
              </div>
            </div>

            {/* Core Splash Action */}
            <div style={{ textAlign: "center", marginBottom: "60px" }}>
              <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#1d2939", margin: "0 0 8px 0" }}>Start Managing Your Sales Activities!</h1>
              <p style={{ fontSize: "14px", color: "#667085", margin: "0 0 24px 0" }}>Create, customize and send professional Sales Orders.</p>
              
              <button
                onClick={() => navigate("/sales-orders/new")}
                style={{
                  padding: "12px 28px",
                  background: "#006ee6",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(0, 110, 230, 0.25)",
                  transition: "all 0.15s ease",
                }}
              >
                CREATE SALES ORDER
              </button>

              <div style={{ marginTop: "20px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "13px", color: "#475569" }}>
                <span>Convert vendor purchase orders into sales orders via Bilateral Connect.</span>
                <span style={{ color: "#e28743", cursor: "pointer", fontWeight: "500", display: "flex", alignItems: "center", gap: "4px" }}>
                  Setup Now
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </span>
              </div>
            </div>

            {/* Lifecycle Flowchart */}
            <div style={{ marginBottom: "60px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "32px" }}>
                <div style={{ height: "1px", background: "#eaecf0", flex: 1 }}></div>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#800020", textTransform: "uppercase", letterSpacing: "0.1em" }}>Life cycle of a Sales Order</h4>
                <div style={{ height: "1px", background: "#eaecf0", flex: 1 }}></div>
              </div>

              {/* Flowchart Diagrams Grid Layout */}
              <div style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "900px", margin: "0 auto" }}>
                {/* Track A */}
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "12px", background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px dashed #e2e8f0" }}>
                  <div style={{ ...flowCard, background: "#eff6ff", borderColor: "#bfdbfe", color: "#1e40af" }}>
                    <div style={{ fontSize: "10px", fontWeight: "700", opacity: 0.8 }}>CUSTOMER REQUEST</div>
                  </div>
                  <div style={flowArrow}>➔</div>
                  <div style={{ ...flowCard, background: "#ffffff", borderColor: "#006ee6", color: "#006ee6" }}>
                    <div style={{ fontSize: "11px", fontWeight: "600" }}>CREATE SALES ORDER</div>
                  </div>
                  <div style={flowArrow}>➔</div>
                  <div style={{ fontSize: "11px", color: "#667085", fontStyle: "italic" }}>Convert to Open</div>
                  <div style={flowArrow}>➔</div>
                  <div style={{ ...flowCard, background: "#ffffff", borderColor: "#047857", color: "#047857" }}>
                    <div style={{ fontSize: "11px", fontWeight: "600" }}>CONFIRM ORDER</div>
                  </div>
                  <div style={flowArrow}>➔</div>
                  <div style={{ fontSize: "11px", color: "#b91c1c", fontWeight: "600" }}>Low Stock</div>
                  <div style={flowArrow}>➔</div>
                  <div style={{ ...flowCard, background: "#fff1f2", borderColor: "#fecdd3", color: "#be123c" }}>
                    <div style={{ fontSize: "10px", fontWeight: "700" }}>CREATE PURCHASE ORDER</div>
                  </div>
                </div>

                {/* Track B */}
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "12px", background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px dashed #e2e8f0" }}>
                  <div style={{ ...flowCard, background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}>
                    <div style={{ fontSize: "10px", fontWeight: "700", opacity: 0.8 }}>ACCEPTED ESTIMATE</div>
                  </div>
                  <div style={flowArrow}>➔</div>
                  <div style={{ ...flowCard, background: "#ffffff", borderColor: "#006ee6", color: "#006ee6" }}>
                    <div style={{ fontSize: "11px", fontWeight: "600" }}>CREATE SALES ORDER</div>
                  </div>
                  <div style={flowArrow}>➔</div>
                  <div style={{ fontSize: "11px", color: "#667085", fontStyle: "italic" }}>Convert to Open</div>
                  <div style={flowArrow}>➔</div>
                  <div style={{ ...flowCard, background: "#ffffff", borderColor: "#047857", color: "#047857" }}>
                    <div style={{ fontSize: "11px", fontWeight: "600" }}>CONFIRM ORDER</div>
                  </div>
                  <div style={flowArrow}>➔</div>
                  <div style={{ ...flowCard, background: "#ffffff", borderColor: "#0f766e", color: "#0f766e" }}>
                    <div style={{ fontSize: "11px", fontWeight: "600" }}>CONVERT TO INVOICE</div>
                  </div>
                  <div style={flowArrow}>➔</div>
                  <div style={{ fontSize: "11px", color: "#667085", fontStyle: "italic" }}>Receive Goods</div>
                  <div style={flowArrow}>➔</div>
                  <div style={{ ...flowCard, background: "#ecfdf5", borderColor: "#a7f3d0", color: "#047857" }}>
                    <div style={{ fontSize: "11px", fontWeight: "700" }}>GET PAID ★</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div style={{ maxWidth: "600px", margin: "0 auto", background: "#fcfcfd", border: "1px solid #eaecf0", borderRadius: "8px", padding: "20px" }}>
              <h5 style={{ margin: "0 0 12px 0", fontSize: "13px", fontWeight: "700", color: "#344054", textTransform: "uppercase" }}>In the Sales Orders module, you can:</h5>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={checkRow}>
                  <span style={checkIcon}>✓</span>
                  <span style={checkText}>Create sales orders to follow up a quote or customer request.</span>
                </div>
                <div style={checkRow}>
                  <span style={checkIcon}>✓</span>
                  <span style={checkText}>Convert the sales order into a purchase order if you are low on stock.</span>
                </div>
                <div style={checkRow}>
                  <span style={checkIcon}>✓</span>
                  <span style={checkText}>Convert the sales order into an invoice if the sale goes through.</span>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* Table list view */
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #eaecf0" }}>
                    <th style={{ ...thStyle, width: "40px" }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.length > 0 && selectedIds.length === sortedSOs.length}
                        onChange={handleSelectAll}
                        style={checkboxStyle}
                      />
                    </th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Sales Order#</th>
                    <th style={thStyle}>Reference#</th>
                    <th style={thStyle}>Customer Name</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Invoiced</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Payment</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                    <th style={thStyle}>Expected Shipment Date</th>
                    <th style={thStyle}>Order Status</th>
                    <th style={thStyle}>Delivery Method</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSOs.map((s) => {
                    const isSelected = selectedIds.includes(s.id);
                    const isInvoiced = s.status === "invoiced";
                    return (
                      <tr
                        key={s.id}
                        onClick={() => navigate(`/sales-orders/${s.id}/document`)}
                        style={{
                          borderBottom: "1px solid #eaecf0",
                          cursor: "pointer",
                          background: isSelected ? "#fcfcfd" : "#ffffff",
                          transition: "background 0.1s ease",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#f9fafb"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? "#fcfcfd" : "#ffffff"; }}
                      >
                        <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectOne(e, s.id)}
                            style={checkboxStyle}
                          />
                        </td>
                        <td style={tdStyle}>{new Date(s.sales_order_date).toLocaleDateString("en-GB")}</td>
                        <td style={{ ...tdStyle, color: "#006ee6", fontWeight: "500" }}>
                          {s.sales_order_number}
                        </td>
                        <td style={tdStyle}>{s.reference_number || "—"}</td>
                        <td style={{ ...tdStyle, color: "#344054" }}>{getCustomerName(s.customer_id)}</td>
                        <td style={tdStyle}>{statusBadge(s.status)}</td>
                        {/* Invoiced dot indicator */}
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <span style={{ 
                            width: "8px", 
                            height: "8px", 
                            borderRadius: "50%", 
                            display: "inline-block", 
                            background: isInvoiced ? "#0f766e" : "#cbd5e1" 
                          }}></span>
                        </td>
                        {/* Payment indicator */}
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <span style={{ 
                            width: "8px", 
                            height: "8px", 
                            borderRadius: "50%", 
                            display: "inline-block", 
                            background: isInvoiced ? "#047857" : "#cbd5e1" 
                          }}></span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600", color: "#1d2939" }}>
                          ₹{parseFloat(s.total).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={tdStyle}>
                          {s.expected_shipment_date ? new Date(s.expected_shipment_date).toLocaleDateString("en-GB") : "—"}
                        </td>
                        <td style={tdStyle}>
                          <span style={{ textTransform: "uppercase", fontSize: "11px", fontWeight: "600", color: "#475569" }}>
                            {s.status}
                          </span>
                        </td>
                        <td style={tdStyle}>{s.delivery_method || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom commerce banner */}
            <div style={{
              margin: "24px",
              padding: "16px 24px",
              border: "1px solid #e4e7ec",
              borderRadius: "8px",
              background: "#ffffff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "0 1px 3px rgba(16, 24, 40, 0.05)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                <div style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#166534",
                  textTransform: "uppercase"
                }}>
                  Zoho Commerce
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#1d2939" }}>Increase your sales by taking your Business online with Zoho Commerce</div>
                  <div style={{ display: "flex", gap: "16px", fontSize: "11px", color: "#667085" }}>
                    <span><span style={{ color: "#155724", fontWeight: "bold", marginRight: "4px" }}>✓</span> List products online</span>
                    <span><span style={{ color: "#155724", fontWeight: "bold", marginRight: "4px" }}>✓</span> Sell to global buyers</span>
                    <span><span style={{ color: "#155724", fontWeight: "bold", marginRight: "4px" }}>✓</span> Auto-sync orders to Zoho Books</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => toast("Redirecting to Zoho Commerce Setup")}
                style={{
                  padding: "8px 16px",
                  background: "#006ee6",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Learn More
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Styling classes
const thStyle = {
  padding: "12px 16px",
  color: "#475569",
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: "1px solid #eaecf0",
  whiteSpace: "nowrap",
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

// Flowchart custom styles
const flowCard = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "1px solid",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "120px",
  textAlign: "center",
  boxShadow: "0 1px 2px rgba(16, 24, 40, 0.05)",
};

const flowArrow = {
  color: "#98a2b3",
  fontSize: "14px",
  fontWeight: "700",
  userSelect: "none",
};

// Checklist custom styles
const checkRow = {
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
};

const checkIcon = {
  color: "#006ee6",
  fontWeight: "bold",
  fontSize: "14px",
};

const checkText = {
  fontSize: "13px",
  color: "#475569",
};

export default SalesOrders;
