import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { TableSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

const filterDisplayNames = {
  "All": "All Expenses",
  "Unbilled": "Unbilled Expenses",
  "Invoiced": "Invoiced Expenses",
  "Reimbursed": "Reimbursed Expenses",
  "Billable": "Billable Expenses",
  "Non-Billable": "Non-Billable Expenses",
  "With Receipts": "With Receipts",
  "Without Receipts": "Without Receipts"
};

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const navigate = useNavigate();
  const journalRef = useRef(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filterType, setFilterType] = useState("All");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  useEffect(() => {
    if (!showDropdown && !showFilterDropdown) return;
    const closeDropdowns = () => {
      setShowDropdown(false);
      setShowFilterDropdown(false);
    };
    document.addEventListener("click", closeDropdowns);
    return () => document.removeEventListener("click", closeDropdowns);
  }, [showDropdown, showFilterDropdown]);

  const filteredExpenses = expenses.filter(exp => {
    switch (filterType) {
      case "All":
        return true;
      case "Unbilled":
        // Treat as unbilled if billable is true and status is not invoiced
        return exp.billable && exp.status !== "invoiced";
      case "Invoiced":
        return exp.status === "invoiced";
      case "Reimbursed":
        return exp.status === "reimbursed";
      case "Billable":
        return exp.billable;
      case "Non-Billable":
        return !exp.billable;
      case "With Receipts":
        return !!exp.attachment_url;
      case "Without Receipts":
        return !exp.attachment_url;
      default:
        return true;
    }
  });

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await apiRequest("/expenses");
      setExpenses(res?.expenses || []);
    } catch (err) { toast.error("Failed to load expenses"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  useEffect(() => {
    const fetchVendorsAndProjects = async () => {
      try {
        const [venRes, projRes] = await Promise.all([
          apiRequest("/vendors"),
          apiRequest("/projects")
        ]);
        setVendors(venRes?.vendors || []);
        setProjects(projRes?.projects || []);
      } catch (err) { /* ignore */ }
    };
    fetchVendorsAndProjects();
  }, []);


  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    try {
      await apiRequest(`/expenses/${id}`, { method: "DELETE" });
      toast.success("Deleted");
      if (selectedExpense?.id === id) {
        setSelectedExpense(null);
      }
      fetchExpenses();
    } catch (err) { toast.error("Delete failed"); }
  };

  return (
    <div className="print-reset-container" style={{ padding: "0", display: "flex", flexDirection: "column", height: "calc(100vh - 64px)", background: "#fff" }}>
      <style>
        {`
          @media print {
            .print-reset-container {
              height: auto !important;
              overflow: visible !important;
              display: block !important;
            }
            .print-reset-content {
              height: auto !important;
              overflow: visible !important;
              display: block !important;
            }
            .print-reset-panel {
              width: 100% !important;
              opacity: 1 !important;
              position: relative !important;
              display: block !important;
              overflow: visible !important;
              border: none !important;
            }
            .print-reset {
              height: auto !important;
              overflow: visible !important;
              display: block !important;
              padding: 0 !important;
              width: 100% !important;
            }
            .print-category-reset {
              background: none !important;
              color: #111827 !important;
              padding: 0 !important;
              font-size: 24px !important;
              font-weight: 500 !important;
              margin-bottom: 25px !important;
              display: block !important;
            }
            .no-print, .sidebar, .topbar {
              display: none !important;
            }
          }
        `}
      </style>
      {/* Content */}
      <div className="print-reset-content" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left Side: Table */}
        <div className="no-print" style={{ flex: selectedExpense ? "0 0 350px" : 1, display: "flex", flexDirection: "column", overflow: "hidden", borderRight: selectedExpense ? "1px solid #e5e7eb" : "none", transition: "flex 0.2s", background: "#fff" }}>
          
          {/* Header for Left Side */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: selectedExpense ? "10px 15px" : "15px 25px", borderBottom: "1px solid #e5e7eb", background: '#fff', position: 'relative' }}>
            <h2 
              onClick={(e) => { e.stopPropagation(); setShowFilterDropdown(!showFilterDropdown); }} 
              style={{ fontSize: selectedExpense ? "14px" : "20px", fontWeight: selectedExpense ? "600" : "500", color: "#111827", margin: 0, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
            >
              {filterDisplayNames[filterType] || "All Expenses"} <span style={{ color: "#2563eb", fontSize: selectedExpense ? "14px" : "16px" }}>&#9662;</span>
            </h2>
            {showFilterDropdown && (
              <div style={{
                position: 'absolute',
                left: selectedExpense ? '15px' : '25px',
                top: selectedExpense ? '45px' : '55px',
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                width: '240px',
                zIndex: 200,
                padding: '6px 0'
              }}>
                {Object.keys(filterDisplayNames).map((key) => (
                  <div 
                    key={key}
                    onClick={() => {
                      setFilterType(key);
                      setShowFilterDropdown(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 16px',
                      fontSize: '13px',
                      color: '#374151',
                      cursor: 'pointer',
                      background: filterType === key ? '#f3f4f6' : 'transparent',
                      fontWeight: filterType === key ? '500' : '400',
                      transition: 'background-color 0.1s'
                    }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                    onMouseOut={e => {
                      if (filterType !== key) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <span>{key}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer' }}>
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #e5e7eb', margin: '6px 0' }} />
                <div 
                  onClick={() => {
                    setShowFilterDropdown(false);
                    toast.success("Custom view creation coming soon!");
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    fontSize: '13px',
                    color: '#2563eb',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                  </svg>
                  New Custom View
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: selectedExpense ? "5px" : "10px", alignItems: "center" }}>
              { selectedExpense ? (
                <>
                  <button onClick={() => navigate("/expenses/new")} style={{ background: "#3b82f6", color: "#fff", border: "none", width: "24px", height: "24px", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "16px", fontWeight: "400" }}>+</span>
                  </button>
                  <button style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", width: "24px", height: "24px", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => navigate("/expenses/new")} style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "4px", fontSize: "13px", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ fontSize: "16px", fontWeight: "400" }}>+</span> New
                  </button>
                  <button style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", padding: "6px 10px", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflow: "auto" }}>
          {loading ? (
            <div style={{ padding: "25px" }}><TableSkeleton columns={8} rows={5} /></div>
          ) : filteredExpenses.length === 0 ? (
            <div style={{ padding: "25px", textAlign: "center", color: "#6b7280" }}>
              {expenses.length === 0 ? "No expenses yet." : "No expenses match this filter."}
            </div>
          ) : selectedExpense ? (
              <div>
                {filteredExpenses.map(exp => {
                  const d = new Date(exp.expense_date);
                  const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                  
                  return (
                    <div 
                      key={exp.id} 
                      onClick={() => setSelectedExpense(exp)}
                      style={{ padding: "12px 15px", borderBottom: "1px solid #e5e7eb", display: "flex", gap: "12px", cursor: "pointer", background: selectedExpense.id === exp.id ? "#f9fafb" : "#fff", transition: "background 0.2s" }}
                      onMouseOver={e => { if (selectedExpense?.id !== exp.id) e.currentTarget.style.background = '#f9fafb' }} 
                      onMouseOut={e => { if (selectedExpense?.id !== exp.id) e.currentTarget.style.background = '#fff' }}
                    >
                      <div style={{ paddingTop: "2px" }}>
                        <input type="checkbox" style={{ accentColor: "#3b82f6", cursor: "pointer", width: "13px", height: "13px", border: "1px solid #d1d5db", borderRadius: "3px" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                           <div style={{ color: "#111827", fontSize: "13px", fontWeight: "400", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exp.category}</div>
                           <div style={{ color: "#111827", fontSize: "13px", fontWeight: "500" }}>₹{parseFloat(exp.amount).toFixed(2)}</div>
                         </div>
                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                           <div style={{ color: "#6b7280", fontSize: "11px" }}>
                             {formattedDate} <span style={{ color: "#d1d5db", margin: "0 4px" }}>•</span> <span style={{ color: "#9ca3af" }}>{exp.vendor_name || "—"}</span>
                           </div>
                           { exp.billable && (
                             <div style={{ color: "#9ca3af", fontSize: "10px", fontWeight: "500" }}>UNBILLED</div>
                           )}
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ minWidth: "800px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", color: "#111827" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ padding: "12px 10px 12px 25px", width: "30px" }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer' }}><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>
                          <input type="checkbox" style={{ accentColor: "#3b82f6", cursor: "pointer", width: "14px", height: "14px", border: "1px solid #d1d5db", borderRadius: "3px" }} />
                        </div>
                      </th>
                      <th style={{ padding: "12px 10px", fontWeight: "600", color: "#6b7280", fontSize: "11px", whiteSpace: "nowrap" }}>DATE</th>
                      <th style={{ padding: "12px 10px", fontWeight: "600", color: "#6b7280", fontSize: "11px", whiteSpace: "nowrap" }}>EXPENSE ACCOUNT</th>
                      <th style={{ padding: "12px 10px", fontWeight: "600", color: "#6b7280", fontSize: "11px", whiteSpace: "nowrap" }}>REFERENCE#</th>
                      <th style={{ padding: "12px 10px", fontWeight: "600", color: "#6b7280", fontSize: "11px", whiteSpace: "nowrap" }}>VENDOR NAME</th>
                      <th style={{ padding: "12px 10px", fontWeight: "600", color: "#6b7280", fontSize: "11px", whiteSpace: "nowrap" }}>PAID THROUGH</th>
                      <th style={{ padding: "12px 10px", fontWeight: "600", color: "#6b7280", fontSize: "11px", whiteSpace: "nowrap" }}>CUSTOMER NAME</th>
                      <th style={{ padding: "12px 10px", fontWeight: "600", color: "#6b7280", fontSize: "11px", whiteSpace: "nowrap" }}>STATUS</th>
                      <th style={{ padding: "12px 10px", fontWeight: "600", color: "#6b7280", fontSize: "11px", whiteSpace: "nowrap" }}>AMOUNT</th>
                      <th style={{ padding: "12px 25px 12px 10px", width: "30px", textAlign: "right" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map(exp => {
                      const d = new Date(exp.expense_date);
                      const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

                      return (
                        <tr 
                          key={exp.id} 
                          onClick={() => setSelectedExpense(exp)}
                          style={{ borderBottom: "1px solid #e5e7eb", background: selectedExpense?.id === exp.id ? "#f1f5f9" : "#fff", cursor: "pointer", transition: "background 0.2s" }} 
                          onMouseOver={e => { if (selectedExpense?.id !== exp.id) e.currentTarget.style.background = '#f9fafb' }} 
                          onMouseOut={e => { if (selectedExpense?.id !== exp.id) e.currentTarget.style.background = '#fff' }}
                        >
                          <td style={{ padding: "12px 10px 12px 25px" }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                               <div style={{ width: '14px' }}></div> {/* Spacer to align checkbox */}
                               <input type="checkbox" style={{ accentColor: "#3b82f6", cursor: "pointer", width: "14px", height: "14px", border: "1px solid #d1d5db", borderRadius: "3px" }} />
                            </div>
                          </td>
                          <td style={{ padding: "12px 10px", whiteSpace: "nowrap" }}>{formattedDate}</td>
                          <td style={{ padding: "12px 10px", color: "#2563eb", cursor: "pointer" }}>{exp.category}</td>
                          <td style={{ padding: "12px 10px" }}>{exp.reference || ""}</td>
                          <td style={{ padding: "12px 10px" }}>{exp.vendor_name || "—"}</td>
                          <td style={{ padding: "12px 10px" }}>{exp.paid_through || "Petty Cash"}</td>
                          <td style={{ padding: "12px 10px" }}>{exp.customer_name || "—"}</td>
                          <td style={{ padding: "12px 10px", color: "#6b7280", fontSize: "12px" }}>
                            {exp.billable ? 'UNBILLED' : 'NON-BILLABLE'}
                          </td>
                          <td style={{ padding: "12px 10px" }}>₹{parseFloat(exp.amount).toFixed(2)}</td>
                          <td style={{ padding: "12px 25px 12px 10px", textAlign: "right" }}></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      </div>

        {/* Right Side: Details Panel */}
        {selectedExpense && (
          <div className="print-reset-panel" style={{ flex: 1, background: "#fff", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Top Bar */}
            <div style={{ padding: '15px 25px', background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '500', color: '#111827', margin: 0 }}>Expense Details</h2>
              <div className="no-print" style={{ display: 'flex', gap: '10px' }}>
                <button style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '6px', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                </button>
                <button onClick={() => setSelectedExpense(null)} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '6px', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </div>
            
            {/* Actions Bar */}
            <div className="no-print" style={{ padding: '10px 25px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '15px', color: '#4b5563', fontSize: '13px' }}>
              <span onClick={() => navigate(`/expenses/${selectedExpense.id}/edit`)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> Edit
              </span>
              <span onClick={() => window.print()} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg> Print
              </span>
              <div className="no-print" style={{ position: 'relative' }}>
                <span 
                  onClick={(e) => { e.stopPropagation(); setShowDropdown(!showDropdown); }} 
                  style={{ 
                    cursor: 'pointer', 
                    color: '#374151', 
                    fontSize: '16px', 
                    fontWeight: 'bold', 
                    padding: '4px 10px', 
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    userSelect: 'none',
                    height: '28px',
                    boxSizing: 'border-box'
                  }}
                >
                  •••
                </span>
                {showDropdown && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '32px',
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                    width: '160px',
                    zIndex: 100,
                    padding: '4px 0'
                  }}>
                    <div 
                      onClick={() => {
                        setShowDropdown(false);
                        navigate("/expenses/new", { state: { cloneFrom: selectedExpense } });
                      }}
                      style={dropdownItemStyle}
                      onMouseOver={e => {
                        e.currentTarget.style.backgroundColor = '#3b82f6';
                        e.currentTarget.style.color = '#fff';
                        const svg = e.currentTarget.querySelector('svg');
                        if (svg) svg.style.stroke = '#fff';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#374151';
                        const svg = e.currentTarget.querySelector('svg');
                        if (svg) svg.style.stroke = '#3b82f6';
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px', transition: 'stroke 0.1s' }}>
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        <path d="M12 13h5m-2-2l2 2-2 2"></path>
                      </svg>
                      Clone
                    </div>
                    <div 
                      onClick={() => {
                        setShowDropdown(false);
                        handleDelete(selectedExpense.id);
                      }}
                      style={dropdownItemStyle}
                      onMouseOver={e => {
                        e.currentTarget.style.backgroundColor = '#3b82f6';
                        e.currentTarget.style.color = '#fff';
                        const svg = e.currentTarget.querySelector('svg');
                        if (svg) svg.style.stroke = '#fff';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#374151';
                        const svg = e.currentTarget.querySelector('svg');
                        if (svg) svg.style.stroke = '#3b82f6';
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px', transition: 'stroke 0.1s' }}>
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                      Delete
                    </div>
                    <div 
                      onClick={() => {
                        setShowDropdown(false);
                        journalRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      style={dropdownItemStyle}
                      onMouseOver={e => {
                        e.currentTarget.style.backgroundColor = '#3b82f6';
                        e.currentTarget.style.color = '#fff';
                        const svg = e.currentTarget.querySelector('svg');
                        if (svg) svg.style.stroke = '#fff';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#374151';
                        const svg = e.currentTarget.querySelector('svg');
                        if (svg) svg.style.stroke = '#3b82f6';
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px', transition: 'stroke 0.1s' }}>
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                        <circle cx="9" cy="8" r="1.5"></circle>
                        <circle cx="9" cy="13" r="1.5"></circle>
                      </svg>
                      View Journal
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Body */}
            <div className="print-reset" style={{ padding: '30px', flex: 1, overflow: 'auto', background: '#fff' }}>
              <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 300px' }}>
                  <p style={{ color: '#6b7280', fontSize: '12px', margin: '0 0 5px 0' }}>Expense Amount</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                    <h1 style={{ color: '#ef4444', fontSize: '24px', fontWeight: '400', margin: 0 }}>₹{parseFloat(selectedExpense.amount).toFixed(2)}</h1>
                    <span style={{ color: '#6b7280', fontSize: '12px' }}>
                      on {`${String(new Date(selectedExpense.expense_date).getDate()).padStart(2, '0')}/${String(new Date(selectedExpense.expense_date).getMonth() + 1).padStart(2, '0')}/${new Date(selectedExpense.expense_date).getFullYear()}`}
                    </span>
                  </div>
                  <p style={{ color: '#6b7280', fontSize: '12px', fontWeight: '500', margin: '0 0 25px 0' }}>{selectedExpense.billable ? 'UNBILLED' : 'NON-BILLABLE'}</p>
                  
                  <div className="print-category-reset" style={{ display: 'inline-block', background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', marginBottom: '35px' }}>
                    {selectedExpense.category}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '20px', fontSize: '13px', color: '#374151' }}>
                    <div>
                      <div style={{ color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}>Paid Through</div>
                      <div>{selectedExpense.paid_through || "Petty Cash"}</div>
                    </div>
                    <div></div>

                    <div>
                      <div style={{ color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}>Customer</div>
                      <div style={{ color: '#2563eb' }}>{selectedExpense.customer_name || "Elanova"}</div>
                    </div>
                    <div></div>

                    <div>
                      <div style={{ color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}>Paid To</div>
                      <div style={{ color: '#2563eb' }}>{selectedExpense.vendor_name || "utsarg tiwary"}</div>
                    </div>
                    <div></div>
                  </div>
                </div>
                
                {/* Right Box (Receipt Upload) */}
                <div className="no-print" style={{ width: '250px' }}>
                   <div style={{ border: '1px dashed #d1d5db', borderRadius: '8px', padding: '40px 20px', textAlign: 'center' }}>
                      <div style={{ width: '50px', height: '50px', background: '#1e3a8a', borderRadius: '12px', margin: '0 auto 15px auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                      </div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '500', color: '#111827' }}>Drag or Drop your Receipts</h4>
                      <p style={{ margin: '0 0 20px 0', fontSize: '11px', color: '#6b7280' }}>Maximum file size allowed is 10MB</p>
                      <button style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', padding: '8px 12px', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', cursor: 'pointer', fontWeight: '500' }}>
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                         Upload your Files
                      </button>
                   </div>
                </div>
              </div>
              
              {/* Journal Table */}
              <div className="no-print" ref={journalRef} style={{ marginTop: '50px' }}>
                <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '20px' }}>
                  <div style={{ borderBottom: '2px solid #111827', display: 'inline-block', paddingBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#111827' }}>Journal</div>
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  Amount is displayed in your base currency <span style={{ background: '#16a34a', color: '#fff', padding: '1px 4px', borderRadius: '2px', fontSize: '10px', fontWeight: '600' }}>INR</span>
                </p>
                <h3 style={{ fontSize: '16px', fontWeight: '500', margin: '0 0 15px 0', color: '#111827' }}>Expense</h3>
                
                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', color: '#374151' }}>
                  <thead>
                    <tr style={{ color: '#6b7280', fontSize: '11px', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: '600' }}>ACCOUNT</th>
                      <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: '600' }}>DEBIT</th>
                      <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: '600' }}>CREDIT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '10px 0' }}>{selectedExpense.category}</td>
                      <td style={{ textAlign: 'right', padding: '10px 0' }}>{parseFloat(selectedExpense.amount).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '10px 0' }}>0.00</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 0' }}>{selectedExpense.paid_through || "Petty Cash"}</td>
                      <td style={{ textAlign: 'right', padding: '10px 0' }}>0.00</td>
                      <td style={{ textAlign: 'right', padding: '10px 0' }}>{parseFloat(selectedExpense.amount).toFixed(2)}</td>
                    </tr>
                    <tr style={{ fontWeight: '600', borderTop: '1px solid #e5e7eb', color: '#111827' }}>
                      <td style={{ padding: '12px 0' }}></td>
                      <td style={{ textAlign: 'right', padding: '12px 0' }}>{parseFloat(selectedExpense.amount).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '12px 0' }}>{parseFloat(selectedExpense.amount).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const dropdownItemStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '8px 16px',
  fontSize: '13px',
  color: '#374151',
  cursor: 'pointer',
  transition: 'background-color 0.1s, color 0.1s',
  userSelect: 'none'
};

export default Expenses;