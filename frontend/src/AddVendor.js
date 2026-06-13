import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "./api";
import { FormSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function AddVendor() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    display_name: "",
    company_name: "",
    email: "",
    phone: "",
    gstin: "",
    pan: "",
    billing_address: "",
    shipping_address: "",
    opening_balance: 0,
    payment_terms: "",
    status: "active",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      setFetching(true);
      fetchVendor();
    }
  }, [id]);

  const fetchVendor = async () => {
    try {
      const res = await apiRequest(`/vendors/${id}`);
      if (res?.vendor) {
        setFormData({
          display_name: res.vendor.display_name || "",
          company_name: res.vendor.company_name || "",
          email: res.vendor.email || "",
          phone: res.vendor.phone || "",
          gstin: res.vendor.gstin || "",
          pan: res.vendor.pan || "",
          billing_address: res.vendor.billing_address || "",
          shipping_address: res.vendor.shipping_address || "",
          opening_balance: res.vendor.opening_balance || 0,
          payment_terms: res.vendor.payment_terms || "",
          status: res.vendor.status || "active",
          notes: res.vendor.notes || "",
        });
      }
    } catch (err) {
      toast.error("Failed to load vendor");
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.display_name) {
      toast.error("Display Name is required");
      return;
    }

    setLoading(true);
    try {
      if (isEditMode) {
        await apiRequest(`/vendors/${id}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
        toast.success("Vendor updated successfully");
        navigate(`/vendors/${id}`);
      } else {
        const res = await apiRequest("/vendors", {
          method: "POST",
          body: JSON.stringify(formData),
        });
        toast.success("Vendor created successfully");
        navigate(`/vendors/${res.vendor.id}`);
      }
    } catch (err) {
      toast.error(isEditMode ? "Failed to update vendor" : "Failed to create vendor");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div style={{ maxWidth: "800px", margin: "auto", padding: "30px" }}>
        <h2 style={{ marginBottom: "25px" }}>{isEditMode ? "Edit Vendor" : "New Vendor"}</h2>
        <FormSkeleton fields={6} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "auto", padding: "30px" }}>
      <h2 style={{ marginBottom: "25px" }}>{isEditMode ? "Edit Vendor" : "New Vendor"}</h2>
      <form onSubmit={handleSave} style={{ background: "#fff", padding: "25px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        
        <h4 style={{ margin: "0 0 15px 0", color: "#555", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>Basic Info</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "25px" }}>
          <div>
            <label style={labelStyle}>Display Name *</label>
            <input type="text" name="display_name" value={formData.display_name} onChange={handleChange} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Company Name</label>
            <input type="text" name="company_name" value={formData.company_name} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input type="text" name="phone" value={formData.phone} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select name="status" value={formData.status} onChange={handleChange} style={inputStyle}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <h4 style={{ margin: "0 0 15px 0", color: "#555", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>Tax & Financial</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "25px" }}>
          <div>
            <label style={labelStyle}>GSTIN / Tax Number</label>
            <input type="text" name="gstin" value={formData.gstin} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>PAN</label>
            <input type="text" name="pan" value={formData.pan} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Opening Balance (₹)</label>
            <input type="number" step="0.01" name="opening_balance" value={formData.opening_balance} onChange={handleChange} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Payment Terms</label>
            <input type="text" name="payment_terms" value={formData.payment_terms} onChange={handleChange} style={inputStyle} placeholder="e.g. Net 30, Due on Receipt" />
          </div>
        </div>

        <h4 style={{ margin: "0 0 15px 0", color: "#555", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>Address & Notes</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "25px" }}>
          <div>
            <label style={labelStyle}>Billing Address</label>
            <textarea name="billing_address" value={formData.billing_address} onChange={handleChange} rows={3} style={inputStyle}></textarea>
          </div>
          <div>
            <label style={labelStyle}>Shipping Address</label>
            <textarea name="shipping_address" value={formData.shipping_address} onChange={handleChange} rows={3} style={inputStyle}></textarea>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} style={inputStyle}></textarea>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button type="button" onClick={() => navigate("/vendors")} style={cancelBtn}>Cancel</button>
          <button type="submit" disabled={loading} style={primaryBtn}>{loading ? "Saving..." : "Save Vendor"}</button>
        </div>
      </form>
    </div>
  );
}

const labelStyle = { display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" };
const inputStyle = { width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" };
const cancelBtn = { padding: "10px 20px", background: "#f1f5f9", color: "#333", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer" };

export default AddVendor;
