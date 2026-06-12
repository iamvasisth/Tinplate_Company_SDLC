/**
 * Customers.js – Final version with activity log timeline, active/inactive toggle,
 * dynamic income chart, column customization, etc.
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiRequest } from "./api";
import { TableSkeleton, DetailSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";
import { canAccess, MODULES, ACTIONS } from "./utils/permissions";


const BLUE = '#4a90e2';
const BORDER_COLOR = '#e2e8f0';
const TEXT_PRIMARY = '#1e293b';
const TEXT_SECONDARY = '#64748b';
const BG_PAGE = '#f8fafc';
const BG_CARD = '#ffffff';
const RADIUS = '8px';
const SHADOW = '0 1px 4px rgba(0,0,0,0.06)';

// Minimal inline styles replacements for table
const thStyle = { padding: "12px 16px", background: "#f8fafc", color: "#64748b", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", borderBottom: "1px solid #f1f5f9" };
const tdStyle = { padding: "12px 16px" };

const ORG_NAME = "Tinplate Computer Training Center";
const ORG_ADDRESS = "2nd Floor, Thakur Pyara Singh Road, Jamshedpur – 831001";
const ORG_EMAIL = "kumarrahulraj468@gmail.com";
const ORG_COUNTRY = "India";

const ALL_COLUMNS = [
  { key: "checkbox", label: "☐" },
  { key: "name", label: "Name" },
  { key: "company", label: "Company Name" },
  { key: "email", label: "Email" },
  { key: "workPhone", label: "Work Phone" },
  { key: "receivables", label: "Receivables (BCY)" },
  { key: "unusedCredits", label: "Unused Credits (BCY)" },
];

function Customers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParamsUrl = new URLSearchParams(location.search);
  const searchQuery = searchParamsUrl.get("search") || "";

  const timeAgo = (dateString) => {
    if (!dateString) return "";
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay > 30) return `${Math.floor(diffDay / 30)} month(s) ago`;
    if (diffDay > 0) return `${diffDay} day(s) ago`;
    if (diffHr > 0) return `${diffHr} hour(s) ago`;
    if (diffMin > 0) return `${diffMin} minute(s) ago`;
    return "just now";
  };

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("active");
  const [visibleColumns, setVisibleColumns] = useState(
    ALL_COLUMNS.reduce((acc, col) => {
      acc[col.key] = !['receivables', 'unusedCredits'].includes(col.key);
      if (typeof window !== 'undefined' && window.innerWidth < 768 && ['company', 'workPhone'].includes(col.key)) {
        acc[col.key] = false;
      }
      return acc;
    }, {})
  );
  const [columnsOpen, setColumnsOpen] = useState(false);

  const [expandedId, setExpandedId] = useState(null);
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [expandedAddresses, setExpandedAddresses] = useState([]);
  const [expandedContacts, setExpandedContacts] = useState([]);
  const [expandedLoading, setExpandedLoading] = useState(false);

  // ✅ FIX 1: activities default [] hai
  const [activities, setActivities] = useState([]);
  const [activeTab, setActiveTab] = useState("Overview");

  const [activeStatus, setActiveStatus] = useState(true);
  useEffect(() => {
    if (expandedCustomer) setActiveStatus(expandedCustomer.is_active);
  }, [expandedCustomer]);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);

  const [statementPreset, setStatementPreset] = useState("thisMonth");
  const [statementFilter, setStatementFilter] = useState("all");
  const [generatedStatement, setGeneratedStatement] = useState(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [orgInfo, setOrgInfo] = useState({
    name: ORG_NAME,
    address: ORG_ADDRESS,
    email: ORG_EMAIL,
    country: ORG_COUNTRY,
  });
  const [statementRange, setStatementRange] = useState({
    from: new Date().toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });

  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [newTransactionOpen, setNewTransactionOpen] = useState(false);

  const [incomePeriod, setIncomePeriod] = useState("last6Months");

  // Email modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  // PDF download loading state
  const [pdfLoading, setPdfLoading] = useState(false);

  const StatusBadge = ({ isActive }) => (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
      background: isActive ? '#d1fae5' : '#f3f4f6',
      color: isActive ? '#065f46' : '#6b7280',
      border: `1px solid ${isActive ? '#6ee7b7' : '#e5e7eb'}`,
    }}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );

  const handleSingleDelete = async (id) => {
    if (!window.confirm('Delete this customer?')) return;
    try {
      await apiRequest(`/customers/${id}`, { method: 'DELETE' });
      toast.success('Customer deleted');
      if (expandedId === id) setExpandedId(null);
      fetchCustomers();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await apiRequest(`/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: newStatus }),
      });
      toast.success(newStatus ? 'Customer activated' : 'Customer deactivated');
      if (expandedId === id) setActiveStatus(newStatus);
      fetchCustomers();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const getCustomerName = (cust) => {
    if (!cust) return "Unknown Customer";
    return (
      cust.display_name ||
      [cust.first_name, cust.last_name].filter(Boolean).join(" ") ||
      cust.company_name ||
      cust.email ||
      "Unknown Customer"
    );
  };

  const filteredCustomers = customers.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = getCustomerName(c).toLowerCase();
    const email = (c.email || "").toLowerCase();
    const comp = (c.company_name || "").toLowerCase();
    return name.includes(q) || email.includes(q) || comp.includes(q);
  });

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await apiRequest(`/customers${params}`);
      if (res) setCustomers(res.customers || []);
    } catch (err) {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const fetchInvoiceData = async (customerId) => {
    setInvoicesLoading(true);
    try {
      const res = await apiRequest(`/customers/${customerId}/invoices`);
      if (res) setInvoices(res.invoices || []);
    } catch (err) {
      toast.error("Failed to load invoices");
    } finally {
      setInvoicesLoading(false);
    }
  };

  const fetchComments = async (customerId) => {
    setCommentsLoading(true);
    try {
      const res = await apiRequest(`/customers/${customerId}/comments`);
      if (res) setComments(res.comments || []);
    } catch (err) {
      toast.error("Failed to load comments");
    } finally {
      setCommentsLoading(false);
    }
  };

  // ✅ FIX 2: res.activity OR res.activities dono handle karo + fallback []
  const fetchActivities = async (customerId) => {
    try {
      const res = await apiRequest(`/customers/${customerId}/activity`);
      if (res) setActivities(res.activity || res.activities || []);
    } catch (err) {
      console.error("Failed to load activities", err);
      setActivities([]); // ✅ error pe bhi [] set karo crash nahi hoga
    }
  };

  const toggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedCustomer(null);
      setExpandedAddresses([]);
      setExpandedContacts([]);
      setActiveTab("Overview");
      setComments([]);
      setGeneratedStatement(null);
      setMoreOpen(false);
      setInvoices([]);
      setActivities([]);
      return;
    }
    setExpandedId(id);
    setExpandedLoading(true);
    setActiveTab("Overview");
    setComments([]);
    setGeneratedStatement(null);
    setMoreOpen(false);
    setInvoices([]);
    setActivities([]);
    try {
      const res = await apiRequest(`/customers/${id}`);
      if (res) {
        setExpandedCustomer(res.customer);
        setExpandedAddresses(res.addresses || []);
        setExpandedContacts(res.contacts || []);
        setActiveStatus(res.customer.is_active);
        fetchInvoiceData(id);
        fetchComments(id);
        fetchActivities(id);
      }
    } catch (err) {
      toast.error("Failed to load details");
      setExpandedId(null);
    } finally {
      setExpandedLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selected.length === customers.length) setSelected([]);
    else setSelected(customers.map((c) => c.id));
  };
  const toggleSelectOne = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
    );
  };

  const deleteSelected = async () => {
    if (!window.confirm(`Delete ${selected.length} selected?`)) return;
    try {
      await Promise.all(
        selected.map((id) =>
          apiRequest(`/customers/${id}`, { method: "DELETE" }),
        ),
      );
      toast.success("Selected deleted");
      setSelected([]);
      if (expandedId && selected.includes(expandedId)) setExpandedId(null);
      fetchCustomers();
    } catch (err) {
      toast.error("Batch delete failed");
    }
  };

  const handleRefresh = () => {
    setMenuOpen(false);
    fetchCustomers();
  };
  const handleImport = () => {
    setMenuOpen(false);
    navigate("/import_more");
  };

  const handleInvitePortal = async (customerId) => {
    try {
      await apiRequest(`/customers/${customerId}`, {
        method: "PUT",
        body: JSON.stringify({ enable_portal: true }),
      });
      toast.success("Portal access enabled");
      const res = await apiRequest(`/customers/${customerId}`);
      if (res) setExpandedCustomer(res.customer);
      fetchCustomers();
    } catch (err) {
      toast.error("Failed to enable portal");
    }
  };

  const handleNewTransaction = (customerId) => {
    toast("Invoice page coming soon");
  };

  const getStatementDates = () => {
    if (statementPreset !== "custom") {
      const today = new Date();
      let from, to;
      switch (statementPreset) {
        case "today":
          from = to = today;
          break;
        case "thisWeek": {
          const day = today.getDay();
          from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - day);
          to = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (6 - day));
          break;
        }
        case "thisMonth":
          from = new Date(today.getFullYear(), today.getMonth(), 1);
          to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          break;
        case "thisYear":
          from = new Date(today.getFullYear(), 0, 1);
          to = new Date(today.getFullYear(), 11, 31);
          break;
        case "lifetime":
        default:
          from = new Date(2000, 0, 1);
          to = new Date(2099, 11, 31);
      }
      return {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
      };
    }
    return statementRange;
  };

  const handleGenerateStatement = async () => {
    if (!expandedId) return;
    setStatementLoading(true);
    try {
      const range = getStatementDates();
      const filteredInvoices = invoices.filter((inv) => {
        const invDate = new Date(inv.invoice_date).toISOString().slice(0, 10);
        return invDate >= range.from && invDate <= range.to;
      });
      const totalInvoiced = filteredInvoices.reduce(
        (sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0,
      );
      const openingBalance = parseFloat(expandedCustomer?.opening_balance) || 0;
      const amountReceived = 0;
      const balanceDue = openingBalance + totalInvoiced - amountReceived;
      const rows = filteredInvoices.map((inv) => ({
        date: new Date(inv.invoice_date).toLocaleDateString(),
        transaction: `Invoice ${inv.invoice_number || "—"}`,
        details: inv.description || "",
        amount: parseFloat(inv.total_amount).toFixed(2),
        payments: "0.00",
        balance: balanceDue.toFixed(2),
      }));
      setGeneratedStatement({
        from: range.from,
        to: range.to,
        openingBalance: openingBalance.toFixed(2),
        totalInvoiced: totalInvoiced.toFixed(2),
        amountReceived: amountReceived.toFixed(2),
        balanceDue: balanceDue.toFixed(2),
        rows,
      });
      toast.success("Statement generated");
    } catch (err) {
      toast.error("Failed to generate statement");
    } finally {
      setStatementLoading(false);
    }
  };

  const openStatementWindow = () => {
    if (!generatedStatement) return;
    const win = window.open("", "_blank", "width=800,height=600");
    const invoiceRows = generatedStatement.rows
      .map((row) => `
      <tr>
        <td>${row.date}</td>
        <td>${row.transaction}</td>
        <td>${row.details}</td>
        <td style="text-align: right;">${row.amount}</td>
        <td style="text-align: right;">${row.payments}</td>
        <td style="text-align: right;">${row.balance}</td>
      </tr>`)
      .join("");
    const html = `
    <!DOCTYPE html><html><head><title>Statement of Accounts</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 13px; color: #333; margin: 0; padding: 40px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
      .org-details { text-align: right; line-height: 1.5; font-size: 13px; }
      .org-details h2 { margin: 0 0 5px 0; font-size: 16px; color: #111; }
      .mid-section { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
      .to-section { font-size: 13px; }
      .to-section .to-label { font-weight: bold; margin-bottom: 5px; }
      .to-section .customer-name { color: #2275d7; font-weight: bold; font-size: 15px; }
      .title-section { text-align: center; margin-right: 40px; }
      .title-section h1 { margin: 0 0 10px 0; font-size: 26px; color: #111; font-weight: bold; }
      .date-range { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 5px 0; font-size: 13px; }
      .account-summary { width: 350px; float: right; margin-bottom: 30px; border-collapse: collapse; }
      .account-summary th { background: #f2f2f2; padding: 8px 10px; text-align: left; font-weight: bold; }
      .account-summary td { padding: 8px 10px; border-bottom: 1px solid #e0e0e0; }
      .txn-table { width: 100%; border-collapse: collapse; clear: both; }
      .txn-table th { background: #333; color: #fff; padding: 10px; text-align: left; font-weight: normal; }
      .txn-table td { padding: 12px 10px; border-bottom: 1px solid #e0e0e0; }
      .final-balance { text-align: right; margin-top: 20px; font-weight: bold; font-size: 14px; padding-right: 10px; }
      .final-balance span { display: inline-block; width: 120px; }
    </style>
    </head><body>
      <div class="header">
        <div></div>
        <div class="org-details">
          <h2>${orgInfo.name}</h2>
          <div>${orgInfo.address}</div>
          <div>${orgInfo.country}</div>
          <div>${orgInfo.email}</div>
        </div>
      </div>
      <div class="mid-section">
        <div class="to-section">
          <div class="to-label">To</div>
          <div class="customer-name">${getCustomerName(expandedCustomer)}</div>
        </div>
        <div class="title-section">
          <h1>Statement of Accounts</h1>
          <div class="date-range">${generatedStatement.from} To ${generatedStatement.to}</div>
        </div>
      </div>
      <table class="account-summary">
        <thead><tr><th colspan="2">Account Summary</th></tr></thead>
        <tbody>
          <tr><td>Opening Balance</td><td style="text-align: right;">₹ ${generatedStatement.openingBalance}</td></tr>
          <tr><td>Invoiced Amount</td><td style="text-align: right;">₹ ${generatedStatement.totalInvoiced}</td></tr>
          <tr><td>Amount Received</td><td style="text-align: right;">₹ ${generatedStatement.amountReceived}</td></tr>
          <tr><td>Balance Due</td><td style="text-align: right;">₹ ${generatedStatement.balanceDue}</td></tr>
        </tbody>
      </table>
      <table class="txn-table">
        <thead>
          <tr>
            <th>Date</th><th>Transactions</th><th>Details</th>
            <th style="text-align: right;">Amount</th>
            <th style="text-align: right;">Payments</th>
            <th style="text-align: right;">Balance</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${generatedStatement.from}</td>
            <td>***Opening Balance***</td><td></td>
            <td style="text-align: right;">${generatedStatement.openingBalance}</td>
            <td style="text-align: right;"></td>
            <td style="text-align: right;">${generatedStatement.openingBalance}</td>
          </tr>
          ${invoiceRows}
        </tbody>
      </table>
      <div class="final-balance">Balance Due <span>₹ ${generatedStatement.balanceDue}</span></div>
    </body></html>`;
    win.document.write(html);
    win.document.close();
    return win;
  };

  const handlePrint = () => {
    const win = openStatementWindow();
    if (win) { win.focus(); win.print(); }
  };

  const handleDownloadPDF = async () => {
    if (!generatedStatement) { toast.error('Please generate the statement first.'); return; }
    setPdfLoading(true);
    try {
      const range = getStatementDates();
      const url = `${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/customers/${expandedId}/statement/pdf?from=${range.from}&to=${range.to}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('PDF generation failed');
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Statement_${getCustomerName(expandedCustomer)}_${range.from}_${range.to}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success('PDF downloaded');
    } catch (err) {
      toast.error('Failed to download PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const openEmailModal = () => {
    if (!generatedStatement) { toast.error('Please generate the statement first.'); return; }
    const range = getStatementDates();
    setEmailTo(expandedCustomer.email || '');
    setEmailSubject(`Statement of Accounts – ${getCustomerName(expandedCustomer)} (${range.from} to ${range.to})`);
    setEmailBody(`Dear ${getCustomerName(expandedCustomer)},\n\nPlease find your Statement of Accounts attached for the period ${range.from} to ${range.to}.\n\nKindly review and let us know if you have any queries.\n\nRegards,\nTinplate Computer Training Center`);
    setEmailModalOpen(true);
  };

  const handleSendEmail = async () => {
    if (!emailTo.trim()) { toast.error('Please enter a recipient email address.'); return; }
    setEmailSending(true);
    const range = getStatementDates();
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/customers/${expandedId}/statement/send`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: emailTo.trim(), subject: emailSubject, body: emailBody,
            from: range.from, to_date: range.to,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Send failed');
      toast.success('Statement emailed successfully!');
      setEmailModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to send email');
    } finally {
      setEmailSending(false);
    }
  };

  const handleDownloadXLS = () => {
    if (!generatedStatement) return;
    let csv = "Date,Transaction,Details,Amount,Payments,Balance\n";
    generatedStatement.rows.forEach((row) => {
      csv += `"${row.date}","${row.transaction}","${row.details}","₹${row.amount}","₹${row.payments}","₹${row.balance}"\n`;
    });
    csv += `\n"","","Opening Balance","₹${generatedStatement.openingBalance}","",""\n`;
    csv += `"","","Invoiced Amount","₹${generatedStatement.totalInvoiced}","",""\n`;
    csv += `"","","Amount Received","₹${generatedStatement.amountReceived}","",""\n`;
    csv += `"","","Balance Due","₹${generatedStatement.balanceDue}","",""\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Statement_${getCustomerName(expandedCustomer)}_${generatedStatement.from}_${generatedStatement.to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("XLS downloaded");
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await apiRequest(`/customers/${expandedId}/comments`, {
        method: "POST",
        body: JSON.stringify({ comment_text: newComment.trim() }),
      });
      setComments([res.comment, ...comments]);
      setNewComment("");
      toast.success("Comment added");
      fetchActivities(expandedId);
    } catch (err) {
      toast.error("Failed to add comment");
    }
  };

  const billing = expandedAddresses.find((a) => a.type === "billing");
  const shipping = expandedAddresses.find((a) => a.type === "shipping");
  const openingBalance = expandedCustomer ? parseFloat(expandedCustomer.opening_balance) || 0 : 0;
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
  const amountReceived = 0;
  const balanceDue = openingBalance + totalInvoiced - amountReceived;

  const getIncomeDateRange = () => {
    const today = new Date();
    let start, end;
    switch (incomePeriod) {
      case "today":
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        break;
      case "thisWeek": {
        const day = today.getDay();
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - day);
        end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
        break;
      }
      case "thisMonth":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        break;
      case "last6Months":
        start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        break;
      case "last12Months":
        start = new Date(today.getFullYear() - 1, today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        break;
      default:
        start = new Date(2020, 0, 1);
        end = new Date(2099, 11, 31);
    }
    return { start, end };
  };

  const buildIncomeChartData = () => {
    const { start, end } = getIncomeDateRange();
    const months = [];
    for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d < end; d.setMonth(d.getMonth() + 1)) {
      months.push({
        month: d.toLocaleString("default", { month: "short", year: "2-digit" }),
        amount: 0,
        key: d.toISOString().slice(0, 7),
      });
    }
    invoices.forEach((inv) => {
      if (!inv.invoice_date || !inv.total_amount) return;
      const invDate = new Date(inv.invoice_date);
      if (invDate >= start && invDate < end) {
        const key = invDate.toISOString().slice(0, 7);
        const monthObj = months.find((m) => m.key === key);
        if (monthObj) monthObj.amount += parseFloat(inv.total_amount) || 0;
      }
    });
    if (months.length > 0) months[0].amount += openingBalance;
    return months;
  };

  const incomeChartData = buildIncomeChartData();
  const chartMax = Math.max(...incomeChartData.map((d) => d.amount), 1);

  const tabStyle = (name) => ({
    padding: "10px 20px",
    cursor: "pointer",
    borderBottom: activeTab === name ? "3px solid #4a90e2" : "3px solid transparent",
    fontWeight: activeTab === name ? "bold" : "normal",
    color: activeTab === name ? "#4a90e2" : "#333",
    background: "none",
    borderTop: "none",
    borderLeft: "none",
    borderRight: "none",
    borderBottom: activeTab === name ? "3px solid #4a90e2" : "3px solid transparent",
  });

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "15px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  };

  const renderCell = (colKey, content) => {
    if (!visibleColumns[colKey]) return null;
    return <td style={tdStyle}>{content}</td>;
  };
  const renderHeader = (colKey, label) => {
    if (!visibleColumns[colKey]) return null;
    return <th style={thStyle}>{label}</th>;
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1200px", margin: "auto", background: BG_PAGE, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: "700", color: TEXT_PRIMARY, margin: 0 }}>Customers</h2>
          <p style={{ color: TEXT_SECONDARY, margin: "4px 0 0", fontSize: "14px" }}>Showing {filteredCustomers.length} customers</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: "8px 12px", borderRadius: "6px", border: `1px solid ${BORDER_COLOR}`, outline: "none", color: TEXT_PRIMARY }}>
            <option value="all">All Customers</option>
            <option value="active">Active Customers</option>
            <option value="inactive">Inactive Customers</option>
          </select>
          {canAccess(user?.role, MODULES.CUSTOMERS, ACTIONS.CREATE) && (
          <button onClick={() => navigate("/customers/new")} style={{ background: BLUE, color: "#fff", borderRadius: "6px", padding: "10px 20px", border: "none", cursor: "pointer", fontWeight: "500" }}>
            + New Customer
          </button>
          )}
          <div style={{ position: "relative" }}>
            <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", padding: "5px", color: TEXT_SECONDARY }}>☰</button>
            {menuOpen && (
              <div style={{ position: "absolute", right: 0, top: "100%", background: "#fff", border: `1px solid ${BORDER_COLOR}`, borderRadius: RADIUS, boxShadow: SHADOW, zIndex: 10, minWidth: "150px" }}>
                <button style={{ width: "100%", padding: "10px", border: "none", background: "none", textAlign: "left", cursor: "pointer", borderBottom: `1px solid ${BORDER_COLOR}` }} onClick={handleRefresh}>🔄 Refresh</button>
                <button style={{ width: "100%", padding: "10px", border: "none", background: "none", textAlign: "left", cursor: "pointer", borderBottom: `1px solid ${BORDER_COLOR}` }} onClick={handleImport}>📥 Import</button>
                <div style={{ position: "relative" }}>
                  <button style={{ width: "100%", padding: "10px", border: "none", background: "none", textAlign: "left", cursor: "pointer" }} onClick={() => setColumnsOpen(!columnsOpen)}>📋 Columns ▸</button>
                  {columnsOpen && (
                    <div style={{ position: "absolute", left: "100%", top: 0, background: "#fff", border: `1px solid ${BORDER_COLOR}`, borderRadius: RADIUS, boxShadow: SHADOW, zIndex: 10, minWidth: "200px" }}>
                      {ALL_COLUMNS.filter((c) => c.key !== "checkbox").map((col) => (
                        <label key={col.key} style={{ display: "flex", alignItems: "center", padding: "8px 16px", cursor: "pointer" }}>
                          <input type="checkbox" checked={visibleColumns[col.key] || false} onChange={() => setVisibleColumns((prev) => ({ ...prev, [col.key]: !prev[col.key] }))} />
                          <span style={{ marginLeft: "8px", fontSize: "14px" }}>{col.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ position: "relative", width: "100%" }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: TEXT_SECONDARY }}>🔍</span>
          <input
            type="text"
            placeholder="Search by name, email or company..."
            value={searchQuery}
            onChange={(e) => {
              const newParams = new URLSearchParams(location.search);
              if (e.target.value) {
                newParams.set("search", e.target.value);
              } else {
                newParams.delete("search");
              }
              navigate({ search: newParams.toString() }, { replace: true });
            }}
            style={{ width: "100%", padding: "12px 12px 12px 40px", borderRadius: RADIUS, border: `1px solid ${BORDER_COLOR}`, outline: "none", fontSize: "14px", boxSizing: "border-box" }}
            onFocus={e => e.target.style.borderColor = BLUE}
            onBlur={e => e.target.style.borderColor = BORDER_COLOR}
          />
        </div>
      </div>

      {selected.length > 0 && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "10px 16px", display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" }}>
          <span style={{ color: "#1e3a8a", fontWeight: "500" }}>{selected.length} customer(s) selected</span>
          <button onClick={deleteSelected} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: "4px", padding: "6px 12px", cursor: "pointer", fontSize: "13px" }}>Delete Selected</button>
          <button onClick={() => setSelected([])} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "13px", textDecoration: "underline" }}>Cancel</button>
        </div>
      )}

      <div style={{ background: BG_CARD, borderRadius: RADIUS, boxShadow: SHADOW, border: `1px solid ${BORDER_COLOR}`, overflow: "hidden" }}>
        {loading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : filteredCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
            <h3 style={{ color: '#374151', marginBottom: '8px' }}>No customers found</h3>
            <p style={{ marginBottom: '20px' }}>{searchQuery ? 'No customers match your search.' : 'Start by adding your first customer.'}</p>
            {!searchQuery && canAccess(user?.role, MODULES.CUSTOMERS, ACTIONS.CREATE) && (
              <button onClick={() => navigate('/customers/new')} style={{ background: BLUE, color: "#fff", borderRadius: "6px", padding: "10px 20px", border: "none", cursor: "pointer" }}>+ New Customer</button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                  {visibleColumns.checkbox && (
                    <th style={{ ...thStyle, width: "40px" }}>
                      <input type="checkbox" checked={selected.length === filteredCustomers.length && filteredCustomers.length > 0} onChange={toggleSelectAll} />
                    </th>
                  )}
                  {renderHeader("name", "Name")}
                  {renderHeader("company", "Company Name")}
                  {renderHeader("email", "Email")}
                  {renderHeader("workPhone", "Phone")}
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                  {renderHeader("receivables", "Receivables (BCY)")}
                  {renderHeader("unusedCredits", "Unused Credits (BCY)")}
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <React.Fragment key={c.id}>
                    <tr
                      style={{ borderBottom: "1px solid #f1f5f9", background: selected.includes(c.id) ? "#eff6ff" : "transparent" }}
                      onMouseEnter={e => e.currentTarget.style.background = selected.includes(c.id) ? "#eff6ff" : "#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.background = selected.includes(c.id) ? "#eff6ff" : "transparent"}
                    >
                      {visibleColumns.checkbox && (
                        <td style={tdStyle}><input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelectOne(c.id)} /></td>
                      )}
                      {renderCell("name",
                        <span style={{ color: BLUE, cursor: "pointer", fontWeight: "500" }} onClick={() => toggleExpand(c.id)}>{getCustomerName(c)}</span>
                      )}
                      {renderCell("company", c.company_name || "—")}
                      {renderCell("email", c.email || "—")}
                      {renderCell("workPhone", c.work_phone || c.phone || "—")}
                      <td style={tdStyle}><StatusBadge isActive={c.is_active} /></td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => navigate('/customers/' + c.id)} style={{ padding: "4px 8px", background: "none", border: `1px solid ${BLUE}`, color: BLUE, borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}>View</button>
                          <button onClick={() => navigate('/customers/' + c.id + '/edit')} style={{ padding: "4px 8px", background: "none", border: "1px solid #94a3b8", color: "#64748b", borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}>Edit</button>
                          <button onClick={() => handleSingleDelete(c.id)} style={{ padding: "4px 8px", background: "none", border: "1px solid #ef4444", color: "#ef4444", borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}>Delete</button>
                          <button onClick={() => handleToggleStatus(c.id, c.is_active)} style={{ padding: "4px 8px", background: "none", border: "1px solid #d1d5db", color: "#475569", borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}>
                            {c.is_active ? 'Mark Inactive' : 'Mark Active'}
                          </button>
                        </div>
                      </td>
                      {renderCell("receivables", `₹${totalInvoiced.toFixed(2)}`)}
                      {renderCell("unusedCredits", "₹0.00")}
                    </tr>
                    {expandedId === c.id && (
                      <tr>
                        <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 2 || 1} style={{ padding: "0" }}>
                          {expandedLoading ? (
                            <div style={{ padding: "30px", background: "#f9fafb" }}>
                              <DetailSkeleton />
                            </div>
                          ) : expandedCustomer ? (
                            <div style={{ padding: "20px 30px", background: "#fff", borderTop: "1px solid #e2e8f0", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)" }}>
                              {/* Header */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "25px" }}>
                                <div>
                                  <h2 style={{ margin: 0 }}>{getCustomerName(expandedCustomer)}</h2>
                                  <p style={{ color: "gray", margin: "5px 0 0" }}>{expandedCustomer.email}</p>
                                  {!expandedCustomer.enable_portal && (
                                    <button onClick={() => handleInvitePortal(c.id)} style={{ ...primaryBtn, marginTop: "10px", fontSize: "13px" }}>Invite to Portal</button>
                                  )}
                                </div>
                                <div style={{ display: "flex", gap: "10px" }}>
                                  <button onClick={() => navigate(`/customers/${c.id}/edit`)} style={primaryBtn}>Edit</button>
                                  <div style={{ position: "relative" }}>
                                    <button onClick={() => setNewTransactionOpen(!newTransactionOpen)} style={{ ...primaryBtn, background: "#6c757d" }}>New Transaction ▾</button>
                                    {newTransactionOpen && (
                                      <div style={{ ...dropdownMenuStyle, right: 0, top: "100%", width: "180px" }}>
                                        <button style={menuItem} onClick={() => { setNewTransactionOpen(false); handleNewTransaction(c.id); }}>📄 Invoice</button>
                                        <button style={menuItem} onClick={() => { setNewTransactionOpen(false); toast("Payment feature coming soon"); }}>💰 Payment</button>
                                        <button style={menuItem} onClick={() => { setNewTransactionOpen(false); toast("Expense feature coming soon"); }}>📉 Expense</button>
                                        <button style={menuItem} onClick={() => { setNewTransactionOpen(false); toast("Project feature coming soon"); }}>📂 Project</button>
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ position: "relative" }}>
                                    <button onClick={() => setMoreOpen(!moreOpen)} style={secondaryBtn}>More ▾</button>
                                    {moreOpen && (
                                      <div style={{ ...dropdownMenuStyle, right: 0, top: "100%", width: "200px" }}>
                                        <button style={menuItem} onClick={async () => {
                                          setMoreOpen(false);
                                          try {
                                            const newStatus = !activeStatus;
                                            await apiRequest(`/customers/${c.id}`, { method: "PUT", body: JSON.stringify({ is_active: newStatus }) });
                                            toast.success(newStatus ? "Customer activated" : "Customer deactivated");
                                            setActiveStatus(newStatus);
                                            const res = await apiRequest(`/customers/${c.id}`);
                                            if (res) setExpandedCustomer(res.customer);
                                            fetchCustomers();
                                            fetchActivities(c.id);
                                          } catch (err) { toast.error("Failed to update status"); }
                                        }}>{activeStatus ? "Mark as Inactive" : "Mark as Active"}</button>
                                        <button style={menuItem} onClick={() => { setMoreOpen(false); toast("Invoice page coming soon"); }}>New Invoice</button>
                                        <button style={menuItem} onClick={() => { setMoreOpen(false); toast("Payment feature coming soon"); }}>New Payment</button>
                                        <button style={menuItem} onClick={() => { setMoreOpen(false); toast("Credit note feature coming soon"); }}>New Credit Note</button>
                                        <button style={menuItem} onClick={() => { setMoreOpen(false); setActiveTab("Transactions"); }}>View All Transactions</button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Tabs */}
                              <div style={{ display: "flex", borderBottom: "2px solid #e2e8f0", marginBottom: "30px" }}>
                                {["Overview", "Comments", "Transactions", "Mails", "Statement"].map((tab) => (
                                  <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(tab)}>{tab}</button>
                                ))}
                              </div>

                              {/* ===== OVERVIEW ===== */}
                              {activeTab === "Overview" && (
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
                                  <div>
                                    <h4>Billing Address</h4>
                                    <div style={cardStyle}>
                                      {billing ? (
                                        <>
                                          <p><strong>{billing.attention}</strong></p>
                                          <p>{billing.address_line1}</p>
                                          <p>{billing.address_line2}</p>
                                          <p>{billing.city}, {billing.state} {billing.pin_code}</p>
                                          <p>{billing.country}</p>
                                          <p>Phone: {billing.phone}</p>
                                          {billing.fax && <p>Fax: {billing.fax}</p>}
                                          <button onClick={() => navigate(`/customers/${c.id}/edit`)} style={{ background: "none", border: "none", color: "#4a90e2", cursor: "pointer", padding: 0, marginTop: "10px" }}>Edit Address</button>
                                        </>
                                      ) : (
                                        <div>
                                          <p style={{ color: "gray" }}>No billing address</p>
                                          <button onClick={() => navigate(`/customers/${c.id}/edit`)} style={{ background: "none", border: "none", color: "#4a90e2", cursor: "pointer", padding: 0 }}>+ New Address</button>
                                        </div>
                                      )}
                                    </div>
                                    <h4 style={{ marginTop: "20px" }}>Shipping Address</h4>
                                    <div style={cardStyle}>
                                      {shipping ? (
                                        <>
                                          <p><strong>{shipping.attention}</strong></p>
                                          <p>{shipping.address_line1}</p>
                                          <p>{shipping.address_line2}</p>
                                          <p>{shipping.city}, {shipping.state} {shipping.pin_code}</p>
                                          <p>{shipping.country}</p>
                                          <p>Phone: {shipping.phone}</p>
                                          {shipping.fax && <p>Fax: {shipping.fax}</p>}
                                        </>
                                      ) : (
                                        <div>
                                          <p style={{ color: "gray" }}>No shipping address</p>
                                          {billing && <button onClick={() => navigate(`/customers/${c.id}/edit`)} style={{ background: "none", border: "none", color: "#4a90e2", cursor: "pointer", padding: 0 }}>Copy from Billing</button>}
                                        </div>
                                      )}
                                    </div>
                                    <h4 style={{ marginTop: "20px" }}>Contact Persons</h4>
                                    <div style={cardStyle}>
                                      {expandedContacts.length === 0 ? (
                                        <div>
                                          <p style={{ color: "gray" }}>No contact persons.</p>
                                          <button onClick={() => navigate(`/customers/${c.id}/edit`)} style={{ background: "none", border: "none", color: "#4a90e2", cursor: "pointer", padding: 0 }}>+ Add Contact Person</button>
                                        </div>
                                      ) : (
                                        expandedContacts.map((p, idx) => (
                                          <div key={idx} style={{ marginBottom: "10px" }}>
                                            <p><strong>{[p.salutation, p.first_name, p.last_name].filter(Boolean).join(" ")}</strong></p>
                                            <p>Email: {p.email}</p>
                                            <p>Work Phone: {p.work_phone}</p>
                                            <p>Mobile: {p.mobile}</p>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <h4>Other Details</h4>
                                    <div style={cardStyle}>
                                      <p><strong>Customer Type:</strong> {expandedCustomer.customer_type}</p>
                                      <p><strong>Sub‑Type:</strong> {expandedCustomer.customer_sub_type || "—"}</p>
                                      <p><strong>Default Currency:</strong> {expandedCustomer.currency}</p>
                                      <p><strong>Postal Status:</strong> {expandedCustomer.enable_portal ? "Enabled" : "Disabled"}</p>
                                      <p><strong>Customer Language:</strong> {expandedCustomer.portal_language || expandedCustomer.language || "English"}</p>
                                      <p><strong>Payment Due Period:</strong> {expandedCustomer.payment_terms || "Due on Receipt"}</p>
                                    </div>

                                    <h4 style={{ marginTop: "20px" }}>Record Info</h4>
                                    <div style={cardStyle}>
                                      <div style={{ position: "relative", paddingLeft: "30px" }}>
                                        <div style={{ position: "absolute", left: 8, top: 8, bottom: 8, width: 2, background: "#e2e8f0" }} />
                                        {/* ✅ FIX: activities guaranteed [] so .length safe hai */}
                                        {activities.length === 0 ? (
                                          <p style={{ color: "gray" }}>No activity yet.</p>
                                        ) : (
                                          activities.map((act) => (
                                            <div key={act.id} style={{ marginBottom: "18px", position: "relative" }}>
                                              <div style={{
                                                position: "absolute", left: -26, top: 4, width: 12, height: 12, borderRadius: "50%",
                                                background: act.action_type === "created" ? "#4a90e2" : act.action_type === "status_changed" ? "#f39c12" : act.action_type === "comment_added" ? "#2ecc71" : "#95a5a6",
                                              }} />
                                              <p style={{ fontWeight: "bold", margin: 0 }}>{act.description}</p>
                                              <p style={{ margin: "2px 0", color: "gray", fontSize: "12px" }}>
                                                {new Date(act.created_at).toLocaleString()} ({timeAgo(act.created_at)}) · by {act.user_email}
                                              </p>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    </div>

                                    <h4 style={{ marginTop: "20px" }}>Receivables</h4>
                                    <div style={cardStyle}>
                                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                        <thead>
                                          <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                                            <th style={{ padding: "8px 0", textAlign: "left", color: "gray", fontWeight: "normal" }}>Currency</th>
                                            <th style={{ padding: "8px 0", textAlign: "left", color: "gray", fontWeight: "normal" }}>Outstanding Receivables</th>
                                            <th style={{ padding: "8px 0", textAlign: "left", color: "gray", fontWeight: "normal" }}>Unused Credits</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr>
                                            <td style={{ padding: "8px 0" }}>{expandedCustomer.currency}</td>
                                            <td style={{ padding: "8px 0", fontWeight: "500" }}>₹{balanceDue.toFixed(2)}</td>
                                            <td style={{ padding: "8px 0", fontWeight: "500" }}>₹0.00</td>
                                          </tr>
                                        </tbody>
                                      </table>
                                      {openingBalance === 0 && totalInvoiced === 0 && (
                                        <button onClick={() => navigate(`/customers/${c.id}/edit`)} style={{ ...primaryBtn, marginTop: "15px", fontSize: "13px" }}>Enter Opening Balance</button>
                                      )}
                                    </div>

                                    <h4 style={{ marginTop: "20px" }}>
                                      Total Income
                                      <select value={incomePeriod} onChange={(e) => setIncomePeriod(e.target.value)} style={{ marginLeft: "10px", padding: "4px", borderRadius: "5px", border: "1px solid #ccc", fontSize: "13px" }}>
                                        <option value="today">Today</option>
                                        <option value="thisWeek">This Week</option>
                                        <option value="thisMonth">This Month</option>
                                        <option value="last6Months">Last 6 Months</option>
                                        <option value="last12Months">Last 12 Months</option>
                                      </select>
                                    </h4>
                                    <div style={cardStyle}>
                                      {incomeChartData.length === 0 ? (
                                        <p style={{ textAlign: "center", color: "gray" }}>No invoice data for this period.</p>
                                      ) : (
                                        <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end", height: "180px", padding: "10px 0" }}>
                                          {incomeChartData.map((item) => (
                                            <div key={item.key} style={{ textAlign: "center", flex: 1 }}>
                                              <div style={{ height: `${(item.amount / chartMax) * 150}px`, width: "20px", background: "#4a90e2", borderRadius: "4px 4px 0 0", margin: "0 auto", transition: "height 0.3s" }}></div>
                                              <p style={{ fontSize: "10px", marginTop: "4px" }}>{item.month}</p>
                                              <p style={{ fontSize: "10px", color: "gray" }}>₹{item.amount.toFixed(0)}</p>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* ===== COMMENTS ===== */}
                              {activeTab === "Comments" && (
                                <div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                    <h3 style={{ margin: 0 }}>Comments</h3>
                                    <button onClick={addComment} style={primaryBtn} disabled={!newComment.trim()}>Add Comment</button>
                                  </div>
                                  <div style={{ marginBottom: "20px" }}>
                                    <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write a comment..." style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ccc", minHeight: "80px" }} />
                                  </div>
                                  {commentsLoading ? (<p>Loading comments...</p>
                                  ) : comments.length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "40px", color: "gray" }}>No comments yet.</div>
                                  ) : (
                                    <div>
                                      {comments.map((comment) => (
                                        <div key={comment.id} style={{ ...cardStyle, marginBottom: "10px" }}>
                                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                            <strong>{comment.author_name}</strong>
                                            <span style={{ color: "gray", fontSize: "12px" }}>{new Date(comment.created_at).toLocaleString()}</span>
                                          </div>
                                          <p style={{ margin: 0 }}>{comment.comment_text}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* ===== TRANSACTIONS ===== */}
                              {activeTab === "Transactions" && (
                                <div>
                                  <div style={{ display: "flex", gap: "30px", marginBottom: "30px", flexWrap: "wrap" }}>
                                    <StatBox label="Opening Balance" value={`₹${openingBalance.toFixed(2)}`} />
                                    <StatBox label="Invoiced Amount" value={`₹${totalInvoiced.toFixed(2)}`} />
                                    <StatBox label="Amount Received" value={`₹${amountReceived.toFixed(2)}`} />
                                    <StatBox label="Balance Due" value={`₹${balanceDue.toFixed(2)}`} highlight />
                                  </div>
                                  {[
                                    {
                                      title: "Invoices", content: invoicesLoading ? <p>Loading invoices...</p> : invoices.length === 0 ? (<div style={{ textAlign: "center", padding: "30px", color: "gray" }}><p>No invoices found.</p><button onClick={() => handleNewTransaction(expandedId)} style={{ ...primaryBtn, marginTop: "10px" }}>Add New</button></div>) : (
                                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                                          <thead><tr style={{ background: "#f1f5f9", textAlign: "left" }}><th style={thStyle}>Date</th><th style={thStyle}>Invoice #</th><th style={thStyle}>Amount</th><th style={thStyle}>Balance Due</th><th style={thStyle}>Status</th><th style={thStyle}>Actions</th></tr></thead>
                                          <tbody>{invoices.map((inv) => (<tr key={inv.id} style={{ borderBottom: "1px solid #e2e8f0" }}><td style={tdStyle}>{new Date(inv.invoice_date).toLocaleDateString()}</td><td style={tdStyle}>{inv.invoice_number || "—"}</td><td style={tdStyle}>₹{parseFloat(inv.total_amount).toFixed(2)}</td><td style={tdStyle}>₹{parseFloat(inv.balance_due).toFixed(2)}</td><td style={tdStyle}>{inv.status}</td><td style={tdStyle}><button onClick={() => navigate(`/invoices/${inv.id}`)} style={editBtnStyle}>View</button></td></tr>))}</tbody>
                                        </table>
                                      ), btn: "+ New Invoice", action: () => handleNewTransaction(expandedId)
                                    },
                                    { title: "Expenses", content: <div style={{ textAlign: "center", padding: "30px", color: "gray" }}>No expenses recorded yet.</div>, btn: "+ New Expense", action: () => toast("Expenses feature coming soon") },
                                    { title: "Projects", content: <div style={{ textAlign: "center", padding: "30px", color: "gray" }}>No projects yet.</div>, btn: "+ New Project", action: () => toast("Projects feature coming soon") },
                                    { title: "Journals", content: <div style={{ textAlign: "center", padding: "30px", color: "gray" }}>No journal entries found.</div>, btn: "+ New Journal", action: () => toast("Journals feature coming soon") },
                                    { title: "Bills", content: <div style={{ textAlign: "center", padding: "30px", color: "gray" }}>No bills recorded yet.</div>, btn: "+ New Bill", action: () => toast("Bills feature coming soon") },
                                    { title: "Credit Notes", content: <div style={{ textAlign: "center", padding: "30px", color: "gray" }}>No credit notes yet.</div>, btn: "+ New Credit Note", action: () => toast("Credit notes feature coming soon") },
                                    { title: "Customer Payments", content: <div style={{ textAlign: "center", padding: "30px", color: "gray" }}>No payments received or recorded yet.</div>, btn: "+ New Payment", action: () => toast("Payment feature coming soon") },
                                  ].map(({ title, content, btn, action }) => (
                                    <div key={title} style={{ marginBottom: "40px" }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                                        <h3 style={{ margin: 0 }}>{title}</h3>
                                        <button onClick={action} style={primaryBtn}>{btn}</button>
                                      </div>
                                      {content}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* ===== MAILS ===== */}
                              {activeTab === "Mails" && (
                                <div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                    <h3 style={{ margin: 0 }}>System Mails</h3>
                                    <button onClick={() => toast("Link email account feature coming soon")} style={primaryBtn}>Link Email Account</button>
                                  </div>
                                  <div style={{ textAlign: "center", padding: "60px", color: "gray" }}>
                                    <p style={{ fontSize: "16px" }}>No emails sent.</p>
                                    <p style={{ fontSize: "14px", marginTop: "10px" }}>System emails (e.g., statements, invoice reminders) will appear here once the email account is linked.</p>
                                  </div>
                                </div>
                              )}

                              {/* ===== STATEMENT ===== */}
                              {activeTab === "Statement" && (
                                <div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                    <h3 style={{ margin: 0 }}>Customer Statement</h3>
                                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                      <select value={statementPreset} onChange={(e) => { setStatementPreset(e.target.value); if (e.target.value !== "custom") setGeneratedStatement(null); }} style={dropdownStyle}>
                                        <option value="today">Today</option>
                                        <option value="thisWeek">This Week</option>
                                        <option value="thisMonth">This Month</option>
                                        <option value="thisYear">This Year</option>
                                        <option value="lifetime">Lifetime</option>
                                        <option value="custom">Custom</option>
                                      </select>
                                      {statementPreset === "custom" && (
                                        <>
                                          <input type="date" value={statementRange.from} onChange={(e) => setStatementRange({ ...statementRange, from: e.target.value })} style={inputStyle} />
                                          <span>to</span>
                                          <input type="date" value={statementRange.to} onChange={(e) => setStatementRange({ ...statementRange, to: e.target.value })} style={inputStyle} />
                                        </>
                                      )}
                                      <select value={statementFilter} onChange={(e) => setStatementFilter(e.target.value)} style={dropdownStyle}>
                                        <option value="all">All</option>
                                        <option value="outstanding">Outstanding</option>
                                      </select>
                                      <button onClick={handleGenerateStatement} disabled={statementLoading} style={primaryBtn}>{statementLoading ? "Generating..." : "Generate"}</button>
                                    </div>
                                  </div>
                                  {generatedStatement && (
                                    <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "20px", background: "#fff" }}>
                                      <div style={{ marginBottom: "20px", borderBottom: "1px solid #eee", paddingBottom: "15px" }}>
                                        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                                          <div style={{ flex: "1 1 200px" }}>
                                            <label style={labelStyle}>Organization Name</label>
                                            <input type="text" value={orgInfo.name} onChange={(e) => setOrgInfo({ ...orgInfo, name: e.target.value })} style={inputStyleLarge} />
                                          </div>
                                          <div style={{ flex: "1 1 200px" }}>
                                            <label style={labelStyle}>Organization Address</label>
                                            <textarea value={orgInfo.address} onChange={(e) => setOrgInfo({ ...orgInfo, address: e.target.value })} rows={2} style={inputStyleLarge} />
                                          </div>
                                          <div style={{ flex: "1 1 150px" }}>
                                            <label style={labelStyle}>Country</label>
                                            <input type="text" value={orgInfo.country} onChange={(e) => setOrgInfo({ ...orgInfo, country: e.target.value })} style={inputStyleLarge} />
                                          </div>
                                          <div style={{ flex: "1 1 200px" }}>
                                            <label style={labelStyle}>Email</label>
                                            <input type="email" value={orgInfo.email} onChange={(e) => setOrgInfo({ ...orgInfo, email: e.target.value })} style={inputStyleLarge} />
                                          </div>
                                        </div>
                                      </div>
                                      <div style={{ textAlign: "right", marginBottom: "20px" }}>
                                        <h2 style={{ margin: 0 }}>{orgInfo.name}</h2>
                                        <p style={{ margin: "2px 0" }}>{orgInfo.address}</p>
                                        <p style={{ margin: "2px 0" }}>{orgInfo.country}</p>
                                        <p style={{ margin: "2px 0" }}>{orgInfo.email}</p>
                                      </div>
                                      <h3 style={{ marginBottom: "5px" }}>Statement of Accounts</h3>
                                      <p style={{ margin: 0 }}>To: <strong>{getCustomerName(expandedCustomer)}</strong></p>
                                      <p style={{ margin: "5px 0" }}>Statement Period: <strong>{generatedStatement.from}</strong> to <strong>{generatedStatement.to}</strong></p>
                                      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
                                        <thead><tr style={{ background: "#f1f5f9" }}><th style={thStyle}>Account Summary</th><th style={thStyle}>Amount</th></tr></thead>
                                        <tbody>
                                          <tr><td style={tdStyle}>Opening Balance</td><td style={tdStyle}>₹{generatedStatement.openingBalance}</td></tr>
                                          <tr><td style={tdStyle}>Invoiced Amount</td><td style={tdStyle}>₹{generatedStatement.totalInvoiced}</td></tr>
                                          <tr><td style={tdStyle}>Amount Received</td><td style={tdStyle}>₹{generatedStatement.amountReceived}</td></tr>
                                          <tr style={{ fontWeight: "bold" }}><td style={tdStyle}>Balance Due</td><td style={tdStyle}>₹{generatedStatement.balanceDue}</td></tr>
                                        </tbody>
                                      </table>
                                      <h4 style={{ marginBottom: "10px" }}>Transactions</h4>
                                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                                        <thead><tr style={{ background: "#f1f5f9", textAlign: "left" }}><th style={thStyle}>Date</th><th style={thStyle}>Transactions</th><th style={thStyle}>Details</th><th style={thStyle}>Amount</th><th style={thStyle}>Payments</th><th style={thStyle}>Balance</th></tr></thead>
                                        <tbody>
                                          {generatedStatement.rows.length > 0 ? (
                                            generatedStatement.rows.map((row, i) => (
                                              <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                                <td style={tdStyle}>{row.date}</td><td style={tdStyle}>{row.transaction}</td><td style={tdStyle}>{row.details}</td>
                                                <td style={tdStyle}>₹{row.amount}</td><td style={tdStyle}>₹{row.payments}</td><td style={tdStyle}>₹{row.balance}</td>
                                              </tr>
                                            ))
                                          ) : (
                                            <tr><td colSpan={6} style={{ textAlign: "center", padding: "20px" }}>No transactions in this period.</td></tr>
                                          )}
                                        </tbody>
                                      </table>
                                      <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
                                        <button onClick={handlePrint} style={secondaryBtn}>🖨 Print</button>
                                        <button onClick={handleDownloadPDF} disabled={pdfLoading} style={{ ...secondaryBtn, opacity: pdfLoading ? 0.6 : 1 }}>{pdfLoading ? 'Generating PDF...' : '⬇ Download PDF'}</button>
                                        <button onClick={handleDownloadXLS} style={secondaryBtn}>XLS</button>
                                        <button onClick={openEmailModal} style={secondaryBtn}>✉ Send Email</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ padding: "20px", background: "#f9fafb" }}>Failed to load details.</div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Email Modal ── */}
        {emailModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '28px 32px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>✉ Send Statement by Email</h3>
                <button onClick={() => setEmailModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={modalLabelStyle}>To *</label>
                <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="recipient@example.com" style={modalInputStyle} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={modalLabelStyle}>Subject</label>
                <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} style={modalInputStyle} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={modalLabelStyle}>Message</label>
                <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={5} style={{ ...modalInputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '10px 14px', marginBottom: '20px', fontSize: '13px', color: '#0369a1' }}>
                📎 The Statement of Accounts PDF will be automatically attached to this email.
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setEmailModalOpen(false)} style={secondaryBtn} disabled={emailSending}>Cancel</button>
                <button onClick={handleSendEmail} disabled={emailSending || !emailTo.trim()} style={{ ...primaryBtn, opacity: (emailSending || !emailTo.trim()) ? 0.6 : 1 }}>
                  {emailSending ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const StatBox = ({ label, value, highlight }) => (
  <div style={{ background: highlight ? "#e8f4fd" : "#f9fafb", borderRadius: "8px", padding: "15px 25px", minWidth: "120px", textAlign: "center" }}>
    <div style={{ fontSize: "12px", color: "gray" }}>{label}</div>
    <div style={{ fontSize: "18px", fontWeight: "bold", color: highlight ? "#2563eb" : "#333" }}>{value}</div>
  </div>
);

const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "500" };
const secondaryBtn = { padding: "8px 16px", background: "#f0f0f0", color: "#333", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer" };
const dropdownStyle = { padding: "8px 12px", borderRadius: "5px", border: "1px solid #ccc", fontSize: "14px" };
const dropdownMenuStyle = { position: "absolute", right: 0, top: "100%", background: "#fff", borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 10, minWidth: "160px" };
const menuItem = { display: "block", width: "100%", padding: "8px 16px", border: "none", background: "none", textAlign: "left", cursor: "pointer", whiteSpace: "nowrap" };
const editBtnStyle = { padding: "5px 10px", background: "orange", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "5px" };
const inputStyle = { padding: "8px", borderRadius: "5px", border: "1px solid #ccc" };
const labelStyle = { display: "block", fontSize: "13px", fontWeight: "500", marginBottom: "5px", color: "#333" };
const inputStyleLarge = { width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc", boxSizing: "border-box" };
const modalLabelStyle = { display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' };
const modalInputStyle = { width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box', outline: 'none' };

export default Customers;