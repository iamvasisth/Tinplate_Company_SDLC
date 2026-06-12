import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

function BankReconciliation() {
  const navigate = useNavigate();
  
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [closingBalance, setClosingBalance] = useState("0");
  
  const [filterType, setFilterType] = useState("all"); // all, reconciled, unreconciled
  const [selectedTxnIds, setSelectedTxnIds] = useState([]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (accountId) {
      fetchTransactions();
    } else {
      setTransactions([]);
    }
  }, [accountId]);

  const fetchAccounts = async () => {
    try {
      const res = await apiRequest("/bank/accounts");
      setAccounts(res?.accounts || []);
    } catch (err) {
      toast.error("Failed to load bank accounts");
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/bank/accounts/${accountId}/transactions`);
      setTransactions(res?.transactions || []);
    } catch (err) {
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkReconcile = async (isReconciled) => {
    if (selectedTxnIds.length === 0) return toast.error("Please select transactions first");
    
    try {
      await apiRequest("/bank/transactions/reconcile-bulk", {
        method: "PUT",
        body: JSON.stringify({ transaction_ids: selectedTxnIds, is_reconciled: isReconciled })
      });
      toast.success(`Marked ${selectedTxnIds.length} transactions as ${isReconciled ? "reconciled" : "unreconciled"}`);
      setSelectedTxnIds([]);
      fetchTransactions();
    } catch (err) {
      toast.error("Failed to update transactions");
    }
  };

  // Filter logic
  let filteredTxns = transactions;
  if (filterType === "reconciled") filteredTxns = transactions.filter(t => t.is_reconciled);
  if (filterType === "unreconciled") filteredTxns = transactions.filter(t => !t.is_reconciled);
  
  if (startDate) filteredTxns = filteredTxns.filter(t => new Date(t.transaction_date) >= new Date(startDate));
  if (endDate) filteredTxns = filteredTxns.filter(t => new Date(t.transaction_date) <= new Date(endDate));

  // Calculations based on currently filtered (and typically reconciled) transactions in the date range
  // Actually, standard reconciliation logic uses ALL transactions in range, or only reconciled? 
  // Usually, calculated balance = opening + reconciled deposits - reconciled withdrawals
  const reconciledInRange = transactions.filter(t => {
    let inRange = true;
    if (startDate) inRange = inRange && new Date(t.transaction_date) >= new Date(startDate);
    if (endDate) inRange = inRange && new Date(t.transaction_date) <= new Date(endDate);
    return inRange && t.is_reconciled;
  });

  const totalDeposits = reconciledInRange.filter(t => t.transaction_type === "deposit").reduce((acc, t) => acc + parseFloat(t.amount), 0);
  const totalWithdrawals = reconciledInRange.filter(t => t.transaction_type === "withdrawal").reduce((acc, t) => acc + parseFloat(t.amount), 0);
  const calculatedBalance = parseFloat(openingBalance || 0) + totalDeposits - totalWithdrawals;
  const difference = parseFloat(closingBalance || 0) - calculatedBalance;
  
  const status = Math.abs(difference) < 0.01 ? "reconciled" : "difference_found";

  const handleSaveReconciliation = async () => {
    if (!accountId) return toast.error("Select a bank account");
    if (!startDate || !endDate) return toast.error("Select start and end dates");
    
    try {
      const payload = {
        bank_account_id: accountId,
        statement_start_date: startDate,
        statement_end_date: endDate,
        opening_balance: openingBalance,
        closing_balance: closingBalance,
        total_deposits: totalDeposits,
        total_withdrawals: totalWithdrawals,
        difference: difference,
        status: status === "reconciled" ? "reconciled" : "draft"
      };
      await apiRequest("/bank/reconciliation", { method: "POST", body: JSON.stringify(payload) });
      toast.success("Reconciliation saved successfully!");
    } catch (err) {
      toast.error("Failed to save reconciliation");
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTxnIds(filteredTxns.map(t => t.id));
    } else {
      setSelectedTxnIds([]);
    }
  };

  const handleSelectTxn = (id) => {
    if (selectedTxnIds.includes(id)) {
      setSelectedTxnIds(selectedTxnIds.filter(x => x !== id));
    } else {
      setSelectedTxnIds([...selectedTxnIds, id]);
    }
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1200px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Bank Reconciliation</h2>
      </div>

      <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "30px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          <div>
            <label style={labelStyle}>Bank Account</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)} style={inputStyle}>
              <option value="">Select Account...</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.account_name} ({a.bank_name})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Statement Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Statement End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "20px" }}>
          <div>
            <label style={labelStyle}>Opening Balance (₹)</label>
            <input type="number" step="0.01" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Closing Balance (₹)</label>
            <input type="number" step="0.01" value={closingBalance} onChange={e => setClosingBalance(e.target.value)} style={inputStyle} />
          </div>
        </div>
      </div>

      {accountId && (
        <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "30px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
          <div>
            <p style={{ margin: "0 0 5px 0", color: "#64748b", fontSize: "12px" }}>Cleared Deposits</p>
            <p style={{ margin: 0, fontWeight: "bold", fontSize: "18px", color: "#16a34a" }}>₹{totalDeposits.toFixed(2)}</p>
          </div>
          <div>
            <p style={{ margin: "0 0 5px 0", color: "#64748b", fontSize: "12px" }}>Cleared Withdrawals</p>
            <p style={{ margin: 0, fontWeight: "bold", fontSize: "18px", color: "#dc2626" }}>₹{totalWithdrawals.toFixed(2)}</p>
          </div>
          <div>
            <p style={{ margin: "0 0 5px 0", color: "#64748b", fontSize: "12px" }}>Calculated Balance</p>
            <p style={{ margin: 0, fontWeight: "bold", fontSize: "18px", color: "#334155" }}>₹{calculatedBalance.toFixed(2)}</p>
          </div>
          <div>
            <p style={{ margin: "0 0 5px 0", color: "#64748b", fontSize: "12px" }}>Difference</p>
            <p style={{ margin: 0, fontWeight: "bold", fontSize: "18px", color: Math.abs(difference) < 0.01 ? "#16a34a" : "#dc2626" }}>
              ₹{difference.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {accountId && (
        <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}>
                <option value="all">All Transactions</option>
                <option value="reconciled">Reconciled</option>
                <option value="unreconciled">Unreconciled</option>
              </select>
            </div>
            
            <div style={{ display: "flex", gap: "10px" }}>
              {selectedTxnIds.length > 0 && (
                <>
                  <button onClick={() => handleBulkReconcile(true)} style={primaryBtn}>Mark Reconciled</button>
                  <button onClick={() => handleBulkReconcile(false)} style={secondaryBtn}>Mark Unreconciled</button>
                </>
              )}
              <button onClick={handleSaveReconciliation} style={{...primaryBtn, background: Math.abs(difference) < 0.01 ? "#16a34a" : "#ca8a04"}}>
                {Math.abs(difference) < 0.01 ? "Save Reconciliation" : "Save as Draft"}
              </button>
            </div>
          </div>

          {loading ? (
            <p style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>Loading transactions...</p>
          ) : filteredTxns.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b", background: "#f8fafc", borderRadius: "8px" }}>
              <p>No bank transactions found for this account in this date range.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", textAlign: "left", borderBottom: "2px solid #cbd5e1" }}>
                    <th style={{ padding: "12px 10px", width: "40px" }}>
                      <input type="checkbox" checked={selectedTxnIds.length === filteredTxns.length && filteredTxns.length > 0} onChange={handleSelectAll} />
                    </th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Description</th>
                    <th style={thStyle}>Reference</th>
                    <th style={{...thStyle, textAlign: "right"}}>Withdrawal</th>
                    <th style={{...thStyle, textAlign: "right"}}>Deposit</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTxns.map(t => (
                    <tr key={t.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "12px 10px" }}>
                        <input type="checkbox" checked={selectedTxnIds.includes(t.id)} onChange={() => handleSelectTxn(t.id)} />
                      </td>
                      <td style={tdStyle}>{new Date(t.transaction_date).toLocaleDateString("en-IN")}</td>
                      <td style={tdStyle}>{t.description}</td>
                      <td style={tdStyle}>{t.reference_number || t.reference || "—"}</td>
                      <td style={{...tdStyle, textAlign: "right", color: "#dc2626"}}>{t.transaction_type === "withdrawal" ? `₹${parseFloat(t.amount).toFixed(2)}` : ""}</td>
                      <td style={{...tdStyle, textAlign: "right", color: "#16a34a"}}>{t.transaction_type === "deposit" ? `₹${parseFloat(t.amount).toFixed(2)}` : ""}</td>
                      <td style={tdStyle}>
                        {t.is_reconciled ? (
                          <span style={{ padding: "4px 8px", background: "#d1fae5", color: "#065f46", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>Reconciled</span>
                        ) : (
                          <span style={{ padding: "4px 8px", background: "#fee2e2", color: "#991b1b", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>Unreconciled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle = { width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" };
const labelStyle = { display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px", color: "#334155" };
const thStyle = { padding: "12px 10px", color: "#334155", fontWeight: "600", fontSize: "13px" };
const tdStyle = { padding: "12px 10px", color: "#1e293b", fontSize: "14px" };
const primaryBtn = { padding: "8px 16px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" };
const secondaryBtn = { padding: "8px 16px", background: "#f8fafc", color: "#334155", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer", fontWeight: "500" };

export default BankReconciliation;
