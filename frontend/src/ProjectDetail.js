/**
 * ProjectDetail.js – Tabbed view for Project management
 */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { FormSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [profitability, setProfitability] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projRes, invRes, expRes, profRes, tsRes] = await Promise.all([
        apiRequest(`/projects/${id}`),
        apiRequest(`/projects/${id}/invoices`),
        apiRequest(`/projects/${id}/expenses`),
        apiRequest(`/projects/${id}/profitability`),
        apiRequest(`/projects/${id}/timesheets`)
      ]);
      if (projRes?.project) setProject(projRes.project);
      if (invRes?.invoices) setInvoices(invRes.invoices);
      if (expRes?.expenses) setExpenses(expRes.expenses);
      if (profRes?.profitability) setProfitability(profRes.profitability);
      if (tsRes?.timesheets) setTimesheets(tsRes.timesheets);
    } catch (err) {
      toast.error("Failed to load project details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: "40px" }}><FormSkeleton fields={6} /></div>;
  if (!project) return <div style={{ padding: "40px", textAlign: "center" }}>Project not found</div>;

  const getStatusColor = (status) => {
    switch (status) {
      case "Active": return { bg: "#dcfce7", color: "#166534" };
      case "Completed": return { bg: "#dbeafe", color: "#1e40af" };
      case "On Hold": return { bg: "#fef3c7", color: "#92400e" };
      case "Cancelled": return { bg: "#fee2e2", color: "#991b1b" };
      default: return { bg: "#f1f5f9", color: "#475569" };
    }
  };
  const badge = getStatusColor(project.status);

  return (
    <div style={{ maxWidth: "1200px", margin: "auto", padding: "30px" }}>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "30px" }}>
        <div>
          <button onClick={() => navigate("/projects")} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 0, marginBottom: "10px", fontSize: "14px" }}>← Back to Projects</button>
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <h2 style={{ margin: 0, fontSize: "28px", color: "#1e293b" }}>{project.project_name}</h2>
            <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: "600", background: badge.bg, color: badge.color }}>
              {project.status}
            </span>
          </div>
          {project.project_code && <div style={{ marginTop: "5px", color: "#64748b", fontSize: "14px" }}>Project Code: {project.project_code}</div>}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => navigate(`/projects/${id}/edit`)} style={secondaryBtn}>✏️ Edit Project</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", marginBottom: "30px", gap: "30px" }}>
        {["overview", "invoices", "expenses", "timesheets", "profitability"].map(tab => (
          <div 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            style={{ 
              padding: "10px 0", 
              cursor: "pointer", 
              fontWeight: "500", 
              fontSize: "15px",
              color: activeTab === tab ? "#2563eb" : "#64748b",
              borderBottom: activeTab === tab ? "2px solid #2563eb" : "2px solid transparent",
              textTransform: "capitalize"
            }}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "30px" }}>
          
          <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#334155" }}>Project Details</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", fontSize: "14px", color: "#475569", lineHeight: "1.6" }}>
              <div><strong>Customer:</strong> <br/><span style={{color: "#1e293b", fontSize: "15px"}}>{project.customer_name || "—"}</span></div>
              <div><strong>Billing Type:</strong> <br/><span style={{color: "#1e293b", fontSize: "15px"}}>{project.billing_type}</span></div>
              <div><strong>Start Date:</strong> <br/><span style={{color: "#1e293b", fontSize: "15px"}}>{project.start_date ? new Date(project.start_date).toLocaleDateString() : "—"}</span></div>
              <div><strong>End Date:</strong> <br/><span style={{color: "#1e293b", fontSize: "15px"}}>{project.end_date ? new Date(project.end_date).toLocaleDateString() : "—"}</span></div>
              <div><strong>Hourly Rate:</strong> <br/><span style={{color: "#1e293b", fontSize: "15px"}}>₹{parseFloat(project.hourly_rate).toFixed(2)}</span></div>
            </div>
            
            {project.description && (
              <div style={{ marginTop: "30px" }}>
                <h4 style={{ marginBottom: "10px", color: "#334155" }}>Description</h4>
                <div style={{ fontSize: "14px", color: "#475569", whiteSpace: "pre-wrap" }}>{project.description}</div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ background: "#f8fafc", padding: "25px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <h4 style={{ margin: "0 0 15px 0", color: "#334155", fontSize: "15px" }}>Financial Snapshot</h4>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "14px" }}>
                <span style={{ color: "#64748b" }}>Budget</span>
                <span style={{ fontWeight: "600", color: "#1e293b" }}>₹{parseFloat(project.budget).toFixed(2)}</span>
              </div>
              {profitability && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "14px" }}>
                    <span style={{ color: "#64748b" }}>Expenses</span>
                    <span style={{ fontWeight: "600", color: "#dc2626" }}>-₹{profitability.total_expenses.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "14px", borderTop: "1px solid #cbd5e1", paddingTop: "10px" }}>
                    <span style={{ color: "#64748b" }}>Remaining Budget</span>
                    <span style={{ fontWeight: "600", color: "#1e293b" }}>₹{(parseFloat(project.budget) - profitability.total_expenses).toFixed(2)}</span>
                  </div>
                  <div style={{ width: "100%", background: "#e2e8f0", height: "6px", borderRadius: "3px", marginTop: "15px", overflow: "hidden" }}>
                    <div style={{ background: profitability.budget_usage_percent > 100 ? "#dc2626" : "#2563eb", height: "100%", width: `${Math.min(profitability.budget_usage_percent, 100)}%` }}></div>
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "5px", textAlign: "right" }}>{profitability.budget_usage_percent.toFixed(1)}% Used</div>
                </>
              )}
            </div>
            
            <div style={{ background: "#f0fdf4", padding: "25px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                <h4 style={{ margin: "0 0 15px 0", color: "#166534", fontSize: "15px" }}>Profit/Loss</h4>
                <div style={{ fontSize: "28px", fontWeight: "700", color: profitability?.profit_loss >= 0 ? "#166534" : "#991b1b" }}>
                  {profitability?.profit_loss >= 0 ? "₹" : "-₹"}{Math.abs(profitability?.profit_loss || 0).toFixed(2)}
                </div>
            </div>
          </div>
        </div>
      )}

      {/* INVOICES TAB */}
      {activeTab === "invoices" && (
        <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <h3 style={{ margin: 0, color: "#334155" }}>Project Invoices</h3>
            <button onClick={() => navigate(`/invoices/new?customer_id=${project.customer_id}`)} style={primaryBtnSmall}>+ Create Invoice</button>
          </div>
          
          {invoices.length === 0 ? <p style={{ color: "#64748b" }}>No invoices linked to this project yet.</p> : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                  <th style={{ padding: "12px" }}>Invoice#</th>
                  <th style={{ padding: "12px" }}>Date</th>
                  <th style={{ padding: "12px" }}>Status</th>
                  <th style={{ padding: "12px", textAlign: "right" }}>Total</th>
                  <th style={{ padding: "12px", textAlign: "right" }}>Balance Due</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px" }}><button onClick={() => navigate(`/invoices/${inv.id}/document`)} style={{ background:"none", border:"none", color:"#2563eb", cursor:"pointer", padding:0 }}>{inv.invoice_number}</button></td>
                    <td style={{ padding: "12px" }}>{new Date(inv.invoice_date).toLocaleDateString()}</td>
                    <td style={{ padding: "12px", textTransform: "capitalize" }}>{inv.status}</td>
                    <td style={{ padding: "12px", textAlign: "right" }}>₹{parseFloat(inv.total).toFixed(2)}</td>
                    <td style={{ padding: "12px", textAlign: "right" }}>₹{parseFloat(inv.balance_due).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* EXPENSES TAB */}
      {activeTab === "expenses" && (
        <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <h3 style={{ margin: 0, color: "#334155" }}>Project Expenses</h3>
            <button onClick={() => navigate("/expenses")} style={primaryBtnSmall}>Manage Expenses</button>
          </div>
          
          {expenses.length === 0 ? <p style={{ color: "#64748b" }}>No expenses linked to this project yet.</p> : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                  <th style={{ padding: "12px" }}>Date</th>
                  <th style={{ padding: "12px" }}>Category</th>
                  <th style={{ padding: "12px" }}>Description</th>
                  <th style={{ padding: "12px", textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px" }}>{new Date(exp.expense_date).toLocaleDateString()}</td>
                    <td style={{ padding: "12px" }}>{exp.category}</td>
                    <td style={{ padding: "12px" }}>{exp.description || "—"}</td>
                    <td style={{ padding: "12px", textAlign: "right", fontWeight: "500" }}>₹{parseFloat(exp.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TIMESHEETS TAB */}
      {activeTab === "timesheets" && (
        <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <h3 style={{ margin: 0, color: "#334155" }}>Project Timesheets</h3>
            <button onClick={() => navigate(`/timesheets/new?project_id=${id}`)} style={primaryBtnSmall}>+ Log Time</button>
          </div>
          
          {timesheets.length === 0 ? <p style={{ color: "#64748b" }}>No timesheets linked to this project yet.</p> : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                  <th style={{ padding: "12px" }}>Date</th>
                  <th style={{ padding: "12px" }}>Staff</th>
                  <th style={{ padding: "12px" }}>Hours</th>
                  <th style={{ padding: "12px" }}>Billing</th>
                  <th style={{ padding: "12px", textAlign: "right" }}>Amount</th>
                  <th style={{ padding: "12px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {timesheets.map(ts => {
                  const sColor = getStatusColor(ts.status);
                  return (
                    <tr key={ts.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px" }}>{new Date(ts.work_date).toLocaleDateString()}</td>
                      <td style={{ padding: "12px" }}>{ts.staff_name || "—"}</td>
                      <td style={{ padding: "12px", fontWeight: "600" }}>{ts.hours}</td>
                      <td style={{ padding: "12px" }}>{ts.billing_type}</td>
                      <td style={{ padding: "12px", textAlign: "right", fontWeight: "500" }}>₹{parseFloat(ts.billable_amount).toFixed(2)}</td>
                      <td style={{ padding: "12px" }}>
                        <span style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "600", background: sColor.bg, color: sColor.color }}>
                          {ts.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* PROFITABILITY TAB */}
      {activeTab === "profitability" && profitability && (
        <div style={{ background: "#fff", padding: "40px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ marginTop: 0, marginBottom: "30px", color: "#334155", textAlign: "center" }}>Financial Summary</h3>
            
            <div style={{ display: "flex", justifyContent: "center", gap: "50px" }}>
                
                {/* Income Card */}
                <div style={{ width: "300px", padding: "20px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "14px", color: "#64748b", textTransform: "uppercase", fontWeight: "600", marginBottom: "10px" }}>Income</div>
                    <div style={{ fontSize: "24px", color: "#1e293b", fontWeight: "bold", marginBottom: "5px" }}>₹{profitability.total_invoiced.toFixed(2)}</div>
                    <div style={{ fontSize: "13px", color: "#64748b" }}>Total Billed</div>
                    <div style={{ marginTop: "15px", paddingTop: "15px", borderTop: "1px dashed #cbd5e1" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                            <span>Received</span>
                            <span style={{ color: "#166534", fontWeight: "600" }}>₹{profitability.total_paid.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", fontSize: "30px", color: "#cbd5e1", fontWeight: "300" }}>-</div>

                {/* Expenses Card */}
                <div style={{ width: "300px", padding: "20px", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca" }}>
                    <div style={{ fontSize: "14px", color: "#991b1b", textTransform: "uppercase", fontWeight: "600", marginBottom: "10px" }}>Expenses</div>
                    <div style={{ fontSize: "24px", color: "#991b1b", fontWeight: "bold", marginBottom: "5px" }}>₹{profitability.total_expenses.toFixed(2)}</div>
                    <div style={{ fontSize: "13px", color: "#991b1b", opacity: 0.8 }}>Total Project Costs</div>
                </div>

                <div style={{ display: "flex", alignItems: "center", fontSize: "30px", color: "#cbd5e1", fontWeight: "300" }}>=</div>

                {/* Profit/Loss Card */}
                <div style={{ width: "300px", padding: "20px", background: profitability.profit_loss >= 0 ? "#f0fdf4" : "#fff1f2", borderRadius: "8px", border: profitability.profit_loss >= 0 ? "1px solid #bbf7d0" : "1px solid #fecdd3" }}>
                    <div style={{ fontSize: "14px", color: profitability.profit_loss >= 0 ? "#166534" : "#e11d48", textTransform: "uppercase", fontWeight: "600", marginBottom: "10px" }}>Profit/Loss</div>
                    <div style={{ fontSize: "28px", color: profitability.profit_loss >= 0 ? "#166534" : "#e11d48", fontWeight: "bold", marginBottom: "5px" }}>
                        {profitability.profit_loss >= 0 ? "₹" : "-₹"}{Math.abs(profitability.profit_loss).toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Timesheet Stats */}
            <div style={{ marginTop: "40px", padding: "25px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <h4 style={{ margin: "0 0 20px 0", color: "#334155" }}>Timesheet Insights</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "20px" }}>
                <div>
                  <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "5px" }}>Billable Hours</div>
                  <div style={{ fontSize: "18px", color: "#1e293b", fontWeight: "600" }}>{profitability.total_billable_hours}</div>
                </div>
                <div>
                  <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "5px" }}>Non-Billable Hours</div>
                  <div style={{ fontSize: "18px", color: "#1e293b", fontWeight: "600" }}>{profitability.total_non_billable_hours}</div>
                </div>
                <div>
                  <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "5px" }}>Invoiced Time</div>
                  <div style={{ fontSize: "18px", color: "#166534", fontWeight: "600" }}>₹{profitability.total_invoiced_timesheet_amount?.toFixed(2) || '0.00'}</div>
                </div>
                <div>
                  <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "5px" }}>Unbilled Time</div>
                  <div style={{ fontSize: "18px", color: "#d97706", fontWeight: "600" }}>₹{profitability.unbilled_timesheet_amount?.toFixed(2) || '0.00'}</div>
                </div>
              </div>
            </div>
            
            <div style={{ textAlign: "center", marginTop: "40px", color: "#64748b", fontSize: "14px" }}>
                * Profitability is calculated based on issued invoices and logged expenses. Unbilled time is not yet included in Total Income.
            </div>
        </div>
      )}

    </div>
  );
}

const secondaryBtn = { padding: "8px 16px", background: "#f8fafc", color: "#334155", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontWeight: "500", fontSize: "14px" };
const primaryBtnSmall = { padding: "8px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500", fontSize: "13px" };

export default ProjectDetail;
