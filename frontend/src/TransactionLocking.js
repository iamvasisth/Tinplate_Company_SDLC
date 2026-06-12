/**
 * TransactionLocking.js – Admin panel to lock transactions before a specific date
 */
import React, { useState, useEffect } from "react";
import { apiRequest } from "./api";
import { PageSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function TransactionLocking() {
  const [activeLock, setActiveLock] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [lockDate, setLockDate] = useState("");
  const [reason, setReason] = useState("");
  const [modules, setModules] = useState(["Invoices", "Bills", "Expenses", "Payments Received", "Payments Made", "Manual Journals", "Bank Transactions", "Credit Notes", "Vendor Credits"]);
  
  const allModules = ["Invoices", "Bills", "Expenses", "Payments Received", "Payments Made", "Manual Journals", "Bank Transactions", "Credit Notes", "Vendor Credits"];

  const fetchLocks = async () => {
    try {
      setLoading(true);
      const [activeRes, histRes] = await Promise.all([
        apiRequest("/transaction-locks/active"),
        apiRequest("/transaction-locks")
      ]);
      setActiveLock(activeRes?.lock || null);
      setHistory(histRes?.locks || []);
    } catch (err) {
      toast.error("Failed to fetch locks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLocks(); }, []);

  const handleModuleToggle = (mod) => {
    if (modules.includes(mod)) {
      setModules(modules.filter(m => m !== mod));
    } else {
      setModules([...modules, mod]);
    }
  };

  const handleApplyLock = async (e) => {
    e.preventDefault();
    if (!lockDate) return toast.error("Lock date is required");
    if (modules.length === 0) return toast.error("Select at least one module");
    if (!window.confirm(`Are you sure you want to lock transactions on or before ${lockDate}?`)) return;

    try {
      await apiRequest("/transaction-locks", {
        method: "POST",
        body: JSON.stringify({ lock_date: lockDate, reason, locked_modules: modules })
      });
      toast.success("Transaction lock applied successfully");
      setLockDate("");
      setReason("");
      fetchLocks();
    } catch (err) {
      toast.error(err.message || "Failed to apply lock");
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm("Are you sure you want to remove the current transaction lock?")) return;
    try {
      await apiRequest(`/transaction-locks/${id}/deactivate`, { method: "PATCH" });
      toast.success("Lock deactivated");
      fetchLocks();
    } catch (err) {
      toast.error(err.message || "Failed to deactivate lock");
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div style={{ padding: "30px", maxWidth: "900px", margin: "auto" }}>
      <div style={{ marginBottom: "30px" }}>
        <h2 style={{ margin: "0 0 10px 0", color: "#1e293b" }}>Transaction Locking</h2>
        <p style={{ color: "#64748b", margin: 0 }}>Prevent users from editing, deleting, or cancelling transactions prior to a specific date. This ensures your finalized accounts remain untouched.</p>
      </div>

      {/* Active Lock Card */}
      {activeLock && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "20px", borderRadius: "8px", marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "#1e40af", fontWeight: "600", fontSize: "16px", marginBottom: "5px" }}>🔒 Active Accounting Lock</div>
            <div style={{ color: "#1e3a8a", fontSize: "14px" }}>
              All selected transactions on or before <strong>{new Date(activeLock.lock_date).toLocaleDateString()}</strong> are locked.
            </div>
            {activeLock.reason && <div style={{ color: "#3b82f6", fontSize: "13px", marginTop: "5px" }}>Reason: {activeLock.reason}</div>}
          </div>
          <button onClick={() => handleDeactivate(activeLock.id)} style={{ padding: "8px 16px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", color: "#dc2626", fontWeight: "500", cursor: "pointer" }}>
            Remove Lock
          </button>
        </div>
      )}

      {/* Set New Lock Form */}
      <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "40px" }}>
        <h3 style={{ marginTop: 0, color: "#334155", marginBottom: "20px" }}>{activeLock ? "Update Lock Date" : "Set Lock Date"}</h3>
        <form onSubmit={handleApplyLock}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label style={labelStyle}>Lock Date *</label>
              <input type="date" value={lockDate} onChange={e => setLockDate(e.target.value)} required style={inputStyle} />
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "5px" }}>Transactions on or before this date will be locked.</div>
            </div>
            <div>
              <label style={labelStyle}>Reason (Optional)</label>
              <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. End of Financial Year 2025" style={inputStyle} />
            </div>
          </div>
          
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Modules to Lock</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginTop: "10px" }}>
              {allModules.map(mod => (
                <label key={mod} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#475569", cursor: "pointer" }}>
                  <input type="checkbox" checked={modules.includes(mod)} onChange={() => handleModuleToggle(mod)} style={{ cursor: "pointer" }} />
                  {mod}
                </label>
              ))}
            </div>
          </div>

          <button type="submit" style={primaryBtn}>{activeLock ? "Update Lock" : "Apply Lock"}</button>
        </form>
      </div>

      {/* History */}
      <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <h3 style={{ marginTop: 0, color: "#334155", marginBottom: "20px" }}>Lock History</h3>
        {history.length === 0 ? <p style={{ color: "#64748b", fontSize: "14px" }}>No locking history found.</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                <th style={{ padding: "12px" }}>Lock Date</th>
                <th style={{ padding: "12px" }}>Applied On</th>
                <th style={{ padding: "12px" }}>Status</th>
                <th style={{ padding: "12px" }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px", fontWeight: "500", color: "#1e293b" }}>{new Date(h.lock_date).toLocaleDateString()}</td>
                  <td style={{ padding: "12px", color: "#64748b" }}>{new Date(h.created_at).toLocaleString()}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "600", background: h.is_active ? "#dcfce7" : "#f1f5f9", color: h.is_active ? "#166534" : "#475569" }}>
                      {h.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "12px", color: "#64748b" }}>{h.reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}

const labelStyle = { display: "block", marginBottom: "8px", fontWeight: "500", color: "#475569", fontSize: "14px" };
const inputStyle = { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box", fontSize: "14px", outline: "none" };
const primaryBtn = { padding: "10px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500", fontSize: "14px" };

export default TransactionLocking;
