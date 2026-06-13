import React, { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { CardSkeleton } from "./components/skeletons";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import { IndianRupee, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';
import "./Dashboard.css";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [financeData, setFinanceData] = useState(null);
  const [projectedData, setProjectedData] = useState(null);
  const [projectedExpensesData, setProjectedExpensesData] = useState(null);
  const [loading, setLoading] = useState(true);

  const monthNames = [
    { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
    { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
    { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
    { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" }
  ];
  const years = [currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // We use the same endpoint, which now provides chartData alongside top_summary
        const res = await apiRequest(`/dashboard/monthly-finance-summary?month=${selectedMonth}&year=${selectedYear}`);
        setFinanceData(res);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchProjectedPayments = async () => {
      try {
        const res = await apiRequest("/accounts/projected-payments");
        if (res) {
          setProjectedData(res);
        } else {
          setProjectedData({ error: "Empty response from server" });
        }
      } catch (err) {
        console.error("Failed to load projected payments:", err);
        setProjectedData({ error: err.message || "API request failed" });
      }
    };

    const fetchProjectedExpenses = async () => {
      try {
        const res = await apiRequest("/accounts/projected-expenses");
        if (res) {
          setProjectedExpensesData(res);
        } else {
          setProjectedExpensesData({ error: "Empty response from server" });
        }
      } catch (err) {
        console.error("Failed to load projected expenses:", err);
        setProjectedExpensesData({ error: err.message || "API request failed" });
      }
    };

    fetchDashboardData();
    fetchProjectedPayments();
    fetchProjectedExpenses();
  }, [selectedMonth, selectedYear]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: user?.default_currency || 'INR' }).format(amount || 0);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#fff', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color, margin: '0 0 3px 0', fontSize: '13px' }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard-container">
      {/* Welcome section */}
      <section className="dash-welcome">
        <div className="dash-welcome-content">
          <div>
            <h1 className="dash-welcome-title">
              Welcome back, {user?.organization_name || user?.email?.split("@")[0] || "User"}
            </h1>
            <p className="dash-welcome-sub">
              Here is your financial overview.
            </p>
          </div>
        </div>
      </section>

      {loading && !financeData ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginTop: '20px' }}>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : !financeData ? (
        <div className="dash-loading">Error loading dashboard data. Please refresh.</div>
      ) : (
        <>
          {/* TOP OVERALL SUMMARY CARDS */}
          <section className="dash-stats-grid">
            <div className="dash-stat-card">
              <div className="dash-stat-header">
                <div className="dash-stat-icon receivables"><IndianRupee size={20} /></div>
                <p>Total Receivables</p>
              </div>
              <div className="dash-stat-content">
                <h3>{formatCurrency(financeData.top_summary?.total_receivables || 0)}</h3>
                <span className="dash-stat-trend trend-down">Unpaid Invoices</span>
              </div>
            </div>
            
            <div className="dash-stat-card">
              <div className="dash-stat-header">
                <div className="dash-stat-icon payables"><CreditCard size={20} /></div>
                <p>Total Payables</p>
              </div>
              <div className="dash-stat-content">
                <h3>{formatCurrency(financeData.top_summary?.total_payables || 0)}</h3>
                <span className="dash-stat-trend trend-down">Unpaid Bills</span>
              </div>
            </div>

            <div className="dash-stat-card">
              <div className="dash-stat-header">
                <div className="dash-stat-icon income"><TrendingUp size={20} /></div>
                <p>Total Income</p>
              </div>
              <div className="dash-stat-content">
                <h3>{formatCurrency(financeData.top_summary?.total_income || 0)}</h3>
                <span className="dash-stat-trend trend-up">All Time</span>
              </div>
            </div>

            <div className="dash-stat-card">
              <div className="dash-stat-header">
                <div className="dash-stat-icon expenses"><TrendingDown size={20} /></div>
                <p>Total Expenses</p>
              </div>
              <div className="dash-stat-content">
                <h3>{formatCurrency(financeData.top_summary?.total_expenses || 0)}</h3>
                <span className="dash-stat-trend">All Time</span>
              </div>
            </div>
          </section>

          {/* MONTHLY OVERVIEW SECTION */}
          <section className="dash-monthly-overview">
            <div className="dash-section-header">
              <h3 className="section-title" style={{ margin: 0 }}>Monthly Overview</h3>
              <div className="dash-welcome-filters">
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="dash-filter-select"
                >
                  {monthNames.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="dash-filter-select"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="monthly-overview-grid">
              <div className="mo-card">
                <p className="mo-label">INCOME</p>
                <h4 className="mo-amount income-color">{formatCurrency(financeData.selected_month?.income_received)}</h4>
              </div>
              <div className="mo-card">
                <p className="mo-label">EXPENSES</p>
                <h4 className="mo-amount expense-color">{formatCurrency(financeData.selected_month?.expenses)}</h4>
              </div>
              <div className="mo-card">
                <p className="mo-label">PROFIT</p>
                <h4 className={`mo-amount ${financeData.selected_month?.profit >= 0 ? 'income-color' : 'expense-color'}`}>
                  {formatCurrency(financeData.selected_month?.profit)}
                </h4>
              </div>
              <div className="mo-card">
                <p className="mo-label">NET CASH</p>
                <h4 className="mo-amount cash-color">{formatCurrency(financeData.selected_month?.net_cash_position)}</h4>
              </div>
            </div>
          </section>

          {/* THREE-COLUMN PROJECTIONS */}
          <section className="dash-projections-grid">
            
            {/* 1. Projected Income */}
            <div className="dash-widget-card proj-card" onClick={() => navigate('/projected-payments')}>
              <h3 className="widget-title">
                <span>Projected Income</span>
                <span className="view-link">View &rarr;</span>
              </h3>
              <div style={{ padding: '5px 0' }}>
                {projectedData ? (
                  projectedData.error ? (
                    <div className="widget-empty"><p>Error: {projectedData.error}</p></div>
                  ) : (
                    <>
                      <h4 className="proj-amount income-color">
                        {formatCurrency(projectedData.total_projected_payment)}
                      </h4>
                      {projectedData.bills && projectedData.bills.length > 0 ? (
                        projectedData.bills.slice(0, 3).map((bill, idx) => (
                          <div key={idx} className="proj-list-item">
                            <div>
                              <p className="proj-list-title">{bill.vendor_name || 'Customer'}</p>
                            </div>
                            <div className="proj-list-amount">{formatCurrency(bill.pending_amount)}</div>
                          </div>
                        ))
                      ) : (
                        <p style={{ fontSize: "13px", color: "#64748b" }}>No projected income.</p>
                      )}
                    </>
                  )
                ) : (
                  <div className="widget-empty"><p>Loading projection...</p></div>
                )}
              </div>
            </div>

            {/* 2. Projected Expense */}
            <div className="dash-widget-card proj-card" onClick={() => navigate('/projected-expenses')}>
              <h3 className="widget-title">
                <span>Projected Expense</span>
                <span className="view-link">View &rarr;</span>
              </h3>
              <div style={{ padding: '5px 0' }}>
                {projectedExpensesData ? (
                  projectedExpensesData.error ? (
                    <div className="widget-empty"><p>Error: {projectedExpensesData.error}</p></div>
                  ) : (
                    <>
                      <h4 className="proj-amount expense-color">
                        {formatCurrency(projectedExpensesData.total_projected_expense)}
                      </h4>
                      {projectedExpensesData.expenses && projectedExpensesData.expenses.length > 0 ? (
                        projectedExpensesData.expenses.slice(0, 3).map((exp, idx) => (
                          <div key={idx} className="proj-list-item">
                            <div>
                              <p className="proj-list-title">{exp.reference_number || 'Expense'}</p>
                            </div>
                            <div className="proj-list-amount">{formatCurrency(exp.pending_amount)}</div>
                          </div>
                        ))
                      ) : (
                        <p style={{ fontSize: "13px", color: "#64748b" }}>No projected expenses.</p>
                      )}
                    </>
                  )
                ) : (
                  <div className="widget-empty"><p>Loading projection...</p></div>
                )}
              </div>
            </div>

            {/* 3. Expected Net Cash */}
            <div className="dash-widget-card">
              <h3 className="widget-title">
                <span>Expected Net Cash</span>
              </h3>
              <div style={{ padding: '5px 0' }}>
                {projectedData && projectedExpensesData && !projectedData.error && !projectedExpensesData.error ? (
                  (() => {
                    const surplus = (projectedData.total_projected_payment || 0) - (projectedExpensesData.total_projected_expense || 0);
                    const isPositive = surplus >= 0;
                    return (
                      <>
                        <h4 className={`proj-amount ${isPositive ? 'income-color' : 'expense-color'}`}>
                          {formatCurrency(surplus)}
                        </h4>
                        <div className={isPositive ? "badge-surplus" : "badge-shortage"}>
                          {isPositive ? "Projected Surplus" : "Projected Shortage"}
                        </div>
                        <p style={{ marginTop: '15px', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                          This represents your expected cash position after receiving projected income and paying projected expenses next month.
                        </p>
                      </>
                    );
                  })()
                ) : (
                  <div className="widget-empty"><p>Loading calculation...</p></div>
                )}
              </div>
            </div>
          </section>

          {/* MAIN DASHBOARD WIDGET GRID (70 / 30) */}
          <div className="zoho-dashboard-layout">
            
            {/* LEFT COLUMN: CHARTS & MONTHLY SUMMARY */}
            <div className="main-charts-column">


              
              {/* Cash Flow Area Chart */}
              <div className="dash-widget-card">
                <h3 className="widget-title">Cash Flow (Last 12 Months)</h3>
                <div className="chart-container">
                  {financeData.chartData?.cashFlowYearly?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={financeData.chartData.cashFlowYearly} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} tickFormatter={(value) => `₹${value/1000}k`} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                        <Area type="monotone" dataKey="income" name="Cash In" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                        <Area type="monotone" dataKey="expense" name="Cash Out" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="widget-empty">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
                      <p>Not enough data to display cash flow.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Income vs Expenses Bar Chart */}
              <div className="dash-widget-card">
                <h3 className="widget-title">Income and Expenses (Last 6 Months)</h3>
                <div className="chart-container small">
                  {financeData.chartData?.incomeExpense6Months?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={financeData.chartData.incomeExpense6Months} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} tickFormatter={(value) => `₹${value/1000}k`} />
                        <RechartsTooltip content={<CustomTooltip />} cursor={{fill: '#f9fafb'}} />
                        <Legend iconType="circle" />
                        <Bar dataKey="income" name="Income" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="expense" name="Expense" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="widget-empty">
                      <p>Not enough data to display income vs expenses.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: WIDGETS */}
            <div className="side-widgets-column">
              


              {/* Top Expenses Donut Chart */}
              <div className="dash-widget-card">
                <h3 className="widget-title">Top Expenses</h3>
                <div className="chart-container small">
                  {financeData.chartData?.topExpenses?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={financeData.chartData.topExpenses}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {financeData.chartData.topExpenses.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                        <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '12px'}} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="widget-empty">
                      <p>No recent expenses.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Shortcuts */}
              <div className="dash-widget-card">
                <h3 className="widget-title">Quick Links</h3>
                <div className="dash-shortcuts-compact">
                  <span className="shortcut-chip" onClick={() => navigate("/customers/new")}>Add Customer</span>
                  <span className="shortcut-chip" onClick={() => navigate("/vendors/new")}>Add Vendor</span>
                  <span className="shortcut-chip" onClick={() => navigate("/items/new")}>Add Item</span>
                  <span className="shortcut-chip" onClick={() => navigate("/quotes/new")}>Create Quote</span>
                  <span className="shortcut-chip" onClick={() => navigate("/payments-received")}>Payments</span>
                </div>
              </div>

            </div>

          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;