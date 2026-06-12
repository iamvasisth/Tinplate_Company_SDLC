/**
 * Projects.js – List view of all projects
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { TableSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRequest("/projects");
      setProjects(Array.isArray(res?.projects) ? res.projects : []);
    } catch (err) { toast.error("Failed to load projects"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await apiRequest(`/projects/${id}`, { method: "DELETE" });
      toast.success("Project deleted (or cancelled if linked)");
      fetchProjects();
    } catch (err) { toast.error(err.message || "Delete failed"); }
  };

  const filteredProjects = projects.filter(p => {
    const matchSearch = search === "" ||
      p.project_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.customer_name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "Active": return { bg: "#dcfce7", color: "#166534" };
      case "Completed": return { bg: "#dbeafe", color: "#1e40af" };
      case "On Hold": return { bg: "#fef3c7", color: "#92400e" };
      case "Cancelled": return { bg: "#fee2e2", color: "#991b1b" };
      default: return { bg: "#f1f5f9", color: "#475569" };
    }
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1200px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>All Projects</h2>
        <button onClick={() => navigate("/projects/new")} style={primaryBtn}>+ New Project</button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap" }}>
        <input type="text" placeholder="Search by name or customer..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: "300px" }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, maxWidth: "160px" }}>
          <option value="all">All Status</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="On Hold">On Hold</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? <TableSkeleton columns={7} rows={5} /> : filteredProjects.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "gray" }}>
          <p>No projects found.</p>
          <button onClick={() => navigate("/projects/new")} style={{ ...primaryBtn, marginTop: "15px" }}>+ New Project</button>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderRadius: "8px", overflow: "hidden" }}>
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
              <th style={thStyle}>Project Name</th>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Billing Type</th>
              <th style={thStyle}>Budget</th>
              <th style={thStyle}>Status</th>
              <th style={{...thStyle, textAlign:"right"}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map(p => {
              const statusColors = getStatusColor(p.status);
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#f8fafc"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                  <td style={tdStyle}>
                    <button onClick={() => navigate(`/projects/${p.id}`)} style={{ background:"none", border:"none", color: "#2563eb", fontWeight: "500", cursor: "pointer", padding:0, fontSize:"14px" }}>
                      {p.project_name}
                    </button>
                    {p.project_code && <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>Code: {p.project_code}</div>}
                  </td>
                  <td style={tdStyle}>{p.customer_name || "—"}</td>
                  <td style={tdStyle}>{p.billing_type}</td>
                  <td style={tdStyle}>₹{parseFloat(p.budget).toFixed(2)}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "600", background: statusColors.bg, color: statusColors.color }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{...tdStyle, textAlign:"right"}}>
                    <button onClick={() => navigate(`/projects/${p.id}/edit`)} style={iconBtn}>✏️</button>
                    <button onClick={() => handleDelete(p.id)} style={{...iconBtn, color:"#dc2626"}}>🗑️</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle = { padding: "12px 15px", fontWeight: "600", color: "#475569" };
const tdStyle = { padding: "12px 15px", color: "#334155" };
const inputStyle = { width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px" };
const primaryBtn = { padding: "8px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500", fontSize: "14px" };
const iconBtn = { background: "none", border: "none", cursor: "pointer", fontSize: "16px", margin: "0 5px", padding: "4px" };

export default Projects;
