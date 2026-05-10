import React, { useState, useEffect } from "react";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

function InvoicePreferences() {
  const [prefs, setPrefs] = useState({
    show_gstin: false,
    show_pan: false,
    show_hsn: false,
    show_payment_mode: false,
    show_due_date: true,
    show_terms: true,
    show_signature: true,
    show_cgst_sgst: false,
  });

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const res = await apiRequest("/invoice-preferences");
        if (res?.preferences) setPrefs({ ...prefs, ...res.preferences });
      } catch (err) { /* ignore */ }
    };
    fetchPrefs();
  }, []);

  const handleToggle = (key) => {
    setPrefs({ ...prefs, [key]: !prefs[key] });
  };

  const handleSave = async () => {
    try {
      await apiRequest("/invoice-preferences", {
        method: "POST",
        body: JSON.stringify(prefs),
      });
      toast.success("Preferences saved");
    } catch (err) {
      toast.error("Failed to save preferences");
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "auto", padding: "30px" }}>
      <h2>Invoice Template Preferences</h2>
      <div style={{ marginTop: "20px" }}>
        {Object.keys(prefs).map((key) => (
          <label key={key} style={{ display: "block", marginBottom: "10px" }}>
            <input
              type="checkbox"
              checked={prefs[key] || false}
              onChange={() => handleToggle(key)}
            />
            <span style={{ marginLeft: "8px" }}>{key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</span>
          </label>
        ))}
      </div>
      <button onClick={handleSave} style={{ padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", marginTop: "20px" }}>
        Save Preferences
      </button>
    </div>
  );
}

export default InvoicePreferences;