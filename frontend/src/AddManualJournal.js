import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "./api";
import { FormSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function AddManualJournal() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);

  const [accounts, setAccounts] = useState([]);

  const [journalDate, setJournalDate] = useState(new Date().toISOString().slice(0, 10));
  const [journalNumber, setJournalNumber] = useState(`MJ-${Date.now().toString().slice(-6)}`);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [lines, setLines] = useState([
    { id: 1, account_id: "", description: "", debit: "", credit: "" },
    { id: 2, account_id: "", description: "", debit: "", credit: "" },
  ]);

  useEffect(() => {
    fetchAccounts();
    if (isEditing) {
      fetchJournal();
    }
  }, [id]);

  const fetchAccounts = async () => {
    try {
      const res = await apiRequest("/accounting/coa");
      setAccounts(res?.accounts || []);
    } catch (err) {
      toast.error("Failed to fetch accounts");
    }
  };

  const fetchJournal = async () => {
    try {
      const res = await apiRequest(`/accounting/journals/${id}`);
      if (res?.journal) {
        setJournalDate(res.journal.journal_date.split("T")[0]);
        setJournalNumber(res.journal.journal_number);
        setReferenceNumber(res.journal.reference_number || "");
        setNotes(res.journal.notes || "");
      }
      if (res?.lines && res.lines.length > 0) {
        setLines(res.lines.map((l, idx) => ({
          id: idx + 1,
          account_id: l.account_id,
          description: l.description || "",
          debit: parseFloat(l.debit) > 0 ? parseFloat(l.debit).toFixed(2) : "",
          credit: parseFloat(l.credit) > 0 ? parseFloat(l.credit).toFixed(2) : ""
        })));
      }
    } catch (err) {
      toast.error("Failed to load journal");
      navigate("/manual-journals");
    } finally {
      setInitialLoading(false);
    }
  };

  const handleLineChange = (id, field, value) => {
    setLines(prev => prev.map(line => {
      if (line.id === id) {
        const newLine = { ...line, [field]: value };
        if (field === "debit" && value && parseFloat(value) > 0) newLine.credit = "";
        if (field === "credit" && value && parseFloat(value) > 0) newLine.debit = "";
        return newLine;
      }
      return line;
    }));
  };

  const addLine = () => {
    setLines([...lines, { id: Date.now(), account_id: "", description: "", debit: "", credit: "" }]);
  };

  const removeLine = (id) => {
    if (lines.length <= 2) {
      return toast.error("A journal must have at least 2 lines");
    }
    setLines(lines.filter(l => l.id !== id));
  };

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01 && totalDebit > 0;

  const handleSave = async (e) => {
    e.preventDefault();

    if (!isBalanced) return toast.error("Total Debit must equal Total Credit.");
    const validLines = lines.filter(l => l.account_id && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0));
    if (validLines.length < 2) return toast.error("At least two valid lines are required.");

    setLoading(true);
    try {
      const payload = {
        journal_date: journalDate,
        journal_number: journalNumber,
        reference_number: referenceNumber,
        notes,
        lines: validLines
      };

      if (isEditing) {
        await apiRequest(`/accounting/journals/${id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("Journal updated successfully");
      } else {
        await apiRequest("/accounting/journals", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Journal created successfully");
      }
      navigate("/manual-journals");
    } catch (err) {
      toast.error(err.message || "Failed to save journal");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div style={{ padding: "30px", maxWidth: "1000px", margin: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2>{isEditing ? "Edit Manual Journal" : "New Manual Journal"}</h2>
          <button onClick={() => navigate("/manual-journals")} style={secondaryBtn}>Back to List</button>
        </div>
        <FormSkeleton fields={5} />
      </div>
    );
  }

  return (
    <div style={{ padding: "30px", maxWidth: "1000px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>{isEditing ? "Edit Manual Journal" : "New Manual Journal"}</h2>
        <button onClick={() => navigate("/manual-journals")} style={secondaryBtn}>Back to List</button>
      </div>

      <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <form onSubmit={handleSave}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label style={labelStyle}>Date *</label>
              <input type="date" value={journalDate} onChange={e => setJournalDate(e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Journal Number *</label>
              <input type="text" value={journalNumber} onChange={e => setJournalNumber(e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Reference Number</label>
              <input type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={inputStyle}></textarea>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: "10px", borderBottom: "1px solid #e2e8f0" }}>Account *</th>
                <th style={{ padding: "10px", borderBottom: "1px solid #e2e8f0" }}>Description</th>
                <th style={{ padding: "10px", borderBottom: "1px solid #e2e8f0", width: "150px" }}>Debits</th>
                <th style={{ padding: "10px", borderBottom: "1px solid #e2e8f0", width: "150px" }}>Credits</th>
                <th style={{ padding: "10px", borderBottom: "1px solid #e2e8f0", width: "50px" }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map(line => (
                <tr key={line.id}>
                  <td style={{ padding: "10px" }}>
                    <select value={line.account_id} onChange={e => handleLineChange(line.id, "account_id", e.target.value)} style={inputStyle} required>
                      <option value="">Select Account</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.account_code ? `[${acc.account_code}] ` : ""}{acc.account_name}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: "10px" }}>
                    <input type="text" value={line.description} onChange={e => handleLineChange(line.id, "description", e.target.value)} style={inputStyle} />
                  </td>
                  <td style={{ padding: "10px" }}>
                    <input type="number" step="0.01" min="0" value={line.debit} onChange={e => handleLineChange(line.id, "debit", e.target.value)} style={inputStyle} disabled={!!line.credit} />
                  </td>
                  <td style={{ padding: "10px" }}>
                    <input type="number" step="0.01" min="0" value={line.credit} onChange={e => handleLineChange(line.id, "credit", e.target.value)} style={inputStyle} disabled={!!line.debit} />
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    <button type="button" onClick={() => removeLine(line.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "16px" }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button type="button" onClick={addLine} style={{ ...secondaryBtn, marginBottom: "30px" }}>+ Add Another Line</button>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "30px" }}>
            <div style={{ width: "300px", background: "#f8fafc", padding: "15px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ color: "#64748b" }}>Total Debit</span>
                <span style={{ fontWeight: "600" }}>₹{totalDebit.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ color: "#64748b" }}>Total Credit</span>
                <span style={{ fontWeight: "600" }}>₹{totalCredit.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "10px", borderTop: "1px solid #cbd5e1" }}>
                <span style={{ fontWeight: "bold", color: isBalanced ? "#065f46" : "#dc2626" }}>Difference</span>
                <span style={{ fontWeight: "bold", color: isBalanced ? "#065f46" : "#dc2626" }}>₹{difference.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
            <button type="button" onClick={() => navigate("/manual-journals")} style={secondaryBtn}>Cancel</button>
            <button type="submit" disabled={loading || !isBalanced} style={{...primaryBtn, opacity: (!isBalanced || loading) ? 0.5 : 1}}>
              {loading ? "Saving..." : "Save Journal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle = { width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" };
const labelStyle = { display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px", color: "#334155" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" };
const secondaryBtn = { padding: "10px 20px", background: "#f1f5f9", color: "#333", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer" };

export default AddManualJournal;
