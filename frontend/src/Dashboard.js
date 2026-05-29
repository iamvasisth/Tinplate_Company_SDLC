/**
 * Dashboard.js – Main dashboard page content (Zoho Books style)
 * This component renders ONLY dashboard content.
 * The Sidebar and Topbar are provided by DashboardLayout.
 * Dependencies: AuthContext, react-router-dom, businessModules
 */
import React from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import businessModules from "./businessModules";
import "./Dashboard.css";

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const modules = businessModules[user?.business_type] || [];

  return (
    <>
      {/* Welcome section */}
      <section className="dash-welcome">
        <div className="dash-welcome-avatar">📋</div>
        <div>
          <h1 className="dash-welcome-title">
            Hello, {user?.email?.split("@")[0] || "User"}
          </h1>
          <p className="dash-welcome-sub">
            {user?.business_type || "Business Dashboard"}
          </p>
        </div>
      </section>

      {/* Tabs */}
      <section className="dash-tabs">
        <button className="dash-tab active">Dashboard</button>
        <button className="dash-tab">Fiscal Year-End Tasks</button>
        <button className="dash-tab">Getting Started ▾</button>
      </section>

      {/* Cards grid */}
      <section className="dash-cards-grid">
        {/* Total Receivables */}
        <DashCard title="Total Receivables" action="+ New">
          <p className="dash-muted">Total Unpaid Invoices</p>
          <h2 className="dash-amount">₹0.00</h2>
          <div className="dash-bar" />
          <div className="dash-legend">
            <span>
              <b className="dash-dot-blue" /> Current : ₹0.00
            </span>
            <span>
              <b className="dash-dot-orange" /> Overdue : ₹0.00 ▾
            </span>
          </div>
        </DashCard>

        {/* Total Payables */}
        <DashCard title="Total Payables" action="+ New">
          <p className="dash-muted">Total Unpaid Bills</p>
          <h2 className="dash-amount">₹0.00</h2>
          <div className="dash-bar" />
          <div className="dash-legend">
            <span>
              <b className="dash-dot-blue" /> Current : ₹0.00
            </span>
            <span>
              <b className="dash-dot-orange" /> Overdue : ₹0.00 ▾
            </span>
          </div>
        </DashCard>

        {/* Cash Flow (full width) */}
        <DashCard title="Cash Flow" dropdown="This Fiscal Year" wide>
          <div className="dash-cash-layout">
            <div className="dash-chart">
              {[5, 4, 3, 2, 1, 0].map((item) => (
                <div className="dash-chart-line" key={item}>
                  <span>{item}K</span>
                </div>
              ))}
              <div className="dash-months">
                {[
                  "Apr", "May", "Jun", "Jul", "Aug", "Sep",
                  "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
                ].map((month) => (
                  <small key={month}>{month}</small>
                ))}
              </div>
            </div>

            <div className="dash-cash-info">
              <p>Cash as on 01/04/2026</p>
              <h3>₹0.00</h3>
              <p className="dash-green-text">■ Incoming</p>
              <h3>₹0.00 (+)</h3>
              <p className="dash-red-text">■ Outgoing</p>
              <h3>₹0.00 (-)</h3>
            </div>
          </div>
        </DashCard>

        {/* Income and Expense */}
        <DashCard title="Income and Expense" dropdown="This Fiscal Year">
          <div className="dash-income-row">
            <div>
              <span className="dash-green-dot" /> Total Income
              <h2 className="dash-amount">₹0.00</h2>
            </div>
            <div>
              <span className="dash-red-dot" /> Total Expenses
              <h2 className="dash-amount">₹0.00</h2>
            </div>
            <div className="dash-accrual-cash">
              <span className="dash-badge">Accrual</span>
              <span className="dash-badge active">Cash</span>
            </div>
          </div>

          <div className="dash-mini-chart">
            {[5, 4, 3, 2, 1, 0].map((item) => (
              <div className="dash-chart-line" key={item}>
                <span>{item}K</span>
              </div>
            ))}
          </div>

          <p className="dash-note">
            * Income and expense values displayed are exclusive of taxes.
          </p>
        </DashCard>

        {/* Top Expenses */}
        <DashCard title="Top Expenses" dropdown="This Fiscal Year">
          <div className="dash-empty-box">
            No Expense recorded for this fiscal year
          </div>
        </DashCard>

        {/* Projects */}
        <DashCard title="Projects">
          <div className="dash-empty-box">
            No projects yet
          </div>
        </DashCard>

        {/* Bank and Credit Cards */}
        <DashCard title="Bank and Credit Cards">
          <div className="dash-empty-box">
            No bank accounts connected
          </div>
        </DashCard>
      </section>

      {/* Business Modules */}
      <section className="dash-modules">
        <h2>Business Modules</h2>
        <p className="dash-muted">Quick access to your available tools</p>

        <div className="dash-module-grid">
          {modules.length > 0 ? (
            modules.map((mod) => (
              <button
                key={mod.path}
                className="dash-module-card"
                onClick={() => navigate(mod.path)}
              >
                {mod.name}
              </button>
            ))
          ) : (
            <p className="dash-muted">No modules available.</p>
          )}
        </div>
      </section>
    </>
  );
}

/* ── Reusable card component ── */
function DashCard({ title, action, dropdown, wide, children }) {
  return (
    <article className={`dash-card ${wide ? "dash-card-wide" : ""}`}>
      <div className="dash-card-header">
        <h3>{title}</h3>
        {action && (
          <button className="dash-card-action">{action}</button>
        )}
        {dropdown && (
          <button className="dash-card-dropdown">{dropdown} ⌄</button>
        )}
      </div>
      <div className="dash-card-body">{children}</div>
    </article>
  );
}

export default Dashboard;