/**
 * Dashboard.js – Clean dashboard with profile and business modules
 * Dependencies: AuthContext, react-router-dom
 */
import React from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import businessModules from "./businessModules";

function Dashboard() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:5000/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error(err);
    }
    setUser(null);
    navigate("/");
  };

  return (
    <div style={{ padding: "30px", maxWidth: "900px", margin: "auto" }}>
      {/* ---- USER PROFILE ---- */}
      {user && (
        <div style={profileStyle}>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Business Type:</strong> {user.business_type || "Not set"}</p>
        </div>
      )}

      {/* ---- BUSINESS MODULE CARDS ---- */}
      {user && (
        <div style={moduleGrid}>
          {(businessModules[user.business_type] || []).map(mod => (
            <button
              key={mod.path}
              style={moduleCard}
              onClick={() => navigate(mod.path)}
            >
              {mod.name}
            </button>
          ))}
        </div>
      )}

      {/* ---- LOGOUT ---- */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
        <button onClick={handleLogout} style={logoutBtn}>
          Logout
        </button>
      </div>
    </div>
  );
}

// ---- Styles ----
const profileStyle = {
  background: "#f8f9fa",
  padding: "12px",
  borderRadius: "8px",
  marginBottom: "20px",
};

const moduleGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
  gap: "15px",
  marginBottom: "30px",
};

const moduleCard = {
  padding: "20px",
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  cursor: "pointer",
  textAlign: "center",
  fontWeight: "500",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};

const logoutBtn = {
  padding: "8px 16px",
  background: "#e74c3c",
  color: "#fff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};

export default Dashboard;