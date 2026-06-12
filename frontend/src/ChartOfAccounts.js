import React, { useState, useEffect } from "react";
import { apiRequest } from "./api";
import { TableSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function ChartOfAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form State
  const [accountName, setAccountName] = useState("");
  const [accountCode, setAccountCode] = useState("");
  const [accountType, setAccountType] = useState("Asset");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await apiRequest("/accounting/coa");
      setAccounts(res?.accounts || []);
    } catch (err) {
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (account = null) => {
    if (account) {
      setEditingId(account.id);
      setAccountName(account.account_name);
      setAccountCode(account.account_code || "");
      setAccountType(account.account_type);
      setOpeningBalance(account.opening_balance || "0");
      setDescription(account.description || "");
      setStatus(account.status || "active");
    } else {
      setEditingId(null);
      setAccountName("");
      setAccountCode("");
      setAccountType("Asset");
      setOpeningBalance("0");
      setDescription("");
      setStatus("active");
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        account_name: accountName,
        account_code: accountCode,
        account_type: accountType,
        opening_balance: parseFloat(openingBalance) || 0,
        description,
        status
      };

      if (editingId) {
        await apiRequest(`/accounting/coa/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        toast.success("Account updated");
      } else {
        await apiRequest("/accounting/coa", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        toast.success("Account created");
      }
      setShowModal(false);
      fetchAccounts();
    } catch (err) {
      toast.error("Failed to save account");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this account?")) return;
    try {
      await apiRequest(`/accounting/coa/${id}`, { method: "DELETE" });
      toast.success("Account deleted");
      fetchAccounts();
    } catch (err) {
      toast.error("Failed to delete account");
    }
  };

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = (acc.account_name?.toLowerCase().includes(search.toLowerCase())) || 
                          (acc.account_code?.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === "All" || acc.account_type === typeFilter;
    const matchesStatus = statusFilter === "All" || acc.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div style={{ padding: "30px", maxWidth: "1200px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Chart of Accounts</h2>
        <button onClick={() => handleOpenModal()} style={primaryBtn}>+ New Account</button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "15px", marginBottom: "20px", background: "#f8fafc", padding: "15px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        <input 
          type="text" 
          placeholder="Search by name or code..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          style={{ ...inputStyle, maxWidth: "300px" }} 
        />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...inputStyle, maxWidth: "150px" }}>
          <option value="All">All Types</option>
          <option value="Asset">Asset</option>
          <option value="Liability">Liability</option>
          <option value="Equity">Equity</option>
          <option value="Income">Income</option>
          <option value="Expense">Expense</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, maxWidth: "150px" }}>
          <option value="All">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton columns={7} rows={6} />
      ) : accounts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px", color: "gray", background: "#f9fafb", borderRadius: "8px" }}>
          <p>No accounts found.</p>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={thStyle}>Code</th>
              <th style={thStyle}>Account Name</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Description</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Balance</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
            <tbody>
            {filteredAccounts.length > 0 ? filteredAccounts.map(acc => (
              <tr key={acc.id} style={{ borderBottom: "1px solid #e2e8f0", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#f8fafc"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                <td style={tdStyle}>{acc.account_code || "—"}</td>
                <td style={{ ...tdStyle, fontWeight: "500", color: "#334155" }}>{acc.account_name}</td>
                <td style={tdStyle}>{acc.account_type}</td>
                <td style={{ ...tdStyle, color: "#64748b" }}>{acc.description || "—"}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600" }}>₹{parseFloat(acc.current_balance).toFixed(2)}</td>
                <td style={tdStyle}>
                  <span style={{ padding: "4px 8px", background: acc.status === 'active' ? "#d1fae5" : "#f1f5f9", color: acc.status === 'active' ? "#065f46" : "#475569", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
                    {acc.status}
                  </span>
                </td>
                <td style={tdStyle}>
                  <button onClick={() => handleOpenModal(acc)} style={actionBtn}>Edit</button>
                  <button onClick={() => handleDelete(acc.id)} style={{ ...actionBtn, color: "#dc2626" }}>Delete</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: "20px" }}>No accounts match your filters.</td></tr>
            )}
          </tbody>
        </table>
      )}

      {/* Modal */}
      {showModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3 style={{ margin: "0 0 20px 0" }}>{editingId ? "Edit Account" : "New Account"}</h3>
            <form onSubmit={handleSave}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <div>
                  <label style={labelStyle}>Account Name *</label>
                  <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)} style={inputStyle} required />
                </div>
                <div>
                  <label style={labelStyle}>Account Code</label>
                  <input type="text" value={accountCode} onChange={e => setAccountCode(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <div>
                  <label style={labelStyle}>Account Type *</label>
                  <select value={accountType} onChange={e => setAccountType(e.target.value)} style={inputStyle} required>
                    <option value="Asset">Asset</option>
                    <option value="Liability">Liability</option>
                    <option value="Equity">Equity</option>
                    <option value="Income">Income</option>
                    <option value="Expense">Expense</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Opening Balance (₹)</label>
                  <input type="number" step="0.01" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} disabled={!!editingId} style={editingId ? {...inputStyle, background: "#f1f5f9"} : inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={labelStyle}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={inputStyle}></textarea>
              </div>

              <div style={{ marginBottom: "25px" }}>
                <label style={labelStyle}>Status</label>
                <div style={{ display: "flex", gap: "15px" }}>
                  <label><input type="radio" value="active" checked={status === "active"} onChange={e => setStatus(e.target.value)} /> Active</label>
                  <label><input type="radio" value="inactive" checked={status === "inactive"} onChange={e => setStatus(e.target.value)} /> Inactive</label>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" onClick={() => setShowModal(false)} style={secondaryBtn}>Cancel</button>
                <button type="submit" style={primaryBtn}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = { padding: "12px", borderBottom: "2px solid #cbd5e1" };
const tdStyle = { padding: "12px" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" };
const secondaryBtn = { padding: "10px 20px", background: "#f1f5f9", color: "#333", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer" };
const actionBtn = { background: "none", border: "none", color: "#2563eb", cursor: "pointer", marginRight: "10px", fontWeight: "500" };
const inputStyle = { width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" };
const labelStyle = { display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px", color: "#334155" };
const modalOverlay = { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalContent = { background: "#fff", padding: "30px", borderRadius: "8px", width: "100%", maxWidth: "600px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" };

export default ChartOfAccounts;
