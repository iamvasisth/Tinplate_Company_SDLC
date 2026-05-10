/**
 * App.js – Main router with shared Navbar layout
 * Dependencies: react-router-dom, React components
 */
import AddQuote from "./AddQuote";
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Items from "./Items";
import Login from "./Login";
import InvoiceDetail from "./InvoiceDetail";
import QuoteEmail from "./QuoteEmail";
import Dashboard from "./Dashboard";
import CustomerDetail from "./CustomerDetail";
import ProtectedRoute from "./ProtectedRoute";
import InvoicePreferences from "./InvoicePreferences";
import InvoiceDocument from "./InvoiceDocument";
import Register from "./Register";
import Quotes from "./Quotes";
import Layout from "./Layout";
import Invoices from "./Invoices";
import QuoteDetail from "./QuoteDetail";
import AddItem from "./AddItem";
import Customers from "./Customers";
import Expenses from "./Expenses";
import ImportMore from "./ImportMore";
import QuoteDocument from "./QuoteDocument";
import AddCustomer from "./AddCustomer";
import AddInvoice from "./AddInvoice";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages (no Navbar) */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes wrapped in Layout -> Navbar visible on all */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/quotes" element={<Quotes />} />
          <Route path="/quotes/new" element={<AddQuote />} />
          <Route path="/quotes/:id" element={<QuoteDetail />} />
          <Route path="/quotes/:id/email" element={<QuoteEmail />} />
          <Route path="/quotes/:id/document" element={<QuoteDocument />} />
          <Route path="/dashboard" element={<Dashboard />} />
          {/* Invoice Routes */}
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/new" element={<AddInvoice />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route
            path="/invoices/preferences"
            element={<InvoicePreferences />}
          />

          <Route path="/invoices/:id/document" element={<InvoiceDocument />} />

          <Route path="/expenses" element={<Expenses />} />
          {/* Future routes can be added here */}
          <Route path="/items" element={<Items />} />
          <Route path="/items/new" element={<AddItem />} />
          <Route path="/items/:id" element={<AddItem />} />
          <Route path="/import_more" element={<ImportMore />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/new" element={<AddCustomer />} />
          <Route path="/customers/:id/edit" element={<AddCustomer />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route
            path="/contacts"
            element={<Navigate to="/customers" replace />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
