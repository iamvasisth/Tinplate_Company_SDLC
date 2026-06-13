/**
 * AddDeliveryChallan.js – New Delivery Challan creation form
 */
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "./api";
import { FormSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function AddDeliveryChallan() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // --- Basic fields ---
  const [customerId, setCustomerId] = useState("");
  const [salesOrderId, setSalesOrderId] = useState("");
  const [challanDate, setChallanDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  // --- Items ---
  const [items, setItems] = useState([
    { item_id: "", item_name: "", description: "", quantity: 1, unit: "", rate: 0 }
  ]);

  // --- Dropdown data ---
  const [customers, setCustomers] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // --- Modals ---
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // --- New Customer form ---
  const [newCustomer, setNewCustomer] = useState({ display_name: "", company_name: "", email: "", phone: "", billing_address: "", pan: "" });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [custRes, itemRes, soRes] = await Promise.all([
          apiRequest("/customers"),
          apiRequest("/items"),
          apiRequest("/sales-orders"),
        ]);
        setCustomers(custRes?.customers || []);
        setCatalogItems(itemRes?.items || []);
        setSalesOrders(soRes?.sales_orders || []);

        if (isEditMode) {
          setFetching(true);
          const res = await apiRequest(`/delivery-challans/${id}`);
          if (res?.delivery_challan) {
            const dc = res.delivery_challan;
            if (dc.stock_reduced) {
              toast.error("Cannot edit a challan that has already been delivered/stock reduced.");
              navigate("/delivery-challans");
              return;
            }
            setCustomerId(dc.customer_id ? String(dc.customer_id) : "");
            setSalesOrderId(dc.sales_order_id ? String(dc.sales_order_id) : "");
            setChallanDate(dc.challan_date ? dc.challan_date.slice(0, 10) : "");
            setDeliveryDate(dc.delivery_date ? dc.delivery_date.slice(0, 10) : "");
            setDeliveryAddress(dc.delivery_address || "");
            setReferenceNumber(dc.reference_number || "");
            setNotes(dc.notes || "");
            setTerms(dc.terms_conditions || "");
            if (res.items && res.items.length > 0) {
              setItems(res.items.map(item => ({
                item_id:     item.item_id     ? String(item.item_id)  : "",
                item_name:   item.item_name   || "",
                description: item.description || "",
                quantity:    item.quantity     || 1,
                unit:        item.unit         || "",
                rate:        item.rate         || 0,
              })));
            }
          }
        }
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setFetching(false);
      }
    };
    fetchAll();
  }, [id, isEditMode, navigate]);

  const addItem = () => {
    setItems([...items, { item_id: "", item_name: "", description: "", quantity: 1, unit: "", rate: 0 }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleItemSelect = (index, itemId) => {
    const updated = [...items];
    updated[index].item_id = itemId;
    if (itemId) {
      const catalogItem = catalogItems.find(ci => String(ci.id) === String(itemId));
      if (catalogItem) {
        updated[index].item_name   = catalogItem.name || "";
        updated[index].description = catalogItem.description || catalogItem.name || "";
        updated[index].unit        = catalogItem.unit || "";
        updated[index].rate        = catalogItem.selling_price || 0;
      }
    } else {
      updated[index].item_name = "";
      updated[index].unit      = "";
    }
    setItems(updated);
  };

  const handleSave = async () => {
    if (!customerId) { toast.error("Please select a customer"); return; }
    if (items.length === 0 || items.every(item => !item.description && !item.item_id)) {
      toast.error("Add at least one item"); return;
    }
    
    // Prevent zero quantity to ensure logic holds
    for(const item of items) {
        if(parseFloat(item.quantity) <= 0) {
            toast.error("Quantity must be greater than zero");
            return;
        }
    }

    setLoading(true);
    try {
      if (isEditMode) {
        await apiRequest(`/delivery-challans/${id}`, {
          method: "PUT",
          body: JSON.stringify({
            customer_id: parseInt(customerId),
            sales_order_id: salesOrderId ? parseInt(salesOrderId) : null,
            challan_date: challanDate,
            delivery_date: deliveryDate || null,
            delivery_address: deliveryAddress || null,
            reference_number: referenceNumber,
            notes: notes,
            terms_conditions: terms,
            items: items.map(item => ({
              ...item,
              item_id:   item.item_id   ? parseInt(item.item_id) : null,
              item_name: item.item_name || null,
              unit:      item.unit      || null,
              quantity:  parseFloat(item.quantity) || 0,
              rate:      parseFloat(item.rate) || 0,
            })),
          }),
        });
        toast.success("Delivery Challan updated");
        navigate(`/delivery-challans/${id}/document`);
      } else {
        await apiRequest("/delivery-challans", {
          method: "POST",
          body: JSON.stringify({
            customer_id: parseInt(customerId),
            sales_order_id: salesOrderId ? parseInt(salesOrderId) : null,
            challan_date: challanDate,
            delivery_date: deliveryDate || null,
            delivery_address: deliveryAddress || null,
            reference_number: referenceNumber,
            status: "Draft",
            notes: notes,
            terms_conditions: terms,
            items: items.map(item => ({
              ...item,
              item_id:   item.item_id   ? parseInt(item.item_id) : null,
              item_name: item.item_name || null,
              unit:      item.unit      || null,
              quantity:  parseFloat(item.quantity) || 0,
              rate:      parseFloat(item.rate) || 0,
            })),
          }),
        });
        toast.success("Delivery Challan created");
        navigate("/delivery-challans");
      }
    } catch (err) {
      toast.error(err.message || (isEditMode ? "Failed to update Delivery Challan" : "Failed to create Delivery Challan"));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomer = async () => {
    if (!newCustomer.display_name && !newCustomer.company_name) { toast.error("Customer name required"); return; }
    try {
      const res = await apiRequest("/customers", {
        method: "POST",
        body: JSON.stringify(newCustomer),
      });
      if (res?.customer) {
        setCustomers(prev => [...prev, res.customer]);
        setCustomerId(String(res.customer.id));
        toast.success("Customer created");
      }
      setShowCustomerModal(false);
      setNewCustomer({ display_name: "", company_name: "", email: "", phone: "", billing_address: "", pan: "" });
    } catch (err) { toast.error("Failed to create customer"); }
  };

  if (fetching) {
    return (
      <div style={{ maxWidth: "960px", margin: "auto", padding: "30px" }}>
        <h2 style={{ marginBottom: "25px" }}>{isEditMode ? "Edit Delivery Challan" : "New Delivery Challan"}</h2>
        <FormSkeleton fields={8} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "960px", margin: "auto", padding: "30px" }}>
      <h2 style={{ marginBottom: "25px" }}>{isEditMode ? "Edit Delivery Challan" : "New Delivery Challan"}</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px", marginBottom: "15px" }}>
        <div>
          <label><strong>Customer *</strong></label>
          <div style={{ display: "flex", gap: "5px" }}>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="">Select customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.display_name || c.company_name || c.email}
                </option>
              ))}
            </select>
            <button onClick={() => setShowCustomerModal(true)} style={addBtnSmall} title="New Customer">+</button>
          </div>
        </div>
        <div>
          <label><strong>Sales Order (Optional)</strong></label>
          <select value={salesOrderId} onChange={e => setSalesOrderId(e.target.value)} style={inputStyle}>
              <option value="">Select Sales Order</option>
              {salesOrders.filter(so => !customerId || String(so.customer_id) === customerId).map(so => (
                <option key={so.id} value={so.id}>
                  {so.sales_order_number}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label><strong>Challan Date</strong></label>
          <input type="date" value={challanDate} onChange={e => setChallanDate(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px", marginBottom: "15px" }}>
        <div style={{ gridColumn: "span 2" }}>
            <label><strong>Delivery Address</strong></label>
            <input type="text" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} style={inputStyle} placeholder="123 Main St, City..." />
        </div>
        <div>
          <label><strong>Reference#</strong></label>
          <input type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} style={inputStyle} placeholder="e.g. PO-1234" />
        </div>
      </div>

      {/* Items Table */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", marginTop: "30px" }}>
        <h3 style={{ margin: 0 }}>Item Table</h3>
        <button onClick={addItem} style={secondaryBtn}>+ Add Row</button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "15px", minWidth: "600px" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={thStyle}>Item</th>
              <th style={thStyle}>Description</th>
              <th style={{ ...thStyle, width: "100px" }}>Qty</th>
              <th style={{ ...thStyle, width: "100px" }}>Unit</th>
              <th style={{ ...thStyle, width: "40px" }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={tdStyle}>
                  <select value={item.item_id} onChange={e => handleItemSelect(idx, e.target.value)}
                    style={{ ...inputStyle, minWidth: "150px" }}>
                    <option value="">— Select item —</option>
                    {catalogItems.map(ci => (
                      <option key={ci.id} value={ci.id}>{ci.name}</option>
                    ))}
                  </select>
                </td>
                <td style={tdStyle}>
                  <input type="text" placeholder="Description" value={item.description}
                    onChange={e => updateItem(idx, "description", e.target.value)} style={{ ...inputStyle, minWidth: "200px" }} />
                </td>
                <td style={tdStyle}>
                  <input type="number" min="0" step="0.01" value={item.quantity}
                    onChange={e => updateItem(idx, "quantity", e.target.value)} style={{ ...inputStyle, width: "95px" }} />
                </td>
                <td style={tdStyle}>
                  <input type="text" placeholder="e.g. kg, box" value={item.unit}
                    onChange={e => updateItem(idx, "unit", e.target.value)} style={{ ...inputStyle, width: "95px" }} />
                </td>
                <td style={tdStyle}>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(idx)} style={deleteItemBtn}>✕</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes & Terms */}
      <div style={{ marginBottom: "15px" }}>
        <label><strong>Notes</strong></label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          rows={2} style={inputStyle} placeholder="Add any specific delivery instructions here." />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label><strong>Terms & Conditions</strong></label>
        <textarea value={terms} onChange={e => setTerms(e.target.value)}
          rows={3} style={inputStyle} placeholder="Enter the terms and conditions..." />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "30px" }}>
        <button onClick={() => navigate(isEditMode ? `/delivery-challans/${id}/document` : "/delivery-challans")} style={cancelBtnStyle}>Cancel</button>
        <button onClick={handleSave} disabled={loading} style={primaryBtn}>
          {loading ? "Saving..." : (isEditMode ? "Update Delivery Challan" : "Save Delivery Challan")}
        </button>
      </div>

      {/* ===== NEW CUSTOMER MODAL ===== */}
      {showCustomerModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ marginTop: 0 }}>+ New Customer</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label>Display Name *</label>
                <input value={newCustomer.display_name} onChange={e => setNewCustomer({ ...newCustomer, display_name: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label>Company Name</label>
                <input value={newCustomer.company_name} onChange={e => setNewCustomer({ ...newCustomer, company_name: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label>Email</label>
                <input type="email" value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label>Phone</label>
                <input value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label>GSTIN / Tax Number</label>
                <input value={newCustomer.pan} onChange={e => setNewCustomer({ ...newCustomer, pan: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label>Billing Address</label>
                <input value={newCustomer.billing_address} onChange={e => setNewCustomer({ ...newCustomer, billing_address: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "15px" }}>
              <button onClick={() => setShowCustomerModal(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleSaveCustomer} style={primaryBtn}>Save Customer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const thStyle = { padding: "10px", borderBottom: "2px solid #cbd5e1", whiteSpace: "nowrap", fontSize: "13px" };
const tdStyle = { padding: "6px 8px" };
const inputStyle = { width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc", boxSizing: "border-box", fontSize: "13px" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "500" };
const secondaryBtn = { padding: "8px 14px", background: "#f0f0f0", color: "#333", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer", fontSize: "13px" };
const cancelBtnStyle = { padding: "10px 20px", background: "#ccc", color: "#333", border: "none", borderRadius: "5px", cursor: "pointer" };
const deleteItemBtn = { background: "red", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", padding: "4px 8px" };
const addBtnSmall = { padding: "6px 10px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" };
const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalBox = { background: "#fff", borderRadius: "8px", padding: "25px", width: "550px", maxWidth: "95%", maxHeight: "85vh", overflow: "auto", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" };

export default AddDeliveryChallan;
