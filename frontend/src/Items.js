/**
 * Items.js – Products / Services table with split-pane detail panel
 * Table columns: Name, Type, SKU, Selling Price (unchanged)
 * Clicking a row opens a Zoho Books-style detail panel on the right
 * Features dropdown list filter for All, Active, Inactive, Sales, Purchases, Services
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";

function Items() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const itemLabel =
    user?.business_type === "School"
      ? "Students"
      : user?.business_type === "Hospital"
      ? "Patients"
      : user?.business_type === "Retail"
      ? "Products"
      : "Items";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [txnLoading, setTxnLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);

  // Filter dropdown state
  const [filterType, setFilterType] = useState("Active");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRequest("/items");
      if (res) setItems(res.items || []);
    } catch (err) {
      toast.error("Failed to load items");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const selectItem = async (item) => {
    setSelectedItem(item);
    setActiveTab("overview");
    setTxnLoading(true);
    try {
      const [qRes, iRes] = await Promise.all([
        apiRequest("/quotes").catch(() => null),
        apiRequest("/invoices").catch(() => null),
      ]);
      const allQuotes = qRes?.quotes || [];
      const allInvoices = iRes?.invoices || [];
      setQuotes(allQuotes.filter(q => {
        const li = q.line_items || q.items || [];
        return li.some(l => l.item_id === item.id || l.name === item.name);
      }));
      setInvoices(allInvoices.filter(inv => {
        const li = inv.line_items || inv.items || [];
        return li.some(l => l.item_id === item.id || l.name === item.name);
      }));
    } catch { /* ignore */ }
    setTxnLoading(false);
  };

  const closePanel = () => setSelectedItem(null);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await apiRequest(`/items/${id}`, { method: "DELETE" });
      toast.success("Item deleted");
      if (selectedItem?.id === id) setSelectedItem(null);
      fetchItems();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) +
        " " +
        new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      : "—";

  // Filter items logic
  const filteredItems = items.filter(item => {
    if (filterType === "All") return true;
    if (filterType === "Active") return true; // default all are active
    if (filterType === "Inactive") return false; // none are inactive in default schema
    if (filterType === "Sales") return parseFloat(item.selling_price || 0) > 0;
    if (filterType === "Purchases") return parseFloat(item.cost_price || 0) > 0;
    if (filterType === "Services") return item.item_type === "Service";
    return true;
  });

  return (
    <div style={S.wrapper}>
      {/* Backdrop for closing filter dropdown */}
      {dropdownOpen && <div style={S.backdrop} onClick={() => setDropdownOpen(false)} />}

      {/* ── Left: Table ── */}
      <div style={{ ...S.tablePanel, flex: selectedItem ? "0 0 55%" : "1 1 100%" }}>
        {/* Page Header */}
        <div style={S.pageHeader}>
          {/* Custom Dropdown Filter Trigger */}
          <div style={{ position: "relative" }}>
            <div style={S.filterTrigger} onClick={() => setDropdownOpen(!dropdownOpen)}>
              <h1 style={S.pageTitle}>
                {filterType === "All" ? `All ${itemLabel}` : `${filterType} ${itemLabel}`}
              </h1>
              <span style={S.caret}>{dropdownOpen ? "▲" : "▼"}</span>
            </div>

            {dropdownOpen && (
              <div style={S.dropdownMenu}>
                <div style={S.dropdownItem} onClick={() => { setFilterType("All"); setDropdownOpen(false); }}>
                  <span>All</span>
                  <span style={S.star}>☆</span>
                </div>
                <div style={S.dropdownItem} onClick={() => { setFilterType("Active"); setDropdownOpen(false); }}>
                  <span>Active</span>
                  <span style={S.star}>☆</span>
                </div>
                <div style={S.dropdownItem} onClick={() => { setFilterType("Inactive"); setDropdownOpen(false); }}>
                  <span>Inactive</span>
                  <span style={S.star}>☆</span>
                </div>
                <div style={S.dropdownItem} onClick={() => { setFilterType("Sales"); setDropdownOpen(false); }}>
                  <span>Sales</span>
                  <span style={S.star}>☆</span>
                </div>
                <div style={S.dropdownItem} onClick={() => { setFilterType("Purchases"); setDropdownOpen(false); }}>
                  <span>Purchases</span>
                  <span style={S.star}>☆</span>
                </div>
                <div style={S.dropdownItem} onClick={() => { setFilterType("Services"); setDropdownOpen(false); }}>
                  <span>Services</span>
                  <span style={S.star}>☆</span>
                </div>
                <div style={{ ...S.dropdownItem, borderBottom: "1px solid #e2e8f0" }} onClick={() => { setDropdownOpen(false); }}>
                  <span>Zoho CRM</span>
                  <span style={S.star}>☆</span>
                </div>
                <div style={S.newCustomView} onClick={() => { setDropdownOpen(false); toast("Custom views can be added later!"); }}>
                  <span style={S.plusIcon}>+</span> New Custom View
                </div>
              </div>
            )}
          </div>

          <button id="new-item-btn" onClick={() => navigate("/items/new")} style={S.primaryBtn}
            onMouseEnter={e => { e.currentTarget.style.background = "#1d4ed8"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#2563eb"; }}>
            <span style={{ fontSize: "17px", lineHeight: 1 }}>+</span> New {itemLabel.slice(0, -1)}
          </button>
        </div>

        {/* Table Card */}
        <div style={S.tableCard}>
          {loading ? (
            <div style={S.emptyState}><p style={{ color: "#94a3b8" }}>Loading…</p></div>
          ) : filteredItems.length === 0 ? (
            <div style={S.emptyState}>
              <div style={{ fontSize: "44px", opacity: 0.5, marginBottom: "8px" }}>📦</div>
              <h3 style={{ margin: "0 0 4px", color: "#1e293b" }}>No {itemLabel} found</h3>
              <p style={{ color: "#64748b", margin: 0 }}>There are no items matching this filter view.</p>
            </div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr style={S.theadRow}>
                  <th style={{ ...S.th, width: "35%" }}>Name</th>
                  <th style={S.th}>Type</th>
                  <th style={S.th}>SKU</th>
                  <th style={{ ...S.th, textAlign: "right" }}>Selling Price</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item.id}
                    style={{
                      ...S.tr,
                      background: selectedItem?.id === item.id ? "#eff6ff" : hoveredId === item.id ? "#f8fafc" : "#fff",
                      borderLeft: selectedItem?.id === item.id ? "3px solid #2563eb" : "3px solid transparent",
                    }}
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setHoveredId(item.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <td style={S.td}><span style={S.nameLink}>{item.name}</span></td>
                    <td style={S.td}>
                      <span style={item.item_type === "Service" ? S.badgeSvc : S.badgeGds}>{item.item_type}</span>
                    </td>
                    <td style={{ ...S.td, color: "#64748b" }}>{item.sku || "—"}</td>
                    <td style={{ ...S.td, textAlign: "right", fontWeight: "600", color: "#0f172a" }}>
                      ₹{parseFloat(item.selling_price || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Right: Detail Panel ── */}
      {selectedItem && (
        <div style={S.detailPanel}>
          {/* Header */}
          <div style={S.detailHeader}>
            <h2 style={S.detailName}>{selectedItem.name}</h2>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button style={S.iconBtn} title="Edit" onClick={() => navigate(`/items/${selectedItem.id}`)}>✏️</button>
              <button style={{ ...S.iconBtn, color: "#ef4444" }} title="Delete" onClick={() => handleDelete(selectedItem.id)}>🗑️</button>
              <button style={S.closeBtn} onClick={closePanel}>✕</button>
            </div>
          </div>
          {/* Tabs */}
          <div style={S.tabBar}>
            {["overview", "transactions", "history"].map(tab => (
              <button key={tab} style={{ ...S.tab, ...(activeTab === tab ? S.tabActive : {}) }}
                onClick={() => setActiveTab(tab)}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          {/* Content */}
          <div style={S.tabContent}>
            {activeTab === "overview" && <OverviewTab item={selectedItem} />}
            {activeTab === "transactions" && <TransactionsTab quotes={quotes} invoices={invoices} loading={txnLoading} navigate={navigate} />}
            {activeTab === "history" && <HistoryTab item={selectedItem} fmtDate={fmtDate} />}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ Overview Tab ═══ */
function OverviewTab({ item }) {
  return (
    <div>
      <Sec title="Basic Details">
        <Row label="Item Type" value={item.item_type || "—"} />
        <Row label="Unit" value={item.unit || "—"} />
        <Row label="SKU" value={item.sku || "—"} />
        <Row label="HSN Code" value={item.hsn_code || "—"} />
        <Row label="Created Source" value="User" />
      </Sec>
      <Sec title="Purchase Information">
        <Row label="Cost Price" value={`₹${parseFloat(item.cost_price || 0).toFixed(2)}`} />
        <Row label="Purchase Account" value={item.purchase_account || "Cost of Goods Sold"} />
        <Row label="Description" value={item.purchase_description || "—"} />
      </Sec>
      <Sec title="Sales Information">
        <Row label="Selling Price" value={`₹${parseFloat(item.selling_price || 0).toFixed(2)}`} highlight />
        <Row label="Sales Account" value={item.sales_account || "Sales"} />
        <Row label="Description" value={item.description || "—"} />
      </Sec>
    </div>
  );
}

/* ═══ Transactions Tab ═══ */
function TransactionsTab({ quotes, invoices, loading, navigate }) {
  if (loading) return <p style={{ color: "#94a3b8", padding: "20px" }}>Loading transactions…</p>;
  if (!quotes.length && !invoices.length) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
        <div style={{ fontSize: "36px", marginBottom: "8px" }}>📄</div>
        <p>No transactions found for this item.</p>
      </div>
    );
  }
  return (
    <div>
      {quotes.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h4 style={S.secHead}>Quotes</h4>
          <table style={S.miniTable}><thead><tr style={S.miniThead}>
            <th style={S.miniTh}>Date</th><th style={S.miniTh}>Quote #</th>
            <th style={{ ...S.miniTh, textAlign: "right" }}>Total</th><th style={S.miniTh}>Status</th>
          </tr></thead><tbody>
            {quotes.map(q => (
              <tr key={q.id} style={S.miniTr} onClick={() => navigate(`/quotes/${q.id}`)}
                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={S.miniTd}>{q.quote_date ? new Date(q.quote_date).toLocaleDateString("en-IN") : "—"}</td>
                <td style={{ ...S.miniTd, color: "#2563eb", fontWeight: 600 }}>{q.quote_number || "—"}</td>
                <td style={{ ...S.miniTd, textAlign: "right" }}>₹{parseFloat(q.total_amount || 0).toFixed(2)}</td>
                <td style={S.miniTd}><span style={{ ...S.badge, ...(q.status === "sent" ? S.bSent : S.bDraft) }}>{q.status || "Draft"}</span></td>
              </tr>
            ))}
          </tbody></table>
        </div>
      )}
      {invoices.length > 0 && (
        <div>
          <h4 style={S.secHead}>Invoices</h4>
          <table style={S.miniTable}><thead><tr style={S.miniThead}>
            <th style={S.miniTh}>Date</th><th style={S.miniTh}>Invoice #</th>
            <th style={{ ...S.miniTh, textAlign: "right" }}>Total</th><th style={S.miniTh}>Status</th>
          </tr></thead><tbody>
            {invoices.map(inv => (
              <tr key={inv.id} style={S.miniTr} onClick={() => navigate(`/invoices/${inv.id}`)}
                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={S.miniTd}>{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString("en-IN") : "—"}</td>
                <td style={{ ...S.miniTd, color: "#2563eb", fontWeight: 600 }}>{inv.invoice_number || "—"}</td>
                <td style={{ ...S.miniTd, textAlign: "right" }}>₹{parseFloat(inv.total_amount || 0).toFixed(2)}</td>
                <td style={S.miniTd}><span style={{ ...S.badge, ...(inv.status === "paid" ? S.bPaid : inv.status === "sent" ? S.bSent : S.bDraft) }}>{inv.status || "Draft"}</span></td>
              </tr>
            ))}
          </tbody></table>
        </div>
      )}
    </div>
  );
}

/* ═══ History Tab ═══ */
function HistoryTab({ item, fmtDate }) {
  const events = [];
  if (item.created_at) events.push({ date: item.created_at, detail: "created by - User" });
  if (item.updated_at && item.updated_at !== item.created_at) events.push({ date: item.updated_at, detail: "last updated by - User" });
  events.sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!events.length) return <p style={{ color: "#94a3b8", padding: "20px" }}>No history available.</p>;
  return (
    <table style={S.miniTable}><thead><tr style={S.miniThead}>
      <th style={S.miniTh}>Date</th><th style={S.miniTh}>Details</th>
    </tr></thead><tbody>
      {events.map((ev, i) => (
        <tr key={i} style={S.miniTr}>
          <td style={S.miniTd}>{fmtDate(ev.date)}</td>
          <td style={S.miniTd}>{ev.detail}</td>
        </tr>
      ))}
    </tbody></table>
  );
}

/* ═══ Helpers ═══ */
function Sec({ title, children }) {
  return <div style={{ marginBottom: "24px" }}><h4 style={S.secHead}>{title}</h4>{children}</div>;
}
function Row({ label, value, highlight }) {
  return (
    <div style={{ display: "flex", padding: "7px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ width: "42%", color: "#64748b", fontSize: "13px" }}>{label}</span>
      <span style={{ flex: 1, fontSize: "13px", fontWeight: highlight ? "700" : "500", color: highlight ? "#2563eb" : "#1e293b" }}>{value}</span>
    </div>
  );
}

/* ═══ Styles ═══ */
const S = {
  wrapper: { display: "flex", height: "calc(100vh - 60px)", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: "#f8fafc", overflow: "hidden" },
  tablePanel: { display: "flex", flexDirection: "column", padding: "24px", overflow: "auto", transition: "flex 0.25s" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" },
  pageTitle: { margin: 0, fontSize: "20px", fontWeight: "700", color: "#0f172a" },
  pageSub: { margin: "4px 0 0", fontSize: "13px", color: "#64748b" },
  primaryBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", boxShadow: "0 4px 14px rgba(37,99,235,0.35)", transition: "background 0.15s", whiteSpace: "nowrap" },
  tableCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 6px rgba(15,23,42,0.06)", flex: 1 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "14px" },
  theadRow: { background: "#f8fafc", borderBottom: "2px solid #e2e8f0" },
  th: { padding: "13px 18px", textAlign: "left", fontWeight: "600", fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid #f1f5f9", cursor: "pointer", transition: "background 0.12s" },
  td: { padding: "14px 18px", verticalAlign: "middle", color: "#334155" },
  nameLink: { color: "#2563eb", fontWeight: "600" },
  badgeGds: { display: "inline-block", padding: "3px 10px", borderRadius: "20px", background: "#eff6ff", color: "#1d4ed8", fontSize: "12px", fontWeight: "600", border: "1px solid #bfdbfe" },
  badgeSvc: { display: "inline-block", padding: "3px 10px", borderRadius: "20px", background: "#f0fdf4", color: "#16a34a", fontSize: "12px", fontWeight: "600", border: "1px solid #bbf7d0" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 32px", textAlign: "center" },

  // Dropdown filter trigger & list styles
  filterTrigger: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", padding: "4px 8px", borderRadius: "6px", transition: "background 0.15s" },
  caret: { fontSize: "10px", color: "#64748b" },
  backdrop: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 998, background: "transparent" },
  dropdownMenu: { position: "absolute", top: "100%", left: 0, zIndex: 999, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)", padding: "4px 0", minWidth: "180px", marginTop: "4px" },
  dropdownItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", fontSize: "13px", color: "#334155", cursor: "pointer", transition: "background 0.15s" },
  star: { color: "#cbd5e1", fontSize: "14px" },
  newCustomView: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", fontSize: "13px", color: "#2563eb", cursor: "pointer", fontWeight: "600", transition: "background 0.15s" },
  plusIcon: { fontSize: "15px", lineHeight: 1 },

  /* Detail Panel */
  detailPanel: { flex: "0 0 45%", borderLeft: "1px solid #e2e8f0", background: "#fff", display: "flex", flexDirection: "column", overflow: "hidden" },
  detailHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #e2e8f0" },
  detailName: { margin: 0, fontSize: "19px", fontWeight: "700", color: "#0f172a" },
  iconBtn: { width: "34px", height: "34px", border: "1px solid #e2e8f0", borderRadius: "7px", background: "#fff", cursor: "pointer", fontSize: "15px", display: "flex", alignItems: "center", justifyContent: "center" },
  closeBtn: { width: "34px", height: "34px", border: "1px solid #e2e8f0", borderRadius: "7px", background: "#fff", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontWeight: "700" },
  tabBar: { display: "flex", borderBottom: "2px solid #e2e8f0", padding: "0 22px" },
  tab: { padding: "12px 16px", border: "none", background: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#64748b", borderBottom: "2px solid transparent", marginBottom: "-2px", transition: "color 0.15s" },
  tabActive: { color: "#2563eb", borderBottomColor: "#2563eb" },
  tabContent: { flex: 1, overflowY: "auto", padding: "22px" },
  secHead: { margin: "0 0 10px", fontSize: "14px", fontWeight: "700", color: "#0f172a" },
  /* Mini tables */
  miniTable: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  miniThead: { background: "#f8fafc", borderBottom: "2px solid #e2e8f0" },
  miniTh: { padding: "9px 12px", textAlign: "left", fontWeight: "600", fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" },
  miniTr: { borderBottom: "1px solid #f1f5f9", cursor: "pointer", transition: "background 0.12s" },
  miniTd: { padding: "9px 12px", color: "#334155" },
  badge: { display: "inline-block", padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600" },
  bDraft: { background: "#f1f5f9", color: "#64748b" },
  bSent: { background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" },
  bPaid: { background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" },
};

export default Items;