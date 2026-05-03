/**
 * ItemsForm.js – Create / Edit inventory item with full accounting details
 * Dependencies: apiRequest, react-router-dom, AuthContext
 */
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "./api";
import { useAuth } from "./AuthContext";

function ItemsForm() {
  const { id } = useParams();              // if editing
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Dynamic label
  const itemLabel =
    user?.business_type === "School"
      ? "Student"
      : user?.business_type === "Hospital"
      ? "Patient"
      : user?.business_type === "Retail"
      ? "Product"
      : "Item";

  // ==================== Form state ====================
  const [form, setForm] = useState({
    name: "",
    item_type: "Goods",
    unit: "",
    image_url: "",
    selling_price: "",
    sales_account: "",
    cost_price: "",
    purchase_account: "",
    description: "",
    preferred_vendor_id: "",
    sku: "",
    hsn_code: "",
    tax_rate: "0",
  });

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ==================== Load vendors (type=vendor) ====================
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await apiRequest("/contacts?type=vendor");
        setVendors(res?.contacts || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchVendors();
  }, []);

  // ==================== If editing, load item data ====================
  useEffect(() => {
    if (!isEdit) return;
    const fetchItem = async () => {
      try {
        const res = await apiRequest(`/items/${id}`);
        if (res?.item) {
          const i = res.item;
          setForm({
            name: i.name || "",
            item_type: i.item_type || "Goods",
            unit: i.unit || "",
            image_url: i.image_url || "",
            selling_price: i.selling_price || "",
            sales_account: i.sales_account || "",
            cost_price: i.cost_price || "",
            purchase_account: i.purchase_account || "",
            description: i.description || "",
            preferred_vendor_id: i.preferred_vendor_id || "",
            sku: i.sku || "",
            hsn_code: i.hsn_code || "",
            tax_rate: i.tax_rate || "0",
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchItem();
  }, [id, isEdit]);

  // ==================== Change handler ====================
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ==================== Submit ====================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const payload = {
        ...form,
        selling_price: parseFloat(form.selling_price) || 0,
        cost_price: parseFloat(form.cost_price) || 0,
        tax_rate: parseFloat(form.tax_rate) || 0,
        preferred_vendor_id: form.preferred_vendor_id
          ? parseInt(form.preferred_vendor_id)
          : null,
      };

      if (isEdit) {
        await apiRequest(`/items/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setMessage("Item updated successfully.");
      } else {
        await apiRequest("/items", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage("Item created successfully.");
      }
      setTimeout(() => navigate("/items"), 1000);
    } catch (err) {
      setMessage(err.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  // ==================== Account dropdown options (hardcoded per requirements) ====================
  const incomeAccounts = [
    "Sales", "Discount", "General Income", "Interest Income",
    "Late Fee Income", "Other Charges", "Shipping Charge"
  ];
  const expenseAccounts = [
    "Cost of Goods Sold", "Advertising And Marketing", "Automobile Expense",
    "Bad Debt", "Bank Fees and Charges", "Consultant Expense",
    "Credit Card Charges", "Depreciation And Amortisation",
    "IT and Internet Expenses", "Office Supplies", "Rent Expense",
    "Salaries and Employee Wages", "Travel Expense", "Uncategorized",
  ];

  return (
    <div style={{ padding: "30px", maxWidth: "700px", margin: "auto" }}>
      <h2>
        {isEdit ? "Edit" : "New"} {itemLabel}
      </h2>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {/* Name */}
        <input
          name="name"
          placeholder={`${itemLabel} Name`}
          value={form.name}
          onChange={handleChange}
          required
          style={inputStyle}
        />

        {/* Type (Goods / Service) */}
        <select name="item_type" value={form.item_type} onChange={handleChange} style={inputStyle}>
          <option value="Goods">Goods</option>
          <option value="Service">Service</option>
        </select>

        {/* Unit */}
        <input name="unit" placeholder="Unit (e.g. pcs, kg)" value={form.unit} onChange={handleChange} style={inputStyle} />

        {/* Image URL (placeholder for upload) */}
        <input name="image_url" placeholder="Image URL" value={form.image_url} onChange={handleChange} style={inputStyle} />

        <hr />

        {/* ===== Sales Information ===== */}
        <h4>Sales Information</h4>
        <input
          name="selling_price"
          type="number"
          placeholder="Selling Price"
          value={form.selling_price}
          onChange={handleChange}
          style={inputStyle}
        />
        <select name="sales_account" value={form.sales_account} onChange={handleChange} style={inputStyle}>
          <option value="">Select Sales Account</option>
          {incomeAccounts.map(acc => (
            <option key={acc} value={acc}>{acc}</option>
          ))}
        </select>

        <hr />

        {/* ===== Purchase Information ===== */}
        <h4>Purchase Information</h4>
        <input
          name="cost_price"
          type="number"
          placeholder="Cost Price"
          value={form.cost_price}
          onChange={handleChange}
          style={inputStyle}
        />
        <select name="purchase_account" value={form.purchase_account} onChange={handleChange} style={inputStyle}>
          <option value="">Select Purchase Account</option>
          {expenseAccounts.map(acc => (
            <option key={acc} value={acc}>{acc}</option>
          ))}
        </select>

        {/* Preferred Vendor (from contacts where type=vendor) */}
        <select name="preferred_vendor_id" value={form.preferred_vendor_id} onChange={handleChange} style={inputStyle}>
          <option value="">Select Preferred Vendor</option>
          {vendors.map(v => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>

        <hr />

        {/* Description */}
        <textarea
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
          style={{ ...inputStyle, height: "80px" }}
        />

        {/* SKU & HSN */}
        <input name="sku" placeholder="SKU" value={form.sku} onChange={handleChange} style={inputStyle} />
        <input name="hsn_code" placeholder="HSN/SAC Code" value={form.hsn_code} onChange={handleChange} style={inputStyle} />
        <input
          name="tax_rate"
          type="number"
          placeholder="Tax Rate (%)"
          value={form.tax_rate}
          onChange={handleChange}
          style={inputStyle}
        />

        {message && <p style={{ color: message.includes("success") ? "green" : "red" }}>{message}</p>}

        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? "Saving..." : isEdit ? "Update" : "Save"}
        </button>
      </form>
    </div>
  );
}

const inputStyle = {
  padding: "10px",
  borderRadius: "5px",
  border: "1px solid #ccc",
  fontSize: "14px",
};
const btnStyle = {
  padding: "10px 20px",
  backgroundColor: "#4a90e2",
  color: "#fff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
  fontWeight: "bold",
};

export default ItemsForm;