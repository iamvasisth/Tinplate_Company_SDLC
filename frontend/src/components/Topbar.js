import React, {
  useState,
  useRef,
  useEffect,
} from "react";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { apiRequest } from "../api";
import CreateOrganizationForm from "./CreateOrganizationForm";
import CreateItemsMenu from "./createItems";


import "./Topbar.css";

function Topbar() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  /* DROPDOWN STATE */
  const [showOrgDropdown, setShowOrgDropdown] =
    useState(false);
  const [showCreateItemsMenu, setShowCreateItemsMenu] = useState(false);
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setIsSearching(true);
      const timer = setTimeout(async () => {
        try {
          const [custRes, itemRes] = await Promise.all([
            apiRequest('/customers').catch(() => null),
            apiRequest('/items').catch(() => null)
          ]);

          let results = [];
          const query = searchQuery.toLowerCase();

          if (custRes && custRes.customers) {
            results = results.concat(
              custRes.customers
                .filter(c => (c.display_name && c.display_name.toLowerCase().includes(query)) || (c.first_name && c.first_name.toLowerCase().includes(query)) || (c.email && c.email.toLowerCase().includes(query)) || (c.company_name && c.company_name.toLowerCase().includes(query)))
                .map(c => ({ type: 'Customer', name: c.display_name || c.first_name || c.company_name || c.email, path: `/customers/${c.id || ''}` }))
            );
          }

          if (itemRes && itemRes.items) {
            results = results.concat(
              itemRes.items
                .filter(i => i.name && i.name.toLowerCase().includes(query))
                .map(i => ({ type: 'Item', name: i.name, path: `/items?search=${encodeURIComponent(i.name)}&expand=${i.id || ''}` }))
            );
          }

          // Also check for static pages
          const pages = [
            { type: 'Page', name: 'Dashboard', path: '/dashboard' },
            { type: 'Page', name: 'Items', path: '/items' },
            { type: 'Page', name: 'Customers', path: '/customers' },
            { type: 'Page', name: 'Invoices', path: '/invoices' },
            { type: 'Page', name: 'Quotes', path: '/quotes' },
            { type: 'Page', name: 'Banking', path: '/banking' }
          ];
          results = results.concat(pages.filter(p => p.name.toLowerCase().includes(query)));

          setSearchResults(results.slice(0, 10)); // limit to 10 results
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearching(false);
        }
      }, 400); // 400ms debounce
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

  /* REF */
  const dropdownRef = useRef(null);

  /* ORGANIZATIONS */
  const [organizations] = useState([
    {
      id: 1,
      name: "THESIS COACHING CENTER",
      orgId: "60070738815",
      plan: "Free",
    },
    {
      id: 2,
      name: "ZOHO TRAINING ACADEMY",
      orgId: "60070738816",
      plan: "Premium",
    },
    {
      id: 3,
      name: "TECH SOLUTIONS PVT LTD",
      orgId: "60070738817",
      plan: "Enterprise",
    },
  ]);

  /* ACTIVE ORGANIZATION */
  const [activeOrg, setActiveOrg] = useState(
    organizations[0]
  );

  /* CLOSE DROPDOWN ON OUTSIDE CLICK */
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target
        )
      ) {
        setShowOrgDropdown(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  /* SWITCH ORGANIZATION */
  const handleOrganizationSwitch = (org) => {
    setActiveOrg(org);
    setShowOrgDropdown(false);
  };

  /* LOGOUT */
  const handleLogout = async () => {
    try {
      await fetch(
        "http://localhost:5000/api/logout",
        {
          method: "POST",
          credentials: "include",
        }
      );
    } catch (err) {
      console.error(err);
    }

    setUser(null);
    navigate("/");
  };

  return (
    <header className="topbar">
      {/* LEFT */}
      <div className="topbar-left">
        <button className="topbar-icon-btn" onClick={() => window.location.reload()} title="Refresh Page">
          ↻
        </button>

        <div className="topbar-search" style={{ position: 'relative' }}>
          <span className="topbar-search-icon">
            ⌕
          </span>

          <input
            type="text"
            placeholder="Search pages..."
            className="topbar-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim() !== '') {
                // If there's an exact match, navigate to it, else alert
                const match = [
                  { name: 'Dashboard', path: '/dashboard' },
                  { name: 'Items', path: '/dashboard/items' },
                  { name: 'Customers', path: '/dashboard/customers' },
                  { name: 'Invoices', path: '/dashboard/invoices' },
                  { name: 'Quotes', path: '/dashboard/quotes' },
                  { name: 'Banking', path: '/dashboard/banking' }
                ].find(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

                if (match) {
                  navigate(match.path);
                  setSearchQuery("");
                } else {
                  alert(`No results found for "${searchQuery}"`);
                }
              }
            }}
          />
          {searchQuery && (
            <button
              className="topbar-clear-search"
              onClick={() => setSearchQuery("")}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                marginLeft: '-25px',
                padding: '0 5px'
              }}
            >
              ✖
            </button>
          )}

          {/* SEARCH RESULTS DROPDOWN */}
          {searchQuery && (
            <div style={{
              position: 'absolute',
              top: '45px',
              left: '0',
              width: '100%',
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 2000,
              overflow: 'hidden',
              color: 'black'
            }}>
              {isSearching ? (
                <div style={{ padding: '10px 15px', color: '#888' }}>Searching...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      navigate(item.path);
                      setSearchQuery("");
                    }}
                    style={{
                      padding: '10px 15px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #eee',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.target.style.background = 'white'}
                  >
                    <span>{item.name}</span>
                    <span style={{ fontSize: '12px', color: '#888', background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>{item.type}</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '10px 15px', color: '#888' }}>
                  No exact matches found.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div className="topbar-actions">
        <span className="topbar-trial-text">
          You are in free plan
        </span>

        <button className="topbar-subscribe-btn" title="Subscription">
          Upgrade
        </button>

        <span className="topbar-separator">
          |
        </span>

        {/* ORGANIZATION DROPDOWN */}
        <div
          className="org-dropdown-wrapper"
          ref={dropdownRef}
        >
          <button
            className="org-dropdown-btn"
            onClick={() => {
              setShowOrgDropdown(!showOrgDropdown);
              setShowCreateItemsMenu(false);
            }}
          >
            {activeOrg.name}

            <span className="dropdown-arrow">
              {showOrgDropdown
                ? "▲"
                : "▼"}
            </span>
          </button>

          {showOrgDropdown && (
            <>
              <div className="dropdown-overlay" onClick={() => setShowOrgDropdown(false)}></div>
              <div className="org-dropdown-menu">
                {/* HEADER */}
              <div className="org-dropdown-header">
                <div className="org-title">
                  Organizations
                </div>

                <button className="manage-btn">
                  ⚙ Manage
                </button>
              </div>

              {/* TITLE */}
              <div className="org-section-title">
                My Organizations
              </div>

              {/* LIST */}
              <div className="org-list">
                {organizations.map((org) => (
                  <div
                    key={org.id}
                    className={`org-card ${activeOrg.id ===
                        org.id
                        ? "active"
                        : ""
                      }`}
                    onClick={() =>
                      handleOrganizationSwitch(
                        org
                      )
                    }
                  >
                    <div className="org-icon">
                      📄
                    </div>

                    <div className="org-details">
                      <h4>{org.name}</h4>

                      <p>
                        Organization ID:{" "}
                        {org.orgId} •{" "}
                        {org.plan}
                      </p>
                    </div>

                    {activeOrg.id ===
                      org.id && (
                        <div className="org-check">
                          ✔
                        </div>
                      )}
                  </div>
                ))}
              </div>

              {/* FOOTER */}
              <div className="org-footer">

                <button className="create-org-btn" onClick={() => {
                  setShowCreateOrgModal(true);
                  setShowOrgDropdown(false);
                }}>
                  + Create Organization
                </button>
              </div>
            </div>
            </>
          )}
        </div>

        {/* CREATE ORG MODAL */}
        {showCreateOrgModal && (
          <div className="modal-overlay">
            <div className="create-org-modal-wrapper" style={{ position: 'relative', zIndex: 3001 }}>
              <button
                onClick={() => setShowCreateOrgModal(false)}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  zIndex: 10
                }}
              >
                ✖
              </button>
              <CreateOrganizationForm />
            </div>
          </div>
        )}

        {/* PLUS */}
        <div style={{ position: "relative" }}>
          <button className="topbar-plus-btn" title="Create New Items" onClick={() => {
            setShowCreateItemsMenu(!showCreateItemsMenu);
            setShowOrgDropdown(false);
          }}>
            +
          </button>
          {showCreateItemsMenu && (
            <>
              <div className="dropdown-overlay" onClick={() => setShowCreateItemsMenu(false)}></div>
              <CreateItemsMenu />
            </>
          )}
        </div>


        {/* ICONS */}
        <button className="topbar-icon-btn">
          🔔
        </button>

        <button className="topbar-icon-btn">
          ⚙
        </button>

        {/* ACCOUNT */}
        <button className="topbar-account-btn">
          {user?.email?.[0]?.toUpperCase() ||
            "U"}
        </button>

        {/* LOGOUT */}
        <button
          className="topbar-logout-btn"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default Topbar;  
