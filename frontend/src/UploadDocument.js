import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

function UploadDocument() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    document_name: "",
    category: "Other",
    related_module: "other",
    related_record_id: "",
    notes: ""
  });
  
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFormData(prev => ({
        ...prev,
        document_name: prev.document_name || file.name
      }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.document_name) return toast.error("Document Name is required");
    if (!selectedFile) return toast.error("Please select a file");

    setSaving(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', selectedFile);
      uploadData.append('document_name', formData.document_name);
      uploadData.append('category', formData.category);
      uploadData.append('related_module', formData.related_module);
      if (formData.related_record_id) uploadData.append('related_record_id', formData.related_record_id);
      uploadData.append('notes', formData.notes);

      const res = await fetch('http://localhost:5000/api/documents', {
        method: 'POST',
        credentials: 'include',
        body: uploadData
      });

      if (!res.ok) throw new Error('Upload failed');
      
      toast.success("Document uploaded successfully");
      navigate("/documents");
    } catch (err) {
      toast.error("Failed to upload document");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "30px", maxWidth: "800px", margin: "auto" }}>
      <h2>Upload Document</h2>
      
      <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginTop: "20px" }}>
        
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <div>
            <label style={labelStyle}>Select File *</label>
            <input type="file" onChange={handleFileChange} style={inputStyle} required />
            {selectedFile && <small style={{ color: "#16a34a", display: "block", marginTop: "5px" }}>Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)</small>}
          </div>

          <div>
            <label style={labelStyle}>Document Name *</label>
            <input 
              type="text" 
              value={formData.document_name} 
              onChange={e => setFormData({...formData, document_name: e.target.value})}
              style={inputStyle} 
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <label style={labelStyle}>Category</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={inputStyle}>
                <option value="Invoice">Invoice</option>
                <option value="Bill">Bill</option>
                <option value="Expense">Expense</option>
                <option value="Receipt">Receipt</option>
                <option value="Customer">Customer</option>
                <option value="Vendor">Vendor</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div>
              <label style={labelStyle}>Related Module</label>
              <select value={formData.related_module} onChange={e => setFormData({...formData, related_module: e.target.value})} style={inputStyle}>
                <option value="invoices">Invoices</option>
                <option value="bills">Bills</option>
                <option value="expenses">Expenses</option>
                <option value="customers">Customers</option>
                <option value="vendors">Vendors</option>
                <option value="items">Items</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Related Record ID (Optional)</label>
            <input 
              type="number" 
              placeholder="e.g. 104"
              value={formData.related_record_id} 
              onChange={e => setFormData({...formData, related_record_id: e.target.value})}
              style={inputStyle} 
            />
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea 
              rows="3"
              value={formData.notes} 
              onChange={e => setFormData({...formData, notes: e.target.value})}
              style={inputStyle} 
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button type="submit" disabled={saving} style={primaryBtn}>{saving ? "Saving..." : "Upload Document"}</button>
            <button type="button" onClick={() => navigate("/documents")} style={secondaryBtn}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle = { display: "block", marginBottom: "5px", fontWeight: "500", color: "#334155", fontSize: "14px" };
const inputStyle = { width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #cbd5e1", boxSizing: "border-box" };
const primaryBtn = { padding: "10px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "500" };
const secondaryBtn = { padding: "10px 20px", background: "#f8fafc", color: "#334155", border: "1px solid #cbd5e1", borderRadius: "5px", cursor: "pointer" };

export default UploadDocument;
