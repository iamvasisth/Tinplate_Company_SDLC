/**
 * Login.js – Zoho Books-style login page
 * Dependencies: apiRequest, AuthContext, react-router-dom
 */
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiRequest } from "./api";
import { useAuth } from "./AuthContext";
import { ButtonSpinner } from "./components/Loader";
import "./Auth.css";


function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  

  const navigate = useNavigate();
  const { user, loading, setUser } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!email || !password) { setMessage("Please enter email and password"); return; }
    setIsSubmitting(true);
    try {
      const data = await apiRequest("/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (data && data.user) { setUser(data.user); navigate("/dashboard", { replace: true }); }
      else setMessage("Login failed");
    } catch (err) { setMessage(err.message || "Network error"); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-form-section">
          <div className="auth-brand"><div className="auth-brand-icon"><span>RUP</span></div></div>
          <h1 className="auth-title">Sign in</h1>
          <p className="auth-subtitle">to access Books</p>
          <form onSubmit={handleLogin} className="auth-form">
            <div className="auth-input-group">
              <input id="login-email" type="email" className="auth-input" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" disabled={isSubmitting} />
            </div>
            <div className="auth-input-group auth-input-password">
              <input id="login-password" type={showPassword ? "text" : "password"} className="auth-input" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" disabled={isSubmitting} />
              <button type="button" className="auth-password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password" disabled={isSubmitting}>{showPassword ? "🙈" : "👁"}</button>
            </div>
            {message && <p className="auth-error">{message}</p>}
            <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? <><ButtonSpinner /> Signing in...</> : "Sign in"}
            </button>
          </form>
          <div className="auth-footer-links">
            <p>Don't have an account? <Link to="/register" className="auth-link">Sign up now</Link></p>
          </div>
        </div>
        <div className="auth-illustration-section">
          <div className="auth-illustration-content">
            <div className="auth-illustration-graphic">
              <div className="auth-illustration-circle"><span>🔐</span></div>
              <div className="auth-floating-badge badge-1">📊</div>
              <div className="auth-floating-badge badge-2">💰</div>
              <div className="auth-floating-badge badge-3">📈</div>
            </div>
            <h2 className="auth-illustration-title">Secure Access</h2>
            <p className="auth-illustration-text">Manage your finances with confidence.<br/>Enterprise-grade security for all your accounting data.</p>
            <button className="auth-learn-more-btn">Learn more</button>
          </div>
        </div>
      </div>
      <footer className="auth-page-footer">© {new Date().getFullYear()} UPP Books. All Rights Reserved.</footer>
    </div>
  );
}

export default Login;
