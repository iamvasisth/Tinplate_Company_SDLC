/**
 * App.js – Main router
 * Public pages: Login, Register (no sidebar/topbar)
 * Protected pages: use DashboardLayout (Sidebar + Topbar)
 */
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Dashboard";
import ProtectedRoute from "./ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import Items from "./Items";
import AddItem from "./AddItem";
import ItemDetail from "./ItemDetail";
import Customers from "./Customers";
import AddCustomer from "./AddCustomer";
import CustomerDetail from "./CustomerDetail";
import Quotes from "./Quotes";
import AddQuote from "./AddQuote";
import QuoteDetail from "./QuoteDetail";
import QuoteEmail from "./QuoteEmail";
import QuoteDocument from "./QuoteDocument";
import SalesOrders from "./SalesOrders";
import AddSalesOrder from "./AddSalesOrder";
import SalesOrderDetail from "./SalesOrderDetail";
import Invoices from "./Invoices";
import AddInvoice from "./AddInvoice";
import InvoiceDetail from "./InvoiceDetail";
import InvoiceDocument from "./InvoiceDocument";
import InvoicePreferences from "./InvoicePreferences";
import Expenses from "./Expenses";
import ProjectedPayments from "./ProjectedPayments";
import ProjectedExpenses from "./ProjectedExpenses";
import ImportMore from "./ImportMore";
// NewItem removed — AddItem handles both create and edit
import PlaceholderPage from "./components/PlaceholderPage";
import Vendors from "./Vendors";
import AddVendor from "./AddVendor";
import VendorDetail from "./VendorDetail";
import PurchaseOrders from "./PurchaseOrders";
import AddPurchaseOrder from "./AddPurchaseOrder";
import PurchaseOrderDetail from "./PurchaseOrderDetail";
import DeliveryChallans from "./DeliveryChallans";
import AddDeliveryChallan from "./AddDeliveryChallan";
import DeliveryChallanDetail from "./DeliveryChallanDetail";
import CreditNotes from "./CreditNotes";
import AddCreditNote from "./AddCreditNote";
import CreditNoteDetail from "./CreditNoteDetail";
import Bills from "./Bills";
import AddBill from "./AddBill";
import BillDetail from "./BillDetail";
import VendorCredits from "./VendorCredits";
import AddVendorCredit from "./AddVendorCredit";
import VendorCreditDetail from "./VendorCreditDetail";
import Projects from "./Projects";
import AddProject from "./AddProject";
import ProjectDetail from "./ProjectDetail";
import Timesheets from "./Timesheets";
import AddTimesheet from "./AddTimesheet";
import RecurringInvoices from "./RecurringInvoices";
import AddRecurringInvoice from "./AddRecurringInvoice";
import RecurringInvoiceDetail from "./RecurringInvoiceDetail";
import Taxes from "./Taxes";
import PaymentsReceived from "./PaymentsReceived";
import AddPaymentReceived from "./AddPaymentReceived";
import ChartOfAccounts from "./ChartOfAccounts";
import ManualJournals from "./ManualJournals";
import AddManualJournal from "./AddManualJournal";
import ManualJournalDetail from "./ManualJournalDetail";
import TransactionLocking from "./TransactionLocking";
import BulkUpdates from "./BulkUpdates";
import ReportsCenter from "./ReportsCenter";
import TrialBalance from "./TrialBalance";
import ProfitAndLoss from "./ProfitAndLoss";
import BalanceSheet from "./BalanceSheet";
import CashFlow from "./CashFlow";
import CustomerAgingReport from "./CustomerAgingReport";
import VendorAgingReport from "./VendorAgingReport";
import PaymentsMade from "./PaymentsMade";
import AddPaymentMade from "./AddPaymentMade";
import InventoryMovements from "./InventoryMovements";
import AddInventoryMovement from "./AddInventoryMovement";
import BankReconciliation from "./BankReconciliation";
import Documents from "./Documents";
import UploadDocument from "./UploadDocument";
import AddExpense from "./AddExpense";
import RecurringExpenses from "./RecurringExpenses";
import OrganizationSettings from "./OrganizationSettings";
import UsersRoles from "./UsersRoles";
import LandingPage from "./components/LandingPage";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import AccessDenied from "./AccessDenied";
import { MODULES, ACTIONS } from "./utils/permissions";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages – NO sidebar, NO topbar */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/access-denied" element={<AccessDenied />} />

        {/* Protected pages – DashboardLayout provides Sidebar + Topbar */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/items" element={<ProtectedRoute module={MODULES.ITEMS}><Items /></ProtectedRoute>} />
          <Route path="/items/new" element={<ProtectedRoute module={MODULES.ITEMS} action={ACTIONS.CREATE}><AddItem /></ProtectedRoute>} />
          <Route path="/items/:id/edit" element={<ProtectedRoute module={MODULES.ITEMS} action={ACTIONS.EDIT}><AddItem /></ProtectedRoute>} />
          <Route path="/items/:id" element={<ProtectedRoute module={MODULES.ITEMS}><ItemDetail /></ProtectedRoute>} />
          <Route path="/inventory/stock" element={<ProtectedRoute module={MODULES.ITEMS}><AddInventoryMovement /></ProtectedRoute>} />
          <Route path="/inventory/movements" element={<ProtectedRoute module={MODULES.ITEMS}><InventoryMovements /></ProtectedRoute>} />
          <Route path="/inventory/low-stock" element={<PlaceholderPage title="Low Stock Alerts" description="View items that are running low on stock." />} />
          <Route path="/reports/item-valuation" element={<PlaceholderPage title="Item Valuation Report" description="View the valuation of your current inventory." />} />
          <Route path="/customers" element={<ProtectedRoute module={MODULES.CUSTOMERS}><Customers /></ProtectedRoute>} />
          <Route path="/customers/new" element={<ProtectedRoute module={MODULES.CUSTOMERS} action={ACTIONS.CREATE}><AddCustomer /></ProtectedRoute>} />
          <Route path="/customers/:id/edit" element={<ProtectedRoute module={MODULES.CUSTOMERS} action={ACTIONS.EDIT}><AddCustomer /></ProtectedRoute>} />
          <Route path="/customers/:id" element={<ProtectedRoute module={MODULES.CUSTOMERS}><CustomerDetail /></ProtectedRoute>} />
          <Route path="/contacts" element={<Navigate to="/customers" replace />} />
          <Route path="/quotes" element={<ProtectedRoute module={MODULES.QUOTES}><Quotes /></ProtectedRoute>} />
          <Route path="/quotes/new" element={<ProtectedRoute module={MODULES.QUOTES} action={ACTIONS.CREATE}><AddQuote /></ProtectedRoute>} />
          <Route path="/quotes/:id" element={<ProtectedRoute module={MODULES.QUOTES}><QuoteDetail /></ProtectedRoute>} />
          <Route path="/quotes/:id/edit" element={<ProtectedRoute module={MODULES.QUOTES} action={ACTIONS.EDIT}><AddQuote /></ProtectedRoute>} />
          <Route path="/quotes/:id/email" element={<ProtectedRoute module={MODULES.QUOTES} action={ACTIONS.SEND}><QuoteEmail /></ProtectedRoute>} />
          <Route path="/quotes/:id/document" element={<ProtectedRoute module={MODULES.QUOTES}><QuoteDocument /></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute module={MODULES.INVOICES}><Invoices /></ProtectedRoute>} />
          <Route path="/invoices/new" element={<ProtectedRoute module={MODULES.INVOICES} action={ACTIONS.CREATE}><AddInvoice /></ProtectedRoute>} />
          <Route path="/invoices/:id" element={<ProtectedRoute module={MODULES.INVOICES}><InvoiceDetail /></ProtectedRoute>} />
          <Route path="/invoices/:id/edit" element={<ProtectedRoute module={MODULES.INVOICES} action={ACTIONS.EDIT}><AddInvoice /></ProtectedRoute>} />
          <Route path="/invoices/preferences" element={<ProtectedRoute module={MODULES.INVOICES}><InvoicePreferences /></ProtectedRoute>} />
          <Route path="/invoices/:id/document" element={<ProtectedRoute module={MODULES.INVOICES}><InvoiceDocument /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute module={MODULES.EXPENSES}><Expenses /></ProtectedRoute>} />
          <Route path="/expenses/new" element={<ProtectedRoute module={MODULES.EXPENSES} action={ACTIONS.CREATE}><AddExpense /></ProtectedRoute>} />
          <Route path="/expenses/:id/edit" element={<ProtectedRoute module={MODULES.EXPENSES} action={ACTIONS.EDIT}><AddExpense /></ProtectedRoute>} />
          <Route path="/projected-payments" element={<ProtectedRoute module={MODULES.BANKING}><ProjectedPayments /></ProtectedRoute>} />
          <Route path="/projected-expenses" element={<ProtectedRoute module={MODULES.EXPENSES}><ProjectedExpenses /></ProtectedRoute>} />
          <Route path="/import_more" element={<ImportMore />} />
          <Route path="/sales-orders" element={<SalesOrders />} />
          <Route path="/sales-orders/new" element={<AddSalesOrder />} />
          <Route path="/sales-orders/:id/edit" element={<AddSalesOrder />} />
          <Route path="/sales-orders/:id/document" element={<SalesOrderDetail />} />
          <Route path="/payments-received" element={<PaymentsReceived />} />
          <Route path="/payments-received/new" element={<AddPaymentReceived />} />
          <Route path="/delivery-challans" element={<DeliveryChallans />} />
          <Route path="/delivery-challans/new" element={<AddDeliveryChallan />} />
          <Route path="/delivery-challans/:id/edit" element={<AddDeliveryChallan />} />
          <Route path="/delivery-challans/:id/document" element={<DeliveryChallanDetail />} />
          <Route path="/recurring-invoices" element={<RecurringInvoices />} />
          <Route path="/recurring-invoices/new" element={<AddRecurringInvoice />} />
          <Route path="/recurring-invoices/:id/edit" element={<AddRecurringInvoice />} />
          <Route path="/recurring-invoices/:id" element={<RecurringInvoiceDetail />} />
          <Route path="/credit-notes" element={<CreditNotes />} />
          <Route path="/credit-notes/new" element={<AddCreditNote />} />
          <Route path="/credit-notes/:id/edit" element={<AddCreditNote />} />
          <Route path="/credit-notes/:id/document" element={<CreditNoteDetail />} />
          <Route path="/vendors" element={<ProtectedRoute module={MODULES.VENDORS}><Vendors /></ProtectedRoute>} />
          <Route path="/vendors/new" element={<ProtectedRoute module={MODULES.VENDORS} action={ACTIONS.CREATE}><AddVendor /></ProtectedRoute>} />
          <Route path="/vendors/:id/edit" element={<ProtectedRoute module={MODULES.VENDORS} action={ACTIONS.EDIT}><AddVendor /></ProtectedRoute>} />
          <Route path="/vendors/:id" element={<ProtectedRoute module={MODULES.VENDORS}><VendorDetail /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute module={MODULES.EXPENSES}><Expenses /></ProtectedRoute>} />
          <Route path="/expenses/new" element={<ProtectedRoute module={MODULES.EXPENSES} action={ACTIONS.CREATE}><AddExpense /></ProtectedRoute>} />
          <Route path="/expenses/:id/edit" element={<ProtectedRoute module={MODULES.EXPENSES} action={ACTIONS.EDIT}><AddExpense /></ProtectedRoute>} />
          <Route path="/recurring-expenses" element={<ProtectedRoute module={MODULES.EXPENSES}><RecurringExpenses /></ProtectedRoute>} />
          <Route path="/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/purchase-orders/new" element={<AddPurchaseOrder />} />
          <Route path="/purchase-orders/:id/edit" element={<AddPurchaseOrder />} />
          <Route path="/purchase-orders/:id/document" element={<PurchaseOrderDetail />} />
          <Route path="/bills" element={<ProtectedRoute module={MODULES.BILLS}><Bills /></ProtectedRoute>} />
          <Route path="/bills/new" element={<ProtectedRoute module={MODULES.BILLS} action={ACTIONS.CREATE}><AddBill /></ProtectedRoute>} />
          <Route path="/bills/:id/edit" element={<ProtectedRoute module={MODULES.BILLS} action={ACTIONS.EDIT}><AddBill /></ProtectedRoute>} />
          <Route path="/bills/:id/document" element={<ProtectedRoute module={MODULES.BILLS}><BillDetail /></ProtectedRoute>} />
          <Route path="/payments-made" element={<PaymentsMade />} />
          <Route path="/payments-made/new" element={<AddPaymentMade />} />
          <Route path="/vendor-credits" element={<VendorCredits />} />
          <Route path="/vendor-credits/new" element={<AddVendorCredit />} />
          <Route path="/vendor-credits/:id/edit" element={<AddVendorCredit />} />
          <Route path="/vendor-credits/:id/document" element={<VendorCreditDetail />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/new" element={<AddProject />} />
          <Route path="/projects/:id/edit" element={<AddProject />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/timesheets" element={<Timesheets />} />
          <Route path="/timesheets/new" element={<AddTimesheet />} />
          <Route path="/timesheets/:id/edit" element={<AddTimesheet />} />
          <Route path="/bank-accounts" element={<ProjectedPayments />} />
          <Route path="/bank-rules" element={<PlaceholderPage title="Bank Rules" description="Set up rules to automatically categorize bank transactions." />} />
          <Route path="/chart-of-accounts" element={<ChartOfAccounts />} />
          <Route path="/manual-journals" element={<ManualJournals />} />
          <Route path="/manual-journals/new" element={<AddManualJournal />} />
          <Route path="/manual-journals/:id/edit" element={<AddManualJournal />} />
          <Route path="/manual-journals/:id" element={<ManualJournalDetail />} />
          <Route path="/transaction-locking" element={<TransactionLocking />} />
          <Route path="/bulk-updates" element={<BulkUpdates />} />
          <Route path="/currency-adjustments" element={<PlaceholderPage title="Currency Adjustments" description="Manage exchange rate adjustments for foreign currencies." />} />
          <Route path="/taxes" element={<Taxes />} />
          <Route path="/reports" element={<ReportsCenter />} />
          <Route path="/reports/trial-balance" element={<TrialBalance />} />
          <Route path="/reports/profit-loss" element={<ProfitAndLoss />} />
          <Route path="/reports/balance-sheet" element={<BalanceSheet />} />
          <Route path="/reports/cash-flow" element={<CashFlow />} />
          <Route path="/reports/customer-aging" element={<CustomerAgingReport />} />
          <Route path="/payments-made" element={<PaymentsMade />} />
          <Route path="/payments-made/new" element={<AddPaymentMade />} />
          <Route path="/inventory-adjustments" element={<InventoryMovements />} />
          <Route path="/inventory-adjustments/new" element={<AddInventoryMovement />} />
          <Route path="/reconciliation" element={<BankReconciliation />} />
          <Route path="/reports/vendor-aging" element={<VendorAgingReport />} />
          <Route path="/reports/tax-summary" element={<PlaceholderPage title="Tax Summary" description="View a summary of taxes collected and paid." />} />
          <Route path="/organization-settings" element={<ProtectedRoute module={MODULES.SETTINGS}><OrganizationSettings /></ProtectedRoute>} />
          <Route path="/settings" element={<Navigate to="/organization-settings" replace />} />
          <Route path="/users-roles" element={<ProtectedRoute module={MODULES.USERS}><UsersRoles /></ProtectedRoute>} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/documents/upload" element={<UploadDocument />} />
          <Route path="/bulk-update" element={<PlaceholderPage title="Bulk Update" description="Update multiple records at once." />} />
          <Route path="/transaction-locking" element={<PlaceholderPage title="Transaction Locking" description="Lock transactions to prevent unauthorized changes." />} />
          <Route path="/composite-items" element={<PlaceholderPage title="Composite Items" description="Bundle multiple items into a single composite item." />} />
          <Route path="/price-lists" element={<PlaceholderPage title="Price Lists" description="Manage custom pricing for different customers." />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;