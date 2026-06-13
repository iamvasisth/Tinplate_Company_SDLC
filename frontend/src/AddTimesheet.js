/**
 * AddTimesheet.js – Form to log time
 */
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "./api";
import { FormSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function AddTimesheet() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [projectId, setProjectId] = useState("");
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");
  const [billingType, setBillingType] = useState("Billable");
  const [hourlyRate, setHourlyRate] = useState("");

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const projRes = await apiRequest("/projects");
        setProjects(projRes?.projects || []);

        if (isEditMode) {
          setFetching(true);
          const res = await apiRequest(`/timesheets/${id}`);
          if (res?.timesheet) {
            const t = res.timesheet;
            setProjectId(t.project_id ? String(t.project_id) : "");
            setWorkDate(t.work_date ? t.work_date.slice(0, 10) : "");
            setStartTime(t.start_time ? t.start_time.slice(0,5) : "");
            setEndTime(t.end_time ? t.end_time.slice(0,5) : "");
            setHours(t.hours || "");
            setDescription(t.description || "");
            setBillingType(t.billing_type || "Billable");
            setHourlyRate(t.hourly_rate || "");
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

  // When project is selected, inherit its billing type and hourly rate by default
  useEffect(() => {
    if (projectId && !isEditMode && projects.length > 0) {
      const selectedProj = projects.find(p => String(p.id) === String(projectId));
      if (selectedProj) {
          if (selectedProj.billing_type === 'Hourly') {
              setBillingType('Billable');
              setHourlyRate(selectedProj.hourly_rate);
          } else if (selectedProj.billing_type === 'Fixed Cost') {
              // Usually fixed cost projects still track hours but maybe not billable directly via timesheet, 
              // but we let user decide. Defaulting to Non-Billable is safer for Fixed Cost, or Billable with 0 rate.
              setBillingType('Non-Billable');
              setHourlyRate("");
          } else {
              setBillingType('Non-Billable');
              setHourlyRate("");
          }
      }
    }
  }, [projectId, projects, isEditMode]);

  // Auto-calculate hours if start and end time are provided
  useEffect(() => {
    if (startTime && endTime) {
        const [sh, sm] = startTime.split(':').map(Number);
        const [eh, em] = endTime.split(':').map(Number);
        let diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff < 0) diff += 24 * 60; // crossed midnight
        const hrs = (diff / 60).toFixed(2);
        setHours(hrs);
    }
  }, [startTime, endTime]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!projectId || !workDate || !hours) {
      toast.error("Project, Work Date, and Hours are required");
      return;
    }
    if (parseFloat(hours) <= 0) {
        toast.error("Hours must be greater than 0");
        return;
    }
    if (billingType === 'Billable' && parseFloat(hourlyRate) < 0) {
      toast.error("Hourly Rate cannot be negative");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        project_id: parseInt(projectId),
        work_date: workDate,
        start_time: startTime || null,
        end_time: endTime || null,
        hours: parseFloat(hours),
        description,
        billing_type: billingType,
        hourly_rate: billingType === "Billable" ? parseFloat(hourlyRate) || 0 : 0
      };

      if (isEditMode) {
        await apiRequest(`/timesheets/${id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("Timesheet updated");
        navigate("/timesheets");
      } else {
        await apiRequest("/timesheets", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Time logged successfully");
        navigate("/timesheets");
      }
    } catch (err) {
      toast.error(err.message || "Failed to save timesheet");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div style={{ padding: "40px" }}><FormSkeleton fields={6} /></div>;

  return (
    <div style={{ maxWidth: "800px", margin: "auto", padding: "40px" }}>
      <h2 style={{ marginBottom: "30px", color: "#1e293b" }}>{isEditMode ? "Edit Timesheet" : "Log Time"}</h2>
      
      <form onSubmit={handleSave} style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        
        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Project *</label>
          <select value={projectId} onChange={e => setProjectId(e.target.value)} required style={inputStyle}>
            <option value="">— Select Project —</option>
            {projects.filter(p => p.status !== 'Cancelled').map(p => (
              <option key={p.id} value={p.id}>{p.project_name} {p.customer_name ? `(${p.customer_name})` : ''}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
          <div>
            <label style={labelStyle}>Date *</label>
            <input type="date" value={workDate} onChange={e => setWorkDate(e.target.value)} required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Total Hours *</label>
            <input type="number" step="0.01" min="0" value={hours} onChange={e => setHours(e.target.value)} required style={inputStyle} placeholder="e.g., 2.5" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px", padding: "15px", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
          <div>
            <label style={labelStyle}>Start Time (Optional)</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>End Time (Optional)</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
          <div>
            <label style={labelStyle}>Billing Type</label>
            <select value={billingType} onChange={e => setBillingType(e.target.value)} style={inputStyle}>
              <option value="Billable">Billable</option>
              <option value="Non-Billable">Non-Billable</option>
            </select>
          </div>
          
          {billingType === "Billable" && (
            <div>
              <label style={labelStyle}>Hourly Rate (₹)</label>
              <input type="number" step="0.01" min="0" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} style={inputStyle} required />
            </div>
          )}
        </div>

        <div style={{ marginBottom: "30px" }}>
          <label style={labelStyle}>Description / Notes</label>
          <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} style={inputStyle} placeholder="What did you work on?"></textarea>
        </div>

        <div style={{ display: "flex", gap: "15px", justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
          <button type="button" onClick={() => navigate(-1)} style={cancelBtnStyle} disabled={loading}>Cancel</button>
          <button type="submit" style={primaryBtnStyle} disabled={loading}>{loading ? "Saving..." : "Save Timesheet"}</button>
        </div>

      </form>
    </div>
  );
}

const labelStyle = { display: "block", marginBottom: "8px", fontWeight: "500", color: "#475569", fontSize: "14px" };
const inputStyle = { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box", fontSize: "14px", outline: "none" };
const primaryBtnStyle = { padding: "10px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500", fontSize: "15px" };
const cancelBtnStyle = { padding: "10px 24px", background: "#fff", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontWeight: "500", fontSize: "15px" };

export default AddTimesheet;
