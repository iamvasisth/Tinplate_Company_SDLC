import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

const LandingPage = () => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Trigger entrance animations after mount
    setIsVisible(true);
  }, []);

  return (
    <div className="landing-page">
      {/* Top Navbar */}
      <nav className={`landing-navbar ${isVisible ? "slide-down" : ""}`}>
        <div className="nav-logo">
          <span className="logo-icon">📚</span>
          <span className="logo-text">RUP Books</span>
        </div>
        <div className="nav-links">
          <div className="nav-item has-dropdown">
            <a href="#features" className="nav-link">Features <span className="chevron">⌃</span></a>
            <div className="landing-mega-menu features-menu">
              <div className="mega-menu-content">
                <div className="mega-menu-left features-left">
                  <div className="features-grid">
                    <div className="mega-column">
                      <h4>Core Features</h4>
                      <ul>
                        <li><span className="m-icon">📄</span> Quotes</li>
                        <li><span className="m-icon">📝</span> Invoicing</li>
                        <li><span className="m-icon">🛒</span> Sales orders</li>
                        <li><span className="m-icon">🧾</span> Bills</li>
                        <li><span className="m-icon">🛍️</span> Purchase orders</li>
                        <li><span className="m-icon">⏳</span> Projects</li>
                        <li><span className="m-icon">🏦</span> Banking</li>
                        <li><span className="m-icon">📦</span> Inventory</li>
                        <li><span className="m-icon">💳</span> Expenses</li>
                        <li><span className="m-icon">📁</span> Documents</li>
                        <li><span className="m-icon">📊</span> Reporting</li>
                        <li><span className="m-icon">💸</span> Online Payments</li>
                      </ul>
                    </div>
                    <div className="mega-column">
                      <h4>Compliance</h4>
                      <ul>
                        <li><span className="m-icon">🏛️</span> GST Filing</li>
                        <li><span className="m-icon">🧾</span> E-Invoicing</li>
                        <li><span className="m-icon">🔍</span> Audit Trail</li>
                        <li><span className="m-icon">📂</span> Document management</li>
                      </ul>
                      <h4 className="mt-4">Effortless Accounting</h4>
                      <ul>
                        <li><span className="m-icon">📱</span> Mobile accounting</li>
                        <li><span className="m-icon">🔗</span> RUP Ecosystem</li>
                        <li><span className="m-icon">🤝</span> Collaboration & Portal</li>
                        <li><span className="m-icon">⚡</span> Smart automations</li>
                      </ul>
                    </div>
                  </div>
                  <button className="see-all-btn">See all features <span>→</span></button>
                </div>
                <div className="mega-menu-right">
                  <div className="mega-promo-card">
                    <div className="promo-image">
                       <div className="promo-mockup"></div>
                    </div>
                    <h4>Accounting Across Devices</h4>
                    <p>Do your accounting from our mobile or desktop app. Take control of your finances anywhere, anytime!</p>
                    <div className="app-badges">
                      <div className="badge ms">Windows</div>
                      <div className="badge apple">Apple</div>
                      <div className="badge play">Android</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <a href="#pricing" className="nav-link">Pricing</a>
          <div className="nav-item has-dropdown">
            <a href="#solutions" className="nav-link">Solutions <span className="chevron">⌃</span></a>
            <div className="landing-mega-menu solutions-menu">
              <div className="mega-menu-content">
                <div className="mega-menu-left solutions-left">
                  <div className="solutions-grid">
                    <div className="solutions-col">
                      <h4>By Size</h4>
                      <div className="solution-item">
                        <span className="s-icon">🏢</span>
                        <div className="s-text">
                          <h5>Startups</h5>
                          <p>Smart and agile accounting solution to support success</p>
                        </div>
                      </div>
                      <div className="solution-item">
                        <span className="s-icon">🏬</span>
                        <div className="s-text">
                          <h5>Small Businesses</h5>
                          <p>Stay on top of cash flow and tax compliance</p>
                        </div>
                      </div>
                      <div className="solution-item">
                        <span className="s-icon">🏙️</span>
                        <div className="s-text">
                          <h5>Medium Sized</h5>
                          <p>Accounting with advanced automation and analytics</p>
                        </div>
                      </div>
                      <div className="solution-item">
                        <span className="s-icon">🤝</span>
                        <div className="s-text">
                          <h5>Non Profit</h5>
                          <p>Categorically manage funds and donations</p>
                        </div>
                      </div>
                    </div>

                    <div className="solutions-col">
                      <h4>By Role</h4>
                      <div className="solution-item">
                        <span className="s-icon">💼</span>
                        <div className="s-text">
                          <h5>Business Owner</h5>
                          <p>Organize your business, clients, and finances in one place</p>
                        </div>
                      </div>
                      <div className="solution-item">
                        <span className="s-icon">📊</span>
                        <div className="s-text">
                          <h5>Accounting Firms</h5>
                          <p>Benefit from helping business manage their finances</p>
                        </div>
                      </div>
                      <div className="solution-item">
                        <span className="s-icon">🎓</span>
                        <div className="s-text">
                          <h5>Students</h5>
                          <p>Learn modern cloud accounting with RUP Books Student Edition</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="solutions-bottom-row">
                    <h4>By Device</h4>
                    <div className="solutions-grid">
                      <div className="solution-item">
                        <span className="s-icon">📱</span>
                        <div className="s-text">
                          <h5>Mobile</h5>
                          <p>Take your accounting wherever you go</p>
                        </div>
                      </div>
                      <div className="solution-item">
                        <span className="s-icon">💻</span>
                        <div className="s-text">
                          <h5>Windows</h5>
                          <p>Experience cloud accounting from your familiar desktop device</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mega-menu-right practice-promo">
                   <div className="practice-image"></div>
                   <div className="practice-logo">
                     <span className="p-icon">⚗️</span> RUP Practice
                   </div>
                   <h4>Introducing RUP Practice</h4>
                   <p>The ultimate practice management software for modern accounting and bookkeeping firms.</p>
                   <a href="#learn-more" className="learn-more-link">Learn More <span>&gt;</span></a>
                </div>
              </div>
            </div>
          </div>
          <a href="#customers" className="nav-link">Customers</a>
          <a href="#partner" className="nav-link">Partner with us</a>
          <div className="nav-item has-dropdown">
            <a href="#resources" className="nav-link">Resources <span className="chevron">⌃</span></a>
            <div className="landing-mega-menu resources-menu">
              <div className="mega-menu-content">
                <div className="mega-menu-left resources-left">
                  <h4>Help and Support</h4>
                  <div className="resources-grid">
                    <ul className="resources-col">
                      <li><span className="m-icon">❓</span> Help Document</li>
                      <li><span className="m-icon">💬</span> FAQ</li>
                      <li><span className="m-icon">🧩</span> Extensions</li>
                      <li><span className="m-icon">▶️</span> Product Videos</li>
                      <li><span className="m-icon">📄</span> Migration Doc</li>
                      <li><span className="m-icon">👩‍💻</span> API Documentation</li>
                      <li><span className="m-icon">👥</span> Forum</li>
                      <li><span className="m-icon">📝</span> Product Blogs</li>
                      <li><span className="m-icon">✨</span> What's new</li>
                      <li><span className="m-icon">📅</span> Upcoming Webinar</li>
                      <li><span className="m-icon">🎧</span> Request a demo</li>
                    </ul>
                    <ul className="resources-col">
                      <li><span className="m-icon">📞</span> Contact us</li>
                      <li><span className="m-icon">🏅</span> Training and Certification</li>
                      <li><span className="m-icon">🤝</span> Partners / Accountant</li>
                      <li><span className="m-icon">📱</span> Mobile Apps</li>
                      <li><span className="m-icon">💻</span> Desktop App</li>
                    </ul>
                  </div>
                  <button className="see-all-btn">See all Resources <span>→</span></button>
                </div>
                
                <div className="mega-menu-right resources-right">
                  <div className="r-section">
                    <div className="r-subtitle">BOOKS ACADEMY</div>
                    <div className="academy-banner">
                      <span className="academy-text">ACADEMY</span>
                      <span className="academy-subtext">BY RUP BOOKS</span>
                    </div>
                    <a href="#explore" className="learn-more-link">Explore now <span>&gt;</span></a>
                  </div>

                  <div className="r-section mt-4">
                    <div className="r-subtitle">FEATURED ARTICLE</div>
                    <div className="featured-article-image"></div>
                    <h5 className="article-title">Latest GST reforms</h5>
                    <p className="article-desc">Check out the updated GST rates for Goods and services.</p>
                    <a href="#learn-more" className="learn-more-link">Learn More <span>&gt;</span></a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="nav-actions">
          <button className="nav-signin" onClick={() => navigate("/login")}>Sign In</button>
          <button className="nav-signup" onClick={() => navigate("/register")}>Start for free</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        {/* Floating Background Cards for Animation */}
        <div className="floating-cards-container">
          <div className={`floating-card detailed-card card-left-1 ${isVisible ? "animate-float-1" : ""}`}>
            <div className="detailed-card-header">
              <div className="paint-can-icon"></div>
            </div>
            <div className="detailed-card-body">
              <div className="d-title">Zylker paint</div>
              <div className="d-price">₹200.00 <span className="d-tag">12312</span></div>
              <div className="d-list">
                <div className="d-row"><span>Opening stock</span> <strong>210.00</strong></div>
                <div className="d-row"><span>Stock in Hand</span> <strong>150.00</strong></div>
                <div className="d-row"><span>Committed Stock</span> <strong>100.00</strong></div>
                <div className="d-row"><span>Available for Sale</span> <strong>50.00</strong></div>
              </div>
            </div>
          </div>
          
          <div className={`floating-card detailed-card card-right-1 ${isVisible ? "animate-float-3" : ""}`}>
            <div className="detailed-card-title">P & L Report</div>
            <div className="d-list">
              <div className="d-section-title">INCOME</div>
              <div className="d-row"><span>Sales</span> <span>₹200,000</span></div>
              <div className="d-row"><span>Services</span> <span>₹200,000</span></div>
              <div className="d-row"><span>Others</span> <span>₹200,000</span></div>
              <div className="d-section-title mt-2">EXPENSES</div>
              <div className="d-row"><span>Accounting</span> <span>₹200,000</span></div>
              <div className="d-row"><span>Marketing</span> <span>₹200,000</span></div>
              <div className="d-row"><span>Employees</span> <span>₹200,000</span></div>
            </div>
          </div>
        </div>

        {/* Hero Content */}
        <div className={`hero-content ${isVisible ? "fade-in-up" : ""}`}>
          <h1 className="hero-title">
            Comprehensive accounting platform<br />
            for growing businesses
          </h1>
          
          <p className="hero-subtitle">
            Manage end-to-end accounting — from invoicing to inventory & payroll with the best accounting software in India.
          </p>

          <div className="hero-buttons">
            <button className="btn-primary" onClick={() => navigate("/register")}>Start my free trial</button>
            <button className="btn-secondary" onClick={() => navigate("/login")}>Request a demo</button>
          </div>
        </div>

        {/* Hero Image / Dashboard Mockup */}
        <div className={`hero-dashboard-mockup ${isVisible ? "zoom-in-up" : ""}`}>
          <div className="mockup-header-dark">
            <div className="mockup-brand">
              <span className="mockup-brand-icon">📚</span>
              <span>Books</span>
            </div>
            <div className="mockup-search-dark">
              <span className="search-icon">🔍</span> Search
            </div>
            <div className="mockup-actions">
              <span className="action-icon">+</span>
              <span className="action-icon">🔔</span>
              <div className="mockup-avatar"></div>
            </div>
          </div>
          <div className="mockup-body">
            <div className="mockup-sidebar">
              <div className="mock-menu-item active"><span className="icon">🏠</span> Home</div>
              <div className="mock-menu-item"><span className="icon">📦</span> Items</div>
              <div className="mock-menu-item"><span className="icon">🏦</span> Banking</div>
              <div className="mock-menu-item"><span className="icon">💼</span> Sales</div>
              <div className="mock-submenu">
                <div className="mock-submenu-item">Customers</div>
                <div className="mock-submenu-item">Estimates</div>
                <div className="mock-submenu-item">Retainer Invoices</div>
                <div className="mock-submenu-item">Sales Orders</div>
                <div className="mock-submenu-item">Invoices</div>
                <div className="mock-submenu-item">Credit Notes</div>
              </div>
              <div className="mock-menu-item"><span className="icon">🛒</span> Purchases</div>
              <div className="mock-menu-item"><span className="icon">⏱</span> Time Tracking</div>
              <div className="mock-menu-item"><span className="icon">👨‍💼</span> Accountant</div>
              <div className="mock-menu-item"><span className="icon">📊</span> Reports</div>
              <div className="mock-menu-item"><span className="icon">📄</span> Documents</div>
            </div>
            <div className="mockup-main">
              <div className="mockup-stats">
                <div className="stat-card">
                  <div className="stat-title">TOTAL RECEIVABLES</div>
                  <div className="stat-subtitle">Total Unpaid Invoices ₹3,84,500.00</div>
                  <div className="stat-bar-container"><div className="stat-bar blue-yellow"></div></div>
                  <div className="stat-values">
                    <div><span className="label blue">Current</span><strong>₹3,42,250.00</strong></div>
                    <div><span className="label yellow">Overdue</span><strong>₹42,250.00</strong></div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-title">TOTAL PAYABLES</div>
                  <div className="stat-subtitle">Total Unpaid Bills ₹22,54,500.00</div>
                  <div className="stat-bar-container"><div className="stat-bar blue-yellow"></div></div>
                  <div className="stat-values">
                    <div><span className="label blue">Current</span><strong>₹2,42,250.00</strong></div>
                    <div><span className="label yellow">Overdue</span><strong>₹12,250.00</strong></div>
                  </div>
                </div>
              </div>
              <div className="mockup-chart-card">
                <div className="stat-title">CASH FLOW</div>
                <div className="chart-layout">
                   <div className="chart-graph">
                     {/* SVG path to mock a line graph */}
                     <svg viewBox="0 0 400 150" className="chart-svg">
                       <path d="M0,120 L50,120 L80,70 L150,70 L220,40 L300,20 L400,10" fill="none" stroke="#2563eb" strokeWidth="2" />
                       <path d="M0,120 L50,120 L80,70 L150,70 L220,40 L300,20 L400,10 L400,150 L0,150 Z" fill="rgba(37,99,235,0.1)" />
                     </svg>
                   </div>
                   <div className="chart-legend">
                     <div className="legend-item">
                        <span className="label">Cash as on 01-04-23</span>
                        <strong>₹42,250.11</strong>
                     </div>
                     <div className="legend-item">
                        <span className="label">Incoming</span>
                        <strong>₹11,153,838.29 <span className="green">+</span></strong>
                     </div>
                     <div className="legend-item">
                        <span className="label">Outgoing</span>
                        <strong>₹12,359,118.12 <span className="red">-</span></strong>
                     </div>
                     <div className="legend-item total">
                        <span className="label">Cash as on 31-03-24</span>
                        <strong>₹1,541,933.67 <span className="gray">=</span></strong>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Migration Banner */}
      <section className="migration-banner">
        <div className="banner-content">
          <div className="banner-icon">🚀</div>
          <div className="banner-text">
            <strong>Migrate to RUP Books.</strong>
            <p>Now you can easily move from other accounting solutions to RUP Books!</p>
          </div>
          <button className="banner-btn">Contact us →</button>
        </div>
      </section>

      {/* Dark Testimonial Section */}
      <section className="dark-section">
        <div className="dark-section-header">
          <h2>Make the switch to the future of business accounting</h2>
        </div>
        <div className="testimonial-container">
          <div className="testimonial-cards">
            <div className="t-card">
              <div className="t-avatar"></div>
              <div className="t-info">
                <h4>One accounting solution for multiple outlets</h4>
                <p>SHARMA HANDLOOM, DIRECTOR</p>
              </div>
            </div>
            <div className="t-card">
              <div className="t-avatar"></div>
              <div className="t-info">
                <h4>User friendly, comprehensive, and highly compliant</h4>
                <p>TARUN KUMAR SAIN, DIRECTOR</p>
              </div>
            </div>
          </div>
          <div className="testimonial-highlight">
            <h1>"</h1>
            <h2>I TRUST RUP BOOKS FOR BUSINESS</h2>
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section className="privacy-section">
        <div className="privacy-icon">🔒</div>
        <h2>Choose privacy.<br/>Choose RUP.</h2>
        <p>
          At RUP, we take pride in our perpetual efforts to surpass all expectations in providing security and privacy to our customers in this increasingly connected world.
        </p>
        <div className="security-badges">
          <div className="sec-badge bsi-iso">
            <span className="bsi-logo">bsi.</span>
            <div className="sec-text">
              <strong>ISO<br/>9001:2015</strong>
              <span>Quality Management System</span>
            </div>
            <div className="sec-bottom">FS 724104</div>
          </div>
          <div className="sec-badge aicpa">
            <strong>AICPA</strong>
            <span>SOC</span>
          </div>
          <div className="sec-badge gdpr">
            <span className="stars">★ ★ ★</span>
            <strong>GDPR</strong>
            <span className="stars">★ ★ ★</span>
          </div>
          <div className="sec-badge bsi-iso-large">
            <span className="bsi-logo">bsi.</span>
            <div className="sec-columns">
              <div className="sec-col">
                <strong>ISO/IEC<br/>27017</strong>
                <span>Security Controls for Cloud Services</span>
              </div>
              <div className="sec-col">
                <strong>ISO/IEC<br/>27018</strong>
                <span>Protection of Personally identifiable information</span>
              </div>
            </div>
            <div className="sec-bottom" style={{ left: '50px' }}>CLOUD 714132 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; PII 714133</div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="landing-footer-complex">
        
        {/* Pre-footer Grid */}
        <div className="pre-footer-grid">
          <div className="pf-col">
            <div className="pf-icon">⌛</div>
            <h4>Free trial</h4>
            <p>Start with a 14-day free trial to experience effortless accounting.</p>
            <button className="pf-btn">Start Trial</button>
          </div>
          <div className="pf-col">
            <div className="pf-icon">💻</div>
            <h4>Demo organization</h4>
            <p>Explore RUP Books features without using your real business data.</p>
            <button className="pf-btn">Explore Demo Account</button>
          </div>
          <div className="pf-col">
            <div className="pf-icon">📋</div>
            <h4>Plans and pricing</h4>
            <p>Compare plans and features and find the best fit for your needs!</p>
            <button className="pf-btn">View all plans</button>
          </div>
          <div className="pf-col">
            <div className="pf-icon">🖥️</div>
            <h4>Webinar</h4>
            <p>Join us online for a live webinar to make the best out of RUP Books.</p>
            <button className="pf-btn">Show All Webinars</button>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="main-footer-grid">
          {/* Left Column (Contact & Apps) */}
          <div className="mf-left-col">
            <div className="mf-section-title">CONTACT US ON</div>
            <div className="contact-item">
              <span className="c-icon">📞</span>
              <div>
                <div className="c-title">Mon - Fri (9:00AM to 7:00PM)</div>
                <div className="c-desc">18005726671</div>
              </div>
            </div>
            <div className="contact-item">
              <span className="c-icon">✉️</span>
              <div>
                <div className="c-title">Mail Us</div>
                <div className="c-desc">support.india@rupbooks.com</div>
              </div>
            </div>

            <div className="mf-section-title mt-8">AVAILABLE ON</div>
            <div className="app-buttons">
              <button className="app-btn">Apple Store</button>
              <button className="app-btn">Google Play</button>
            </div>

            <div className="mf-section-title mt-8">AVAILABLE ON DESKTOP APP</div>
            <button className="app-btn">Microsoft Store</button>

            <div className="mf-section-title mt-8">FEATURED APP</div>
            <div className="featured-app-card">
              <span className="f-icon">🛍️</span>
              <div>
                <div className="f-title">RUP Commerce</div>
                <a href="#learn" className="f-link">LEARN MORE</a>
              </div>
            </div>

            <div className="mf-section-title mt-8">CONNECT WITH US</div>
            <div className="social-icons">
              <span>𝕏</span>
              <span>📸</span>
              <span>▶️</span>
              <span>💼</span>
            </div>
          </div>

          {/* Middle Column (Product Help & Resources) */}
          <div className="mf-mid-col">
            <div className="mf-section-title border-bottom-title">PRODUCT HELP & RESOURCES</div>
            <div className="mf-mid-grid">
              <div className="mf-links-group">
                <div className="mf-group-title">ABOUT RUP BOOKS</div>
                <ul>
                  <li><a href="#what">What is RUP Books?</a></li>
                  <li><a href="#features">All Features</a></li>
                  <li><a href="#gst">GST Accounting</a></li>
                  <li><a href="#pricing">Pricing</a></li>
                  <li><a href="#customers">Customers</a></li>
                  <li><a href="#integrations">Integrations</a></li>
                  <li><a href="#accountant">Accountant Program</a></li>
                  <li><a href="#partner">Register as a Partner</a></li>
                  <li><a href="#training">Training & Certification</a></li>
                </ul>
              </div>
              <div className="mf-links-group">
                <div className="mf-group-title">HELPFUL RESOURCES</div>
                <ul>
                  <li><a href="#help">Help Documentation</a></li>
                  <li><a href="#api">Developers API</a></li>
                  <li><a href="#faq">FAQs</a></li>
                  <li><a href="#videos">Product Videos</a></li>
                  <li><a href="#webinars">Webinars</a></li>
                  <li><a href="#blogs">Blogs</a></li>
                  <li><a href="#forums">Forums</a></li>
                  <li><a href="#whats-new">What's New</a></li>
                  <li><a href="#find-accountant">Find an Accountant</a></li>
                </ul>
              </div>
              <div className="mf-links-group">
                <div className="mf-group-title">CONNECTED BANKING PARTNERS</div>
                <ul>
                  <li><a href="#scb">Standard Chartered Bank</a></li>
                  <li><a href="#kotak">Kotak Mahindra Bank</a></li>
                  <li><a href="#hsbc">HSBC Bank</a></li>
                </ul>
              </div>
            </div>
            
            <div className="mf-section-title border-bottom-title mt-8">OTHER RESOURCES</div>
            <div className="mf-other-links">
              <a href="#free">Free Accounting Software</a>
              <a href="#bookkeeping">Bookkeeping Software</a>
              <a href="#spreadsheet">Accounting for Spreadsheet Users</a>
              <a href="#crm">CRM Accounting Software</a>
            </div>
          </div>

          {/* Right Column (Learning Hub & Free Tools) */}
          <div className="mf-right-col">
            <div className="mf-section-title border-bottom-title">LEARNING HUB</div>
            <div className="mf-links-group">
              <ul>
                <li><a href="#gst-resources">GST Resources</a></li>
                <li><a href="#guides">Essential Business Guides</a></li>
                <li><a href="#dictionary">Accounting Dictionary</a></li>
                <li><a href="#what-is-acc">What is Accounting Software?</a></li>
              </ul>
            </div>

            <div className="mf-section-title border-bottom-title mt-8">FREE TOOLS</div>
            <div className="mf-links-group">
              <ul>
                <li><a href="#hsn">HSN/SAC Finder</a></li>
                <li><a href="#invoice">Invoice Generator</a></li>
                <li><a href="#quote">Quote Generator</a></li>
                <li><a href="#calc">GST Calculator</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* App Ecosystem Banner */}
        <div className="ecosystem-banner">
          <p>Other RUP Finance & Operations Apps</p>
          <div className="ecosystem-logos">
            <span>⚙️ RUP ERP</span>
            <span>💸 RUP Expense</span>
            <span>💳 RUP Billing</span>
            <span>📦 RUP Inventory</span>
            <span>💰 RUP Payroll</span>
            <span>⚗️ RUP Practice</span>
            <span>🛍️ RUP Commerce</span>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom-bar">
          <div className="fb-links">
            <a href="#contact">Contact</a>
            <a href="#security">Security</a>
            <a href="#compliance">Compliance</a>
            <a href="#ipr">IPR Complaints</a>
            <a href="#anti-spam">Anti-spam Policy</a>
            <a href="#tos">Terms of Service</a>
            <a href="#privacy">Privacy Policy</a>
            <a href="#trademark">Trademark Policy</a>
            <a href="#cookie">Cookie Policy</a>
            <a href="#gdpr">GDPR Compliance</a>
            <a href="#abuse">Abuse Policy</a>
          </div>
          <p className="copyright">&copy; {new Date().getFullYear()}, RUP Corporation Pvt. Ltd. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
