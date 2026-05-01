/**
 * App.js – Main router for Tinplate Accounting App
 * Dependencies: react-router-dom, React components
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './Login';
import Dashboard from './Dashboard';
import Contacts from './Contacts';
import ProtectedRoute from './ProtectedRoute';
import Register from './Register';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public login page – accessible at root */}
        <Route path="/" element={<Login />} />

        {/* Redirect /login to / (avoids 404) */}
        <Route path="/login" element={<Navigate to="/" replace />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/contacts"
          element={
            <ProtectedRoute>
              <Contacts />
            </ProtectedRoute>
          }
        />
      </Routes>
      {/* Registration route */}
      <Routes>
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}


export default App;