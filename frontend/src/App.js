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
import Customers from "./Customers";
import AddCustomer from "./AddCustomer";
import CustomerDetail from "./CustomerDetail";
import Quotes from "./Quotes";
import AddQuote from "./AddQuote";
import QuoteDetail from "./QuoteDetail";
import QuoteEmail from "./QuoteEmail";
import QuoteDocument from "./QuoteDocument";
import Invoices from "./Invoices";
import AddInvoice from "./AddInvoice";
import InvoiceDetail from "./InvoiceDetail";
import InvoiceDocument from "./InvoiceDocument";
import InvoicePreferences from "./InvoicePreferences";
import Expenses from "./Expenses";
import Banking from "./Banking";
import ImportMore from "./ImportMore";
import NewItem from "./NewItem";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages – NO sidebar, NO topbar */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Register />} />

        {/* Protected pages – DashboardLayout provides Sidebar + Topbar */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/items" element={<Items />} />
          <Route path="/items/new" element={<NewItem />} />
          <Route path="/items/:id" element={<AddItem />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/new" element={<AddCustomer />} />
          <Route path="/customers/:id/edit" element={<AddCustomer />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/contacts" element={<Navigate to="/customers" replace />} />
          <Route path="/quotes" element={<Quotes />} />
          <Route path="/quotes/new" element={<AddQuote />} />
          <Route path="/quotes/:id" element={<QuoteDetail />} />
          <Route path="/quotes/:id/edit" element={<AddQuote />} />
          <Route path="/quotes/:id/email" element={<QuoteEmail />} />
          <Route path="/quotes/:id/document" element={<QuoteDocument />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/new" element={<AddInvoice />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/invoices/:id/edit" element={<AddInvoice />} />
          <Route path="/invoices/preferences" element={<InvoicePreferences />} />
          <Route path="/invoices/:id/document" element={<InvoiceDocument />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/banking" element={<Banking />} />
          <Route path="/import_more" element={<ImportMore />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
