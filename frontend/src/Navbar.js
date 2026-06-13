/**
 * Navbar.js – Full accounting navigation with dropdown menus
 * Dependencies: react-router-dom, AuthContext (for logout), businessModules (for label)
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

function Navbar() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  // Dropdown states
  const [itemsOpen, setItemsOpen] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);
  const [purchasesOpen, setPurchasesOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [accountantOpen, setAccountantOpen] = useState(false);

  // Determine the “Item” label based on business_type (can be overridden)
  const itemLabel =
    user?.business_type === "School"
      ? "Students"
      : user?.business_type === "Hospital"
      ? "Patients"
      : user?.business_type === "Retail"
      ? "Products"
      : "Items";

  // Logout handler
  const handleLogout = async () => {
    // Optionally call API to clear cookie, then clear state
    try {
      // await apiRequest("/logout", { method: "POST" }); // uncomment if backend logout needed
    } catch (e) {}
    setUser(null);
    navigate("/");
  };

  // Common menu item style
  const menuItemStyle = {
    position: "relative",
    padding: "10px 15px",
    cursor: "pointer",
    color: "#fff",
    fontWeight: "500",
    userSelect: "none",
  };

  // Dropdown container style (absolutely positioned)
  const dropdownStyle = {
    position: "absolute",
    top: "100%",
    left: 0,
    background: "#fff",
    borderRadius: "6px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    zIndex: 100,
    minWidth: "200px",
    display: "flex",
    flexDirection: "column",
  };

  const dropdownItemStyle = {
    padding: "8px 16px",
    color: "#333",
    textDecoration: "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: "#1e293b",
        color: "#fff",
        padding: "0 20px",
        height: "56px",
        position: "relative",
        zIndex: 1000,
      }}
    >
      {/* Logo / Brand */}
      <div
        style={{ 
          display: "flex", 
          alignItems: "center", 
          marginRight: "40px", 
          cursor: "pointer",
          userSelect: "none"
        }}
        onClick={() => navigate("/dashboard")}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src={require('./eazzio-logo-dark.png')} alt="eAzzio BOOKS" style={{ height: "40px", objectFit: "contain", borderRadius: "4px" }} />
        </div>
      </div>

      {/* Navigation items */}
      <div style={{ display: "flex", alignItems: "center", flex: 1, gap: "5px" }}>
        {/* Home (Dashboard) */}
        <div
          style={{ padding: "10px 15px", cursor: "pointer", fontWeight: "500" }}
          onClick={() => navigate("/dashboard")}
        >
          Home
        </div>

        {/* Items (dynamic) dropdown */}
        <div
          style={menuItemStyle}
          onMouseEnter={() => setItemsOpen(true)}
          onMouseLeave={() => setItemsOpen(false)}
        >
          {itemLabel}
          {itemsOpen && (
            <div style={dropdownStyle}>
              <div style={dropdownItemStyle} onClick={() => navigate("/items")}>Items</div>
              <div style={dropdownItemStyle} onClick={() => navigate("/items/new")}>New Item</div>
              <div style={dropdownItemStyle} onClick={() => navigate("/inventory/stock")}>Stock In / Stock Out</div>
              <div style={dropdownItemStyle} onClick={() => navigate("/inventory/movements")}>Inventory Movements</div>
              <div style={dropdownItemStyle} onClick={() => navigate("/inventory/low-stock")}>Low Stock Alerts</div>
              <div style={dropdownItemStyle} onClick={() => navigate("/reports/item-valuation")}>Item Valuation Report</div>
            </div>
          )}
        </div>

        {/* Sales dropdown */}
        <div
          style={menuItemStyle}
          onMouseEnter={() => setSalesOpen(true)}
          onMouseLeave={() => setSalesOpen(false)}
        >
          Sales
          {salesOpen && (
            <div style={dropdownStyle}>
              <div style={dropdownItemStyle} onClick={() => navigate("/customers")}>Customers</div>
              <div style={dropdownItemStyle} onClick={() => navigate("/quotes")}>Quotes</div>
              <div style={dropdownItemStyle} onClick={() => navigate("/sales-orders")}>Sales Orders</div>
              <div style={dropdownItemStyle} onClick={() => navigate("/invoices")}>Invoices</div>
              <div style={dropdownItemStyle} onClick={() => navigate("/recurring-invoices")}>Recurring Invoices</div>
              <div style={dropdownItemStyle} onClick={() => navigate("/delivery-challans")}>Delivery Challans</div>
              <div style={dropdownItemStyle} onClick={() => navigate("/payments-received")}>Payments Received</div>
              <div style={dropdownItemStyle} onClick={() => navigate("/credit-notes")}>Credit Notes</div>
            </div>
          )}
        </div>

        {/* Purchases dropdown */}
        <div
          style={menuItemStyle}
          onMouseEnter={() => setPurchasesOpen(true)}
          onMouseLeave={() => setPurchasesOpen(false)}
        >
          Purchases
          {purchasesOpen && (
            <div style={dropdownStyle}>
              <div style={dropdownItemStyle} onClick={() => navigate("/vendors")}>Vendors</div>
              <div style={dropdownItemStyle} onClick={() => navigate("/expenses")}>Expenses</div>
              <div style={dropdownItemStyle} onClick={() => navigate("/recurring-expenses")}>Recurring / Fixed Expenses</div>
              <div style={dropdownItemStyle} onClick={() => navigate("/purchase-orders")}>Purchase Orders</div>
              <div style={dropdownItemStyle} onClick={() => navigate("/bills")}>Bills</div>
              <div style={dropdownItemStyle} onClick={() => navigate("/payments-made")}>Payments Made</div>
              <div style={dropdownItemStyle} onClick={() => navigate("/vendor-credits")}>Vendor Credits</div>
            </div>
          )}
        </div>

        {/* Time Tracker dropdown */}
        <div
          style={menuItemStyle}
          onMouseEnter={() => setTimeOpen(true)}
          onMouseLeave={() => setTimeOpen(false)}
        >
          Time Tracker
          {timeOpen && (
            <div style={dropdownStyle}>
              <div style={dropdownItemStyle} onClick={() => navigate("/projects")}>Projects</div>
              <div style={dropdownItemStyle} onClick={() => navigate("/timesheet")}>Timesheet</div>
            </div>
          )}
        </div>

        {/* Projected Payment */}
        <div
          style={{ padding: "10px 15px", cursor: "pointer", fontWeight: "500" }}
          onClick={() => navigate("/projected-payments")}
        >
          Projected Payment
        </div>

        {/* Accountant dropdown */}
        <div
          style={menuItemStyle}
          onMouseEnter={() => setAccountantOpen(true)}
          onMouseLeave={() => setAccountantOpen(false)}
        >
          Accountant
          {accountantOpen && (
            <div style={dropdownStyle}>
              <div style={dropdownItemStyle} onClick={() => navigate("/manual-journals")}>Manual Journals</div>
              <div style={dropdownItemStyle} onClick={() => navigate("/bulk-update")}>Bulk Update</div>
              <div style={dropdownItemStyle} onClick={() => navigate("/chart-of-accounts")}>Chart of Accounts</div>
              <div style={dropdownItemStyle} onClick={() => navigate("/transaction-locking")}>Transaction Locking</div>
            </div>
          )}
        </div>

        {/* Reports */}
        <div
          style={{ padding: "10px 15px", cursor: "pointer", fontWeight: "500" }}
          onClick={() => navigate("/reports")}
        >
          Reports
        </div>

        {/* Documents */}
        <div
          style={{ padding: "10px 15px", cursor: "pointer", fontWeight: "500" }}
          onClick={() => navigate("/documents")}
        >
          Documents
        </div>
      </div>

      {/* Logout button */}
      <div style={{ marginLeft: "auto" }}>
        <button
          onClick={handleLogout}
          style={{
            padding: "6px 12px",
            background: "#e74c3c",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "500",
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default Navbar;