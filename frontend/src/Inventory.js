import React, { useEffect, useState } from "react";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

function Inventory() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // ---- form state (new fields added) ----
  const [name, setName] = useState("");
  const [itemType, setItemType] = useState("Goods");
  const [unit, setUnit] = useState("");
  const [sku, setSku] = useState("");
  const [hsn, setHsn] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [description, setDescription] = useState("");
  const [salesAccount, setSalesAccount] = useState("Sales");
  const [purchaseAccount, setPurchaseAccount] = useState("Cost of Goods Sold");

  // ---- edit state ----
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editItemType, setEditItemType] = useState("Goods");
  const [editUnit, setEditUnit] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editHsn, setEditHsn] = useState("");
  const [editTaxRate, setEditTaxRate] = useState("");
  const [editSellingPrice, setEditSellingPrice] = useState("");
  const [editCostPrice, setEditCostPrice] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSalesAccount, setEditSalesAccount] = useState("Sales");
  const [editPurchaseAccount, setEditPurchaseAccount] =
    useState("Cost of Goods Sold");

  const loadItems = async () => {
    try {
      setLoading(true);
      const res = await apiRequest("/items");
      setItems(res?.items || []);
    } catch (err) {
      toast.error("Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const addItem = async () => {
    if (!name.trim()) {
      toast.error("Item name required");
      return;
    }
    try {
      setLoading(true);
      await apiRequest("/items", {
        method: "POST",
        body: JSON.stringify({
          name,
          item_type: itemType,
          unit,
          sku,
          hsn_code: hsn,
          tax_rate: taxRate || 0,
          selling_price: sellingPrice || 0,
          cost_price: costPrice || 0,
          description,
          sales_account: salesAccount,
          purchase_account: purchaseAccount,
        }),
      });
      toast.success("Item added");
      // reset form
      setName("");
      setItemType("Goods");
      setUnit("");
      setSku("");
      setHsn("");
      setTaxRate("");
      setSellingPrice("");
      setCostPrice("");
      setDescription("");
      setSalesAccount("Sales");
      setPurchaseAccount("Cost of Goods Sold");
      loadItems();
    } catch (err) {
      toast.error("Error adding item");
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id) => {
    try {
      setLoading(true);
      await apiRequest(`/items/${id}`, { method: "DELETE" });
      toast.success("Item deleted");
      loadItems();
    } catch (err) {
      toast.error("Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditItemType(item.item_type || "Goods");
    setEditUnit(item.unit || "");
    setEditSku(item.sku || "");
    setEditHsn(item.hsn_code || "");
    setEditTaxRate(item.tax_rate || "");
    setEditSellingPrice(item.selling_price || "");
    setEditCostPrice(item.cost_price || "");
    setEditDescription(item.description || "");
    setEditSalesAccount(item.sales_account || "Sales");
    setEditPurchaseAccount(item.purchase_account || "Cost of Goods Sold");
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id) => {
    try {
      setLoading(true);
      await apiRequest(`/items/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editName,
          item_type: editItemType,
          unit: editUnit,
          sku: editSku,
          hsn_code: editHsn,
          tax_rate: editTaxRate || 0,
          selling_price: editSellingPrice || 0,
          cost_price: editCostPrice || 0,
          description: editDescription,
          sales_account: editSalesAccount,
          purchase_account: editPurchaseAccount,
        }),
      });
      toast.success("Item updated");
      setEditingId(null);
      loadItems();
    } catch (err) {
      toast.error("Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest("/logout", { method: "POST" });
    } catch (err) {
      console.error(err);
    } finally {
      setUser(null);
      navigate("/");
    }
  };

  return (
    <>
      <div style={{ padding: "30px", maxWidth: "1000px", margin: "auto" }}>
        <h2>Inventory – New Item</h2>
        {loading && <p style={{ color: "gray" }}>Processing...</p>}

        {/* ------- Add Form ------- */}
        <div style={formGrid}>
          <input
            placeholder="Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
          <select
            value={itemType}
            onChange={(e) => setItemType(e.target.value)}
            style={inputStyle}
          >
            <option value="Goods">Goods</option>
            <option value="Service">Service</option>
          </select>
          <input
            placeholder="Unit (e.g., pcs, kg)"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="HSN Code"
            value={hsn}
            onChange={(e) => setHsn(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Tax Rate %"
            type="number"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Selling Price"
            type="number"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Cost Price"
            type="number"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Sales Account"
            value={salesAccount}
            onChange={(e) => setSalesAccount(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Purchase Account"
            value={purchaseAccount}
            onChange={(e) => setPurchaseAccount(e.target.value)}
            style={inputStyle}
          />
          <button onClick={addItem} style={btnStyle}>
            Add Item
          </button>
        </div>

        {/* ------- Items Table ------- */}
        <table
          border="1"
          cellPadding="8"
          style={{ width: "100%", marginTop: "30px" }}
        >
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Unit</th>
              <th>SKU</th>
              <th>HSN</th>
              <th>Tax %</th>
              <th>Sell Price</th>
              <th>Cost</th>
              <th>Desc</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                {editingId === item.id ? (
                  <>
                    <td>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={smallInput}
                      />
                    </td>
                    <td>
                      <select
                        value={editItemType}
                        onChange={(e) => setEditItemType(e.target.value)}
                        style={smallInput}
                      >
                        <option value="Goods">Goods</option>
                        <option value="Service">Service</option>
                      </select>
                    </td>
                    <td>
                      <input
                        value={editUnit}
                        onChange={(e) => setEditUnit(e.target.value)}
                        style={smallInput}
                      />
                    </td>
                    <td>
                      <input
                        value={editSku}
                        onChange={(e) => setEditSku(e.target.value)}
                        style={smallInput}
                      />
                    </td>
                    <td>
                      <input
                        value={editHsn}
                        onChange={(e) => setEditHsn(e.target.value)}
                        style={smallInput}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={editTaxRate}
                        onChange={(e) => setEditTaxRate(e.target.value)}
                        style={smallInput}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={editSellingPrice}
                        onChange={(e) => setEditSellingPrice(e.target.value)}
                        style={smallInput}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={editCostPrice}
                        onChange={(e) => setEditCostPrice(e.target.value)}
                        style={smallInput}
                      />
                    </td>
                    <td>
                      <input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        style={smallInput}
                      />
                    </td>
                    <td>
                      <button onClick={() => saveEdit(item.id)} style={saveBtn}>
                        Save
                      </button>
                      <button onClick={cancelEdit} style={cancelBtn}>
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{item.name}</td>
                    <td>{item.item_type || "Goods"}</td>
                    <td>{item.unit || "-"}</td>
                    <td>{item.sku || "-"}</td>
                    <td>{item.hsn_code || "-"}</td>
                    <td>{item.tax_rate}%</td>
                    <td>{item.selling_price}</td>
                    <td>{item.cost_price || 0}</td>
                    <td>{item.description || "-"}</td>
                    <td>
                      <button onClick={() => startEdit(item)} style={editBtn}>
                        Edit
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        style={deleteBtn}
                      >
                        Delete
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---- styles ----
const formGrid = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginBottom: "20px",
};
const inputStyle = {
  padding: "8px",
  borderRadius: "5px",
  border: "1px solid #ccc",
  flex: "1 1 160px",
};
const smallInput = { width: "70px", padding: "4px" };
const btnStyle = {
  padding: "8px 15px",
  background: "#4a90e2",
  color: "#fff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};
const editBtn = {
  background: "orange",
  color: "#fff",
  border: "none",
  padding: "4px 8px",
  borderRadius: "4px",
  marginRight: "5px",
  cursor: "pointer",
};
const deleteBtn = {
  background: "red",
  color: "#fff",
  border: "none",
  padding: "4px 8px",
  borderRadius: "4px",
  cursor: "pointer",
};
const saveBtn = {
  background: "#28a745",
  color: "#fff",
  border: "none",
  padding: "4px 8px",
  borderRadius: "4px",
  marginRight: "5px",
  cursor: "pointer",
};
const cancelBtn = {
  background: "gray",
  color: "#fff",
  border: "none",
  padding: "4px 8px",
  borderRadius: "4px",
  cursor: "pointer",
};

export default Inventory;
