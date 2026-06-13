/**
 * Register.js – RUPP Books-style registration page
 * Dependencies: apiRequest, react-router-dom, react-hot-toast
 */
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiRequest } from "./api";
import toast from "react-hot-toast";
import "./Auth.css";

function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [businessType, setBusinessType] = useState("Other");
  const [role, setRole] = useState("Admin");

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!fullName || !email || !password || !confirmPassword || !organizationName) {
      toast.error("All fields are required");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Password and confirm password do not match");
      return;
    }

    try {
      const data = await apiRequest("/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          organization_name: organizationName,
          business_type: businessType,
          role: role
        }),
      });

      if (data && data.user) {
        toast.success("Registration successful! Please login.");
        navigate("/");
      } else {
        toast.error("Registration failed");
      }
    } catch (err) {
      toast.error(err.message || "Registration failed");
    }
  };

  return (
    <div className="auth-page register-page">
      <div className="register-wrapper">
        <div className="register-brand" style={{ marginBottom: "20px" }}>
          <img src="/logo.png" alt="Logo" style={{ height: "90px", maxWidth: "100%", objectFit: "contain" }} />
        </div>

        <h1 className="register-title">Create your account</h1>
        <p className="register-subtitle">
          Get started with RUPP Books in just a few minutes
        </p>

        <div className="register-card">
          <form onSubmit={handleRegister} className="register-form">
            <div className="register-grid">
              <div className="auth-field">
                <label htmlFor="register-name">Full Name</label>
                <input
                  id="register-name"
                  type="text"
                  className="auth-input"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>

              <div className="auth-field">
                <label htmlFor="register-email">Email Address</label>
                <input
                  id="register-email"
                  type="email"
                  className="auth-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="auth-field">
                <label htmlFor="register-password">Password</label>
                <input
                  id="register-password"
                  type="password"
                  className="auth-input"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div className="auth-field">
                <label htmlFor="register-confirm-password">
                  Confirm Password
                </label>
                <input
                  id="register-confirm-password"
                  type="password"
                  className="auth-input"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div className="auth-field">
                <label htmlFor="register-organization">
                  Organization Name
                </label>
                <input
                  id="register-organization"
                  type="text"
                  className="auth-input"
                  placeholder="Your Company Pvt Ltd"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  autoComplete="organization"
                />
              </div>

              <div className="auth-field">
                <label htmlFor="register-role">System Access Role</label>
                <select
                  id="register-role"
                  className="auth-input auth-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="Admin">Admin (Full Access)</option>
                  <option value="Accountant">Accountant (Manage Books)</option>
                  <option value="Staff">Staff (Create/Edit Basic Data)</option>
                  <option value="Viewer">Viewer (Read Only)</option>
                </select>
              </div>
            </div>

            <button type="submit" className="auth-submit-btn register-submit">
              Create Account
            </button>
          </form>

          <p className="register-bottom-text">
            Already have an account?{" "}
            <Link to="/" className="auth-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;