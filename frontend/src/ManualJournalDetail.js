import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { DetailSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function ManualJournalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [journal, setJournal] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJournal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchJournal = async () => {
    try {
      setLoading(true);
      const res = await apiRequest(`/accounting/journals/${id}`);
      if (res?.journal) {
        setJournal(res.journal);
        setLines(res.lines || []);
      } else {
        toast.error("Journal not found");
        navigate("/manual-journals");
      }
    } catch (err) {
      toast.error("Failed to load journal");
      navigate("/manual-journals");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this journal entry?")) return;
    try {
      await apiRequest(`/accounting/journals/${id}`, { method: "DELETE" });
      toast.success("Journal deleted");
      navigate("/manual-journals");
    } catch (err) {
      toast.error("Failed to delete journal");
    }
  };

  if (loading) return <DetailSkeleton />;
  if (!journal) return <div style={{ padding: "30px" }}>Journal not found.</div>;

  return (
    <div style={{ padding: "30px", maxWidth: "900px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Manual Journal: {journal.journal_number}</h2>
        <div>
          <button onClick={() => navigate(`/manual-journals/${journal.id}/edit`)} style={actionBtn}>Edit</button>
          <button onClick={handleDelete} style={{ ...actionBtn, color: "#dc2626" }}>Delete</button>
          <button onClick={() => navigate("/manual-journals")} style={secondaryBtn}>Back to List</button>
        </div>
      </div>

      <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
          <div>
            <p style={{ color: "#64748b", margin: "0 0 5px 0", fontSize: "14px" }}>Journal Date</p>
            <p style={{ fontWeight: "500", margin: 0 }}>{new Date(journal.journal_date).toLocaleDateString("en-IN")}</p>
          </div>
          <div>
            <p style={{ color: "#64748b", margin: "0 0 5px 0", fontSize: "14px" }}>Reference Number</p>
            <p style={{ fontWeight: "500", margin: 0 }}>{journal.reference_number || "—"}</p>
          </div>
          {journal.notes && (
            <div style={{ gridColumn: "span 2" }}>
              <p style={{ color: "#64748b", margin: "0 0 5px 0", fontSize: "14px" }}>Notes</p>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{journal.notes}</p>
            </div>
          )}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ padding: "12px", color: "#64748b", fontWeight: "600" }}>Account</th>
              <th style={{ padding: "12px", color: "#64748b", fontWeight: "600" }}>Description</th>
              <th style={{ padding: "12px", color: "#64748b", fontWeight: "600", textAlign: "right" }}>Debits (₹)</th>
              <th style={{ padding: "12px", color: "#64748b", fontWeight: "600", textAlign: "right" }}>Credits (₹)</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(line => (
              <tr key={line.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "12px", fontWeight: "500", color: "#334155" }}>
                  {line.account_code ? `[${line.account_code}] ` : ""}{line.account_name}
                </td>
                <td style={{ padding: "12px", color: "#64748b" }}>{line.description || "—"}</td>
                <td style={{ padding: "12px", textAlign: "right", color: "#065f46", fontWeight: parseFloat(line.debit) > 0 ? "bold" : "normal" }}>
                  {parseFloat(line.debit) > 0 ? parseFloat(line.debit).toFixed(2) : ""}
                </td>
                <td style={{ padding: "12px", textAlign: "right", color: "#dc2626", fontWeight: parseFloat(line.credit) > 0 ? "bold" : "normal" }}>
                  {parseFloat(line.credit) > 0 ? parseFloat(line.credit).toFixed(2) : ""}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: "#f1f5f9", borderTop: "2px solid #cbd5e1" }}>
              <td colSpan="2" style={{ padding: "12px", fontWeight: "bold", textAlign: "right" }}>Total</td>
              <td style={{ padding: "12px", textAlign: "right", fontWeight: "bold", color: "#065f46" }}>₹{parseFloat(journal.total_debit).toFixed(2)}</td>
              <td style={{ padding: "12px", textAlign: "right", fontWeight: "bold", color: "#dc2626" }}>₹{parseFloat(journal.total_credit).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

const actionBtn = { padding: "8px 16px", background: "#fff", border: "1px solid #ccc", color: "#333", borderRadius: "4px", cursor: "pointer", marginRight: "10px", fontWeight: "500" };
const secondaryBtn = { padding: "8px 16px", background: "#f1f5f9", color: "#333", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "500" };

export default ManualJournalDetail;
