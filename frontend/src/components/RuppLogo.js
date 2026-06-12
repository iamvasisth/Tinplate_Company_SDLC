import React from "react";

const RuppLogo = ({ width, height, theme = "light" }) => {
  const logoSrc = theme === "dark" 
    ? require('../eazzio-logo-dark.png') 
    : require('../eazzio-logo.jpeg');

  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      userSelect: "none",
      height: height || "auto"
    }}>
      <img src={logoSrc} alt="eAzzio BOOKS" style={{ height: height || "40px", maxWidth: "100%", objectFit: "contain", borderRadius: "4px" }} />
    </div>
  );
};

export default RuppLogo;
