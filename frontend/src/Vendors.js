import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { TableSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function Vendors() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // 'all', 'active', 'inactive'

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const res = await apiRequest("/vendors");
      setVendors(res?.vendors || []);
    } catch (err) {
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  const deleteVendor = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this vendor?")) return;
    try {
      await apiRequest(`/vendors/${id}`, { method: "DELETE" });
      setVendors(vendors.filter((v) => v.id !== id));
      toast.success("Vendor deleted");
    } catch (err) {
      toast.error("Failed to delete vendor");
    }
  };

  const filteredVendors = vendors.filter((v) => {
    const matchSearch =
      v.display_name.toLowerCase().includes(search.toLowerCase()) ||
      (v.company_name && v.company_name.toLowerCase().includes(search.toLowerCase())) ||
      (v.email && v.email.toLowerCase().includes(search.toLowerCase()));
    
    if (filter === "all") return matchSearch;
    return matchSearch && v.status === filter;
  });

  return (
    <div style={{ padding: "30px", maxWidth: "1000px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Vendors</h2>
        <button onClick={() => navigate("/vendors/new")} style={primaryBtn}>
          + New Vendor
        </button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
        <input
          type="text"
          placeholder="Search by name, company, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: "300px" }}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...inputStyle, width: "150px" }}>
          <option value="all">All Vendors</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <TableSkeleton columns={6} rows={5} />
      ) : filteredVendors.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px", color: "gray", background: "#f9fafb", borderRadius: "8px" }}>
          <p>No vendors found.</p>
          <button onClick={() => navigate("/vendors/new")} style={secondaryBtn}>Add Your First Vendor</button>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Company Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVendors.map((vendor) => (
              <tr
                key={vendor.id}
                onClick={() => navigate(`/vendors/${vendor.id}`)}
                style={{ borderBottom: "1px solid #e2e8f0", cursor: "pointer", transition: "background 0.2s" }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#f8fafc")}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <td style={tdStyle}><span style={{ color: "#4a90e2" }}>{vendor.display_name}</span></td>
                <td style={tdStyle}>{vendor.company_name || "—"}</td>
                <td style={tdStyle}>{vendor.email || "—"}</td>
                <td style={tdStyle}>{vendor.phone || "—"}</td>
                <td style={tdStyle}>
                  {vendor.status === "active" ? (
                    <span style={activeBadge}>Active</span>
                  ) : (
                    <span style={inactiveBadge}>Inactive</span>
                  )}
                </td>
                <td style={tdStyle}>
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/vendors/${vendor.id}/edit`); }} style={actionBtn}>Edit</button>
                  <button onClick={(e) => deleteVendor(vendor.id, e)} style={{ ...actionBtn, color: "red", marginLeft: "8px" }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle = { padding: "12px", borderBottom: "2px solid #cbd5e1" };
const tdStyle = { padding: "12px" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" };
const secondaryBtn = { padding: "10px 20px", background: "#f1f5f9", color: "#333", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer" };
const actionBtn = { padding: "4px 8px", background: "none", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer" };
const inputStyle = { padding: "8px", borderRadius: "4px", border: "1px solid #ccc" };
const activeBadge = { background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" };
const inactiveBadge = { background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" };

export default Vendors;
