/**
 * AddProject.js – Form to create/edit projects
 */
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "./api";
import { FormSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function AddProject() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [billingType, setBillingType] = useState("Fixed Cost");
  const [hourlyRate, setHourlyRate] = useState("");
  const [status, setStatus] = useState("Active");
  const [description, setDescription] = useState("");

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const custRes = await apiRequest("/customers");
        setCustomers(custRes?.customers || []);

        if (isEditMode) {
          setFetching(true);
          const res = await apiRequest(`/projects/${id}`);
          if (res?.project) {
            const p = res.project;
            setProjectName(p.project_name || "");
            setProjectCode(p.project_code || "");
            setCustomerId(p.customer_id ? String(p.customer_id) : "");
            setStartDate(p.start_date ? p.start_date.slice(0, 10) : "");
            setEndDate(p.end_date ? p.end_date.slice(0, 10) : "");
            setBudget(p.budget || "");
            setBillingType(p.billing_type || "Fixed Cost");
            setHourlyRate(p.hourly_rate || "");
            setStatus(p.status || "Active");
            setDescription(p.description || "");
          }
        }
      } catch (err) {
        toast.error("Failed to load data");
      } finally {
        setFetching(false);
      }
    };
    fetchAll();
  }, [id, isEditMode]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!projectName.trim() || !customerId) {
      toast.error("Project Name and Customer are required");
      return;
    }
    if (parseFloat(budget) < 0 || parseFloat(hourlyRate) < 0) {
      toast.error("Budget and Hourly Rate cannot be negative");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        project_name: projectName,
        project_code: projectCode,
        customer_id: parseInt(customerId),
        start_date: startDate || null,
        end_date: endDate || null,
        budget: parseFloat(budget) || 0,
        billing_type: billingType,
        hourly_rate: billingType === "Hourly" ? parseFloat(hourlyRate) || 0 : 0,
        status,
        description
      };

      if (isEditMode) {
        await apiRequest(`/projects/${id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("Project updated");
        navigate(`/projects/${id}`);
      } else {
        await apiRequest("/projects", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Project created");
        navigate("/projects");
      }
    } catch (err) {
      toast.error(err.message || "Failed to save project");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div style={{ padding: "40px" }}><FormSkeleton fields={6} /></div>;

  return (
    <div style={{ maxWidth: "800px", margin: "auto", padding: "40px" }}>
      <h2 style={{ marginBottom: "30px", color: "#1e293b" }}>{isEditMode ? "Edit Project" : "New Project"}</h2>
      
      <form onSubmit={handleSave} style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
          <div>
            <label style={labelStyle}>Project Name *</label>
            <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Customer *</label>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)} required style={inputStyle}>
              <option value="">— Select Customer —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.display_name || c.company_name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
          <div>
            <label style={labelStyle}>Project Code (Optional)</label>
            <input type="text" value={projectCode} onChange={e => setProjectCode(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
              <option value="Active">Active</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
          <div>
            <label style={labelStyle}>Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px", padding: "20px", background: "#f8fafc", borderRadius: "8px" }}>
          <div>
            <label style={labelStyle}>Billing Type</label>
            <select value={billingType} onChange={e => setBillingType(e.target.value)} style={inputStyle}>
              <option value="Fixed Cost">Fixed Cost</option>
              <option value="Hourly">Hourly</option>
              <option value="Non-Billable">Non-Billable</option>
            </select>
          </div>
          
          {billingType === "Hourly" && (
            <div>
              <label style={labelStyle}>Hourly Rate (₹)</label>
              <input type="number" step="0.01" min="0" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} style={inputStyle} required />
            </div>
          )}

          <div>
            <label style={labelStyle}>Budget (₹)</label>
            <input type="number" step="0.01" min="0" value={budget} onChange={e => setBudget(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: "30px" }}>
          <label style={labelStyle}>Description</label>
          <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} style={inputStyle}></textarea>
        </div>

        <div style={{ display: "flex", gap: "15px", justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
          <button type="button" onClick={() => navigate(-1)} style={cancelBtnStyle} disabled={loading}>Cancel</button>
          <button type="submit" style={primaryBtnStyle} disabled={loading}>{loading ? "Saving..." : "Save Project"}</button>
        </div>

      </form>
    </div>
  );
}

const labelStyle = { display: "block", marginBottom: "8px", fontWeight: "500", color: "#475569", fontSize: "14px" };
const inputStyle = { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box", fontSize: "14px", outline: "none" };
const primaryBtnStyle = { padding: "10px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500", fontSize: "15px" };
const cancelBtnStyle = { padding: "10px 24px", background: "#fff", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontWeight: "500", fontSize: "15px" };

export default AddProject;
