import React, { useEffect, useState } from "react";
import { apiRequest } from "./api";
import { TableSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function Taxes() {
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  const [formData, setFormData] = useState({
    tax_name: "",
    tax_type: "GST",
    rate: 0,
    description: "",
    status: "active"
  });

  useEffect(() => {
    fetchTaxes();
  }, []);

  const fetchTaxes = async () => {
    try {
      setLoading(true);
      const res = await apiRequest("/taxes");
      setTaxes(res?.taxes || []);
    } catch (err) {
      toast.error("Failed to load taxes");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setCurrentId(null);
    setFormData({
      tax_name: "",
      tax_type: "GST",
      rate: 0,
      description: "",
      status: "active"
    });
    setShowModal(true);
  };

  const handleOpenEdit = (tax) => {
    setIsEditMode(true);
    setCurrentId(tax.id);
    setFormData({
      tax_name: tax.tax_name || "",
      tax_type: tax.tax_type || "GST",
      rate: tax.rate || 0,
      description: tax.description || "",
      status: tax.status || "active"
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.tax_name) return toast.error("Tax Name is required");
    
    try {
      if (isEditMode) {
        await apiRequest(`/taxes/${currentId}`, { method: "PUT", body: JSON.stringify(formData) });
        toast.success("Tax updated successfully");
      } else {
        await apiRequest("/taxes", { method: "POST", body: JSON.stringify(formData) });
        toast.success("Tax added successfully");
      }
      setShowModal(false);
      fetchTaxes();
    } catch (err) {
      toast.error("Failed to save tax");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this tax?")) return;
    try {
      await apiRequest(`/taxes/${id}`, { method: "DELETE" });
      toast.success("Tax deleted");
      fetchTaxes();
    } catch (err) {
      toast.error("Failed to delete tax");
    }
  };

  const filteredTaxes = taxes.filter(t => {
    const matchSearch = t.tax_name.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || t.tax_type === filterType;
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  return (
    <div style={{ padding: "30px", maxWidth: "1000px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Taxes & GST Management</h2>
        <button onClick={handleOpenAdd} style={primaryBtn}>+ New Tax</button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search tax name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: "300px" }}
        />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...inputStyle, width: "150px" }}>
          <option value="all">All Types</option>
          <option value="GST">GST</option>
          <option value="IGST">IGST</option>
          <option value="CGST">CGST</option>
          <option value="SGST">SGST</option>
          <option value="CESS">CESS</option>
          <option value="Other">Other</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: "150px" }}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <TableSkeleton columns={5} rows={5} />
      ) : filteredTaxes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px", color: "gray", background: "#f9fafb", borderRadius: "8px" }}>
          <p>No taxes found.</p>
          <button onClick={handleOpenAdd} style={secondaryBtn}>Add New Tax</button>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={thStyle}>Tax Name</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Rate (%)</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTaxes.map(tax => (
              <tr key={tax.id} style={{ borderBottom: "1px solid #e2e8f0", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#f8fafc"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                <td style={tdStyle}>
                  <div style={{ fontWeight: "500", color: "#333" }}>{tax.tax_name}</div>
                  {tax.description && <div style={{ fontSize: "12px", color: "#64748b" }}>{tax.description}</div>}
                </td>
                <td style={tdStyle}>{tax.tax_type || "—"}</td>
                <td style={tdStyle}><span style={{ fontWeight: "600", color: "#0f172a" }}>{parseFloat(tax.rate).toFixed(2)}%</span></td>
                <td style={tdStyle}>
                  {tax.status === "active" ? (
                    <span style={activeBadge}>Active</span>
                  ) : (
                    <span style={inactiveBadge}>Inactive</span>
                  )}
                </td>
                <td style={tdStyle}>
                  <button onClick={() => handleOpenEdit(tax)} style={actionBtn}>Edit</button>
                  <button onClick={() => handleDelete(tax.id)} style={{ ...actionBtn, color: "red", marginLeft: "8px" }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ marginTop: 0, marginBottom: "20px" }}>{isEditMode ? "Edit Tax" : "New Tax"}</h3>
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: "15px" }}>
                <label style={labelStyle}>Tax Name *</label>
                <input type="text" name="tax_name" value={formData.tax_name} onChange={handleChange} style={inputStyle} placeholder="e.g. GST 18%" required />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <div>
                  <label style={labelStyle}>Rate (%) *</label>
                  <input type="number" step="0.01" name="rate" value={formData.rate} onChange={handleChange} style={inputStyle} required />
                </div>
                <div>
                  <label style={labelStyle}>Tax Type</label>
                  <select name="tax_type" value={formData.tax_type} onChange={handleChange} style={inputStyle}>
                    <option value="GST">GST</option>
                    <option value="IGST">IGST</option>
                    <option value="CGST">CGST</option>
                    <option value="SGST">SGST</option>
                    <option value="CESS">CESS</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: "15px" }}>
                <label style={labelStyle}>Status</label>
                <select name="status" value={formData.status} onChange={handleChange} style={inputStyle}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Description (Optional)</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={3} style={inputStyle}></textarea>
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowModal(false)} style={cancelBtn}>Cancel</button>
                <button type="submit" style={primaryBtn}>Save Tax</button>
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
const actionBtn = { padding: "4px 10px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer", fontSize: "13px" };
const inputStyle = { width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" };
const labelStyle = { display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" };
const activeBadge = { background: "#dcfce7", color: "#166534", padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" };
const inactiveBadge = { background: "#f1f5f9", color: "#475569", padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" };

const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalBox = { background: "#fff", borderRadius: "8px", padding: "30px", width: "450px", maxWidth: "90%", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" };
const cancelBtn = { padding: "10px 20px", background: "#f1f5f9", color: "#333", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer" };

export default Taxes;
