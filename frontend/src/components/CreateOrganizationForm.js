import React, { useState } from "react";
import { apiRequest } from "../api";
import toast from "react-hot-toast";
import "./CreateOrganizationForm.css";

function CreateOrganizationForm({ onClose }) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    organization_name: "",
    business_type: "",
    gstin: "",
    pan: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    phone: "",
    organization_email: "",
    financial_year_start: "April",
    default_currency: "INR"
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // In a real multi-tenant app, this would be POST /api/organizations
      // Since this is scoped to the user for now, we use the existing settings API
      await apiRequest("/organization-settings", {
        method: "PUT",
        body: JSON.stringify(formData)
      });
      toast.success("Organization created successfully!");
      // Force reload to update context and topbar
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      toast.error("Failed to create organization");
      setSaving(false);
    }
  };

  return (
    <div className="org-modal-overlay">
      <div className="org-modal-container">
        <div className="org-modal-header">
          <h2>Create New Organization</h2>
          <button className="org-modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSave} className="org-modal-body">
          <div className="org-form-group">
            <label>Organization Name *</label>
            <input 
              required
              value={formData.organization_name} 
              onChange={e => setFormData({...formData, organization_name: e.target.value})} 
            />
          </div>
          
          <div className="org-form-row">
            <div className="org-form-group">
              <label>Business Type</label>
              <input 
                value={formData.business_type} 
                onChange={e => setFormData({...formData, business_type: e.target.value})} 
              />
            </div>
            <div className="org-form-group">
              <label>State (Required for GST)</label>
              <input 
                required
                value={formData.state} 
                onChange={e => setFormData({...formData, state: e.target.value})} 
              />
            </div>
          </div>

          <div className="org-form-row">
            <div className="org-form-group">
              <label>GSTIN</label>
              <input 
                value={formData.gstin} 
                onChange={e => setFormData({...formData, gstin: e.target.value})} 
              />
            </div>
            <div className="org-form-group">
              <label>Default Currency</label>
              <select 
                value={formData.default_currency} 
                onChange={e => setFormData({...formData, default_currency: e.target.value})}
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div className="org-form-group">
            <label>Address</label>
            <textarea 
              rows="2"
              value={formData.address} 
              onChange={e => setFormData({...formData, address: e.target.value})} 
            />
          </div>

          <div className="org-modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-save" disabled={saving}>{saving ? "Saving..." : "Save and Continue"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateOrganizationForm;
