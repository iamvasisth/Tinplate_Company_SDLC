import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { TableSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function ManualJournals() {
  const navigate = useNavigate();
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchJournals();
  }, []);

  const fetchJournals = async () => {
    try {
      setLoading(true);
      const res = await apiRequest("/accounting/journals");
      setJournals(res?.journals || []);
    } catch (err) {
      toast.error("Failed to load manual journals");
    } finally {
      setLoading(false);
    }
  };

  const filteredJournals = journals.filter(j => {
    const term = search.toLowerCase();
    const jNum = j.journal_number?.toLowerCase() || "";
    const refNum = j.reference_number?.toLowerCase() || "";
    return jNum.includes(term) || refNum.includes(term);
  });

  return (
    <div style={{ padding: "30px", maxWidth: "1200px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Manual Journals</h2>
        <button onClick={() => navigate("/manual-journals/new")} style={primaryBtn}>+ New Journal</button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <input 
          type="text" 
          placeholder="Search by journal number or reference..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          style={{ ...inputStyle, maxWidth: "400px" }} 
        />
      </div>

      {loading ? (
        <TableSkeleton columns={8} rows={5} />
      ) : filteredJournals.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px", color: "gray", background: "#f9fafb", borderRadius: "8px" }}>
          <p>No manual journals found.</p>
          <button onClick={() => navigate("/manual-journals/new")} style={secondaryBtn}>Create Journal</button>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <thead>
              <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Journal #</th>
                <th style={thStyle}>Reference</th>
                <th style={thStyle}>Notes</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Total Debit</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Total Credit</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredJournals.map(journal => (
                <tr key={journal.id} style={{ borderBottom: "1px solid #e2e8f0", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#f8fafc"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                  <td style={tdStyle}>{new Date(journal.journal_date).toLocaleDateString("en-IN")}</td>
                  <td onClick={() => navigate(`/manual-journals/${journal.id}`)} style={{...tdStyle, color: "#2563eb", cursor: "pointer"}}>{journal.journal_number}</td>
                  <td style={tdStyle}>{journal.reference_number || "—"}</td>
                  <td style={{ ...tdStyle, color: "#64748b" }}>{journal.notes ? (journal.notes.substring(0, 30) + "...") : "—"}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600", color: "#334155" }}>₹{parseFloat(journal.total_debit).toFixed(2)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600", color: "#334155" }}>₹{parseFloat(journal.total_credit).toFixed(2)}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: "4px 8px", background: "#d1fae5", color: "#065f46", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
                      {journal.status || "Published"}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => navigate(`/manual-journals/${journal.id}`)} style={actionBtn}>View</button>
                    <button onClick={() => navigate(`/manual-journals/${journal.id}/edit`)} style={actionBtn}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle = { padding: "12px", borderBottom: "2px solid #cbd5e1" };
const tdStyle = { padding: "12px" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" };
const secondaryBtn = { padding: "10px 20px", background: "#f1f5f9", color: "#333", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer" };
const inputStyle = { width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" };
const actionBtn = { background: "none", border: "none", color: "#2563eb", cursor: "pointer", marginRight: "10px", fontWeight: "500" };

export default ManualJournals;
