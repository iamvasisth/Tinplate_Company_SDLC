import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import "./Auth.css";

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!password || !confirmPassword) {
      setMessage("Please fill out both password fields");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await apiRequest(`/reset-password/${token}`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setMessage(data.message || "Password has been reset successfully");
      setIsSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setMessage(err.message || "Reset token is invalid or has expired");
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
          <h1 className="auth-hero-title">Secure Your Account</h1>
          <p className="auth-hero-subtitle">
            Create a strong, new password to keep your accounting data safe.
          </p>
        </div>
      </div>

      <div className="auth-right-panel">
        <div className="auth-form-card">
          <h1 className="auth-title">Create New Password</h1>
          <p className="auth-subtitle">Your new password must be at least 6 characters</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="reset-password">New Password</label>
              <div className="auth-password-wrap">
                <input
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  className="auth-input"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting || isSuccess}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="confirm-password">Confirm Password</label>
              <div className="auth-password-wrap">
                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  className="auth-input"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting || isSuccess}
                />
              </div>
            </div>

            {message && <p className={isSuccess ? "auth-success" : "auth-error"} style={{ color: isSuccess ? "#166534" : "#dc2626", background: isSuccess ? "#dcfce7" : "#fee2e2", padding: "10px", borderRadius: "6px", fontSize: "14px" }}>{message}</p>}

            {!isSuccess && (
              <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
                {isSubmitting ? "Resetting..." : "Reset Password"}
              </button>
            )}
          </form>

          {isSuccess && (
            <p style={{ textAlign: "center", marginTop: "20px", fontSize: "14px", color: "#475569" }}>
              Redirecting to login in 3 seconds...
            </p>
          )}

          {!isSuccess && (
            <p className="auth-bottom-text" style={{ marginTop: "30px" }}>
              Remembered your password?{" "}
              <Link to="/login" className="auth-link auth-create-link">
                Back to Login
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
