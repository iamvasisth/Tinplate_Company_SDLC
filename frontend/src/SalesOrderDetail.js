/**
 * SalesOrderDetail.js – High-Fidelity Zoho-style Split Master-Detail view for Sales Orders
 */
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { DetailSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

const ORG_NAME = "Tinplate Computer Training Center";
const ORG_ADDRESS = "2nd Floor, Thakur Pyara Singh Road, Jamshedpur – 831001";
const ORG_EMAIL = "kumarrahulraj468@gmail.com";
const ORG_COUNTRY = "India";

const STATUS_COLORS = {
  draft:     { bg: "#f1f5f9", color: "#475569", label: "DRAFT" },
  confirmed: { bg: "#ecfdf5", color: "#047857", label: "CONFIRMED" },
  invoiced:  { bg: "#f0fdfa", color: "#0f766e", label: "INVOICED" },
  cancelled: { bg: "#fef2f2", color: "#b91c1c", label: "CANCELLED" },
};

function SalesOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Selected Sales Order details
  const [so, setSO] = useState(null);
  const [items, setItems] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [converting, setConverting] = useState(false);

  // Master list state
  const [salesOrders, setSalesOrders] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [salespersonsList, setSalespersonsList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Menu dropdowns
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const [convertMenuOpen, setConvertMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [sortBy] = useState("sales_order_date");
  const sortOrder = "desc";
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");

  // Fetch Master list (Sales Orders + Customers + Salespersons + Projects)
  const fetchMasterList = useCallback(async () => {
    try {
      setListLoading(true);
      const [soRes, customersRes, spRes, projRes] = await Promise.all([
        apiRequest("/sales-orders"),
        apiRequest("/customers"),
        apiRequest("/salespersons"),
        apiRequest("/projects"),
      ]);
      setSalesOrders(Array.isArray(soRes?.sales_orders) ? soRes.sales_orders : []);
      setCustomersList(Array.isArray(customersRes?.customers) ? customersRes.customers : []);
      setSalespersonsList(Array.isArray(spRes?.salespersons) ? spRes.salespersons : []);
      setProjectsList(Array.isArray(projRes?.projects) ? projRes.projects : []);
    } catch (err) {
      console.error("Failed to load list data", err);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMasterList();
  }, [fetchMasterList]);

  // Fetch active sales order details
  useEffect(() => {
    const fetchSODetails = async () => {
      try {
        setFetching(true);
        const res = await apiRequest(`/sales-orders/${id}`);
        if (!res?.sales_order) {
          toast.error("Sales Order not found");
          navigate("/sales-orders");
          return;
        }
        setSO(res.sales_order);
        setItems(res.items || []);
        if (res.sales_order.customer_id) {
          const custRes = await apiRequest(`/customers/${res.sales_order.customer_id}`);
          if (custRes?.customer) setCustomer(custRes.customer);
        }
      } catch (err) {
        toast.error("Failed to load Sales Order details");
      } finally {
        setFetching(false);
      }
    };
    fetchSODetails();
  }, [id, navigate]);

  const getCustomerName = (customerId) => {
    if (!customerId) return "—";
    const cust = customersList.find((c) => c.id === customerId);
    return cust ? cust.display_name || [cust.first_name, cust.last_name].filter(Boolean).join(" ") || cust.email : "—";
  };

  const changeStatus = async (newStatus) => {
    try {
      await apiRequest(`/sales-orders/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      setSO((prev) => ({ ...prev, status: newStatus }));
      setSalesOrders((prev) =>
        prev.map((s) => (s.id === parseInt(id) ? { ...s, status: newStatus } : s))
      );
      toast.success(`Sales Order marked as ${newStatus}`);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleConvertToInvoice = async () => {
    if (!window.confirm("Convert this Sales Order to an invoice?")) return;
    setConverting(true);
    setConvertMenuOpen(false);
    try {
      const res = await apiRequest(`/sales-orders/${id}/convert-to-invoice`, { method: "POST" });
      if (res?.alreadyConverted) {
        toast("Already converted. Opening existing invoice.", { icon: "ℹ️" });
        navigate(`/invoices/${res.invoiceId}`);
        return;
      }
      toast.success("Sales Order converted to invoice!");
      setSO((prev) => ({ ...prev, status: "invoiced" }));
      setSalesOrders((prev) =>
        prev.map((s) => (s.id === parseInt(id) ? { ...s, status: "invoiced" } : s))
      );
      navigate(`/invoices/${res.invoiceId}`);
    } catch (err) {
      toast.error("Failed to convert Sales Order to invoice");
    } finally {
      setConverting(false);
    }
  };

  const handleConvertToDeliveryChallan = async () => {
    if (!window.confirm("Convert this Sales Order to a Delivery Challan?")) return;
    setConverting(true);
    setConvertMenuOpen(false);
    try {
      const res = await apiRequest(`/delivery-challans/from-sales-order/${id}`, { method: "POST" });
      if (res?.alreadyConverted) {
        toast("Already converted. Opening existing challan.", { icon: "ℹ️" });
        navigate(`/delivery-challans/${res.deliveryChallanId}/edit`);
        return;
      }
      toast.success("Sales Order converted to Delivery Challan!");
      navigate(`/delivery-challans/${res.deliveryChallanId}/edit`);
    } catch (err) {
      toast.error("Failed to convert Sales Order to Delivery Challan");
    } finally {
      setConverting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this sales order?")) return;
    try {
      await apiRequest(`/sales-orders/${id}`, { method: "DELETE" });
      toast.success("Sales Order deleted");
      navigate("/sales-orders");
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const openEmailModal = () => {
    setEmailTo(customer?.email || "");
    setEmailSubject(`Sales Order ${so.sales_order_number} from ${ORG_NAME}`);
    setEmailBody(
      `Dear ${customer?.display_name || "Customer"},\n\nPlease find your Sales Order attached.\n\nSales Order Number: ${so.sales_order_number}\nTotal: ₹${parseFloat(so.total).toFixed(2)}\n\nThank you for your business.\n\nRegards,\n${ORG_NAME}`
    );
    setShowEmailModal(true);
  };

  const sendEmailAndMarkSent = async () => {
    if (!emailTo) { toast.error("Recipient email is required"); return; }
    setSendingEmail(true);
    try {
      await apiRequest(`/sales-orders/${id}/send`, {
        method: "POST",
        body: JSON.stringify({ to: emailTo, subject: emailSubject, body: emailBody }),
      });
      toast.success("Email sent!");
      setShowEmailModal(false);
      if (so.status === "draft") {
        changeStatus("confirmed");
      }
    } catch (err) {
      toast.error("Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  // Filter left list
  const filteredListSOs = salesOrders.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) {
      return false;
    }
    const customerName = getCustomerName(s.customer_id).toLowerCase();
    const soNumber = (s.sales_order_number || "").toLowerCase();
    const soRef = (s.reference_number || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return customerName.includes(query) || soNumber.includes(query) || soRef.includes(query);
  });

  // Sort left list
  const sortedListSOs = [...filteredListSOs].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (sortBy === "customer_name") {
      aVal = getCustomerName(a.customer_id).toLowerCase();
      bVal = getCustomerName(b.customer_id).toLowerCase();
    } else if (sortBy === "total") {
      aVal = parseFloat(a.total) || 0;
      bVal = parseFloat(b.total) || 0;
    } else if (sortBy === "sales_order_date") {
      aVal = new Date(a.sales_order_date).getTime();
      bVal = new Date(b.sales_order_date).getTime();
    } else if (sortBy === "sales_order_number") {
      aVal = (a.sales_order_number || "").toLowerCase();
      bVal = (b.sales_order_number || "").toLowerCase();
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const calcSubtotal = () => items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0), 0);
  const calcTotalDiscount = () => items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const disc = parseFloat(item.discount) || 0;
    if (item.discount_type === "percent") return sum + (qty * rate * disc / 100);
    return sum + disc;
  }, 0);
  const calcTotalTax = () => items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    let amt = qty * rate;
    const disc = parseFloat(item.discount) || 0;
    if (item.discount_type === "percent") amt -= amt * (disc / 100);
    else amt -= disc;
    return sum + (amt * ((parseFloat(item.tax_rate) || 0) / 100));
  }, 0);

  const subtotal = calcSubtotal();
  const totalDiscount = calcTotalDiscount();
  const totalTax = calcTotalTax();
  const grandTotal = so ? parseFloat(so.total) || (subtotal - totalDiscount + totalTax) : 0;

  let totalWords = "";
  if (so) {
    try {
      totalWords = require("number-to-words").toWords(Math.floor(grandTotal));
      totalWords = totalWords.charAt(0).toUpperCase() + totalWords.slice(1);
    } catch (e) {
      totalWords = grandTotal.toFixed(0);
    }
  }

  // Diagonal Ribbon status background color
  const ribbonColors = {
    draft:     "#94a3b8",
    confirmed: "#047857",
    invoiced:  "#0f766e",
    cancelled: "#be123c",
  };

  const getFilterLabel = (filter) => {
    switch (filter) {
      case "all": return "All Sales Orders";
      case "draft": return "Draft";
      case "confirmed": return "Confirmed";
      case "invoiced": return "Invoiced";
      case "cancelled": return "Cancelled";
      default: return "All Sales Orders";
    }
  };

  const listViews = [
    { key: "all", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "confirmed", label: "Confirmed" },
    { key: "invoiced", label: "Invoiced" },
    { key: "cancelled", label: "Cancelled" },
  ];

  const filteredViews = listViews.filter(v => v.label.toLowerCase().includes(filterSearch.toLowerCase()));

  return (
    <div style={{ display: "flex", height: "100vh", background: "#ffffff", fontFamily: "system-ui, -apple-system, sans-serif", overflow: "hidden" }}>
      
      {/* Styles Injection */}
      <style dangerouslySetInnerHTML={{__html: `
        .toolbar-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border: 1px solid #d0d5dd;
          background: #ffffff;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          color: #344054;
          cursor: pointer;
          transition: all 0.15s ease;
          outline: none;
        }
        .toolbar-btn:hover {
          background: #f9fafb;
          border-color: #98a2b3;
        }
        .dropdown-item {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 8px 14px;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          font-size: 13px;
          color: #344054;
          outline: none;
          transition: background 0.1s ease;
        }
        .dropdown-item:hover {
          background: #f4f5f7;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-a4, .printable-a4 * {
            visibility: visible;
          }
          .printable-a4 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none;
            padding: 0;
          }
          .print-hide {
            display: none !important;
          }
        }
      `}} />

      {/* LEFT PANE (SALES ORDERS LIST) */}
      <div className="print-hide" style={{ width: "350px", borderRight: "1px solid #eaecf0", display: "flex", flexDirection: "column", height: "100%" }}>
        
        {/* Header toolbar */}
        <div style={{ padding: "16px", borderBottom: "1px solid #eaecf0", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
          <div>
            <h3 
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              style={{ fontSize: "15px", fontWeight: "600", color: "#1d2939", margin: 0, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
            >
              {getFilterLabel(statusFilter)}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="2" style={{ transform: statusDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </h3>

            {statusDropdownOpen && (
              <div style={{ position: "absolute", left: "16px", top: "100%", marginTop: "4px", background: "#ffffff", border: "1px solid #eaecf0", borderRadius: "8px", boxShadow: "0 10px 30px rgba(16, 24, 40, 0.08)", zIndex: 1000, width: "240px", padding: "8px 0" }}>
                <div style={{ padding: "0 12px 8px 12px", borderBottom: "1px solid #f2f4f7" }}>
                  <input
                    type="text"
                    placeholder="Search views..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    style={{ width: "100%", padding: "6px 8px", borderRadius: "4px", border: "1px solid #d0d5dd", fontSize: "12px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {filteredViews.map(view => (
                    <div
                      key={view.key}
                      onClick={() => { setStatusFilter(view.key); setStatusDropdownOpen(false); }}
                      style={{ padding: "8px 16px", background: statusFilter === view.key ? "#f0f6ff" : "transparent", cursor: "pointer", fontSize: "13px", color: statusFilter === view.key ? "#006ee6" : "#344054" }}
                    >
                      {view.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            <button 
              onClick={() => navigate("/sales-orders/new")}
              style={{ padding: "6px 10px", background: "#006ee6", color: "#ffffff", border: "none", borderRadius: "4px", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}
            >
              + New
            </button>
          </div>
        </div>

        {/* Search inside left list */}
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #eaecf0" }}>
          <div style={{ position: "relative", width: "100%" }}>
            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", display: "flex" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search in Sales Orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px 8px 32px",
                borderRadius: "4px",
                border: "1px solid #d0d5dd",
                fontSize: "12px",
                outline: "none",
                boxSizing: "border-box",
                color: "#344054",
              }}
            />
          </div>
        </div>

        {/* Compact Sales Order List */}
        <div style={{ flex: 1, overflowY: "auto", background: "#fcfcfd" }}>
          {listLoading ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#667085", fontSize: "13px" }}>Loading list...</div>
          ) : sortedListSOs.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#667085", fontSize: "13px" }}>No orders found</div>
          ) : (
            sortedListSOs.map((s) => {
              const isSelected = String(s.id) === String(id);
              const statusColor = STATUS_COLORS[s.status] || STATUS_COLORS.draft;
              return (
                <div
                  key={s.id}
                  onClick={() => navigate(`/sales-orders/${s.id}/document`)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #eaecf0",
                    cursor: "pointer",
                    background: isSelected ? "#f0f6ff" : "#ffffff",
                    borderLeft: isSelected ? "3px solid #006ee6" : "3px solid transparent",
                    transition: "all 0.1s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontWeight: "500", fontSize: "13px", color: isSelected ? "#006ee6" : "#344054", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>
                      {getCustomerName(s.customer_id)}
                    </span>
                    <span style={{ fontWeight: "600", fontSize: "13px", color: "#1d2939" }}>
                      ₹{parseFloat(s.total).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", color: "#667085" }}>
                      {s.sales_order_number} &bull; {new Date(s.sales_order_date).toLocaleDateString("en-GB")}
                    </span>
                    <span style={{ fontSize: "10px", fontWeight: "600", color: statusColor.color, textTransform: "uppercase" }}>
                      {s.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANE (SALES ORDER DETAILS) */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", background: "#ffffff", overflow: "hidden" }}>
        {fetching ? (
          <div style={{ padding: "40px" }}><DetailSkeleton /></div>
        ) : !so ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#667085" }}>Failed to load Sales Order details.</div>
        ) : (
          <>
            {/* Top Toolbar */}
            <div className="print-hide" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", borderBottom: "1px solid #eaecf0", background: "#ffffff" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#1d2939", margin: 0 }}>
                {so.sales_order_number}
              </h2>
              
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {/* Edit Action */}
                <button
                  onClick={() => navigate(`/sales-orders/${id}/edit`)}
                  className="toolbar-btn"
                  title="Edit"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  Edit
                </button>

                {/* Email composer trigger */}
                <button onClick={openEmailModal} className="toolbar-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  Send
                </button>

                {/* Print action */}
                <button onClick={() => window.print()} className="toolbar-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                  </svg>
                  PDF/Print
                </button>

                {/* Convert Dropdown Menu */}
                {so.status !== "cancelled" && so.status !== "invoiced" && (
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={() => { setConvertMenuOpen(!convertMenuOpen); setMoreMenuOpen(false); }}
                      style={{ padding: "6px 12px", background: "#006ee6", color: "#ffffff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="17 1 21 5 17 9"></polyline>
                        <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                        <polyline points="7 23 3 19 7 15"></polyline>
                        <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                      </svg>
                      Convert
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginLeft: "2px" }}>
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                    {convertMenuOpen && (
                      <div style={{ position: "absolute", right: 0, top: "100%", marginTop: "6px", background: "#ffffff", border: "1px solid #eaecf0", borderRadius: "8px", boxShadow: "0 10px 30px rgba(16, 24, 40, 0.08)", zIndex: 1000, minWidth: "180px", padding: "6px 0" }}>
                        <button
                          onClick={handleConvertToInvoice}
                          disabled={converting}
                          className="dropdown-item"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "8px" }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                          </svg>
                          Convert to Invoice
                        </button>
                        <button
                          onClick={handleConvertToDeliveryChallan}
                          disabled={converting}
                          className="dropdown-item"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "8px" }}>
                            <rect x="1" y="3" width="15" height="13"></rect>
                            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                            <circle cx="5.5" cy="18.5" r="2.5"></circle>
                            <circle cx="18.5" cy="18.5" r="2.5"></circle>
                          </svg>
                          Convert to Challan
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* More Action Menu */}
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => { setMoreMenuOpen(!moreMenuOpen); setConvertMenuOpen(false); }}
                    className="toolbar-btn"
                  >
                    ⋯
                  </button>
                  {moreMenuOpen && (
                    <div style={{ position: "absolute", right: 0, top: "100%", marginTop: "6px", background: "#ffffff", border: "1px solid #eaecf0", borderRadius: "8px", boxShadow: "0 10px 30px rgba(16, 24, 40, 0.08)", zIndex: 1000, minWidth: "160px", padding: "6px 0" }}>
                      {so.status === "draft" && (
                        <button onClick={() => { setMoreMenuOpen(false); changeStatus("confirmed"); }} className="dropdown-item">
                          Mark Confirmed
                        </button>
                      )}
                      {so.status !== "cancelled" && (
                        <button onClick={() => { setMoreMenuOpen(false); changeStatus("cancelled"); }} className="dropdown-item">
                          Mark Cancelled
                        </button>
                      )}
                      <button
                        onClick={() => { setMoreMenuOpen(false); handleDelete(); }}
                        style={{ color: "#dc2626", borderTop: "1px solid #f1f5f9" }}
                        className="dropdown-item"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Close Pane Button */}
                <button
                  onClick={() => navigate("/sales-orders")}
                  style={{
                    border: "none",
                    background: "none",
                    padding: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#667085",
                    marginLeft: "4px",
                  }}
                  title="Close Detail"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>

            {/* WHAT'S NEXT Banner */}
            {(so.status === "draft" || so.status === "confirmed") && (
              <div className="print-hide" style={{ padding: "12px 24px", background: "#f0f9ff", borderBottom: "1px solid #bae6fd", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "13px", color: "#0369a1", fontWeight: "500" }}>
                  <strong>WHAT'S NEXT?</strong> Send this sales order to your customer via email or convert it directly to an invoice.
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={openEmailModal}
                    style={{ padding: "5px 12px", background: "#006ee6", color: "#ffffff", border: "none", borderRadius: "4px", fontSize: "12px", fontWeight: "500", cursor: "pointer" }}
                  >
                    Email Order
                  </button>
                  {so.status === "draft" && (
                    <button
                      onClick={() => changeStatus("confirmed")}
                      style={{ padding: "5px 12px", background: "#ffffff", color: "#344054", border: "1px solid #d0d5dd", borderRadius: "4px", fontSize: "12px", fontWeight: "500", cursor: "pointer" }}
                    >
                      Confirm Order
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Document details container */}
            <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", padding: "30px 20px" }}>
              
              {/* Document Sheet Container */}
              <div className="printable-a4" style={{ position: "relative", maxWidth: "800px", margin: "0 auto", background: "#ffffff", padding: "40px 50px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", borderRadius: "4px", overflow: "hidden" }}>
                
                {/* Diagonal Status Ribbon */}
                <div style={{
                  position: "absolute",
                  top: "20px",
                  right: "-40px",
                  width: "150px",
                  padding: "6px 0",
                  background: ribbonColors[so.status] || ribbonColors.draft,
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: "700",
                  textAlign: "center",
                  transform: "rotate(45deg)",
                  textTransform: "uppercase",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  letterSpacing: "0.1em",
                  zIndex: 10
                }}>
                  {so.status}
                </div>

                {/* Organization Details Header */}
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #eaecf0", paddingBottom: "20px", marginBottom: "30px" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <h1 style={{ margin: "0 0 8px 0", fontSize: "22px", fontWeight: "700", color: "#1d2939", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                      Sales Order
                    </h1>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#475569" }}>
                      # {so.sales_order_number}
                    </span>
                    <span style={{ fontSize: "12px", color: "#667085", marginTop: "4px" }}>
                      Date: {new Date(so.sales_order_date).toLocaleDateString("en-GB")}
                    </span>
                    {so.expected_shipment_date && (
                      <span style={{ fontSize: "12px", color: "#667085" }}>
                        Expected Shipment: {new Date(so.expected_shipment_date).toLocaleDateString("en-GB")}
                      </span>
                    )}
                    {so.reference_number && (
                      <span style={{ fontSize: "12px", color: "#667085" }}>
                        Reference#: {so.reference_number}
                      </span>
                    )}
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
                      {ORG_NAME}
                    </h3>
                    <div style={{ fontSize: "12px", color: "#475569", maxWidth: "250px", lineHeight: "1.4" }}>
                      {ORG_ADDRESS}<br />
                      {ORG_COUNTRY}<br />
                      Email: {ORG_EMAIL}
                    </div>
                  </div>
                </div>

                {/* Billing Addresses Block */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "35px" }}>
                  <div style={{ width: "45%" }}>
                    <span style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#800020", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #eaecf0", paddingBottom: "4px", marginBottom: "8px" }}>
                      Bill To
                    </span>
                    <div style={{ fontSize: "13px", color: "#334155", lineHeight: "1.6" }}>
                      <strong style={{ fontSize: "14px", color: "#0f172a" }}>{customer?.display_name || "—"}</strong><br />
                      {customer?.company_name && <>{customer.company_name}<br /></>}
                      {customer?.email && <>{customer.email}<br /></>}
                      {customer?.phone && <>{customer.phone}<br /></>}
                    </div>
                  </div>

                  <div style={{ width: "45%", textAlign: "right" }}>
                    <span style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#800020", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #eaecf0", paddingBottom: "4px", marginBottom: "8px" }}>
                      Order Details
                    </span>
                    <div style={{ fontSize: "12px", color: "#475569", lineHeight: "1.6" }}>
                      {so.salesperson_id && (
                        <div><strong>Salesperson:</strong> {salespersonsList.find(s => s.id === so.salesperson_id)?.name || "—"}</div>
                      )}
                      {so.project_id && (
                        <div><strong>Project:</strong> {projectsList.find(p => p.id === so.project_id)?.project_name || "—"}</div>
                      )}
                      {so.delivery_method && (
                        <div><strong>Delivery Method:</strong> {so.delivery_method}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "30px", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "2px solid #eaecf0" }}>
                      <th style={{ padding: "10px 8px", textAlign: "left", color: "#475569", fontWeight: "600", width: "40px" }}>#</th>
                      <th style={{ padding: "10px 8px", textAlign: "left", color: "#475569", fontWeight: "600" }}>Item & Description</th>
                      <th style={{ padding: "10px 8px", textAlign: "right", color: "#475569", fontWeight: "600", width: "60px" }}>Qty</th>
                      <th style={{ padding: "10px 8px", textAlign: "right", color: "#475569", fontWeight: "600", width: "100px" }}>Rate</th>
                      <th style={{ padding: "10px 8px", textAlign: "right", color: "#475569", fontWeight: "600", width: "120px" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px 8px", color: "#667085" }}>{idx + 1}</td>
                        <td style={{ padding: "12px 8px" }}>
                          <span style={{ fontWeight: "600", color: "#1d2939", display: "block" }}>
                            {item.item_name || "Item"}
                          </span>
                          {item.description && (
                            <span style={{ fontSize: "11px", color: "#667085", marginTop: "2px", display: "block" }}>
                              {item.description}
                            </span>
                          )}
                          {item.hsn_code && (
                            <span style={{ fontSize: "9px", color: "#800020", background: "#fff5f5", border: "1px solid #ffd8d8", borderRadius: "3px", padding: "1px 4px", marginTop: "4px", display: "inline-block" }}>
                              HSN: {item.hsn_code}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 8px", textAlign: "right", color: "#334155" }}>
                          {parseFloat(item.quantity).toFixed(0)}
                        </td>
                        <td style={{ padding: "12px 8px", textAlign: "right", color: "#334155" }}>
                          ₹{parseFloat(item.rate).toFixed(2)}
                        </td>
                        <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: "600", color: "#1d2939" }}>
                          ₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Calculation Summary blocks */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "40px" }}>
                  <div style={{ width: "320px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "13px", color: "#475569" }}>
                      <span>Sub Total</span>
                      <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    {totalDiscount > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "13px", color: "#b91c1c" }}>
                        <span>Total Discount</span>
                        <span>- ₹{totalDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    {totalTax > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "13px", color: "#0f766e" }}>
                        <span>Total Tax</span>
                        <span>+ ₹{totalTax.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontSize: "16px", fontWeight: "700", borderTop: "2px solid #eaecf0", marginTop: "8px", color: "#006ee6" }}>
                      <span>Total</span>
                      <span>₹{grandTotal.toFixed(2)}</span>
                    </div>

                    {totalWords && (
                      <div style={{ fontSize: "11px", color: "#667085", textAlign: "right", fontStyle: "italic", marginTop: "4px" }}>
                        Rupees {totalWords} Only
                      </div>
                    )}
                  </div>
                </div>

                {/* Lower Notes & Terms */}
                {so.notes && (
                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "16px", marginBottom: "16px" }}>
                    <span style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>
                      Customer Notes
                    </span>
                    <p style={{ margin: 0, fontSize: "12px", color: "#667085", whiteSpace: "pre-wrap" }}>
                      {so.notes}
                    </p>
                  </div>
                )}
                {so.terms && (
                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                    <span style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>
                      Terms & Conditions
                    </span>
                    <p style={{ margin: 0, fontSize: "12px", color: "#667085", whiteSpace: "pre-wrap" }}>
                      {so.terms}
                    </p>
                  </div>
                )}

                {/* Sign-off signature block */}
                <div style={{ marginTop: "60px", display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ textAlign: "center", width: "220px" }}>
                    <div style={{ borderBottom: "1px solid #cbd5e1", height: "40px" }}></div>
                    <div style={{ fontSize: "12px", color: "#475569", fontWeight: "600", marginTop: "8px" }}>
                      Authorized Signatory
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>Send Sales Order via Email</h3>
              <button onClick={() => setShowEmailModal(false)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "20px", color: "#98a2b3" }} disabled={sendingEmail}>&times;</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={labelStyle}>To</label>
                <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} style={modalInputStyle} disabled={sendingEmail} />
              </div>
              <div>
                <label style={labelStyle}>Subject</label>
                <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} style={modalInputStyle} disabled={sendingEmail} />
              </div>
              <div>
                <label style={labelStyle}>Message</label>
                <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={6} style={{ ...modalInputStyle, resize: "none" }} disabled={sendingEmail} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "24px", borderTop: "1px solid #eaecf0", paddingTop: "16px" }}>
              <button onClick={() => setShowEmailModal(false)} style={modalCancelBtn} disabled={sendingEmail}>Cancel</button>
              <button onClick={sendEmailAndMarkSent} style={modalPrimaryBtn} disabled={sendingEmail}>
                {sendingEmail ? "Sending..." : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Inline constant styles
const labelStyle = {
  display: "block",
  fontSize: "12px",
  fontWeight: "600",
  color: "#344054",
};

// Modals styles
const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(16, 24, 40, 0.4)",
  backdropFilter: "blur(4px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalBox = {
  background: "#ffffff",
  borderRadius: "12px",
  padding: "24px",
  width: "550px",
  maxWidth: "95%",
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 20px 24px -4px rgba(16, 24, 40, 0.08), 0 8px 8px -4px rgba(16, 24, 40, 0.03)",
};

const modalInputStyle = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #d0d5dd",
  borderRadius: "6px",
  fontSize: "13px",
  color: "#344054",
  boxSizing: "border-box",
  outline: "none",
  marginTop: "4px",
};

const modalCancelBtn = {
  padding: "8px 16px",
  background: "#ffffff",
  border: "1px solid #d0d5dd",
  color: "#344054",
  fontSize: "13px",
  fontWeight: "600",
  borderRadius: "6px",
  cursor: "pointer",
};

const modalPrimaryBtn = {
  padding: "8px 16px",
  background: "#006ee6",
  border: "none",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: "600",
  borderRadius: "6px",
  cursor: "pointer",
};

export default SalesOrderDetail;
