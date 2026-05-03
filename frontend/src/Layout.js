/**
 * Layout.js – Shared layout with Navbar and Outlet for nested routes
 * Dependencies: react-router-dom, Navbar
 */
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

function Layout() {
  return (
    <>
      <Navbar />
      <main style={{ paddingTop: '20px' }}>
        <Outlet />
      </main>
    </>
  );
}

export default Layout;