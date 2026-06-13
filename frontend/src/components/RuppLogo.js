import React from "react";

const RuppLogo = ({ height = 45 }) => {
  return (
    <img src="/logo1.png" alt="Logo" style={{ height: height, width: "auto", objectFit: "contain" }} />
  );
};

export default RuppLogo;
