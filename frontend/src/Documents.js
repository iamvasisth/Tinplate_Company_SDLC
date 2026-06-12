import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { TableSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function Documents() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/documents");
      setDocuments(res?.documents || []);
    } catch (err) {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (id) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      await apiRequest(`/documents/${id}`, { method: "DELETE" });
      toast.success("Document deleted");
      fetchDocuments();
    } catch (err) {
      toast.error("Failed to delete document");
    }
  };

  const handleView = async (doc) => {
    try {
      const toastId = toast.loading("Loading document...");
      const res = await fetch(`http://localhost:5001/api/documents/${doc.id}/download`, {
        credentials: 'include'
      });
      toast.dismiss(toastId);
      
      if (!res.ok) {
        toast.error("Failed to load. The physical file may be missing.");
        return;
      }
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000); // Clean up after 1 minute
    } catch (err) {
      toast.error("Network error while trying to view document");
    }
  };

  let filtered = documents;
  if (searchTerm) filtered = filtered.filter(d => d.document_name.toLowerCase().includes(searchTerm.toLowerCase()));
  if (categoryFilter !== "all") filtered = filtered.filter(d => d.category === categoryFilter);
  if (moduleFilter !== "all") filtered = filtered.filter(d => d.related_module === moduleFilter);

  return (
    <div style={{ padding: "30px", maxWidth: "1200px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Documents</h2>
        <button onClick={() => navigate("/documents/upload")} style={primaryBtn}>+ Upload Document</button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        <input 
          placeholder="Search documents..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)}
          style={inputStyle}
        />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={inputStyle}>
          <option value="all">All Categories</option>
          <option value="Invoice">Invoice</option>
          <option value="Bill">Bill</option>
          <option value="Expense">Expense</option>
          <option value="Receipt">Receipt</option>
          <option value="Customer">Customer</option>
          <option value="Vendor">Vendor</option>
          <option value="Other">Other</option>
        </select>
        <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} style={inputStyle}>
          <option value="all">All Modules</option>
          <option value="invoices">Invoices</option>
          <option value="bills">Bills</option>
          <option value="expenses">Expenses</option>
          <option value="customers">Customers</option>
          <option value="vendors">Vendors</option>
          <option value="items">Items</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        {loading ? (
          <TableSkeleton columns={6} rows={5} />
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
            <p>No documents found.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
                <th style={thStyle}>Document Name</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Related Module</th>
                <th style={thStyle}>File Name</th>
                <th style={thStyle}>Uploaded</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(doc => (
                <tr key={doc.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{...tdStyle, fontWeight: "500", color: "#1e293b"}}>{doc.document_name}</td>
                  <td style={tdStyle}>{doc.category || "—"}</td>
                  <td style={tdStyle}>{doc.related_module || "—"}</td>
                  <td style={tdStyle}>{doc.file_name || "—"}</td>
                  <td style={tdStyle}>{new Date(doc.created_at).toLocaleDateString()}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button onClick={() => handleView(doc)} style={secondaryBtn}>View / Download</button>
                      <button onClick={() => deleteDocument(doc.id)} style={{...secondaryBtn, color: "#dc2626", border: "1px solid #fca5a5"}}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const inputStyle = { padding: "8px 12px", borderRadius: "4px", border: "1px solid #ccc", minWidth: "200px" };
const thStyle = { padding: "12px 10px", color: "#475569", fontWeight: "600" };
const tdStyle = { padding: "12px 10px", color: "#334155" };
const primaryBtn = { padding: "8px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "500" };
const secondaryBtn = { padding: "6px 10px", background: "#fff", color: "#334155", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer", fontSize: "12px" };

export default Documents;
