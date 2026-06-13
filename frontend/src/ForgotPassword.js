import React, { useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "./api";
import "./Auth.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setMessage("Please enter your email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setMessage("Please enter a valid email format");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await apiRequest("/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: trimmedEmail }),
      });
      setMessage(data.message || "If this email exists, a password reset link has been sent.");
      setIsSuccess(true);
    } catch (err) {
      setMessage(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left-panel">
        <div className="auth-overlay"></div>
        <div className="auth-left-content">
          <div className="auth-brand-badge" style={{ padding: 0, background: "transparent", boxShadow: "none" }}>
            <img src="/logo1.png" alt="Logo" style={{ height: "40px", maxWidth: "100%", objectFit: "contain" }} />
          </div>
          <h1 className="auth-hero-title">Forgot Your Password?</h1>
          <p className="auth-hero-subtitle">
            Don't worry, we'll send you a link to securely reset it.
          </p>
        </div>
      </div>

      <div className="auth-right-panel">
        <div className="auth-form-card">
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">Enter your email to receive reset instructions</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="forgot-email">Email Address</label>
              <input
                id="forgot-email"
                type="email"
                className="auth-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={isSubmitting || isSuccess}
              />
            </div>

            {message && <p className={isSuccess ? "auth-success" : "auth-error"} style={{ color: isSuccess ? "#166534" : "#dc2626", background: isSuccess ? "#dcfce7" : "#fee2e2", padding: "10px", borderRadius: "6px", fontSize: "14px" }}>{message}</p>}

            {!isSuccess && (
              <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
                {isSubmitting ? "Sending Link..." : "Send Reset Link"}
              </button>
            )}
          </form>

          <p className="auth-bottom-text" style={{ marginTop: "30px" }}>
            Remembered your password?{" "}
            <Link to="/login" className="auth-link auth-create-link">
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
