/**
 * Register.js – Zoho Books-style registration page
 * Dependencies: apiRequest, react-router-dom, react-hot-toast
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest } from './api';
import toast from 'react-hot-toast';
import { ButtonSpinner } from "./components/Loader";
import './Auth.css';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessType, setBusinessType] = useState('Other');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Email and password are required'); return; }
    setIsSubmitting(true);
    try {
      const data = await apiRequest('/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, business_type: businessType })
      });
      if (data && data.user) { toast.success('Registration successful! Please login.'); navigate('/'); }
    } catch (err) { toast.error(err.message || 'Registration failed'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-form-section">
          <div className="auth-brand"><div className="auth-brand-icon"><span>RUP</span></div></div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Sign up to get started with Books</p>
          <form onSubmit={handleRegister} className="auth-form">
            <div className="auth-input-group">
              <input id="register-email" type="email" className="auth-input" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" disabled={isSubmitting} />
            </div>
            <div className="auth-input-group">
              <input id="register-password" type="password" className="auth-input" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" disabled={isSubmitting} />
            </div>
            <div className="auth-input-group">
              <select id="register-business" className="auth-input auth-select" value={businessType} onChange={(e) => setBusinessType(e.target.value)} disabled={isSubmitting}>
                <option value="Other">Other</option>
                <option value="School">School</option>
                <option value="Hospital">Hospital</option>
                <option value="Retail">Retail</option>
                <option value="Manufacturing">Manufacturing</option>
              </select>
            </div>
            <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? <><ButtonSpinner /> Creating...</> : "Create Account"}
            </button>
          </form>
          <div className="auth-footer-links">
            <p>Already have an account? <Link to="/login" className="auth-link">Sign in</Link></p>
          </div>
        </div>
        <div className="auth-illustration-section">
          <div className="auth-illustration-content">
            <div className="auth-illustration-graphic">
              <div className="auth-illustration-circle"><span>🚀</span></div>
              <div className="auth-floating-badge badge-1">📋</div>
              <div className="auth-floating-badge badge-2">🏦</div>
              <div className="auth-floating-badge badge-3">📊</div>
            </div>
            <h2 className="auth-illustration-title">Get Started Today</h2>
            <p className="auth-illustration-text">Streamline your accounting workflow.<br/>Free trial with full access to all features.</p>
            <button className="auth-learn-more-btn">Learn more</button>
          </div>
        </div>
      </div>
      <footer className="auth-page-footer">© {new Date().getFullYear()} UPP Books. All Rights Reserved.</footer>
    </div>
  );
}

export default Register;