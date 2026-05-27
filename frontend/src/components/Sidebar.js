/**
 * Sidebar.js – Reusable left sidebar navigation (Zoho Books style)
 * Responsive: auto-collapses on mobile, has hamburger toggle on Topbar
 * Dependencies: react-router-dom
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Sidebar.css";

/* ── Sidebar menu definition ── */
const sidebarMenus = [
  { label: "Home", icon: "⌂", path: "/dashboard" },
  {
    label: "Items", icon: "▣",
    children: [
      { label: "Items", path: "/items" },
      { label: "Composite Items", path: "/composite-items" },
      { label: "Inventory Adjustments", path: "/inventory-adjustments" },
      { label: "Price Lists", path: "/price-lists" },
    ],
  },
  {
    label: "Sales", icon: "🛒",
    children: [
      { label: "Customers", path: "/customers" },
      { label: "Quotes", path: "/quotes" },
      { label: "Sales Orders", path: "/sales-orders" },
      { label: "Invoices", path: "/invoices" },
      { label: "Payments Received", path: "/payments-received" },
      { label: "Credit Notes", path: "/credit-notes" },
    ],
  },
  {
    label: "Purchases", icon: "🧾",
    children: [
      { label: "Vendors", path: "/vendors" },
      { label: "Expenses", path: "/expenses" },
      { label: "Purchase Orders", path: "/purchase-orders" },
      { label: "Bills", path: "/bills" },
      { label: "Payments Made", path: "/payments-made" },
      { label: "Vendor Credits", path: "/vendor-credits" },
    ],
  },
  {
    label: "Time Tracking", icon: "⏱",
    children: [
      { label: "Projects", path: "/projects" },
      { label: "Timesheet", path: "/timesheet" },
    ],
  },
  {
    label: "Banking", icon: "🏦",
    children: [
      { label: "Bank Accounts", path: "/bank-accounts" },
      { label: "Bank Rules", path: "/bank-rules" },
      { label: "Reconciliation", path: "/reconciliation" },
    ],
  },
  {
    label: "Accountant", icon: "♟",
    children: [
      { label: "Chart of Accounts", path: "/chart-of-accounts" },
      { label: "Manual Journals", path: "/manual-journals" },
      { label: "Currency Adjustments", path: "/currency-adjustments" },
      { label: "Taxes", path: "/taxes" },
    ],
  },
  {
    label: "Reports", icon: "▥",
    children: [
      { label: "Profit and Loss", path: "/reports/profit-loss" },
      { label: "Balance Sheet", path: "/reports/balance-sheet" },
      { label: "Cash Flow Statement", path: "/reports/cash-flow" },
      { label: "Trial Balance", path: "/reports/trial-balance" },
    ],
  },
  {
    label: "Documents", icon: "📁",
    children: [
      { label: "All Documents", path: "/documents" },
      { label: "Upload Document", path: "/documents/upload" },
    ],
  },
];

function Sidebar({ onCollapseChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  /* Notify parent of collapse changes */
  const handleCollapse = (val) => {
    setCollapsed(val);
    if (onCollapseChange) onCollapseChange(val);
  };

  /* Listen for resize to auto-collapse on mobile */
  const handleResize = useCallback(() => {
    const mobile = window.innerWidth <= 768;
    setIsMobile(mobile);
    if (mobile) {
      setMobileOpen(false);
      setCollapsed(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  /* Close mobile sidebar when route changes */
  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [location.pathname, isMobile]);

  /* Toggle dropdown inside sidebar */
  const toggleDropdown = (menuName) => {
    if (collapsed && !isMobile) return;
    setOpenDropdown(openDropdown === menuName ? null : menuName);
  };

  /* Check if a menu item or any of its children match the current path */
  const isActive = (menu) => {
    if (menu.path && location.pathname === menu.path) return true;
    if (menu.children) {
      return menu.children.some((child) => location.pathname.startsWith(child.path));
    }
    return false;
  };

  /* Determine CSS classes */
  const sidebarClass = [
    "sidebar",
    collapsed && !isMobile ? "collapsed" : "",
    isMobile ? "sidebar-mobile" : "",
    isMobile && mobileOpen ? "sidebar-mobile-open" : "",
  ].filter(Boolean).join(" ");

  const showLabels = isMobile ? true : !collapsed;

  return (
    <>
      {/* Mobile hamburger button - rendered via CSS positioning */}
      {isMobile && (
        <button
          className="sidebar-hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      )}

      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={sidebarClass}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">RUP</div>
          {showLabels && <span className="sidebar-brand-text">Books</span>}
        </div>

        {/* Desktop collapse button */}
        {!isMobile && (
          <button
            className="sidebar-collapse-btn"
            onClick={() => handleCollapse(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "›" : "‹"}
          </button>
        )}

        {/* Navigation */}
        <nav className="sidebar-nav">
          {sidebarMenus.map((menu) => (
            <div key={menu.label} className="sidebar-menu-block">
              <button
                className={`sidebar-menu-btn ${isActive(menu) ? "active" : ""}`}
                onClick={() =>
                  menu.children
                    ? toggleDropdown(menu.label)
                    : navigate(menu.path)
                }
                title={!showLabels ? menu.label : ""}
              >
                <span className="sidebar-menu-icon">{menu.icon}</span>
                {showLabels && (
                  <>
                    <span className="sidebar-menu-text">{menu.label}</span>
                    {menu.children && (
                      <span className={`sidebar-arrow ${openDropdown === menu.label ? "open" : ""}`}>
                        ›
                      </span>
                    )}
                  </>
                )}
              </button>

              {/* Dropdown submenu */}
              {showLabels && menu.children && openDropdown === menu.label && (
                <div className="sidebar-submenu">
                  {menu.children.map((child) => (
                    <button
                      key={child.label}
                      className={`sidebar-submenu-btn ${location.pathname.startsWith(child.path) ? "active" : ""}`}
                      onClick={() => navigate(child.path)}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        {showLabels && (
          <div className="sidebar-footer">
            <button className="sidebar-configure-btn">Configure Features ›</button>
            <button className="sidebar-tour-btn">● TAKE A LIVE PRODUCT TOUR</button>
          </div>
        )}
      </aside>
    </>
  );
}

export default Sidebar;
