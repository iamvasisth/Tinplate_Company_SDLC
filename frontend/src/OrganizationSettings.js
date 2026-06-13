import React, { useState, useEffect } from "react";
import { apiRequest } from "./api";
import { FormSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function OrganizationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
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

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiRequest("/organization-settings");
      if (res.settings) {
        setSettings({ ...settings, ...res.settings });
      }
    } catch (err) {
      toast.error("Failed to load organization settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest("/organization-settings", {
        method: "PUT",
        body: JSON.stringify(settings)
      });
      toast.success("Organization Settings updated successfully!");
    } catch (err) {
      toast.error("Failed to update organization settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "30px", maxWidth: "800px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Organization Profile</h2>
      </div>

      <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        {loading ? (
          <FormSkeleton fields={6} />
        ) : (
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <h4 style={{ margin: "0 0 10px 0", color: "#475569", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>General Information</h4>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <label style={labelStyle}>Organization Name</label>
              <input 
                value={settings.organization_name || ""} 
                onChange={e => setSettings({...settings, organization_name: e.target.value})} 
                style={inputStyle} 
                required 
              />
            </div>
            <div>
              <label style={labelStyle}>Business Type</label>
              <input 
                value={settings.business_type || ""} 
                onChange={e => setSettings({...settings, business_type: e.target.value})} 
                style={inputStyle} 
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <label style={labelStyle}>GSTIN (For automated Tax calculation)</label>
              <input 
                value={settings.gstin || ""} 
                onChange={e => setSettings({...settings, gstin: e.target.value})} 
                style={inputStyle} 
              />
            </div>
            <div>
              <label style={labelStyle}>PAN</label>
              <input 
                value={settings.pan || ""} 
                onChange={e => setSettings({...settings, pan: e.target.value})} 
                style={inputStyle} 
              />
            </div>
          </div>

          <h4 style={{ margin: "20px 0 10px 0", color: "#475569", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>Contact Details</h4>
          
          <div>
            <label style={labelStyle}>Street Address</label>
            <textarea 
              rows="2"
              value={settings.address || ""} 
              onChange={e => setSettings({...settings, address: e.target.value})} 
              style={inputStyle} 
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <label style={labelStyle}>City</label>
              <input 
                value={settings.city || ""} 
                onChange={e => setSettings({...settings, city: e.target.value})} 
                style={inputStyle} 
              />
            </div>
            <div>
              <label style={labelStyle}>State / Province (Determines CGST/SGST vs IGST)</label>
              <input 
                value={settings.state || ""} 
                onChange={e => setSettings({...settings, state: e.target.value})} 
                style={inputStyle} 
                placeholder="e.g. Maharashtra"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input 
                type="email"
                value={settings.organization_email || ""} 
                onChange={e => setSettings({...settings, organization_email: e.target.value})} 
                style={inputStyle} 
              />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input 
                value={settings.phone || ""} 
                onChange={e => setSettings({...settings, phone: e.target.value})} 
                style={inputStyle} 
              />
            </div>
          </div>

          <h4 style={{ margin: "20px 0 10px 0", color: "#475569", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>Regional Settings</h4>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <label style={labelStyle}>Financial Year Start</label>
              <select value={settings.financial_year_start || "April"} onChange={e => setSettings({...settings, financial_year_start: e.target.value})} style={inputStyle}>
                <option value="January">January</option>
                <option value="April">April</option>
                <option value="July">July</option>
                <option value="October">October</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Default Currency</label>
              <select value={settings.default_currency || "INR"} onChange={e => setSettings({...settings, default_currency: e.target.value})} style={inputStyle}>
                <option value="INR">INR - Indian Rupee</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
            <button type="submit" disabled={saving} style={primaryBtn}>{saving ? "Saving..." : "Save Settings"}</button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}

const labelStyle = { display: "block", marginBottom: "5px", fontWeight: "500", color: "#334155", fontSize: "14px" };
const inputStyle = { width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #cbd5e1", boxSizing: "border-box" };
const primaryBtn = { padding: "10px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "500" };

export default OrganizationSettings;
