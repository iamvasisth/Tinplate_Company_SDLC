/**
 * Register.js – RUPP Books-style registration page
 * Dependencies: apiRequest, react-router-dom, react-hot-toast
 */
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiRequest } from "./api";
import toast from "react-hot-toast";
import "./Auth.css";
import RuppLogo from "./components/RuppLogo";

function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [businessType, setBusinessType] = useState("Other");

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
        <div className="register-brand" style={{ justifyContent: "center" }}>
          <RuppLogo height="48px" />
        </div>

        <h1 className="register-title">Create your account</h1>
        <p className="register-subtitle">
          Get started with eAzzio BOOKS in just a few minutes
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
                <label htmlFor="register-business">Your Role</label>
                <select
                  id="register-business"
                  className="auth-input auth-select"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                >
                  <option value="Other">Select your role</option>
                  <option value="Owner">Owner</option>
                  <option value="Accountant">Accountant</option>
                  <option value="Manager">Manager</option>
                  <option value="Employee">Employee</option>
                  <option value="Other">Other</option>
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