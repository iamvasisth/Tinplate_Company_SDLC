import React, { useState, useEffect, useCallback } from "react";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Inline add form
  const [showForm, setShowForm] = useState(false);
  const [vendorId, setVendorId] = useState("");
  const [category, setCategory] = useState("Other Expenses");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await apiRequest("/expenses");
      setExpenses(res?.expenses || []);
    } catch (err) { toast.error("Failed to load expenses"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await apiRequest("/contacts?type=vendor");
        setVendors(res?.contacts || []);
      } catch (err) { /* ignore */ }
    };
    fetchVendors();
  }, []);

  const addExpense = async () => {
    if (!amount) return toast.error("Enter amount");
    try {
      await apiRequest("/expenses", {
        method: "POST",
        body: JSON.stringify({
          vendor_id: vendorId || null,
          category,
          amount: parseFloat(amount),
          expense_date: expenseDate,
          description,
          reference,
        }),
      });
      toast.success("Expense added");
      setShowForm(false); setAmount(""); setDescription(""); setReference("");
      fetchExpenses();
    } catch (err) { toast.error("Failed to add expense"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete?")) return;
    try {
      await apiRequest(`/expenses/${id}`, { method: "DELETE" });
      toast.success("Deleted");
      fetchExpenses();
    } catch (err) { toast.error("Delete failed"); }
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1000px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Expenses</h2>
        <button onClick={() => setShowForm(true)} style={primaryBtn}>+ New Expense</button>
      </div>

      {/* Inline Add Form */}
      {showForm && (
        <div style={{ background: "#f0f4ff", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
            <select value={vendorId} onChange={e => setVendorId(e.target.value)} style={inputStyle}>
              <option value="">Select Vendor</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
              <option>Other Expenses</option><option>Travel</option><option>Meals</option><option>Office Supplies</option><option>Rent</option><option>Utilities</option>
            </select>
            <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} style={{ ...inputStyle, width: "120px" }} />
            <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} style={{ ...inputStyle, width: "150px" }} />
          </div>
          <input type="text" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} style={{ ...inputStyle, marginBottom: "10px" }} />
          <input type="text" placeholder="Reference / Bill #" value={reference} onChange={e => setReference(e.target.value)} style={{ ...inputStyle, marginBottom: "10px" }} />
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={addExpense} style={primaryBtn}>Save</button>
            <button onClick={() => setShowForm(false)} style={cancelBtnStyle}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <p>Loading...</p> : expenses.length === 0 ? (
        <p>No expenses yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Vendor</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(exp => (
              <tr key={exp.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={tdStyle}>{new Date(exp.expense_date).toLocaleDateString()}</td>
                <td style={tdStyle}>{exp.category}</td>
                <td style={tdStyle}>{exp.vendor_name || "—"}</td>
                <td style={tdStyle}>₹{parseFloat(exp.amount).toFixed(2)}</td>
                <td style={tdStyle}>{exp.status}</td>
                <td style={tdStyle}>
                  <button onClick={() => handleDelete(exp.id)} style={deleteBtnStyle}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle = { padding: "10px", borderBottom: "2px solid #cbd5e1", whiteSpace: "nowrap" };
const tdStyle = { padding: "10px" };
const inputStyle = { padding: "8px", borderRadius: "5px", border: "1px solid #ccc" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "500" };
const cancelBtnStyle = { padding: "10px 20px", background: "#ccc", color: "#333", border: "none", borderRadius: "5px", cursor: "pointer" };
const deleteBtnStyle = { padding: "5px 10px", background: "red", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" };

export default Expenses;