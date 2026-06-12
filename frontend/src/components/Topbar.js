import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import "./Topbar.css";
import CreateOrganizationForm from "./CreateOrganizationForm";

function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useAuth();
  
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCreateOrg, setShowCreateOrg] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const currentSearch = searchParams.get("search") || "";
  
  const [globalResults, setGlobalResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setGlobalResults(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    const newParams = new URLSearchParams(location.search);
    if (val) {
      newParams.set("search", val);
    } else {
      newParams.delete("search");
    }
    navigate({ search: newParams.toString() }, { replace: true });

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!val.trim()) {
      setGlobalResults(null);
      return;
    }
    
    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`http://localhost:5001/api/search?q=${encodeURIComponent(val)}`, { credentials: 'include' });
        if(res.ok) {
          const data = await res.json();
          setGlobalResults(data);
        }
      } catch(e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  /* Logout handler */
  const handleLogout = async () => {
    try {
      await fetch("http://localhost:5001/api/logout", {
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
    <>
      <header className="topbar">
        <div className="topbar-left">
          {/* Refresh icon */}
          <button className="topbar-icon-btn" aria-label="Refresh" onClick={() => window.location.reload()}>
            ↻
          </button>

          {/* Search bar */}
          <div className="topbar-search" ref={searchRef}>
            <span className="topbar-search-icon">⌕</span>
            <input
              type="text"
              placeholder="Search customers, items, invoices..."
              className="topbar-search-input"
              value={currentSearch}
              onChange={handleSearchChange}
              onFocus={(e) => {
                if (e.target.value.trim() && !globalResults) {
                  handleSearchChange(e);
                }
              }}
            />
            
            {/* Global Search Dropdown */}
            {globalResults && (globalResults.customers?.length > 0 || globalResults.items?.length > 0 || globalResults.invoices?.length > 0 || globalResults.quotes?.length > 0) && (
              <div className="global-search-dropdown">
                {globalResults.customers?.length > 0 && (
                  <div className="global-search-group">
                    <div className="global-search-group-title">Customers</div>
                    {globalResults.customers.map(c => (
                      <div key={`c-${c.id}`} className="global-search-item" onClick={() => { setGlobalResults(null); navigate(`/customers?search=${encodeURIComponent(c.display_name || c.company_name)}`); }}>
                        <span className="global-search-item-primary">{c.display_name || c.first_name || c.company_name}</span>
                        <span className="global-search-item-secondary">{c.email}</span>
                      </div>
                    ))}
                  </div>
                )}
                {globalResults.items?.length > 0 && (
                  <div className="global-search-group">
                    <div className="global-search-group-title">Items</div>
                    {globalResults.items.map(i => (
                      <div key={`i-${i.id}`} className="global-search-item" onClick={() => { setGlobalResults(null); navigate(`/items?search=${encodeURIComponent(i.name)}`); }}>
                        <span className="global-search-item-primary">{i.name}</span>
                        <span className="global-search-item-secondary">SKU: {i.sku || 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                )}
                {globalResults.invoices?.length > 0 && (
                  <div className="global-search-group">
                    <div className="global-search-group-title">Invoices</div>
                    {globalResults.invoices.map(inv => (
                      <div key={`inv-${inv.id}`} className="global-search-item" onClick={() => { setGlobalResults(null); navigate(`/invoices?search=${encodeURIComponent(inv.invoice_number)}`); }}>
                        <span className="global-search-item-primary">INV-{inv.invoice_number}</span>
                        <span className="global-search-item-secondary">{inv.customer_name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {globalResults.quotes?.length > 0 && (
                  <div className="global-search-group">
                    <div className="global-search-group-title">Quotes</div>
                    {globalResults.quotes.map(q => (
                      <div key={`q-${q.id}`} className="global-search-item" onClick={() => { setGlobalResults(null); navigate(`/quotes?search=${encodeURIComponent(q.quote_number)}`); }}>
                        <span className="global-search-item-primary">QT-{q.quote_number}</span>
                        <span className="global-search-item-secondary">{q.customer_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right-side actions */}
        <div className="topbar-actions">
          <span className="topbar-trial-text">Professional Edition</span>
          <span className="topbar-separator">|</span>

          {/* Organization Dropdown */}
          <div className="topbar-dropdown-container">
            <button 
              className="topbar-org-name" 
              onClick={() => setShowOrgMenu(!showOrgMenu)}
            >
              {user?.organization_name || user?.business_type || "My Organization"} ▾
            </button>
            
            {showOrgMenu && (
              <div className="topbar-dropdown-menu org-menu">
                <div className="dropdown-header">Organizations</div>
                <div 
                  className="dropdown-item active"
                  onClick={() => setShowOrgMenu(false)}
                >
                  {user?.organization_name || "Primary Organization"}
                  <span className="dropdown-check">✓</span>
                </div>
                <div className="dropdown-divider"></div>
                <div 
                  className="dropdown-item"
                  onClick={() => { setShowOrgMenu(false); navigate("/organization-settings"); }}
                >
                  ⚙ Manage Organization
                </div>
                <div 
                  className="dropdown-item"
                  onClick={() => { setShowOrgMenu(false); setShowCreateOrg(true); }}
                >
                  + Create New Organization
                </div>
              </div>
            )}
          </div>

          {/* Plus / Create button */}
          <button className="topbar-plus-btn" aria-label="Create new" onClick={() => navigate("/invoices/new")}>
            +
          </button>

          {/* Notification / users icons */}
          <button className="topbar-icon-btn" aria-label="Users" onClick={() => navigate("/users-roles")}>
            👤
          </button>
          <button className="topbar-icon-btn" aria-label="Settings" onClick={() => navigate("/organization-settings")}>
            ⚙
          </button>

          {/* Profile Dropdown */}
          <div className="topbar-dropdown-container">
            <button 
              className="topbar-account-btn" 
              aria-label="Account"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              {user?.email?.[0]?.toUpperCase() || "U"}
            </button>

            {showProfileMenu && (
              <div className="topbar-dropdown-menu profile-menu">
                <div className="profile-header">
                  <strong>{user?.email}</strong>
                  <br/>
                  <span className="profile-role">Role: {user?.role || "Admin"}</span>
                </div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-item" onClick={() => { setShowProfileMenu(false); navigate("/organization-settings"); }}>
                  Organization Settings
                </div>
                <div className="dropdown-item" onClick={() => { setShowProfileMenu(false); navigate("/users-roles"); }}>
                  Users & Roles
                </div>
                <div className="dropdown-item" onClick={() => { setShowProfileMenu(false); navigate("/taxes"); }}>
                  Taxes
                </div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-item text-danger" onClick={handleLogout}>
                  Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Create Organization Modal */}
      {showCreateOrg && (
        <CreateOrganizationForm onClose={() => setShowCreateOrg(false)} />
      )}
    </>
  );
}

export default Topbar;
