/**
 * App.js – Main router with shared Navbar layout
 * Dependencies: react-router-dom, React components
 */
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Items from "./Items";
import Login from "./Login";
import Dashboard from "./Dashboard";
import CustomerDetail from './CustomerDetail';
import ProtectedRoute from "./ProtectedRoute";
import Register from "./Register";
import Layout from "./Layout";
import AddItem from './AddItem';
import Customers from './Customers';
import ImportMore from './ImportMore';
import AddCustomer from './AddCustomer';


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
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Future routes can be added here */}
          <Route path="/items" element={<Items />} />
            <Route path="/items/new" element={<AddItem />} />
          <Route path="/items/:id" element={<AddItem />}
          />
          <Route path="/import_more" element={<ImportMore />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/new" element={<AddCustomer />} />
          <Route path="/customers/:id/edit" element={<AddCustomer />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/contacts" element={<Navigate to="/customers" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
