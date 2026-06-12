import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { TableSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function InventoryMovements() {
  const navigate = useNavigate();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    try {
      const res = await apiRequest("/inventory/movements");
      setMovements(res?.movements || []);
    } catch (err) {
      toast.error("Failed to load inventory movements");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1200px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Inventory Adjustments & Movements</h2>
        <button onClick={() => navigate("/inventory-adjustments/new")} style={primaryBtn}>+ New Adjustment</button>
      </div>

      <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflowX: "auto" }}>
        {loading ? (
          <TableSkeleton columns={8} rows={5} />
        ) : movements.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px", color: "gray" }}>
            <p>No inventory movements found.</p>
            <button onClick={() => navigate("/inventory-adjustments/new")} style={secondaryBtn}>Make an Adjustment</button>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #cbd5e1", textAlign: "left", background: "#f1f5f9" }}>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Item Name</th>
                <th style={thStyle}>Movement Type</th>
                <th style={thStyle}>Quantity</th>
                <th style={thStyle}>Reason</th>
                <th style={thStyle}>Reference Number</th>
                <th style={thStyle}>Previous Stock</th>
                <th style={thStyle}>New Stock</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={tdStyle}>{new Date(m.created_at).toLocaleString("en-IN")}</td>
                  <td style={{ ...tdStyle, color: "#2563eb", fontWeight: "500" }}>{m.item_name}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold",
                      background: m.movement_type === "stock_in" ? "#d1fae5" : m.movement_type === "stock_out" ? "#fee2e2" : "#fef3c7",
                      color: m.movement_type === "stock_in" ? "#065f46" : m.movement_type === "stock_out" ? "#991b1b" : "#b45309"
                    }}>
                      {m.movement_type.toUpperCase().replace("_", " ")}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: "bold", color: m.movement_type === "stock_in" ? "#16a34a" : m.movement_type === "stock_out" ? "#dc2626" : "#334155" }}>
                    {m.movement_type === "stock_in" ? "+" : m.movement_type === "stock_out" ? "-" : ""}{parseFloat(m.quantity)}
                  </td>
                  <td style={tdStyle}>{m.reason || "—"}</td>
                  <td style={tdStyle}>{m.reference_number || "—"}</td>
                  <td style={tdStyle}>{parseFloat(m.previous_stock)}</td>
                  <td style={{ ...tdStyle, fontWeight: "bold" }}>{parseFloat(m.new_stock)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const thStyle = { padding: "12px 10px", color: "#334155" };
const tdStyle = { padding: "12px 10px", color: "#1e293b" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" };
const secondaryBtn = { padding: "10px 20px", background: "#fff", color: "#333", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer", fontWeight: "500" };

export default InventoryMovements;
