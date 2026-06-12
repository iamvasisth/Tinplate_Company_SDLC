/**
 * PurchaseOrders.js – Purchase Order list with split-panel layout (Expense-style split screen)
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiRequest } from "./api";
import { TableSkeleton, DetailSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

const ORG_NAME = "Tinplate Computer Training Center";
const ORG_ADDRESS = "2nd Floor, Thakur Pyara Singh Road, Jamshedpur – 831001";
const ORG_EMAIL = "kumarrahulraj468@gmail.com";
const ORG_COUNTRY = "India";

const STATUS_COLORS = {
  Draft:     { bg: "#e2e3e5", color: "#383d41" },
  Issued:    { bg: "#d4edda", color: "#155724" },
  Billed:    { bg: "#d1ecf1", color: "#0c5460" },
  Cancelled: { bg: "#f8d7da", color: "#721c24" },
};

function PurchaseOrders() {
  const navigate = useNavigate();
  const location = useLocation();

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Split view state
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedPOItems, setSelectedPOItems] = useState([]);
  const [selectedPOLoading, setSelectedPOLoading] = useState(false);
  const [selectedPOVendor, setSelectedPOVendor] = useState(null);
  const [selectedPOCustomer, setSelectedPOCustomer] = useState(null);
  const [selectedPOSalesperson, setSelectedPOSalesperson] = useState(null);
  const [selectedPOProject, setSelectedPOProject] = useState(null);

  // Email modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailTo, setEmailTo] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Dropdown menu state in details panel
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [poRes, vendorsRes] = await Promise.all([
        apiRequest("/purchase-orders"),
        apiRequest("/vendors"),
      ]);
      setPurchaseOrders(Array.isArray(poRes?.purchase_orders) ? poRes.purchase_orders : []);
      setVendors(Array.isArray(vendorsRes?.vendors) ? vendorsRes.vendors : []);
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, location.state?.refresh]);

  const getVendorName = (vendorId) => {
    if (!vendorId) return "—";
    const vend = vendors.find(v => v.id === vendorId);
    return vend ? vend.display_name || vend.company_name || vend.email : "—";
  };

  const getVendorById = (vendorId) => vendors.find(v => v.id === vendorId) || {};

  const handleSelectPO = async (po) => {
    if (selectedPO && selectedPO.id === po.id) {
      setSelectedPO(null);
      setSelectedPOItems([]);
      setSelectedPOVendor(null);
      setSelectedPOCustomer(null);
      setSelectedPOSalesperson(null);
      setSelectedPOProject(null);
      return;
    }

    setSelectedPO(po);
    setSelectedPOLoading(true);
    try {
      const res = await apiRequest(`/purchase-orders/${po.id}`);
      if (res?.purchase_order) {
        setSelectedPO(res.purchase_order);
        setSelectedPOItems(res.items || []);

        if (res.purchase_order.vendor_id) {
          const vendRes = await apiRequest(`/vendors/${res.purchase_order.vendor_id}`);
          if (vendRes?.vendor) setSelectedPOVendor(vendRes.vendor);
        }
        if (res.purchase_order.customer_id) {
          const custRes = await apiRequest(`/customers/${res.purchase_order.customer_id}`);
          if (custRes?.customer) setSelectedPOCustomer(custRes.customer);
        }
        if (res.purchase_order.salesperson_id) {
          const spRes = await apiRequest(`/salespersons`);
          const foundSp = spRes?.salespersons?.find(s => String(s.id) === String(res.purchase_order.salesperson_id));
          if (foundSp) setSelectedPOSalesperson(foundSp);
        }
        if (res.purchase_order.project_id) {
          const projRes = await apiRequest(`/projects`);
          const foundProj = projRes?.projects?.find(p => String(p.id) === String(res.purchase_order.project_id));
          if (foundProj) setSelectedPOProject(foundProj);
        }
      }
    } catch (err) {
      toast.error("Failed to load details");
      setSelectedPO(null);
    } finally {
      setSelectedPOLoading(false);
    }
  };

  const changeStatus = async (poId, newStatus) => {
    try {
      await apiRequest(`/purchase-orders/${poId}`, { method: "PUT", body: JSON.stringify({ status: newStatus }) });
      toast.success(`Marked as ${newStatus}`);
      setPurchaseOrders(prev => prev.map(p => p.id === poId ? { ...p, status: newStatus } : p));
      if (selectedPO?.id === poId) {
        setSelectedPO(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (poId) => {
    if (!window.confirm("Delete this purchase order?")) return;
    try {
      await apiRequest(`/purchase-orders/${poId}`, { method: "DELETE" });
      toast.success("Purchase Order deleted");
      setSelectedPO(null);
      setSelectedPOItems([]);
      fetchData();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const handleConvertToBill = async (poId) => {
    if (!window.confirm("Convert this Purchase Order to a Bill?")) return;
    try {
      const res = await apiRequest(`/purchase-orders/${poId}/convert-to-bill`, { method: "POST" });
      if (res?.alreadyConverted) {
        toast("Already converted. Opening existing bill.", { icon: "ℹ️" });
        navigate(`/bills/${res.billId}`);
        return;
      }
      toast.success("Purchase Order converted to Bill!");
      setPurchaseOrders(prev => prev.map(p => p.id === poId ? { ...p, status: "Billed" } : p));
      if (selectedPO?.id === poId) {
        setSelectedPO(prev => ({ ...prev, status: "Billed" }));
      }
      navigate(`/bills/${res.billId}`);
    } catch (err) {
      toast.error("Conversion failed");
    }
  };

  const openEmailModal = (po) => {
    const vend = getVendorById(po.vendor_id);
    setEmailTo(vend.email || "");
    setEmailSubject(`Purchase Order ${po.purchase_order_number} from ${ORG_NAME}`);
    setEmailBody(`Dear ${vend.display_name || vend.company_name || "Vendor"},\n\nPlease find our Purchase Order attached.\n\nPurchase Order Number: ${po.purchase_order_number}\nTotal: ₹${parseFloat(po.total_amount).toFixed(2)}\n\nThank you.\n\nRegards,\n${ORG_NAME}`);
    setShowEmailModal(true);
  };

  const sendEmail = async () => {
    if (!emailTo) { toast.error("Recipient email is required"); return; }
    setSendingEmail(true);
    try {
      await apiRequest(`/purchase-orders/${selectedPO.id}/send`, {
        method: "POST",
        body: JSON.stringify({ to: emailTo, subject: emailSubject, body: emailBody }),
      });
      toast.success("Email sent!");
      setShowEmailModal(false);
      if (selectedPO.status === "Draft") {
        changeStatus(selectedPO.id, "Issued");
      }
    } catch (err) {
      toast.error("Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  const statusBadge = (status) => {
    const colors = STATUS_COLORS[status] || STATUS_COLORS.Draft;
    return (
      <span style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "500", background: colors.bg, color: colors.color, textTransform: "capitalize" }}>
        {status}
      </span>
    );
  };

  const filteredPOs = purchaseOrders.filter(po => {
    const matchSearch = search === "" ||
      (po.purchase_order_number || "").toLowerCase().includes(search.toLowerCase()) ||
      getVendorName(po.vendor_id).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || po.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Totals calculations for preview
  const subtotal = selectedPOItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0), 0);
  const totalDiscount = selectedPOItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const disc = parseFloat(item.discount) || 0;
    if (item.discount_type === "percent") return sum + (qty * rate * disc / 100);
    return sum + disc;
  }, 0);

  const totalCGST = selectedPOItems.reduce((sum, item) => sum + (parseFloat(item.cgst_amount) || 0), 0);
  const totalSGST = selectedPOItems.reduce((sum, item) => sum + (parseFloat(item.sgst_amount) || 0), 0);
  const totalIGST = selectedPOItems.reduce((sum, item) => sum + (parseFloat(item.igst_amount) || 0), 0);
  const totalTax = totalCGST + totalSGST + totalIGST;
  const grandTotal = subtotal - totalDiscount + totalTax;

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
              padding: 0 !important;
            }
            .printable-a4 {
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}
      </style>

      {/* Content split screen */}
      <div className="print-reset-content" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        
        {/* Left Side: PO List */}
        <div className="no-print" style={{ flex: selectedPO ? "0 0 350px" : 1, display: "flex", flexDirection: "column", overflow: "hidden", borderRight: selectedPO ? "1px solid #e5e7eb" : "none", transition: "flex 0.2s", background: "#fff" }}>
          
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: selectedPO ? "10px 15px" : "15px 25px", borderBottom: "1px solid #e5e7eb", background: '#fff' }}>
            <div style={{ position: "relative" }}>
              <div 
                style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", padding: "6px 10px", borderRadius: "6px", background: dropdownOpen ? "#f1f5f9" : "transparent" }}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <h2 style={{ fontSize: selectedPO ? "14px" : "20px", fontWeight: selectedPO ? "600" : "500", color: "#111827", margin: 0 }}>
                  {statusFilter === "all" ? "All Purchase Orders" : `${statusFilter} Purchase Orders`}
                </h2>
                <span style={{ color: "#3b82f6", fontSize: selectedPO ? "14px" : "16px", marginTop: "2px" }}>{dropdownOpen ? '▲' : '▼'}</span>
              </div>

              {dropdownOpen && (
                <div style={{ position: "absolute", top: "100%", left: 0, marginTop: "4px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)", width: "240px", zIndex: 50 }}>
                  <div style={{ padding: "8px 0" }}>
                    {["all", "Draft", "Issued", "Billed", "Cancelled"].map(f => (
                      <div key={f} onClick={() => { setStatusFilter(f); setDropdownOpen(false); }} style={{ padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", color: "#334155", fontSize: "14px" }} onMouseOver={e => e.currentTarget.style.background = "#f8fafc"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                        <span>{f === "all" ? "All Status" : f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: selectedPO ? "5px" : "10px", alignItems: "center" }}>
              <button onClick={() => navigate("/purchase-orders/new")} style={{ background: "#3b82f6", color: "#fff", border: "none", padding: selectedPO ? "6px 10px" : "8px 16px", borderRadius: "4px", fontSize: "13px", fontWeight: "500", cursor: "pointer" }}>
                {selectedPO ? "+" : "+ New"}
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ padding: selectedPO ? "10px" : "10px 25px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
            <input 
              type="text" 
              placeholder="Search by PO # or vendor..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "13px", outline: "none" }} 
            />
          </div>

          {/* PO List Body */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: "20px" }}><TableSkeleton columns={selectedPO ? 3 : 5} rows={5} /></div>
            ) : filteredPOs.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "gray", fontSize: '13px' }}>No Purchase Orders found.</div>
            ) : selectedPO ? (
              <div>
                {filteredPOs.map(po => {
                  const d = new Date(po.purchase_order_date);
                  const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                  return (
                    <div 
                      key={po.id} 
                      onClick={() => handleSelectPO(po)}
                      style={{ padding: "12px 15px", borderBottom: "1px solid #e5e7eb", cursor: "pointer", background: selectedPO.id === po.id ? "#f3f4f6" : "#fff" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "600", color: "#2563eb" }}>{po.purchase_order_number}</span>
                        <span style={{ fontSize: "13px", fontWeight: "600", color: "#111827" }}>₹{parseFloat(po.total_amount).toFixed(2)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: "#6b7280" }}>{formattedDate} • {getVendorName(po.vendor_id)}</span>
                        {statusBadge(po.status)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", color: "#111827" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ padding: "12px 20px", fontWeight: "600", color: "#6b7280", fontSize: "11px" }}>PURCHASE ORDER#</th>
                      <th style={{ padding: "12px 20px", fontWeight: "600", color: "#6b7280", fontSize: "11px" }}>DATE</th>
                      <th style={{ padding: "12px 20px", fontWeight: "600", color: "#6b7280", fontSize: "11px" }}>VENDOR</th>
                      <th style={{ padding: "12px 20px", fontWeight: "600", color: "#6b7280", fontSize: "11px" }}>STATUS</th>
                      <th style={{ padding: "12px 20px", fontWeight: "600", color: "#6b7280", fontSize: "11px", textAlign: "right" }}>AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPOs.map(po => {
                      const d = new Date(po.purchase_order_date);
                      const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                      return (
                        <tr 
                          key={po.id} 
                          onClick={() => handleSelectPO(po)}
                          style={{ borderBottom: "1px solid #e5e7eb", cursor: "pointer", transition: "background 0.2s" }} 
                          onMouseOver={e => e.currentTarget.style.background = '#f9fafb'} 
                          onMouseOut={e => e.currentTarget.style.background = '#fff'}
                        >
                          <td style={{ padding: "12px 20px", color: "#2563eb", fontWeight: "500" }}>{po.purchase_order_number}</td>
                          <td style={{ padding: "12px 20px" }}>{formattedDate}</td>
                          <td style={{ padding: "12px 20px" }}>{getVendorName(po.vendor_id)}</td>
                          <td style={{ padding: "12px 20px" }}>{statusBadge(po.status)}</td>
                          <td style={{ padding: "12px 20px", textAlign: "right", fontWeight: "500" }}>₹{parseFloat(po.total_amount).toFixed(2)}</td>
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
        {selectedPO && (
          <div className="print-reset-panel" style={{ flex: 1, background: "#f8fafc", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            
            {/* Details Top Bar */}
            <div className="no-print" style={{ padding: '15px 25px', background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '500', color: '#111827', margin: 0 }}>{selectedPO.purchase_order_number}</h2>
                {statusBadge(selectedPO.status)}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={() => navigate(`/purchase-orders/${selectedPO.id}/edit`)} style={actionBtn}>✏️ Edit</button>
                <button onClick={() => openEmailModal(selectedPO)} style={actionBtn}>✉️ Email</button>
                <button onClick={() => window.print()} style={actionBtn}>🖨️ Print</button>
                
                {selectedPO.status !== "Billed" && selectedPO.status !== "Cancelled" && (
                  <button 
                    onClick={() => handleConvertToBill(selectedPO.id)} 
                    style={{ ...actionBtn, background: '#16a34a', color: '#fff', border: 'none' }}
                  >
                    🔄 Convert to Bill
                  </button>
                )}

                {/* More Action Dropdown */}
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowMoreDropdown(!showMoreDropdown)} style={actionBtn}>⋯ More</button>
                  {showMoreDropdown && (
                    <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '5px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '150px' }}>
                      {selectedPO.status === "Draft" && (
                        <button 
                          onClick={() => { changeStatus(selectedPO.id, "Issued"); setShowMoreDropdown(false); }} 
                          style={dropdownItemStyle}
                        >
                          Mark Issued
                        </button>
                      )}
                      {selectedPO.status !== "Cancelled" && (
                        <button 
                          onClick={() => { changeStatus(selectedPO.id, "Cancelled"); setShowMoreDropdown(false); }} 
                          style={{ ...dropdownItemStyle, color: '#ef4444' }}
                        >
                          Cancel PO
                        </button>
                      )}
                      <button 
                        onClick={() => { handleDelete(selectedPO.id); setShowMoreDropdown(false); }} 
                        style={{ ...dropdownItemStyle, color: '#ef4444' }}
                      >
                        🗑️ Delete PO
                      </button>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setSelectedPO(null)} 
                  style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '6px', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </div>

            {/* Document body area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '30px' }}>
              {selectedPOLoading ? (
                <DetailSkeleton />
              ) : (
                /* High Fidelity A4 PO Container */
                <div className="printable-a4" style={{ maxWidth: "800px", margin: "0 auto", background: "#fff", padding: "40px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderRadius: "4px", border: '1px solid #e5e7eb' }}>
                  
                  {/* Status Overlay Ribbon */}
                  {selectedPO.status === "Cancelled" && (
                    <div style={{ textAlign: "center", color: "#ef4444", fontWeight: "bold", border: "2px dashed #ef4444", padding: "8px", marginBottom: "20px", textTransform: "uppercase", letterSpacing: "1px", fontSize: '13px' }}>
                      CANCELLED
                    </div>
                  )}
                  {selectedPO.status === "Billed" && (
                    <div style={{ textAlign: "center", color: "#0c5460", background: "#d1ecf1", fontWeight: "bold", padding: "8px", marginBottom: "20px", textTransform: "uppercase", letterSpacing: "1px", fontSize: '13px' }}>
                      BILLED
                    </div>
                  )}

                  {/* Header Row */}
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #334155", paddingBottom: "15px", marginBottom: "25px" }}>
                    <div>
                      <h1 style={{ margin: "0 0 5px 0", color: "#111827", fontSize: "24px", fontWeight: '700' }}>PURCHASE ORDER</h1>
                      <div style={{ fontSize: "13px", color: "#4b5563" }}>
                        <strong># {selectedPO.purchase_order_number}</strong><br />
                        Date: {new Date(selectedPO.purchase_order_date).toLocaleDateString()}<br />
                        {selectedPO.expected_delivery_date && <>Expected Delivery: {new Date(selectedPO.expected_delivery_date).toLocaleDateString()}<br /></>}
                        {selectedPO.reference_number && <>Ref: {selectedPO.reference_number}</>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: "13px", color: "#4b5563" }}>
                      <h2 style={{ margin: "0 0 5px 0", color: "#111827", fontSize: "16px", fontWeight: '600' }}>{ORG_NAME}</h2>
                      <div>{ORG_ADDRESS}</div>
                      <div>{ORG_COUNTRY}</div>
                      <div>{ORG_EMAIL}</div>
                    </div>
                  </div>

                  {/* Addresses */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
                    <div style={{ width: "45%" }}>
                      <h3 style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#6b7280", textTransform: "uppercase", borderBottom: "1px solid #e5e7eb", paddingBottom: "3px" }}>Vendor</h3>
                      <div style={{ fontSize: "13px", color: "#1f2937", lineHeight: "1.5" }}>
                        <strong>{selectedPOVendor?.display_name || selectedPOVendor?.company_name || "—"}</strong><br />
                        {selectedPOVendor?.email && <>{selectedPOVendor.email}<br /></>}
                        {selectedPOVendor?.phone && <>{selectedPOVendor.phone}<br /></>}
                        {selectedPOVendor?.billing_address && <>{selectedPOVendor.billing_address}<br /></>}
                        {selectedPO.customer_gstin && <><strong>GSTIN:</strong> {selectedPO.customer_gstin}<br /></>}
                      </div>
                    </div>

                    {selectedPOCustomer && (
                      <div style={{ width: "45%" }}>
                        <h3 style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#6b7280", textTransform: "uppercase", borderBottom: "1px solid #e5e7eb", paddingBottom: "3px" }}>Deliver To</h3>
                        <div style={{ fontSize: "13px", color: "#1f2937", lineHeight: "1.5" }}>
                          <strong>{selectedPOCustomer.display_name || [selectedPOCustomer.first_name, selectedPOCustomer.last_name].filter(Boolean).join(' ') || "—"}</strong><br />
                          {selectedPOCustomer.email && <>{selectedPOCustomer.email}<br /></>}
                          {selectedPOCustomer.phone && <>{selectedPOCustomer.phone}<br /></>}
                          {selectedPOCustomer.shipping_address ? <>{selectedPOCustomer.shipping_address}<br /></> : (selectedPOCustomer.billing_address && <>{selectedPOCustomer.billing_address}<br /></>)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Salesperson & Project Panel */}
                  {(selectedPOSalesperson || selectedPOProject) && (
                    <div style={{ display: "flex", gap: "25px", marginBottom: "25px", fontSize: "12px", color: "#4b5563", background: "#f9fafb", padding: "10px 15px", borderRadius: "4px", border: "1px solid #e5e7eb" }}>
                      {selectedPOSalesperson && (
                        <div>
                          <strong>Salesperson:</strong> {selectedPOSalesperson.name}
                        </div>
                      )}
                      {selectedPOProject && (
                        <div>
                          <strong>Project:</strong> {selectedPOProject.project_name}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Items List Table */}
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "25px", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "#f3f4f6", color: "#1f2937", borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: "10px", textAlign: "left" }}>#</th>
                        <th style={{ padding: "10px", textAlign: "left" }}>Item & Description</th>
                        <th style={{ padding: "10px", textAlign: "right" }}>Qty</th>
                        <th style={{ padding: "10px", textAlign: "right" }}>Rate</th>
                        {totalDiscount > 0 && <th style={{ padding: "10px", textAlign: "right" }}>Discount</th>}
                        {totalTax > 0 && <th style={{ padding: "10px", textAlign: "right" }}>Tax %</th>}
                        <th style={{ padding: "10px", textAlign: "right" }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPOItems.map((item, idx) => {
                        const lineAmt = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
                        let itemDiscount = parseFloat(item.discount) || 0;
                        if (item.discount_type === "percent") itemDiscount = lineAmt * (itemDiscount / 100);
                        const taxable = lineAmt - itemDiscount;
                        const itemTax = taxable * ((parseFloat(item.tax_rate) || 0) / 100);
                        return (
                          <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb" }}>
                            <td style={{ padding: "10px", textAlign: "left" }}>{idx + 1}</td>
                            <td style={{ padding: "10px", textAlign: "left" }}>
                              <strong>{item.item_name || "Item"}</strong>
                              {item.description && <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "3px" }}>{item.description}</div>}
                              {item.hsn_code && <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "2px" }}>HSN: {item.hsn_code}</div>}
                            </td>
                            <td style={{ padding: "10px", textAlign: "right" }}>{parseFloat(item.quantity).toFixed(2)}</td>
                            <td style={{ padding: "10px", textAlign: "right" }}>{parseFloat(item.rate).toFixed(2)}</td>
                            {totalDiscount > 0 && <td style={{ padding: "10px", textAlign: "right" }}>₹{itemDiscount.toFixed(2)}</td>}
                            {totalTax > 0 && <td style={{ padding: "10px", textAlign: "right" }}>{parseFloat(item.tax_rate).toFixed(0)}%</td>}
                            <td style={{ padding: "10px", textAlign: "right" }}>₹{(taxable + itemTax).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Totals Section */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "30px" }}>
                    <div style={{ width: "300px", fontSize: '13px' }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                        <span>Sub Total</span><span>₹{subtotal.toFixed(2)}</span>
                      </div>
                      {totalDiscount > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#ef4444" }}>
                          <span>Discount</span><span>- ₹{totalDiscount.toFixed(2)}</span>
                        </div>
                      )}

                      {/* GST Tax Breakdown */}
                      {selectedPO.gst_type === "intra_state" ? (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#4b5563" }}>
                            <span>CGST</span><span>+ ₹{totalCGST.toFixed(2)}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#4b5563" }}>
                            <span>SGST</span><span>+ ₹{totalSGST.toFixed(2)}</span>
                          </div>
                        </>
                      ) : (
                        totalIGST > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#4b5563" }}>
                            <span>IGST</span><span>+ ₹{totalIGST.toFixed(2)}</span>
                          </div>
                        )
                      )}

                      {totalTax > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#2563eb", borderTop: "1px dashed #e5e7eb", marginTop: "4px" }}>
                          <span>Total Tax</span><span>+ ₹{totalTax.toFixed(2)}</span>
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: "16px", fontWeight: "bold", borderTop: "2px solid #374151", marginTop: "5px" }}>
                        <span>Total</span><span>₹{(parseFloat(selectedPO.total_amount) || grandTotal).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes & Terms Conditions */}
                  {selectedPO.notes && (
                    <div style={{ marginBottom: "15px", fontSize: "12px", color: "#4b5563" }}>
                      <strong>Notes:</strong>
                      <div style={{ marginTop: "4px", whiteSpace: "pre-wrap" }}>{selectedPO.notes}</div>
                    </div>
                  )}
                  {selectedPO.terms_conditions && (
                    <div style={{ marginBottom: "15px", fontSize: "12px", color: "#4b5563" }}>
                      <strong>Terms & Conditions:</strong>
                      <div style={{ marginTop: "4px", whiteSpace: "pre-wrap" }}>{selectedPO.terms_conditions}</div>
                    </div>
                  )}

                  <div style={{ marginTop: "50px", textAlign: "right", color: "#374151", fontSize: "13px" }}>
                    <div>_________________________</div>
                    <div style={{ marginTop: "8px" }}>Authorized Signature</div>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Send Email Modal Overlay */}
      {showEmailModal && selectedPO && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ marginTop: 0 }}>Send Purchase Order via Email</h3>
            <div style={{ marginBottom: "15px" }}>
              <label><strong>To:</strong></label>
              <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label><strong>Subject:</strong></label>
              <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label><strong>Message:</strong></label>
              <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={6} style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowEmailModal(false)} style={cancelBtnStyle} disabled={sendingEmail}>Cancel</button>
              <button onClick={sendEmail} style={primaryBtn} disabled={sendingEmail}>
                {sendingEmail ? "Sending..." : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = { width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc", boxSizing: "border-box", fontSize: "13px" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "500" };
const cancelBtnStyle = { padding: "10px 20px", background: "#ccc", color: "#333", border: "none", borderRadius: "5px", cursor: "pointer" };
const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalBox = { background: "#fff", borderRadius: "8px", padding: "25px", width: "600px", maxWidth: "90%", maxHeight: "80vh", overflow: "auto", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" };
const actionBtn = { padding: "6px 12px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: "500", color: "#334155" };
const dropdownItemStyle = { display: "block", width: "100%", padding: "8px 16px", border: "none", background: "none", textAlign: "left", cursor: "pointer", whiteSpace: "nowrap", fontSize: "13px", color: '#334155' };

export default PurchaseOrders;
