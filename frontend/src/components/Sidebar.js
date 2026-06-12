/**
 * Sidebar.js – Reusable left sidebar navigation (Zoho Books style)
 * Responsive: auto-collapses on mobile, has hamburger toggle on Topbar
 * Dependencies: react-router-dom
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Sidebar.css";

import { 
  Home, Package, ShoppingCart, Receipt, 
  Clock, Landmark, Calculator, BarChart2, FolderOpen 
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { canAccess, MODULES, ACTIONS } from "../utils/permissions";
import logoImage from "../eazzio-logo-dark.png";

/* ── Sidebar menu definition ── */
const sidebarMenus = [
  { label: "Home", icon: <Home size={18} />, path: "/dashboard" },
  {
    label: "Items", icon: <Package size={18} />, module: MODULES.ITEMS,
    children: [
      { label: "Items", path: "/items" },
      { label: "New Item", path: "/items/new" },
      { label: "Stock In / Stock Out", path: "/inventory/stock" },
      { label: "Inventory Movements", path: "/inventory/movements" },
      { label: "Low Stock Alerts", path: "/inventory/low-stock" },
      { label: "Item Valuation Report", path: "/reports/item-valuation" },
    ],
  },
  {
    label: "Sales", icon: <ShoppingCart size={18} />,
    children: [
      { label: "Customers", path: "/customers", module: MODULES.CUSTOMERS },
      { label: "Quotes", path: "/quotes", module: MODULES.QUOTES },
      { label: "Invoices", path: "/invoices", module: MODULES.INVOICES },
      { label: "Sales Orders", path: "/sales-orders" }, // Allow if they have sales access
      { label: "Payments Received", path: "/payments-received" },
      { label: "Delivery Challans", path: "/delivery-challans" },
      { label: "Credit Notes", path: "/credit-notes" },
      { label: "Recurring Invoices", path: "/recurring-invoices" },
    ],
  },
  {
    label: "Purchases", icon: <Receipt size={18} />,
    children: [
      { label: "Vendors", path: "/vendors", module: MODULES.VENDORS },
      { label: "Expenses", path: "/expenses", module: MODULES.EXPENSES },
      { label: "Recurring / Fixed Expenses", path: "/recurring-expenses" },
      { label: "Purchase Orders", path: "/purchase-orders" },
      { label: "Bills", path: "/bills", module: MODULES.BILLS },
      { label: "Payments Made", path: "/payments-made" },
      { label: "Vendor Credits", path: "/vendor-credits" },
    ],
  },
  {
    label: "Time Tracking", icon: <Clock size={18} />,
    children: [
      { label: "Projects", path: "/projects" },
      { label: "Timesheets", path: "/timesheets" },
    ],
  },
  {
    label: "Banking", icon: <Landmark size={18} />, module: MODULES.BANKING,
    children: [
      { label: "Bank Accounts", path: "/bank-accounts" },
      { label: "Bank Rules", path: "/bank-rules" },
      { label: "Reconciliation", path: "/reconciliation" },
    ],
  },
  {
    label: "Accountant", icon: <Calculator size={18} />, module: MODULES.REPORTS, // Treat accountant tools like reports access for visibility
    children: [
      { label: "Chart of Accounts", path: "/chart-of-accounts" },
      { label: "Manual Journals", path: "/manual-journals" },
      { label: "Transaction Locking", path: "/transaction-locking" },
      { label: "Bulk Updates", path: "/bulk-updates" },
      { label: "Currency Adjustments", path: "/currency-adjustments" },
      { label: "Taxes", path: "/taxes" },
    ],
  },
  {
    label: "Reports", icon: <BarChart2 size={18} />, module: MODULES.REPORTS,
    children: [
      { label: "Profit and Loss", path: "/reports/profit-loss" },
      { label: "Balance Sheet", path: "/reports/balance-sheet" },
      { label: "Cash Flow Statement", path: "/reports/cash-flow" },
      { label: "Trial Balance", path: "/reports/trial-balance" },
    ],
  },
  {
    label: "Documents", icon: <FolderOpen size={18} />,
    children: [
      { label: "All Documents", path: "/documents" },
      { label: "Upload Document", path: "/documents/upload" },
    ],
  },
];

function Sidebar({ onCollapseChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
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
        <div className="sidebar-brand" style={{ padding: "10px", display: "flex", justifyContent: "center" }}>
          {showLabels ? (
            <img src={logoImage} alt="Logo" style={{ height: "40px", maxWidth: "100%", objectFit: "contain" }} />
          ) : (
            <img src={logoImage} alt="Logo" style={{ height: "30px", width: "30px", objectFit: "cover", objectPosition: "left" }} />
          )}
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
          {sidebarMenus.map((menu) => {
            // Check top-level permission
            if (menu.module && !canAccess(user?.role, menu.module, ACTIONS.VIEW)) return null;

            // Filter children
            const allowedChildren = menu.children ? menu.children.filter(child => {
              if (child.module) return canAccess(user?.role, child.module, ACTIONS.VIEW);
              // For sales/purchases sub-items without explicit modules mapped,
              // we hide them if they are Staff (for unsupported ones) or Viewer. 
              // To keep it simple, if no module is mapped on the child, we allow it to render,
              // but the actual route will be blocked by ProtectedRoute or backend.
              // We'll hide Sales Orders, etc for Staff by mapping them, but let's just use a simple approach for now.
              return true; 
            }) : [];

            if (menu.children && allowedChildren.length === 0) return null;

            // Specific hide logic for Staff on Accounting
            if (menu.label === "Accountant" && user?.role?.toLowerCase() === "staff") return null;

            return (
            <div key={menu.label} className="sidebar-menu-block">
              <button
                className={`sidebar-menu-btn ${isActive(menu) ? "active" : ""}`}
                onClick={() =>
                  allowedChildren.length > 0
                    ? toggleDropdown(menu.label)
                    : navigate(menu.path)
                }
                title={!showLabels ? menu.label : ""}
              >
                <span className="sidebar-menu-icon">{menu.icon}</span>
                {showLabels && (
                  <>
                    <span className="sidebar-menu-text">{menu.label}</span>
                    {allowedChildren.length > 0 && (
                      <span className={`sidebar-arrow ${openDropdown === menu.label ? "open" : ""}`}>
                        ›
                      </span>
                    )}
                  </>
                )}
              </button>

              {/* Dropdown submenu */}
              {showLabels && allowedChildren.length > 0 && openDropdown === menu.label && (
                <div className="sidebar-submenu">
                  {allowedChildren.map((child) => (
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
            );
          })}
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