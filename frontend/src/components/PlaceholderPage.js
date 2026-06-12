import React from "react";

function PlaceholderPage({ title, description }) {
  return (
    <div style={{
      padding: "40px",
      textAlign: "center",
      background: "#fff",
      height: "100%",
      minHeight: "400px",
      borderRadius: "8px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <h2 style={{ color: "#1e293b", marginBottom: "16px", fontSize: "24px", fontWeight: "600" }}>{title}</h2>
      <p style={{ color: "#64748b", fontSize: "16px", marginBottom: "24px", maxWidth: "400px", lineHeight: "1.5" }}>
        {description}
      </p>
      <div style={{
        display: "inline-block",
        background: "#f1f5f9",
        color: "#475569",
        padding: "8px 16px",
        borderRadius: "20px",
        fontWeight: "500",
        fontSize: "14px",
        border: "1px solid #e2e8f0"
      }}>
        This module is under development
      </div>
    </div>
  );
}

export default PlaceholderPage;
