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
const thStyle = {
  padding: "12px 14px",
  borderBottom: "1px solid #eaecf0",
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase",
  color: "#475569",
  letterSpacing: "0.03em",
};
const tdStyle = {
  padding: "12px 14px",
  verticalAlign: "middle",
};

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
      const url = `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/customers/${expandedId}/statement/pdf?from=${range.from}&to=${range.to}`;
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
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/customers/${expandedId}/statement/send`,
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
    <div style={{ background: "#f8fafc", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif", color: "#1d2939" }}>
      <style>{`
        .premium-input {
          border: 1px solid #d0d5dd;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .premium-input:focus {
          border-color: #006ee6 !important;
          box-shadow: 0 0 0 4px rgba(0, 110, 230, 0.12) !important;
        }
        .tab-btn {
          padding: 12px 18px;
          cursor: pointer;
          font-weight: 500;
          font-size: 13px;
          color: #667085;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          transition: all 0.15s ease;
          outline: none;
        }
        .tab-btn:hover {
          color: #1d2939;
        }
        .tab-btn.active {
          color: #006ee6;
          border-bottom-color: #006ee6;
          font-weight: 600;
        }
        .hover-bg:hover {
          background-color: #f9fafb !important;
        }
        .timeline-line {
          position: absolute;
          left: 17px;
          top: 8px;
          bottom: 8px;
          width: 2px;
          background: #eaecf0;
        }
        .timeline-node {
          position: absolute;
          left: 12px;
          top: 4px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid #ffffff;
          box-shadow: 0 0 0 2px #d0d5dd;
          background: #ffffff;
        }
        .timeline-node.success { box-shadow: 0 0 0 2px #12b76a; background: #12b76a; }
        .timeline-node.warning { box-shadow: 0 0 0 2px #f79009; background: #f79009; }
        .timeline-node.primary { box-shadow: 0 0 0 2px #006ee6; background: #006ee6; }
        .action-icon-btn {
          border: 1px solid #d0d5dd;
          background: #ffffff;
          padding: 8px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #475569;
          transition: all 0.15s ease;
        }
        .action-icon-btn:hover {
          border-color: #98a2b3;
          background: #f9fafb;
          color: #1d2939;
        }
        .list-item-selected {
          background-color: #f0f6ff !important;
          border-left: 3.5px solid #006ee6 !important;
        }
        .list-item-normal {
          border-left: 3.5px solid transparent;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .list-item-normal:hover {
          background-color: #f8fafc;
        }
        .receivable-card {
          background: #f8fafc;
          border: 1px solid #eaecf0;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
        }
        
        /* Responsive Split Pane */
        @media (max-width: 768px) {
          .customers-main-container {
            flex-direction: column !important;
          }
          .customers-left-pane {
            width: 100% !important;
            min-width: 100% !important;
            border-right: none !important;
            border-bottom: 1px solid #eaecf0 !important;
            height: 400px;
            flex: none !important;
          }
          .customers-right-pane {
            width: 100% !important;
          }
          .customers-header-actions {
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 10px;
          }
          .customers-detail-tabs {
            overflow-x: auto;
            white-space: nowrap;
            padding-bottom: 5px;
          }
          .detail-header-row {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 15px;
          }
        }
      `}</style>

      {/* Main Container */}
      <div className="customers-main-container" style={{ display: "flex", minHeight: "100vh" }}>
        
        {/* ==================== LEFT PANE (Only in Split View) ==================== */}
        {expandedId !== null && (
          <div className="customers-left-pane" style={{ width: "320px", minWidth: "320px", borderRight: "1px solid #eaecf0", background: "#ffffff", display: "flex", flexDirection: "column" }}>
            
            {/* Left Header */}
            <div style={{ padding: "16px", borderBottom: "1px solid #eaecf0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <button 
                  onClick={() => setMenuOpen(!menuOpen)}
                  style={{ background: "none", border: "none", fontSize: "15px", fontWeight: "600", color: "#1d2939", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  {statusFilter === "all" ? "All Customers" : statusFilter === "active" ? "Active Customers" : "Inactive Customers"}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                
                {menuOpen && (
                  <div style={{ position: "absolute", left: 0, top: "100%", marginTop: "8px", background: "#ffffff", border: "1px solid #eaecf0", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.08)", zIndex: 100, minWidth: "180px" }}>
                    <button style={{ width: "100%", padding: "10px 14px", border: "none", background: "none", textAlign: "left", cursor: "pointer", fontSize: "13px", color: "#344054" }} onClick={() => { setStatusFilter("all"); setMenuOpen(false); }}>All Customers</button>
                    <button style={{ width: "100%", padding: "10px 14px", border: "none", background: "none", textAlign: "left", cursor: "pointer", fontSize: "13px", color: "#344054" }} onClick={() => { setStatusFilter("active"); setMenuOpen(false); }}>Active Customers</button>
                    <button style={{ width: "100%", padding: "10px 14px", border: "none", background: "none", textAlign: "left", cursor: "pointer", fontSize: "13px", color: "#344054" }} onClick={() => { setStatusFilter("inactive"); setMenuOpen(false); }}>Inactive Customers</button>
                    <div style={{ borderTop: "1px solid #eaecf0", margin: "4px 0" }}></div>
                    <button style={{ width: "100%", padding: "10px 14px", border: "none", background: "none", textAlign: "left", cursor: "pointer", fontSize: "13px", color: "#344054" }} onClick={handleRefresh}>🔄 Refresh List</button>
                    <button style={{ width: "100%", padding: "10px 14px", border: "none", background: "none", textAlign: "left", cursor: "pointer", fontSize: "13px", color: "#344054" }} onClick={handleImport}>📥 Import Contacts</button>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                {canAccess(user?.role, MODULES.CUSTOMERS, ACTIONS.CREATE) && (
                  <button 
                    onClick={() => navigate("/customers/new")} 
                    style={{ background: "#006ee6", color: "#ffffff", border: "none", borderRadius: "6px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "16px", fontWeight: "600" }}
                    title="Add Customer"
                  >
                    +
                  </button>
                )}
              </div>
            </div>

            {/* Left Search Bar */}
            <div style={{ padding: "12px", borderBottom: "1px solid #eaecf0", background: "#f8fafc" }}>
              <div style={{ position: "relative", width: "100%" }}>
                <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#98a2b3", fontSize: "12px" }}>🔍</span>
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => {
                    const newParams = new URLSearchParams(location.search);
                    if (e.target.value) newParams.set("search", e.target.value);
                    else newParams.delete("search");
                    navigate({ search: newParams.toString() }, { replace: true });
                  }}
                  style={{ width: "100%", padding: "8px 8px 8px 30px", borderRadius: "6px", border: "1px solid #d0d5dd", fontSize: "13px", boxSizing: "border-box", outline: "none", background: "#ffffff" }}
                />
              </div>
            </div>

            {/* Left Scrollable List */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filteredCustomers.length === 0 ? (
                <div style={{ padding: "40px 16px", textAlign: "center", color: "#667085", fontSize: "13px" }}>No customers found.</div>
              ) : (
                filteredCustomers.map((c) => {
                  const initials = getCustomerName(c).split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
                  const isSelected = expandedId === c.id;
                  
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleExpand(c.id)}
                      className={isSelected ? "list-item-selected" : "list-item-normal"}
                      style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid #eaecf0", background: "#ffffff" }}
                    >
                      <input 
                        type="checkbox" 
                        checked={selected.includes(c.id)} 
                        onChange={(e) => { e.stopPropagation(); toggleSelectOne(c.id); }} 
                        style={{ cursor: "pointer" }} 
                      />
                      
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: isSelected ? "#006ee6" : "#f2f4f7", color: isSelected ? "#ffffff" : "#475569", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "600" }}>
                        {initials || "C"}
                      </div>
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "#1d2939", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {getCustomerName(c)}
                        </div>
                        <div style={{ fontSize: "11px", color: "#667085", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "2px" }}>
                          {c.company_name || "No Company"}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "#344054" }}>
                          ₹{c.opening_balance ? parseFloat(c.opening_balance).toFixed(0) : "0"}
                        </div>
                        <div style={{ fontSize: "10px", color: c.is_active ? "#12b76a" : "#667085", fontWeight: "500", marginTop: "2px" }}>
                          {c.is_active ? "Active" : "Inactive"}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

        {/* ==================== RIGHT PANE / DETAIL OR FULL LIST ==================== */}
        <div className="customers-right-pane" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          
          {expandedId !== null ? (
            // ==================== DETAIL VIEW MODE ====================
            expandedLoading ? (
              <div style={{ padding: "40px" }}><DetailSkeleton /></div>
            ) : expandedCustomer ? (
              <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#ffffff" }}>
                
                {/* Detail View Header Banner */}
                <div className="detail-header-row" style={{ padding: "16px 24px", borderBottom: "1px solid #eaecf0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1d2939" }}>
                      {getCustomerName(expandedCustomer)}
                    </h2>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: activeStatus ? "#ecfdf5" : "#f2f4f7", border: `1px solid ${activeStatus ? "#a7f3d0" : "#d0d5dd"}`, padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "500", color: activeStatus ? "#047857" : "#475569" }}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: activeStatus ? "#10b981" : "#6b7280" }}></span>
                      {activeStatus ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Header Actions */}
                  <div className="customers-header-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button 
                      onClick={() => navigate(`/customers/${expandedCustomer.id}/edit`)} 
                      style={{ padding: "8px 14px", background: "#ffffff", border: "1px solid #d0d5dd", borderRadius: "6px", fontSize: "13px", fontWeight: "600", color: "#344054", cursor: "pointer", outline: "none" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                      onMouseLeave={e => e.currentTarget.style.background = "#ffffff"}
                    >
                      Edit
                    </button>
                    
                    <button 
                      className="action-icon-btn" 
                      title="Attach File"
                      onClick={() => toast("Attachments feature coming soon")}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                      </svg>
                    </button>

                    {/* New Transaction Dropdown */}
                    <div style={{ position: "relative" }}>
                      <button 
                        onClick={() => setNewTransactionOpen(!newTransactionOpen)} 
                        style={{ padding: "8px 14px", background: "#006ee6", color: "#ffffff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", outline: "none" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#0056b3"}
                        onMouseLeave={e => e.currentTarget.style.background = "#006ee6"}
                      >
                        New Transaction
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </button>
                      
                      {newTransactionOpen && (
                        <div style={{ position: "absolute", right: 0, top: "100%", marginTop: "6px", background: "#ffffff", border: "1px solid #eaecf0", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.08)", zIndex: 100, minWidth: "160px" }}>
                          <button style={menuItem} onClick={() => { setNewTransactionOpen(false); handleNewTransaction(expandedCustomer.id); }}>📄 Invoice</button>
                          <button style={menuItem} onClick={() => { setNewTransactionOpen(false); toast("Payment page coming soon"); }}>💰 Payment</button>
                          <button style={menuItem} onClick={() => { setNewTransactionOpen(false); toast("Expense page coming soon"); }}>📉 Expense</button>
                          <button style={menuItem} onClick={() => { setNewTransactionOpen(false); toast("Project page coming soon"); }}>📂 Project</button>
                        </div>
                      )}
                    </div>

                    {/* More Menu Dropdown */}
                    <div style={{ position: "relative" }}>
                      <button 
                        onClick={() => setMoreOpen(!moreOpen)} 
                        style={{ padding: "8px 14px", background: "#ffffff", border: "1px solid #d0d5dd", borderRadius: "6px", fontSize: "13px", fontWeight: "600", color: "#344054", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", outline: "none" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                        onMouseLeave={e => e.currentTarget.style.background = "#ffffff"}
                      >
                        More
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </button>

                      {moreOpen && (
                        <div style={{ position: "absolute", right: 0, top: "100%", marginTop: "6px", background: "#ffffff", border: "1px solid #eaecf0", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.08)", zIndex: 100, minWidth: "185px" }}>
                          <button style={menuItem} onClick={async () => {
                            setMoreOpen(false);
                            try {
                              const newStatus = !activeStatus;
                              await apiRequest(`/customers/${expandedCustomer.id}`, { method: "PUT", body: JSON.stringify({ is_active: newStatus }) });
                              toast.success(newStatus ? "Customer activated" : "Customer deactivated");
                              setActiveStatus(newStatus);
                              const res = await apiRequest(`/customers/${expandedCustomer.id}`);
                              if (res) setExpandedCustomer(res.customer);
                              fetchCustomers();
                              fetchActivities(expandedCustomer.id);
                            } catch (err) { toast.error("Failed to update status"); }
                          }}>
                            {activeStatus ? "Mark as Inactive" : "Mark as Active"}
                          </button>
                          <button style={menuItem} onClick={() => { setMoreOpen(false); handleNewTransaction(expandedCustomer.id); }}>New Invoice</button>
                          <button style={menuItem} onClick={() => { setMoreOpen(false); toast("Credit note page coming soon"); }}>New Credit Note</button>
                          <button style={menuItem} onClick={() => { setMoreOpen(false); setActiveTab("Transactions"); }}>View All Transactions</button>
                        </div>
                      )}
                    </div>

                    {/* Close Split View */}
                    <button 
                      onClick={() => setExpandedId(null)} 
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#98a2b3", display: "flex", padding: "4px", borderRadius: "4px", marginLeft: "6px" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f2f4f7"}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}
                    >
                      &times;
                    </button>
                  </div>

                </div>

                {/* Tabs Bar */}
                <div style={{ padding: "0 24px", borderBottom: "1px solid #eaecf0", display: "flex", gap: "6px", background: "#ffffff" }}>
                  {["Overview", "Comments", "Transactions", "Mails", "Statement"].map((tab) => (
                    <button 
                      key={tab} 
                      onClick={() => setActiveTab(tab)} 
                      className={`tab-btn ${activeTab === tab ? "active" : ""}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab Content Display Area */}
                <div style={{ flex: 1, overflowY: "auto", padding: "24px", background: "#ffffff" }}>
                  
                  {/* ===== TAB: OVERVIEW ===== */}
                  {activeTab === "Overview" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "32px", alignItems: "start" }}>
                      
                      {/* Left Column Details */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                        
                        <div>
                          <div style={{ fontSize: "12px", color: "#667085", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Company Name</div>
                          <div style={{ fontSize: "16px", fontWeight: "600", color: "#1d2939" }}>{expandedCustomer.company_name || "General store pvt ltd"}</div>
                        </div>

                        {/* Contact details card */}
                        <div style={{ border: "1px solid #eaecf0", borderRadius: "10px", padding: "20px", display: "flex", gap: "16px", background: "#fcfcfd" }}>
                          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#e0f2fe", color: "#0369a1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "600" }}>
                            {getCustomerName(expandedCustomer).split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "C"}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#1d2939", marginBottom: "4px" }}>{getCustomerName(expandedCustomer)}</div>
                            <div style={{ fontSize: "13px", color: "#475569", display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                              <span>✉</span>
                              <span>{expandedCustomer.email || "No Email Provided"}</span>
                            </div>
                            <div style={{ fontSize: "13px", color: "#475569", display: "flex", alignItems: "center", gap: "6px" }}>
                              <span>📞</span>
                              <span>{expandedCustomer.work_phone || expandedCustomer.phone || "No Phone Provided"}</span>
                            </div>
                            
                            {!expandedCustomer.enable_portal && (
                              <button 
                                onClick={() => handleInvitePortal(expandedCustomer.id)} 
                                style={{ background: "none", border: "none", color: "#006ee6", cursor: "pointer", fontSize: "12px", fontWeight: "600", padding: 0, marginTop: "12px", display: "flex", alignItems: "center", gap: "4px", outline: "none" }}
                              >
                                Invite to Portal →
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Addresses Card */}
                        <div>
                          <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.03em", fontWeight: "600" }}>Address</h4>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                            
                            {/* Billing */}
                            <div style={{ border: "1px solid #eaecf0", borderRadius: "8px", padding: "16px", background: "#ffffff" }}>
                              <div style={{ fontSize: "12px", fontWeight: "600", color: "#667085", marginBottom: "8px" }}>BILLING ADDRESS</div>
                              {billing ? (
                                <div style={{ fontSize: "13px", color: "#344054", lineHeight: "1.5" }}>
                                  <div style={{ fontWeight: "600" }}>{billing.attention}</div>
                                  <div>{billing.address_line1}</div>
                                  {billing.address_line2 && <div>{billing.address_line2}</div>}
                                  <div>{billing.city}, {billing.state} {billing.pin_code}</div>
                                  <div>{billing.country}</div>
                                  {billing.phone && <div style={{ marginTop: "4px", color: "#667085" }}>Phone: {billing.phone}</div>}
                                  <button onClick={() => navigate(`/customers/${expandedCustomer.id}/edit`)} style={{ background: "none", border: "none", color: "#006ee6", cursor: "pointer", padding: 0, marginTop: "10px", fontSize: "12px", fontWeight: "500", textDecoration: "underline" }}>Edit Billing</button>
                                </div>
                              ) : (
                                <div style={{ fontSize: "13px", color: "#667085" }}>
                                  No Billing Address configured.
                                  <button onClick={() => navigate(`/customers/${expandedCustomer.id}/edit`)} style={{ background: "none", border: "none", color: "#006ee6", cursor: "pointer", padding: 0, marginTop: "6px", display: "block", fontSize: "12px", fontWeight: "500" }}>+ Add Address</button>
                                </div>
                              )}
                            </div>

                            {/* Shipping */}
                            <div style={{ border: "1px solid #eaecf0", borderRadius: "8px", padding: "16px", background: "#ffffff" }}>
                              <div style={{ fontSize: "12px", fontWeight: "600", color: "#667085", marginBottom: "8px" }}>SHIPPING ADDRESS</div>
                              {shipping ? (
                                <div style={{ fontSize: "13px", color: "#344054", lineHeight: "1.5" }}>
                                  <div style={{ fontWeight: "600" }}>{shipping.attention}</div>
                                  <div>{shipping.address_line1}</div>
                                  {shipping.address_line2 && <div>{shipping.address_line2}</div>}
                                  <div>{shipping.city}, {shipping.state} {shipping.pin_code}</div>
                                  <div>{shipping.country}</div>
                                  {shipping.phone && <div style={{ marginTop: "4px", color: "#667085" }}>Phone: {shipping.phone}</div>}
                                </div>
                              ) : (
                                <div style={{ fontSize: "13px", color: "#667085" }}>
                                  No Shipping Address configured.
                                  {billing && <button onClick={() => navigate(`/customers/${expandedCustomer.id}/edit`)} style={{ background: "none", border: "none", color: "#006ee6", cursor: "pointer", padding: 0, marginTop: "6px", display: "block", fontSize: "12px", fontWeight: "500" }}>Copy from Billing</button>}
                                </div>
                              )}
                            </div>

                          </div>
                        </div>

                        {/* Contact Persons list */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                            <h4 style={{ margin: 0, fontSize: "13px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.03em", fontWeight: "600" }}>Contact Persons</h4>
                            <button onClick={() => navigate(`/customers/${expandedCustomer.id}/edit`)} style={{ background: "none", border: "none", color: "#006ee6", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>+ Add</button>
                          </div>
                          
                          <div style={{ border: "1px solid #eaecf0", borderRadius: "8px", overflow: "hidden" }}>
                            {expandedContacts.length === 0 ? (
                              <div style={{ padding: "16px", textAlign: "center", color: "#667085", fontSize: "13px" }}>No contact persons found.</div>
                            ) : (
                              expandedContacts.map((p, idx) => (
                                <div key={idx} style={{ padding: "12px 16px", borderBottom: idx === expandedContacts.length - 1 ? "none" : "1px solid #eaecf0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff" }}>
                                  <div>
                                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#1d2939" }}>{[p.salutation, p.first_name, p.last_name].filter(Boolean).join(" ")}</div>
                                    <div style={{ fontSize: "11px", color: "#667085", marginTop: "2px" }}>{p.email}</div>
                                  </div>
                                  <div style={{ fontSize: "12px", color: "#475569", textAlign: "right" }}>
                                    <div>{p.work_phone || p.mobile || "—"}</div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Other details */}
                        <div>
                          <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.03em", fontWeight: "600" }}>Other Details</h4>
                          <div style={{ border: "1px solid #eaecf0", borderRadius: "8px", background: "#fcfcfd", padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" }}>
                            <div>
                              <div style={{ fontSize: "11px", color: "#667085", fontWeight: "600" }}>CUSTOMER TYPE</div>
                              <div style={{ fontSize: "13px", fontWeight: "500", color: "#1d2939", marginTop: "4px" }}>{expandedCustomer.customer_type || "Business"}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: "11px", color: "#667085", fontWeight: "600" }}>DEFAULT CURRENCY</div>
                              <div style={{ fontSize: "13px", fontWeight: "500", color: "#1d2939", marginTop: "4px" }}>{expandedCustomer.currency || "INR"}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: "11px", color: "#667085", fontWeight: "600" }}>PAN</div>
                              <div style={{ fontSize: "13px", fontWeight: "500", color: "#1d2939", marginTop: "4px" }}>{expandedCustomer.pan || "LNOPKRF16"}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: "11px", color: "#667085", fontWeight: "600" }}>PORTAL STATUS</div>
                              <div style={{ fontSize: "13px", fontWeight: "500", color: expandedCustomer.enable_portal ? "#12b76a" : "#f04438", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: expandedCustomer.enable_portal ? "#10b981" : "#f04438" }}></span>
                                {expandedCustomer.enable_portal ? "Enabled" : "Disabled"}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: "11px", color: "#667085", fontWeight: "600" }}>CUSTOMER LANGUAGE</div>
                              <div style={{ fontSize: "13px", fontWeight: "500", color: "#1d2939", marginTop: "4px" }}>{expandedCustomer.portal_language || expandedCustomer.language || "English"}</div>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Right Column Details */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                        
                        {/* Payment Term */}
                        <div style={{ background: "#f8fafc", border: "1px solid #eaecf0", borderRadius: "8px", padding: "14px 18px", fontSize: "12px", color: "#475569" }}>
                          <span style={{ fontWeight: "600", color: "#1d2939" }}>Payment due period:</span> {expandedCustomer.payment_terms || "Due end of the month"}
                        </div>

                        {/* Receivables Card */}
                        <div className="receivable-card">
                          <h4 style={{ margin: "0 0 16px 0", fontSize: "12px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.03em", fontWeight: "600" }}>Receivables</h4>
                          
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr", borderBottom: "1px solid #eaecf0", paddingBottom: "12px", marginBottom: "12px", fontSize: "11px", fontWeight: "600", color: "#667085" }}>
                            <div>CURRENCY</div>
                            <div style={{ textAlign: "right" }}>OUTSTANDING RECEIVABLES</div>
                            <div style={{ textAlign: "right" }}>UNUSED CREDITS</div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr", fontSize: "13px", color: "#1d2939", fontWeight: "500" }}>
                            <div>{expandedCustomer.currency || "INR"}</div>
                            <div style={{ textAlign: "right", color: "#006ee6", fontWeight: "600" }}>₹{balanceDue.toFixed(2)}</div>
                            <div style={{ textAlign: "right", color: "#667085" }}>₹0.00</div>
                          </div>

                          {balanceDue === 0 && (
                            <button 
                              onClick={() => navigate(`/customers/${expandedCustomer.id}/edit`)} 
                              style={{ background: "none", border: "none", color: "#006ee6", cursor: "pointer", fontSize: "12px", fontWeight: "600", padding: 0, marginTop: "16px", textDecoration: "underline" }}
                            >
                              View Opening Balance
                            </button>
                          )}
                        </div>

                        {/* Income Graph */}
                        <div style={{ border: "1px solid #eaecf0", borderRadius: "10px", padding: "20px", background: "#ffffff" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <h4 style={{ margin: 0, fontSize: "12px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.03em", fontWeight: "600" }}>Income</h4>
                            <select 
                              value={incomePeriod} 
                              onChange={(e) => setIncomePeriod(e.target.value)} 
                              style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #d0d5dd", fontSize: "11px", background: "#ffffff", outline: "none", cursor: "pointer" }}
                            >
                              <option value="last6Months">Last 6 Months</option>
                              <option value="last12Months">Last 12 Months</option>
                              <option value="thisMonth">This Month</option>
                              <option value="thisWeek">This Week</option>
                            </select>
                          </div>

                          {incomeChartData.length === 0 ? (
                            <div style={{ padding: "40px 10px", textAlign: "center", color: "#667085", fontSize: "13px" }}>No income recorded yet.</div>
                          ) : (
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: "130px", paddingBottom: "10px", borderBottom: "1px solid #f2f4f7" }}>
                                {incomeChartData.map((item) => (
                                  <div key={item.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }} title={`₹${item.amount.toFixed(2)}`}>
                                    <div 
                                      style={{ 
                                        height: `${(item.amount / chartMax) * 100}px`, 
                                        width: "14px", 
                                        background: "#12b76a", 
                                        borderRadius: "3px 3px 0 0", 
                                        transition: "height 0.3s ease",
                                        minHeight: item.amount > 0 ? "4px" : "0" 
                                      }}
                                    ></div>
                                    <div style={{ fontSize: "9px", color: "#475569", marginTop: "6px", transform: "scale(0.95)" }}>{item.month}</div>
                                  </div>
                                ))}
                              </div>
                              <div style={{ fontSize: "11px", color: "#475569", fontWeight: "500", marginTop: "12px", textAlign: "center" }}>
                                Total Income ({incomePeriod === "last6Months" ? "Last 6 Months" : "Period"}) - <span style={{ fontWeight: "700", color: "#1d2939" }}>₹{incomeChartData.reduce((s,i)=>s+i.amount,0).toLocaleString("en-IN", {maximumFractionDigits: 2})}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Activity Log / Timeline */}
                        <div style={{ border: "1px solid #eaecf0", borderRadius: "10px", padding: "20px", background: "#ffffff" }}>
                          <h4 style={{ margin: "0 0 16px 0", fontSize: "12px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.03em", fontWeight: "600" }}>Timeline</h4>
                          
                          <div style={{ position: "relative", paddingLeft: "24px" }}>
                            <div className="timeline-line"></div>
                            
                            {activities.length === 0 ? (
                              <div style={{ fontSize: "13px", color: "#667085" }}>No recent activity.</div>
                            ) : (
                              activities.slice(0, 5).map((act) => {
                                const typeClass = act.action_type === "created" ? " timeline-node success" : act.action_type === "comment_added" ? " timeline-node primary" : " timeline-node warning";
                                
                                return (
                                  <div key={act.id} style={{ marginBottom: "20px", position: "relative" }}>
                                    <div className={typeClass}></div>
                                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#344054" }}>{act.description}</div>
                                    <div style={{ fontSize: "11px", color: "#667085", marginTop: "3px" }}>
                                      {new Date(act.created_at).toLocaleDateString()} {new Date(act.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} · {act.user_email || "System"}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                      </div>

                    </div>
                  )}

                  {/* ===== TAB: COMMENTS ===== */}
                  {activeTab === "Comments" && (
                    <div style={{ maxWidth: "700px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#344054" }}>Comments</h3>
                        <button onClick={addComment} style={{ padding: "8px 16px", background: "#006ee6", color: "#ffffff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }} disabled={!newComment.trim()}>Add Comment</button>
                      </div>
                      <div style={{ marginBottom: "20px" }}>
                        <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write a comment..." style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #d0d5dd", minHeight: "80px", outline: "none", fontSize: "13px", fontFamily: "inherit" }} className="premium-input" />
                      </div>
                      {commentsLoading ? (
                        <p>Loading comments...</p>
                      ) : comments.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px", color: "#667085", fontSize: "13px" }}>No comments yet.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {comments.map((comment) => (
                            <div key={comment.id} style={{ border: "1px solid #eaecf0", borderRadius: "8px", padding: "16px", background: "#fcfcfd" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                <strong style={{ fontSize: "13px", color: "#344054" }}>{comment.author_name}</strong>
                                <span style={{ color: "#667085", fontSize: "11px" }}>{new Date(comment.created_at).toLocaleString()}</span>
                              </div>
                              <p style={{ margin: 0, fontSize: "13px", color: "#475569", lineHeight: "1.5" }}>{comment.comment_text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ===== TAB: TRANSACTIONS ===== */}
                  {activeTab === "Transactions" && (
                    <div>
                      <div style={{ display: "flex", gap: "16px", marginBottom: "32px", flexWrap: "wrap" }}>
                        <StatBox label="Opening Balance" value={`₹${openingBalance.toFixed(2)}`} />
                        <StatBox label="Invoiced Amount" value={`₹${totalInvoiced.toFixed(2)}`} />
                        <StatBox label="Amount Received" value={`₹${amountReceived.toFixed(2)}`} />
                        <StatBox label="Balance Due" value={`₹${balanceDue.toFixed(2)}`} highlight />
                      </div>

                      {[
                        {
                          title: "Invoices", 
                          content: invoicesLoading ? (
                            <p>Loading invoices...</p>
                          ) : invoices.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "30px", color: "#667085" }}>
                              <p style={{ fontSize: "13px" }}>No invoices found.</p>
                              <button onClick={() => handleNewTransaction(expandedCustomer.id)} style={{ padding: "8px 14px", background: "#006ee6", color: "#ffffff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer", marginTop: "10px" }}>Add New</button>
                            </div>
                          ) : (
                            <div style={{ border: "1px solid #eaecf0", borderRadius: "8px", overflow: "hidden" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                                <thead>
                                  <tr style={{ background: "#f9fafb", textAlign: "left", borderBottom: "1px solid #eaecf0" }}>
                                    <th style={thStyle}>Date</th>
                                    <th style={thStyle}>Invoice #</th>
                                    <th style={thStyle}>Amount</th>
                                    <th style={thStyle}>Balance Due</th>
                                    <th style={thStyle}>Status</th>
                                    <th style={thStyle}>Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {invoices.map((inv) => (
                                    <tr key={inv.id} style={{ borderBottom: "1px solid #eaecf0" }}>
                                      <td style={tdStyle}>{new Date(inv.invoice_date).toLocaleDateString()}</td>
                                      <td style={tdStyle}>{inv.invoice_number || "—"}</td>
                                      <td style={tdStyle}>₹{parseFloat(inv.total_amount).toFixed(2)}</td>
                                      <td style={tdStyle}>₹{parseFloat(inv.balance_due).toFixed(2)}</td>
                                      <td style={tdStyle}>{inv.status}</td>
                                      <td style={tdStyle}>
                                        <button onClick={() => navigate(`/invoices/${inv.id}`)} style={{ padding: "4px 8px", background: "none", border: "1px solid #006ee6", color: "#006ee6", borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontWeight: "600" }}>View</button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ), 
                          btn: "+ New Invoice", 
                          action: () => handleNewTransaction(expandedCustomer.id)
                        },
                        { title: "Expenses", content: <div style={{ textAlign: "center", padding: "30px", color: "#667085", fontSize: "13px" }}>No expenses recorded yet.</div>, btn: "+ New Expense", action: () => toast("Expenses feature coming soon") },
                        { title: "Projects", content: <div style={{ textAlign: "center", padding: "30px", color: "#667085", fontSize: "13px" }}>No projects yet.</div>, btn: "+ New Project", action: () => toast("Projects feature coming soon") },
                      ].map(({ title, content, btn, action }) => (
                        <div key={title} style={{ marginBottom: "40px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#344054", textTransform: "uppercase", letterSpacing: "0.03em" }}>{title}</h3>
                            <button onClick={action} style={{ padding: "6px 12px", background: "#ffffff", border: "1px solid #d0d5dd", color: "#344054", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>{btn}</button>
                          </div>
                          {content}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ===== TAB: MAILS ===== */}
                  {activeTab === "Mails" && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#344054" }}>System Mails</h3>
                        <button onClick={() => toast("Link email account feature coming soon")} style={{ padding: "8px 14px", background: "#ffffff", border: "1px solid #d0d5dd", color: "#344054", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>Link Email Account</button>
                      </div>
                      <div style={{ textAlign: "center", padding: "60px", color: "#667085", background: "#fcfcfd", border: "1px dashed #eaecf0", borderRadius: "8px" }}>
                        <p style={{ fontSize: "14px", fontWeight: "600", color: "#344054", margin: 0 }}>No emails sent.</p>
                        <p style={{ fontSize: "12px", marginTop: "6px" }}>System emails (e.g., statements, invoice reminders) will appear here once the email account is linked.</p>
                      </div>
                    </div>
                  )}

                  {/* ===== TAB: STATEMENT ===== */}
                  {activeTab === "Statement" && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#344054" }}>Statement</h3>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                          <select value={statementPreset} onChange={(e) => { setStatementPreset(e.target.value); if (e.target.value !== "custom") setGeneratedStatement(null); }} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #d0d5dd", fontSize: "13px", outline: "none", background: "#ffffff", cursor: "pointer" }}>
                            <option value="today">Today</option>
                            <option value="thisWeek">This Week</option>
                            <option value="thisMonth">This Month</option>
                            <option value="thisYear">This Year</option>
                            <option value="lifetime">Lifetime</option>
                            <option value="custom">Custom Range</option>
                          </select>
                          
                          {statementPreset === "custom" && (
                            <>
                              <input type="date" value={statementRange.from} onChange={(e) => setStatementRange({ ...statementRange, from: e.target.value })} style={{ padding: "6px 8px", borderRadius: "6px", border: "1px solid #d0d5dd", fontSize: "13px" }} />
                              <span style={{ fontSize: "13px", color: "#667085" }}>to</span>
                              <input type="date" value={statementRange.to} onChange={(e) => setStatementRange({ ...statementRange, to: e.target.value })} style={{ padding: "6px 8px", borderRadius: "6px", border: "1px solid #d0d5dd", fontSize: "13px" }} />
                            </>
                          )}
                          
                          <select value={statementFilter} onChange={(e) => setStatementFilter(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #d0d5dd", fontSize: "13px", outline: "none", background: "#ffffff", cursor: "pointer" }}>
                            <option value="all">All transactions</option>
                            <option value="outstanding">Outstanding only</option>
                          </select>
                          
                          <button onClick={handleGenerateStatement} disabled={statementLoading} style={{ padding: "8px 16px", background: "#006ee6", color: "#ffffff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>{statementLoading ? "Generating..." : "Generate"}</button>
                        </div>
                      </div>

                      {generatedStatement && (
                        <div style={{ border: "1px solid #eaecf0", borderRadius: "10px", padding: "24px", background: "#ffffff", boxShadow: "0 4px 15px rgba(16,24,40,0.02)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #eaecf0", paddingBottom: "20px", marginBottom: "20px" }}>
                            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", flex: 1 }}>
                              <div style={{ minWidth: "180px" }}>
                                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#667085", marginBottom: "4px" }}>COMPANY NAME</label>
                                <input type="text" value={orgInfo.name} onChange={(e) => setOrgInfo({ ...orgInfo, name: e.target.value })} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #d0d5dd", fontSize: "13px", width: "100%", boxSizing: "border-box" }} />
                              </div>
                              <div style={{ minWidth: "220px" }}>
                                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#667085", marginBottom: "4px" }}>ADDRESS</label>
                                <textarea value={orgInfo.address} onChange={(e) => setOrgInfo({ ...orgInfo, address: e.target.value })} rows={2} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #d0d5dd", fontSize: "13px", width: "100%", boxSizing: "border-box", resize: "none" }} />
                              </div>
                              <div style={{ minWidth: "150px" }}>
                                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#667085", marginBottom: "4px" }}>EMAIL</label>
                                <input type="email" value={orgInfo.email} onChange={(e) => setOrgInfo({ ...orgInfo, email: e.target.value })} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #d0d5dd", fontSize: "13px", width: "100%", boxSizing: "border-box" }} />
                              </div>
                            </div>

                            <div style={{ textAlign: "right" }}>
                              <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "#1d2939" }}>{orgInfo.name}</h3>
                              <p style={{ margin: 0, fontSize: "12px", color: "#667085", lineHeight: "1.5" }}>{orgInfo.address}</p>
                              <p style={{ margin: 0, fontSize: "12px", color: "#667085" }}>{orgInfo.email}</p>
                            </div>
                          </div>

                          <div style={{ marginBottom: "24px" }}>
                            <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", color: "#1d2939" }}>Statement of Accounts</h3>
                            <div style={{ fontSize: "13px", color: "#475569" }}>To: <strong style={{ color: "#1d2939" }}>{getCustomerName(expandedCustomer)}</strong></div>
                            <div style={{ fontSize: "12px", color: "#667085", marginTop: "4px" }}>Period: {generatedStatement.from} to {generatedStatement.to}</div>
                          </div>

                          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px", fontSize: "13px" }}>
                            <thead>
                              <tr style={{ background: "#f9fafb" }}>
                                <th style={{ ...thStyle, borderBottom: "1.5px solid #eaecf0" }}>Account Summary</th>
                                <th style={{ ...thStyle, borderBottom: "1.5px solid #eaecf0", textAlign: "right" }}>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr style={{ borderBottom: "1px solid #eaecf0" }}><td style={tdStyle}>Opening Balance</td><td style={{ ...tdStyle, textAlign: "right" }}>₹{generatedStatement.openingBalance}</td></tr>
                              <tr style={{ borderBottom: "1px solid #eaecf0" }}><td style={tdStyle}>Invoiced Amount</td><td style={{ ...tdStyle, textAlign: "right" }}>₹{generatedStatement.totalInvoiced}</td></tr>
                              <tr style={{ borderBottom: "1px solid #eaecf0" }}><td style={tdStyle}>Amount Received</td><td style={{ ...tdStyle, textAlign: "right" }}>₹{generatedStatement.amountReceived}</td></tr>
                              <tr style={{ fontWeight: "700", borderBottom: "1.5px solid #d0d5dd", background: "#f8fafc" }}><td style={tdStyle}>Balance Due</td><td style={{ ...tdStyle, textAlign: "right", color: "#006ee6" }}>₹{generatedStatement.balanceDue}</td></tr>
                            </tbody>
                          </table>

                          <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#344054", textTransform: "uppercase", letterSpacing: "0.03em" }}>Transactions</h4>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", marginBottom: "24px" }}>
                            <thead>
                              <tr style={{ background: "#f9fafb", textAlign: "left", borderBottom: "1.5px solid #eaecf0" }}>
                                <th style={thStyle}>Date</th>
                                <th style={thStyle}>Transaction</th>
                                <th style={thStyle}>Details</th>
                                <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                                <th style={{ ...thStyle, textAlign: "right" }}>Payments</th>
                                <th style={{ ...thStyle, textAlign: "right" }}>Balance</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr style={{ borderBottom: "1px solid #eaecf0", fontStyle: "italic", color: "#667085" }}>
                                <td style={tdStyle}>{generatedStatement.from}</td>
                                <td style={tdStyle}>*** Opening Balance ***</td>
                                <td style={tdStyle}></td>
                                <td style={{ ...tdStyle, textAlign: "right" }}>₹{generatedStatement.openingBalance}</td>
                                <td style={{ ...tdStyle, textAlign: "right" }}></td>
                                <td style={{ ...tdStyle, textAlign: "right" }}>₹{generatedStatement.openingBalance}</td>
                              </tr>
                              {generatedStatement.rows.map((row, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid #eaecf0" }}>
                                  <td style={tdStyle}>{row.date}</td>
                                  <td style={tdStyle}>{row.transaction}</td>
                                  <td style={tdStyle}>{row.details}</td>
                                  <td style={{ ...tdStyle, textAlign: "right" }}>₹{row.amount}</td>
                                  <td style={{ ...tdStyle, textAlign: "right" }}>₹{row.payments}</td>
                                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600" }}>₹{row.balance}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button onClick={handlePrint} style={{ padding: "8px 16px", background: "#ffffff", border: "1px solid #d0d5dd", borderRadius: "6px", fontSize: "13px", color: "#344054", cursor: "pointer", fontWeight: "600" }}>🖨 Print</button>
                            <button onClick={handleDownloadPDF} disabled={pdfLoading} style={{ padding: "8px 16px", background: "#ffffff", border: "1px solid #d0d5dd", borderRadius: "6px", fontSize: "13px", color: "#344054", cursor: "pointer", fontWeight: "600" }}>{pdfLoading ? 'Generating PDF...' : '⬇ Download PDF'}</button>
                            <button onClick={handleDownloadXLS} style={{ padding: "8px 16px", background: "#ffffff", border: "1px solid #d0d5dd", borderRadius: "6px", fontSize: "13px", color: "#344054", cursor: "pointer", fontWeight: "600" }}>📥 XLS / CSV</button>
                            <button onClick={openEmailModal} style={{ padding: "8px 16px", background: "#006ee6", color: "#ffffff", border: "none", borderRadius: "6px", fontSize: "13px", cursor: "pointer", fontWeight: "600" }}>✉ Send Email</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>

              </div>
            ) : (
              <div style={{ padding: "40px", textAlign: "center" }}>Customer not found.</div>
            )
          ) : (
            // ==================== FULL LIST VIEW MODE ====================
            <div style={{ padding: "32px", maxWidth: "1280px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
              
              {/* List Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                  <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#1d2939", margin: 0 }}>Customers</h2>
                  <p style={{ color: "#667085", margin: "4px 0 0", fontSize: "13px" }}>Showing {filteredCustomers.length} customers</p>
                </div>
                
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)} 
                    style={{ padding: "9px 12px", borderRadius: "6px", border: "1px solid #d0d5dd", outline: "none", color: "#344054", fontSize: "13px", background: "#ffffff", cursor: "pointer" }}
                  >
                    <option value="all">All Customers</option>
                    <option value="active">Active Customers</option>
                    <option value="inactive">Inactive Customers</option>
                  </select>
                  
                  {canAccess(user?.role, MODULES.CUSTOMERS, ACTIONS.CREATE) && (
                    <button 
                      onClick={() => navigate("/customers/new")} 
                      style={{ background: "#006ee6", color: "#ffffff", borderRadius: "6px", padding: "10px 18px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#0056b3"}
                      onMouseLeave={e => e.currentTarget.style.background = "#006ee6"}
                    >
                      + New Customer
                    </button>
                  )}

                  <div style={{ position: "relative" }}>
                    <button 
                      onClick={() => setMenuOpen(!menuOpen)} 
                      style={{ background: "#ffffff", border: "1px solid #d0d5dd", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#344054" }}
                    >
                      ☰
                    </button>
                    
                    {menuOpen && (
                      <div style={{ position: "absolute", right: 0, top: "100%", marginTop: "6px", background: "#ffffff", border: "1px solid #eaecf0", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.08)", zIndex: 100, minWidth: "160px" }}>
                        <button style={menuItem} onClick={handleRefresh}>🔄 Refresh</button>
                        <button style={menuItem} onClick={handleImport}>📥 Import Contacts</button>
                        <div style={{ borderTop: "1px solid #eaecf0", margin: "4px 0" }}></div>
                        <button style={menuItem} onClick={() => setColumnsOpen(!columnsOpen)}>📋 Columns ▸</button>
                        
                        {columnsOpen && (
                          <div style={{ position: "absolute", right: "100%", top: 0, marginRight: "4px", background: "#ffffff", border: "1px solid #eaecf0", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.08)", zIndex: 100, minWidth: "180px" }}>
                            {ALL_COLUMNS.filter((c) => c.key !== "checkbox").map((col) => (
                              <label key={col.key} style={{ display: "flex", alignItems: "center", padding: "8px 14px", cursor: "pointer" }}>
                                <input type="checkbox" checked={visibleColumns[col.key] || false} onChange={() => setVisibleColumns((prev) => ({ ...prev, [col.key]: !prev[col.key] }))} />
                                <span style={{ marginLeft: "8px", fontSize: "13px", color: "#344054" }}>{col.label}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* List Search Bar */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ position: "relative", width: "100%" }}>
                  <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#98a2b3" }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search by name, email or company..."
                    value={searchQuery}
                    onChange={(e) => {
                      const newParams = new URLSearchParams(location.search);
                      if (e.target.value) newParams.set("search", e.target.value);
                      else newParams.delete("search");
                      navigate({ search: newParams.toString() }, { replace: true });
                    }}
                    style={{ width: "100%", padding: "12px 12px 12px 42px", borderRadius: "8px", border: "1px solid #d0d5dd", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
                    className="premium-input"
                  />
                </div>
              </div>

              {/* Bulk Actions Banner */}
              {selected.length > 0 && (
                <div style={{ background: "#f0f6ff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
                  <span style={{ color: "#0369a1", fontWeight: "600", fontSize: "13px" }}>{selected.length} customer(s) selected</span>
                  <button onClick={deleteSelected} style={{ background: "#d92d20", color: "#ffffff", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>Delete Selected</button>
                  <button onClick={() => setSelected([])} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: "12px", textDecoration: "underline" }}>Cancel</button>
                </div>
              )}

              {/* Table List Layout */}
              <div style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #eaecf0", boxShadow: "0 1px 3px rgba(16, 24, 40, 0.05)", overflow: "hidden" }}>
                {loading ? (
                  <TableSkeleton rows={8} columns={6} />
                ) : filteredCustomers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '80px 20px', color: '#98a2b3' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                    <h3 style={{ color: '#1d2939', marginBottom: '8px', fontSize: "16px", fontWeight: "600" }}>No customers found</h3>
                    <p style={{ marginBottom: '20px', fontSize: "13px" }}>{searchQuery ? 'No customers match your search.' : 'Start by adding your first customer.'}</p>
                    {!searchQuery && canAccess(user?.role, MODULES.CUSTOMERS, ACTIONS.CREATE) && (
                      <button onClick={() => navigate('/customers/new')} style={{ background: "#006ee6", color: "#ffffff", borderRadius: "6px", padding: "10px 20px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>+ New Customer</button>
                    )}
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ background: "#f9fafb", textAlign: "left", borderBottom: "1px solid #eaecf0" }}>
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
                          {renderHeader("receivables", "Receivables")}
                          {renderHeader("unusedCredits", "Unused Credits")}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCustomers.map((c) => (
                          <tr
                            key={c.id}
                            style={{ borderBottom: "1px solid #eaecf0", background: selected.includes(c.id) ? "#f0f6ff" : "transparent" }}
                            className="hover-bg"
                          >
                            {visibleColumns.checkbox && (
                              <td style={tdStyle}><input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelectOne(c.id)} /></td>
                            )}
                            {renderCell("name",
                              <span style={{ color: "#006ee6", cursor: "pointer", fontWeight: "600" }} onClick={() => toggleExpand(c.id)}>{getCustomerName(c)}</span>
                            )}
                            {renderCell("company", c.company_name || "—")}
                            {renderCell("email", c.email || "—")}
                            {renderCell("workPhone", c.work_phone || c.phone || "—")}
                            <td style={tdStyle}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: c.is_active ? "#ecfdf5" : "#f2f4f7", border: `1px solid ${c.is_active ? "#a7f3d0" : "#d0d5dd"}`, padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "500", color: c.is_active ? "#047857" : "#475569" }}>
                                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: c.is_active ? "#10b981" : "#6b7280" }}></span>
                                {c.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td style={tdStyle}>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button onClick={() => navigate('/customers/' + c.id)} style={{ padding: "4px 8px", background: "none", border: "1px solid #d0d5dd", color: "#344054", borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontWeight: "500" }}>View</button>
                                <button onClick={() => navigate('/customers/' + c.id + '/edit')} style={{ padding: "4px 8px", background: "none", border: "1px solid #d0d5dd", color: "#344054", borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontWeight: "500" }}>Edit</button>
                                <button onClick={() => handleSingleDelete(c.id)} style={{ padding: "4px 8px", background: "none", border: "1px solid #fecdca", color: "#d92d20", borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontWeight: "500" }}>Delete</button>
                                <button onClick={() => handleToggleStatus(c.id, c.is_active)} style={{ padding: "4px 8px", background: "none", border: "1px solid #d0d5dd", color: "#344054", borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontWeight: "500" }}>
                                  {c.is_active ? 'Mark Inactive' : 'Mark Active'}
                                </button>
                              </div>
                            </td>
                            {renderCell("receivables", `₹${c.opening_balance ? parseFloat(c.opening_balance).toFixed(2) : "0.00"}`)}
                            {renderCell("unusedCredits", "₹0.00")}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>

      {/* ── Email Modal ── */}
      {emailModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: "blur(4px)", zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '28px 32px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 40px rgba(0,0,0,0.12)', border: "1px solid #eaecf0" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1d2939' }}>✉ Send Statement by Email</h3>
              <button onClick={() => setEmailModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#98a2b3' }}>✕</button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={modalLabelStyle}>To *</label>
                <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="recipient@example.com" style={modalInputStyle} className="premium-input" />
              </div>
              <div>
                <label style={modalLabelStyle}>Subject</label>
                <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} style={modalInputStyle} className="premium-input" />
              </div>
              <div>
                <label style={modalLabelStyle}>Message</label>
                <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={5} style={{ ...modalInputStyle, resize: 'vertical', fontFamily: 'inherit' }} className="premium-input" />
              </div>
            </div>

            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '12px 14px', margin: '20px 0', fontSize: '12px', color: '#0284c7', fontWeight: "500" }}>
              📎 The Statement of Accounts PDF will be automatically attached to this email.
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEmailModalOpen(false)} style={{ padding: "8px 16px", background: "#ffffff", color: "#344054", border: "1px solid #d0d5dd", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }} disabled={emailSending}>Cancel</button>
              <button onClick={handleSendEmail} disabled={emailSending || !emailTo.trim()} style={{ padding: "8px 16px", background: "#006ee6", color: "#ffffff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer", opacity: (emailSending || !emailTo.trim()) ? 0.6 : 1 }}>
                {emailSending ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const StatBox = ({ label, value, highlight }) => (
  <div style={{ background: highlight ? "#f0f6ff" : "#f8fafc", border: `1px solid ${highlight ? "#bae6fd" : "#eaecf0"}`, borderRadius: "8px", padding: "14px 20px", flex: 1, minWidth: "120px", textAlign: "center" }}>
    <div style={{ fontSize: "11px", color: "#667085", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
    <div style={{ fontSize: "16px", fontWeight: "700", color: highlight ? "#006ee6" : "#344054", marginTop: "6px" }}>{value}</div>
  </div>
);



const labelStyle = {
  display: "block",
  fontSize: "11px",
  fontWeight: "600",
  color: "#667085",
  marginBottom: "4px",
  textTransform: "uppercase",
};

const inputStyle = {
  padding: "6px 8px",
  borderRadius: "6px",
  border: "1px solid #d0d5dd",
  fontSize: "13px",
  outline: "none",
};

const inputStyleLarge = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: "6px",
  border: "1px solid #d0d5dd",
  fontSize: "13px",
  boxSizing: "border-box",
};

const menuItem = {
  display: "block",
  width: "100%",
  padding: "10px 14px",
  border: "none",
  background: "none",
  textAlign: "left",
  cursor: "pointer",
  fontSize: "13px",
  color: "#344054",
  transition: "background 0.1s ease",
};

const modalLabelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '600',
  color: '#344054',
  marginBottom: '6px',
};

const modalInputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '6px',
  border: '1px solid #d0d5dd',
  fontSize: '13px',
  boxSizing: 'border-box',
  outline: 'none',
};

export default Customers;