/**
 * DashboardLayout.js – Shared layout for authenticated ERP pages
 * Structure: Fixed Sidebar + Main content (Topbar + Page Content)
 * Dependencies: Sidebar, Topbar, react-router-dom (Outlet)
 */
import React, { useState, useCallback, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "./DashboardLayout.css";

function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const handleResize = useCallback(() => {
    setIsMobile(window.innerWidth <= 768);
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  return (
    <div className={`dashboard-layout ${sidebarCollapsed && !isMobile ? "sidebar-collapsed" : ""}`}>
      <Sidebar onCollapseChange={setSidebarCollapsed} />
      <main className="dashboard-main">
        <Topbar />
        <div className="dashboard-page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default DashboardLayout;
