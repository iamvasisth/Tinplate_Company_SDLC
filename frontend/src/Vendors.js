import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { TableSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";
import VendorDetail from "./VendorDetail";

function Vendors() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const res = await apiRequest("/vendors");
      setVendors(res?.vendors || []);
    } catch (err) {
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  const deleteVendor = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this vendor?")) return;
    try {
      await apiRequest(`/vendors/${id}`, { method: "DELETE" });
      setVendors(vendors.filter((v) => v.id !== id));
      if (selectedVendor && selectedVendor.id === id) setSelectedVendor(null);
      toast.success("Vendor deleted");
    } catch (err) {
      toast.error("Failed to delete vendor");
    }
  };

  const filteredVendors = vendors.filter((v) => {
    const matchSearch =
      (v.display_name && v.display_name.toLowerCase().includes(search.toLowerCase())) ||
      (v.company_name && v.company_name.toLowerCase().includes(search.toLowerCase())) ||
      (v.email && v.email.toLowerCase().includes(search.toLowerCase()));
    
    if (filter === "all") return matchSearch;
    if (filter === "active") return matchSearch && v.is_active !== false;
    if (filter === "inactive") return matchSearch && v.is_active === false;
    if (filter === "crm") return matchSearch;
    if (filter === "duplicate") return false;
    return matchSearch;
  });

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
            .print-reset-wrapper {
              position: relative !important;
              height: auto !important;
              overflow: visible !important;
              display: block !important;
              top: auto !important;
              left: auto !important;
              right: auto !important;
              bottom: auto !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}
      </style>
      {/* Content */}
      <div className="print-reset-content" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left Side: Table / List */}
        <div className="no-print" style={{ flex: selectedVendor ? "0 0 350px" : 1, display: "flex", flexDirection: "column", overflow: "hidden", borderRight: selectedVendor ? "1px solid #e5e7eb" : "none", transition: "flex 0.2s", background: "#fff" }}>
          
          {/* Header for Left Side */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: selectedVendor ? "10px 15px" : "15px 25px", borderBottom: "1px solid #e5e7eb", background: '#fff' }}>
            <div style={{ position: "relative" }}>
              <div 
                style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", padding: "6px 10px", borderRadius: "6px", background: dropdownOpen ? "#f1f5f9" : "transparent" }}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <h2 style={{ fontSize: selectedVendor ? "14px" : "20px", fontWeight: selectedVendor ? "600" : "500", color: "#111827", margin: 0 }}>
                  {filter === "all" ? "All Vendors" : 
                   filter === "active" ? "Active Vendors" : 
                   filter === "inactive" ? "Inactive Vendors" : 
                   filter === "crm" ? "CRM Vendors" :
                   filter === "duplicate" ? "Duplicate Vendors" : "All Vendors"}
                </h2>
                <span style={{ color: "#3b82f6", fontSize: selectedVendor ? "14px" : "16px", marginTop: "2px" }}>{dropdownOpen ? '▲' : '▼'}</span>
              </div>

              {dropdownOpen && (
                <div style={{ position: "absolute", top: "100%", left: 0, marginTop: "4px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)", width: "240px", zIndex: 50 }}>
                  <div style={{ padding: "8px 0" }}>
                    {["all", "active", "crm", "duplicate", "inactive"].map(f => (
                      <div key={f} onClick={() => { setFilter(f); setDropdownOpen(false); }} style={{ padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", color: "#334155", fontSize: "14px" }} onMouseOver={e => e.currentTarget.style.background = "#f8fafc"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                        <span>{f === "all" ? "All Vendors" : f === "active" ? "Active Vendors" : f === "crm" ? "CRM Vendors" : f === "duplicate" ? "Duplicate Vendors" : "Inactive Vendors"}</span>
                        <span style={{ color: "#cbd5e1" }}>☆</span>
                      </div>
                    ))}
                    <div style={{ height: "1px", background: "#e2e8f0", margin: "4px 0" }}></div>
                    <div onClick={() => setDropdownOpen(false)} style={{ padding: "12px 16px", cursor: "pointer", color: "#3b82f6", display: "flex", alignItems: "center", gap: "10px", fontSize: "14px" }} onMouseOver={e => e.currentTarget.style.background = "#f8fafc"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                      <div style={{ background: "#3b82f6", color: "#fff", borderRadius: "50%", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "bold" }}>+</div>
                      <span>New Custom View</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: selectedVendor ? "5px" : "10px", alignItems: "center" }}>
              {selectedVendor ? (
                <>
                  <button onClick={() => navigate("/vendors/new")} style={{ background: "#3b82f6", color: "#fff", border: "none", width: "24px", height: "24px", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "16px", fontWeight: "400" }}>+</span>
                  </button>
                  <button style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", width: "24px", height: "24px", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => navigate("/vendors/new")} style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "4px", fontSize: "13px", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
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
              <div style={{ padding: "25px" }}><TableSkeleton columns={6} rows={5} /></div>
            ) : filteredVendors.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px", color: "gray" }}>
                <p>No vendors found.</p>
                <button onClick={() => navigate("/vendors/new")} style={{ padding: "10px 20px", background: "#f1f5f9", color: "#333", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer" }}>Add Your First Vendor</button>
              </div>
            ) : selectedVendor ? (
              <div>
                {filteredVendors.map(vendor => (
                  <div 
                    key={vendor.id} 
                    onClick={() => setSelectedVendor(vendor)}
                    style={{ padding: "12px 15px", borderBottom: "1px solid #e5e7eb", display: "flex", gap: "12px", cursor: "pointer", background: selectedVendor.id === vendor.id ? "#f9fafb" : "#fff", transition: "background 0.2s" }}
                    onMouseOver={e => { if (selectedVendor?.id !== vendor.id) e.currentTarget.style.background = '#f9fafb' }} 
                    onMouseOut={e => { if (selectedVendor?.id !== vendor.id) e.currentTarget.style.background = '#fff' }}
                  >
                    <div style={{ paddingTop: "2px" }}>
                      <input type="checkbox" style={{ accentColor: "#3b82f6", cursor: "pointer", width: "13px", height: "13px", border: "1px solid #d1d5db", borderRadius: "3px" }} onClick={(e) => e.stopPropagation()} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                         <div style={{ color: "#111827", fontSize: "13px", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{vendor.display_name}</div>
                         <div style={{ color: "#111827", fontSize: "13px", fontWeight: "500" }}>₹{Number(vendor.opening_balance || 0).toFixed(2)}</div>
                       </div>
                       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                         <div style={{ color: "#6b7280", fontSize: "11px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                           {vendor.company_name || vendor.email || "—"}
                         </div>
                         <div style={{ color: vendor.is_active !== false ? "#16a34a" : "#ef4444", fontSize: "10px", fontWeight: "500" }}>
                           {vendor.is_active !== false ? "ACTIVE" : "INACTIVE"}
                         </div>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ minWidth: "800px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", color: "#111827", background: "#fff" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ padding: "12px 16px", width: "30px" }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: "#3b82f6", cursor: "pointer", fontSize: "14px" }}>⧬</span>
                          <input type="checkbox" style={{ accentColor: "#3b82f6", cursor: "pointer", width: "14px", height: "14px", border: "1px solid #d1d5db", borderRadius: "3px" }} />
                        </div>
                      </th>
                      <th style={{ padding: "12px 10px", fontWeight: "600", color: "#6b7280", fontSize: "11px", whiteSpace: "nowrap" }}>NAME <span style={{fontSize: "10px"}}>↕</span></th>
                      <th style={{ padding: "12px 10px", fontWeight: "600", color: "#6b7280", fontSize: "11px", whiteSpace: "nowrap" }}>COMPANY NAME</th>
                      <th style={{ padding: "12px 10px", fontWeight: "600", color: "#6b7280", fontSize: "11px", whiteSpace: "nowrap" }}>EMAIL</th>
                      <th style={{ padding: "12px 10px", fontWeight: "600", color: "#6b7280", fontSize: "11px", whiteSpace: "nowrap" }}>WORK PHONE</th>
                      <th style={{ padding: "12px 10px", fontWeight: "600", color: "#6b7280", fontSize: "11px", whiteSpace: "nowrap", textAlign: "right" }}>PAYABLES (BCY)</th>
                      <th style={{ padding: "12px 10px", fontWeight: "600", color: "#6b7280", fontSize: "11px", whiteSpace: "nowrap", textAlign: "right" }}>UNUSED CREDITS</th>
                      <th style={{ padding: "12px 16px", width: "40px", textAlign: "center" }}>🔍</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVendors.map((vendor) => (
                      <tr
                        key={vendor.id}
                        onClick={() => setSelectedVendor(vendor)}
                        style={{ borderBottom: "1px solid #e2e8f0", cursor: "pointer", transition: "background 0.2s" }}
                        onMouseOver={(e) => { if (selectedVendor?.id !== vendor.id) e.currentTarget.style.background = "#f8fafc" }}
                        onMouseOut={(e) => { if (selectedVendor?.id !== vendor.id) e.currentTarget.style.background = "transparent" }}
                      >
                        <td style={{ padding: "12px 16px", paddingLeft: "34px" }} onClick={e => e.stopPropagation()}>
                          <input type="checkbox" style={{ accentColor: "#3b82f6", cursor: "pointer", width: "14px", height: "14px", border: "1px solid #d1d5db", borderRadius: "3px" }} />
                        </td>
                        <td style={{ padding: "12px 10px", color: "#3b82f6" }}>{vendor.display_name}</td>
                        <td style={{ padding: "12px 10px", color: "#334155" }}>{vendor.company_name || "—"}</td>
                        <td style={{ padding: "12px 10px", color: "#64748b" }}>{vendor.email || "—"}</td>
                        <td style={{ padding: "12px 10px", color: "#334155" }}>{vendor.work_phone || vendor.phone || vendor.mobile || "—"}</td>
                        <td style={{ padding: "12px 10px", textAlign: "right", color: "#334155" }}>₹{Number(vendor.opening_balance || 0).toFixed(2)}</td>
                        <td style={{ padding: "12px 10px", textAlign: "right", color: "#334155" }}>₹0.00</td>
                        <td style={{ padding: "12px 16px" }}></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="print-reset-panel" style={{ 
          width: selectedVendor ? "calc(100% - 350px)" : "0px",
          opacity: selectedVendor ? 1 : 0,
          transition: "all 0.3s ease-in-out",
          background: "#fff", 
          display: "flex", 
          flexDirection: "column", 
          overflow: "hidden",
          borderLeft: selectedVendor ? "1px solid #e5e7eb" : "none",
          position: "relative"
        }}>
          {selectedVendor && (
             <div className="print-reset-wrapper" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
                <VendorDetail 
                  inlineVendorId={selectedVendor.id} 
                  onClose={(deleted) => {
                    setSelectedVendor(null);
                    if (deleted) fetchVendors();
                  }} 
                />
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Vendors;
