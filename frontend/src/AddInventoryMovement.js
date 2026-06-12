import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiRequest } from "./api";
import { FormSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function AddInventoryMovement() {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [items, setItems] = useState([]);
  
  const [itemId, setItemId] = useState("");
  const [movementType, setMovementType] = useState("stock_in");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchItems();
  }, []);

  // Check if we came here from the Items page with a preselected item and type
  useEffect(() => {
    if (items.length > 0 && location.state) {
      if (location.state.itemId) setItemId(location.state.itemId.toString());
      if (location.state.type) setMovementType(location.state.type);
    }
  }, [items, location.state]);

  const fetchItems = async () => {
    try {
      const res = await apiRequest("/items");
      setItems(res?.items || []);
    } catch (err) {
      toast.error("Failed to load items");
    } finally {
      setInitialLoading(false);
    }
  };

  const selectedItem = items.find(i => i.id === parseInt(itemId));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!itemId) return toast.error("Please select an item");
    
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) return toast.error("Quantity must be greater than 0");

    if (movementType === "stock_out" && selectedItem && qty > parseFloat(selectedItem.stock_quantity || 0)) {
      return toast.error(`Cannot stock out ${qty}. Current stock is only ${selectedItem.stock_quantity || 0}.`);
    }

    setLoading(true);
    try {
      const payload = {
        item_id: itemId,
        movement_type: movementType,
        quantity: qty,
        reason,
        reference_number: referenceNumber,
        notes
      };

      await apiRequest("/inventory/movements", { method: "POST", body: JSON.stringify(payload) });
      toast.success("Inventory adjusted successfully");
      navigate("/inventory-adjustments");
    } catch (err) {
      toast.error(err.message || "Failed to adjust inventory");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "30px", maxWidth: "800px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>New Inventory Adjustment</h2>
        <button onClick={() => navigate(-1)} style={secondaryBtn}>Back</button>
      </div>

      {initialLoading ? (
        <FormSkeleton fields={4} />
      ) : (
        <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <form onSubmit={handleSave}>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label style={labelStyle}>Item *</label>
              <select value={itemId} onChange={e => setItemId(e.target.value)} style={inputStyle} required>
                <option value="">Select an Item</option>
                {items.filter(i => i.item_type !== "Service").map(i => (
                  <option key={i.id} value={i.id}>{i.name} (SKU: {i.sku || "N/A"})</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={labelStyle}>Movement Type *</label>
              <select value={movementType} onChange={e => setMovementType(e.target.value)} style={inputStyle} required>
                <option value="stock_in">Stock In (Increase)</option>
                <option value="stock_out">Stock Out (Decrease)</option>
                <option value="adjustment">Absolute Adjustment (Set to)</option>
              </select>
            </div>
          </div>

          {selectedItem && (
            <div style={{ background: "#f8fafc", padding: "15px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              <div>
                <p style={{ margin: "0 0 5px 0", color: "#64748b", fontSize: "12px" }}>Current Stock</p>
                <p style={{ margin: 0, fontWeight: "600", fontSize: "16px" }}>{parseFloat(selectedItem.stock_quantity || 0)} {selectedItem.unit}</p>
              </div>
              <div>
                <p style={{ margin: "0 0 5px 0", color: "#64748b", fontSize: "12px" }}>Reorder Level</p>
                <p style={{ margin: 0, fontWeight: "500", fontSize: "14px" }}>{parseFloat(selectedItem.reorder_level || 0)}</p>
              </div>
              <div>
                <p style={{ margin: "0 0 5px 0", color: "#64748b", fontSize: "12px" }}>Unit</p>
                <p style={{ margin: 0, fontWeight: "500", fontSize: "14px" }}>{selectedItem.unit || "N/A"}</p>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label style={labelStyle}>{movementType === "adjustment" ? "New Absolute Stock Level" : "Quantity"} *</label>
              <input type="number" step="0.01" min="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Reference Number</label>
              <input type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Reason</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} style={inputStyle} placeholder="e.g. Received from Supplier, Damaged, Sample" />
          </div>

          <div style={{ marginBottom: "30px" }}>
            <label style={labelStyle}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={inputStyle}></textarea>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" onClick={() => navigate(-1)} style={secondaryBtn}>Cancel</button>
            <button type="submit" disabled={loading} style={{...primaryBtn, opacity: loading ? 0.5 : 1}}>
              {loading ? "Saving..." : "Save Adjustment"}
            </button>
          </div>
        </form>
      </div>
      )}
    </div>
  );
}

const inputStyle = { width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" };
const labelStyle = { display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px", color: "#334155" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" };
const secondaryBtn = { padding: "10px 20px", background: "#f1f5f9", color: "#333", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer" };

export default AddInventoryMovement;
