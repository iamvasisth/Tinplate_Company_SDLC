import React, { useState, useEffect, useCallback } from "react";
import { apiRequest } from "./api";
import { TableSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function Banking() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccount, setNewAccount] = useState({ account_name: "", bank_name: "", account_number: "", ifsc_code: "", opening_balance: "" });

  // For transactions
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [newTx, setNewTx] = useState({ transaction_date: new Date().toISOString().slice(0, 10), description: "", transaction_type: "deposit", amount: "", reference: "" });

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRequest("/bank/accounts");
      setAccounts(res?.accounts || []);
    } catch (err) { toast.error("Failed to load accounts"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const addAccount = async () => {
    if (!newAccount.account_name) return toast.error("Account name required");
    try {
      await apiRequest("/bank/accounts", { method: "POST", body: JSON.stringify(newAccount) });
      toast.success("Account created");
      setShowAddModal(false);
      setNewAccount({ account_name: "", bank_name: "", account_number: "", ifsc_code: "", opening_balance: "" });
      fetchAccounts();
    } catch (err) { toast.error("Failed to create account"); }
  };

  const deleteAccount = async (id) => {
    if (!window.confirm("Delete this account?")) return;
    try {
      await apiRequest(`/bank/accounts/${id}`, { method: "DELETE" });
      toast.success("Account deleted");
      if (selectedAccount?.id === id) { setSelectedAccount(null); setTransactions([]); }
      fetchAccounts();
    } catch (err) { toast.error("Delete failed"); }
  };

  const fetchTransactions = async (account) => {
    setSelectedAccount(account);
    setTxLoading(true);
    try {
      const res = await apiRequest(`/bank/accounts/${account.id}/transactions`);
      setTransactions(res?.transactions || []);
    } catch (err) { toast.error("Failed to load transactions"); }
    finally { setTxLoading(false); }
  };

  const addTransaction = async () => {
    if (!newTx.amount) return toast.error("Amount required");
    try {
      await apiRequest(`/bank/accounts/${selectedAccount.id}/transactions`, {
        method: "POST",
        body: JSON.stringify(newTx),
      });
      toast.success("Transaction recorded");
      setShowTxModal(false);
      setNewTx({ transaction_date: new Date().toISOString().slice(0, 10), description: "", transaction_type: "deposit", amount: "", reference: "" });
      fetchAccounts(); // refresh balances
      fetchTransactions(selectedAccount);
    } catch (err) { toast.error("Failed to record transaction"); }
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1100px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Banking</h2>
        <button onClick={() => setShowAddModal(true)} style={primaryBtn}>+ Add Account</button>
      </div>

      {loading ? <TableSkeleton columns={5} rows={4} /> : accounts.length === 0 ? (
        <p>No bank accounts yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={thStyle}>Account Name</th>
              <th style={thStyle}>Bank</th>
              <th style={thStyle}>Account #</th>
              <th style={thStyle}>Current Balance</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(acc => (
              <React.Fragment key={acc.id}>
                <tr style={{ borderBottom: "1px solid #e2e8f0", cursor: "pointer", background: selectedAccount?.id === acc.id ? "#f0f4ff" : "transparent" }}
                  onClick={() => fetchTransactions(acc)}>
                  <td style={tdStyle}><span style={{ color: "#4a90e2", textDecoration: "underline" }}>{acc.account_name}</span></td>
                  <td style={tdStyle}>{acc.bank_name || "—"}</td>
                  <td style={tdStyle}>{acc.account_number || "—"}</td>
                  <td style={tdStyle}>₹{parseFloat(acc.current_balance).toFixed(2)}</td>
                  <td style={tdStyle}>
                    <button onClick={(e) => { e.stopPropagation(); fetchTransactions(acc); setShowTxModal(true); }} style={smallBtn}>+ Transaction</button>
                    <button onClick={(e) => { e.stopPropagation(); deleteAccount(acc.id); }} style={deleteBtnStyle}>Delete</button>
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}

      {/* Transactions panel for selected account */}
      {selectedAccount && (
        <div style={{ marginTop: "30px" }}>
          <h3>Transactions – {selectedAccount.account_name}</h3>
          {txLoading ? <TableSkeleton columns={5} rows={3} /> : transactions.length === 0 ? <p>No transactions yet.</p> : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>Reference</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={tdStyle}>{new Date(tx.transaction_date).toLocaleDateString()}</td>
                    <td style={tdStyle}>{tx.description}</td>
                    <td style={tdStyle}>{tx.transaction_type}</td>
                    <td style={tdStyle} style={{ color: tx.transaction_type === "deposit" ? "green" : "red" }}>₹{parseFloat(tx.amount).toFixed(2)}</td>
                    <td style={tdStyle}>{tx.reference || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3>New Bank Account</h3>
            <input placeholder="Account Name *" value={newAccount.account_name} onChange={e => setNewAccount({ ...newAccount, account_name: e.target.value })} style={inputStyle} />
            <input placeholder="Bank Name" value={newAccount.bank_name} onChange={e => setNewAccount({ ...newAccount, bank_name: e.target.value })} style={inputStyle} />
            <input placeholder="Account Number" value={newAccount.account_number} onChange={e => setNewAccount({ ...newAccount, account_number: e.target.value })} style={inputStyle} />
            <input placeholder="IFSC Code" value={newAccount.ifsc_code} onChange={e => setNewAccount({ ...newAccount, ifsc_code: e.target.value })} style={inputStyle} />
            <input type="number" placeholder="Opening Balance" value={newAccount.opening_balance} onChange={e => setNewAccount({ ...newAccount, opening_balance: e.target.value })} style={inputStyle} />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
              <button onClick={() => setShowAddModal(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={addAccount} style={primaryBtn}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showTxModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3>New Transaction – {selectedAccount?.account_name}</h3>
            <input type="date" value={newTx.transaction_date} onChange={e => setNewTx({ ...newTx, transaction_date: e.target.value })} style={inputStyle} />
            <input placeholder="Description" value={newTx.description} onChange={e => setNewTx({ ...newTx, description: e.target.value })} style={inputStyle} />
            <select value={newTx.transaction_type} onChange={e => setNewTx({ ...newTx, transaction_type: e.target.value })} style={inputStyle}>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
            </select>
            <input type="number" placeholder="Amount" value={newTx.amount} onChange={e => setNewTx({ ...newTx, amount: e.target.value })} style={inputStyle} />
            <input placeholder="Reference" value={newTx.reference} onChange={e => setNewTx({ ...newTx, reference: e.target.value })} style={inputStyle} />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
              <button onClick={() => setShowTxModal(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={addTransaction} style={primaryBtn}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = { padding: "10px", borderBottom: "2px solid #cbd5e1", whiteSpace: "nowrap" };
const tdStyle = { padding: "10px" };
const inputStyle = { width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc", boxSizing: "border-box", marginBottom: "10px" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "500" };
const cancelBtnStyle = { padding: "10px 20px", background: "#ccc", color: "#333", border: "none", borderRadius: "5px", cursor: "pointer" };
const smallBtn = { padding: "5px 10px", background: "#f0f0f0", color: "#333", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer", marginRight: "5px" };
const deleteBtnStyle = { padding: "5px 10px", background: "red", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" };
const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalContent = { background: "#fff", borderRadius: "8px", padding: "25px", width: "450px", maxWidth: "90%", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" };

export default Banking;