/**
 * Topbar.js – Top utility bar (Zoho Books style)
 * Contains: Search bar, Trial text, Subscribe, Plus, Account, Logout
 * Does NOT contain any navigation items (those are in Sidebar.js)
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import "./Topbar.css";

function Topbar() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  /* Logout handler */
  const handleLogout = async () => {
    try {
      await fetch("http://localhost:5000/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error(err);
    }
    setUser(null);
    navigate("/");
  };

  return (
    <header className="topbar">
      {/* Refresh icon */}
      <button className="topbar-icon-btn" aria-label="Refresh">
        ↻
      </button>

      {/* Search bar */}
      <div className="topbar-search">
        <span className="topbar-search-icon">⌕</span>
        <input
          type="text"
          placeholder="Search in Customers ( / )"
          className="topbar-search-input"
        />
      </div>

      {/* Right-side actions */}
      <div className="topbar-actions">
        <span className="topbar-trial-text">Your free trial is over</span>
        <button className="topbar-subscribe-btn">Subscribe</button>

        <span className="topbar-separator">|</span>

        <span className="topbar-org-name">
          {user?.business_type || "Organization"}...
        </span>

        {/* Plus / Create button */}
        <button className="topbar-plus-btn" aria-label="Create new">
          +
        </button>

        {/* Notification / users icons */}
        <button className="topbar-icon-btn" aria-label="Users">
          👤
        </button>
        <button className="topbar-icon-btn" aria-label="Notifications">
          🔔
        </button>
        <button className="topbar-icon-btn" aria-label="Settings">
          ⚙
        </button>

        {/* Account avatar */}
        <button className="topbar-account-btn" aria-label="Account">
          {user?.email?.[0]?.toUpperCase() || "U"}
        </button>

        {/* Logout */}
        <button className="topbar-logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default Topbar;
