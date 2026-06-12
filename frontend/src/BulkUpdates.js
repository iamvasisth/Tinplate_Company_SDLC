/**
 * BulkUpdates.js – Admin panel to apply bulk changes to records
 */
import React, { useState, useEffect } from "react";
import { apiRequest } from "./api";
import { PageSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function BulkUpdates() {
  const [modules, setModules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Flow State
  const [selectedModule, setSelectedModule] = useState("");
  const [records, setRecords] = useState([]); // Fetched records for the module
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);
  const [actionType, setActionType] = useState("");
  const [payload, setPayload] = useState({});
  const [previewResult, setPreviewResult] = useState(null);
  
  // UI State
  const [fetchingRecords, setFetchingRecords] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [applying, setApplying] = useState(false);
  const [activeTab, setActiveTab] = useState("update");

  useEffect(() => {
    const fetchInit = async () => {
      try {
        setLoading(true);
        const [modRes, logRes] = await Promise.all([
          apiRequest("/bulk-updates/modules"),
          apiRequest("/bulk-updates/logs")
        ]);
        setModules(modRes?.modules || []);
        setLogs(logRes?.logs || []);
      } catch (err) {
        toast.error("Failed to load bulk update configurations");
      } finally {
        setLoading(false);
      }
    };
    fetchInit();
  }, []);

  // When module changes, fetch records for that module
  useEffect(() => {
    if (!selectedModule) {
      setRecords([]);
      setSelectedRecordIds([]);
      setActionType("");
      return;
    }
    const fetchRecords = async () => {
      try {
        setFetchingRecords(true);
        const endpoint = selectedModule.toLowerCase(); // simplified routing assumption
        const res = await apiRequest(`/${endpoint}`);
        setRecords(res[endpoint] || res.items || res.customers || res.invoices || res.expenses || []);
        setSelectedRecordIds([]);
        setActionType("");
      } catch (err) {
        toast.error(`Failed to fetch ${selectedModule}`);
      } finally {
        setFetchingRecords(false);
      }
    };
    fetchRecords();
  }, [selectedModule]);

  const activeModuleConfig = modules.find(m => m.name === selectedModule);

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedRecordIds(records.map(r => r.id));
    else setSelectedRecordIds([]);
  };

  const handleSelectRecord = (id) => {
    if (selectedRecordIds.includes(id)) setSelectedRecordIds(selectedRecordIds.filter(rid => rid !== id));
    else setSelectedRecordIds([...selectedRecordIds, id]);
  };

  const handlePreview = async () => {
    if (selectedRecordIds.length === 0) return toast.error("Select at least one record");
    if (!actionType) return toast.error("Select an action");
    
    try {
      setApplying(true);
      const res = await apiRequest("/bulk-updates/preview", {
        method: "POST",
        body: JSON.stringify({
          module_name: selectedModule,
          action_type: actionType,
          records: selectedRecordIds,
          payload
        })
      });
      setPreviewResult(res.results);
      setShowPreviewModal(true);
    } catch (err) {
      toast.error(err.message || "Preview failed");
    } finally {
      setApplying(false);
    }
  };

  const handleApply = async () => {
    if (!window.confirm("Are you sure you want to apply these bulk updates? This action cannot be undone.")) return;
    try {
      setApplying(true);
      await apiRequest("/bulk-updates/apply", {
        method: "POST",
        body: JSON.stringify({
          module_name: selectedModule,
          action_type: actionType,
          records: selectedRecordIds,
          payload
        })
      });
      toast.success("Bulk update applied successfully");
      setShowPreviewModal(false);
      setSelectedModule(""); // reset
      setPayload({});
      // Refresh logs
      const logRes = await apiRequest("/bulk-updates/logs");
      setLogs(logRes?.logs || []);
      setActiveTab("logs");
    } catch (err) {
      toast.error(err.message || "Failed to apply bulk updates");
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div style={{ padding: "30px", maxWidth: "1100px", margin: "auto" }}>
      <div style={{ marginBottom: "30px" }}>
        <h2 style={{ margin: "0 0 10px 0", color: "#1e293b" }}>Bulk Updates</h2>
        <p style={{ color: "#64748b", margin: 0 }}>Safely apply changes to multiple records simultaneously.</p>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", marginBottom: "30px", gap: "30px" }}>
        {["update", "logs"].map(tab => (
          <div 
            key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: "10px 0", cursor: "pointer", fontWeight: "500", fontSize: "15px", color: activeTab === tab ? "#2563eb" : "#64748b", borderBottom: activeTab === tab ? "2px solid #2563eb" : "2px solid transparent", textTransform: "capitalize" }}
          >
            {tab === "update" ? "New Bulk Update" : "Update Logs"}
          </div>
        ))}
      </div>

      {activeTab === "update" && (
        <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          
          <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Select Module</label>
              <select value={selectedModule} onChange={e => setSelectedModule(e.target.value)} style={inputStyle}>
                <option value="">— Select a Module —</option>
                {modules.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            {selectedModule && (
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Select Action</label>
                <select value={actionType} onChange={e => setActionType(e.target.value)} style={inputStyle}>
                  <option value="">— Select Action —</option>
                  {activeModuleConfig?.actions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Action Payload Fields */}
          {actionType === "setStatus" && (
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>New Status</label>
              <select value={payload.status || ""} onChange={e => setPayload({...payload, status: e.target.value})} style={{...inputStyle, width: "300px"}}>
                <option value="">— Select Status —</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="void">Void</option>
              </select>
            </div>
          )}
          {actionType === "setTaxRate" && (
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>New Tax Rate (%)</label>
              <input type="number" step="0.01" value={payload.tax_rate || ""} onChange={e => setPayload({...payload, tax_rate: e.target.value})} style={{...inputStyle, width: "300px"}} placeholder="e.g. 18" />
            </div>
          )}
          {actionType === "setCategory" && (
             <div style={{ marginBottom: "20px" }}>
             <label style={labelStyle}>New Category</label>
             <input type="text" value={payload.category || ""} onChange={e => setPayload({...payload, category: e.target.value})} style={{...inputStyle, width: "300px"}} placeholder="e.g. Meals and Entertainment" />
           </div>
          )}

          {/* Records Table */}
          {selectedModule && (
            <div style={{ marginTop: "30px" }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#334155" }}>Select Records ({selectedRecordIds.length} selected)</h4>
              {fetchingRecords ? <p style={{ color: "#64748b" }}>Loading records...</p> : (
                <div style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                    <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>
                      <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                        <th style={{ padding: "12px", width: "40px", textAlign: "center" }}>
                          <input type="checkbox" checked={records.length > 0 && selectedRecordIds.length === records.length} onChange={handleSelectAll} style={{ cursor: "pointer" }} />
                        </th>
                        <th style={{ padding: "12px" }}>Record Name / Identifier</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map(r => (
                        <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            <input type="checkbox" checked={selectedRecordIds.includes(r.id)} onChange={() => handleSelectRecord(r.id)} style={{ cursor: "pointer" }} />
                          </td>
                          <td style={{ padding: "12px", color: "#1e293b" }}>{r.display_name || r.name || r.invoice_number || r.bill_number || `Record #${r.id}`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "30px" }}>
            <button onClick={handlePreview} style={primaryBtn} disabled={applying || selectedRecordIds.length === 0 || !actionType}>
              {applying ? "Checking..." : "Preview Updates"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          {logs.length === 0 ? <p style={{ color: "#64748b" }}>No bulk updates have been performed yet.</p> : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                  <th style={{ padding: "12px" }}>Date</th>
                  <th style={{ padding: "12px" }}>Module</th>
                  <th style={{ padding: "12px" }}>Action</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Success</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Failed</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px", color: "#1e293b", fontWeight: "500" }}>{new Date(l.created_at).toLocaleString()}</td>
                    <td style={{ padding: "12px", color: "#64748b" }}>{l.module_name}</td>
                    <td style={{ padding: "12px", color: "#64748b" }}>{l.action_type}</td>
                    <td style={{ padding: "12px", textAlign: "center", color: "#166534", fontWeight: "600" }}>{l.success_count}</td>
                    <td style={{ padding: "12px", textAlign: "center", color: l.failed_count > 0 ? "#dc2626" : "#64748b", fontWeight: "600" }}>{l.failed_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewResult && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", width: "600px", maxWidth: "90%", maxHeight: "80vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 20px 0", color: "#1e293b" }}>Preview Bulk Update</h3>
            
            <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
              <div style={{ background: "#dcfce7", padding: "15px", borderRadius: "6px", flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: "24px", color: "#166534", fontWeight: "700" }}>{previewResult.success.length}</div>
                <div style={{ fontSize: "13px", color: "#166534" }}>Ready to Update</div>
              </div>
              <div style={{ background: "#fee2e2", padding: "15px", borderRadius: "6px", flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: "24px", color: "#991b1b", fontWeight: "700" }}>{previewResult.failed.length}</div>
                <div style={{ fontSize: "13px", color: "#991b1b" }}>Will Fail</div>
              </div>
            </div>

            {previewResult.failed.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#dc2626", fontSize: "14px" }}>Failed Records (Won't be updated)</h4>
                <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #f87171", borderRadius: "6px", padding: "10px", background: "#fef2f2" }}>
                  {previewResult.failed.map(f => (
                    <div key={f.id} style={{ fontSize: "13px", color: "#991b1b", padding: "4px 0", borderBottom: "1px solid #fecaca" }}>
                      <strong>Record #{f.id}:</strong> {f.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "30px" }}>
              <button onClick={() => setShowPreviewModal(false)} style={cancelBtn} disabled={applying}>Cancel</button>
              <button onClick={handleApply} style={primaryBtn} disabled={applying || previewResult.success.length === 0}>
                {applying ? "Applying..." : `Apply to ${previewResult.success.length} records`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const labelStyle = { display: "block", marginBottom: "8px", fontWeight: "500", color: "#475569", fontSize: "14px" };
const inputStyle = { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box", fontSize: "14px", outline: "none" };
const primaryBtn = { padding: "10px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500", fontSize: "14px" };
const cancelBtn = { padding: "10px 24px", background: "#fff", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontWeight: "500", fontSize: "14px" };

export default BulkUpdates;
