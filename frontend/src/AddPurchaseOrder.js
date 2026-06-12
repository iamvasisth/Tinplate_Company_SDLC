/**
 * AddPurchaseOrder.js – New Purchase Order creation form (Expense-style Layout)
 */
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "./api";
import { FormSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";
import AddCustomer from "./AddCustomer";

function AddPurchaseOrder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // --- Basic fields ---
  const [vendorId, setVendorId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [poDate, setPoDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [projectId, setProjectId] = useState("");

  // --- GST Fields ---
  const [supplierState, setSupplierState] = useState("Jharkhand");
  const [placeOfSupply, setPlaceOfSupply] = useState("Jharkhand");
  const [customerGstin, setCustomerGstin] = useState("");
  const [gstType, setGstType] = useState("intra_state");

  // --- Items ---
  const [items, setItems] = useState([
    { item_id: "", item_name: "", description: "", quantity: 1, rate: 0, tax_rate: 0, discount: 0, discount_type: "flat", hsn_code: "", unit: "" }
  ]);

  // --- Dropdown data ---
  const [vendors, setVendors] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [salespersons, setSalespersons] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // --- Modals ---
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showSalespersonModal, setShowSalespersonModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  // --- New Vendor form ---
  const [newVendor, setNewVendor] = useState({ display_name: "", company_name: "", email: "", phone: "", billing_address: "", pan: "" });
  const [newSp, setNewSp] = useState({ name: "", email: "", phone: "", employee_id: "" });
  const [newProj, setNewProj] = useState({ project_name: "", customer_id: "", start_date: "", end_date: "", description: "", status: "active" });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [vendRes, custRes, itemRes, spRes, projRes, orgRes] = await Promise.all([
          apiRequest("/vendors"),
          apiRequest("/customers"),
          apiRequest("/items"),
          apiRequest("/salespersons"),
          apiRequest("/projects"),
          apiRequest("/organization-settings")
        ]);
        setVendors(vendRes?.vendors || []);
        setCustomers(custRes?.customers || []);
        setCatalogItems(itemRes?.items || []);
        setSalespersons(spRes?.salespersons || []);
        setProjects(projRes?.projects || []);

        if (orgRes?.settings?.state) {
          setSupplierState(orgRes.settings.state);
          setPlaceOfSupply(orgRes.settings.state);
        }

        if (isEditMode) {
          setFetching(true);
          const res = await apiRequest(`/purchase-orders/${id}`);
          if (res?.purchase_order) {
            const po = res.purchase_order;
            setVendorId(po.vendor_id ? String(po.vendor_id) : "");
            setCustomerId(po.customer_id ? String(po.customer_id) : "");
            setPoDate(po.purchase_order_date ? po.purchase_order_date.slice(0, 10) : "");
            setExpectedDeliveryDate(po.expected_delivery_date ? po.expected_delivery_date.slice(0, 10) : "");
            setReferenceNumber(po.reference_number || "");
            setNotes(po.notes || "");
            setTerms(po.terms_conditions || "");
            setSalespersonId(po.salesperson_id ? String(po.salesperson_id) : "");
            setProjectId(po.project_id ? String(po.project_id) : "");
            if (po.supplier_state) setSupplierState(po.supplier_state);
            if (po.place_of_supply) setPlaceOfSupply(po.place_of_supply);
            if (po.customer_gstin) setCustomerGstin(po.customer_gstin);
            if (po.gst_type) setGstType(po.gst_type);

            if (res.items && res.items.length > 0) {
              setItems(res.items.map(item => ({
                item_id:       item.item_id       ? String(item.item_id)  : "",
                item_name:     item.item_name     || "",
                description:   item.description   || "",
                quantity:      item.quantity       || 1,
                rate:          item.rate           || 0,
                tax_rate:      item.tax_rate       || 0,
                discount:      item.discount       || 0,
                discount_type: item.discount_type  || "flat",
                hsn_code:      item.hsn_code       || "",
                unit:          item.unit           || "",
                cgst_rate:     item.cgst_rate      || 0,
                cgst_amount:   item.cgst_amount    || 0,
                sgst_rate:     item.sgst_rate      || 0,
                sgst_amount:   item.sgst_amount    || 0,
                igst_rate:     item.igst_rate      || 0,
                igst_amount:   item.igst_amount    || 0,
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
  }, [id, isEditMode]);

  // Update Supplier State and GSTIN when vendor changes
  useEffect(() => {
    if (vendorId) {
      const vend = vendors.find(v => String(v.id) === String(vendorId));
      if (vend && !isEditMode) {
        if (vend.pan) setCustomerGstin(vend.pan);
        if (vend.billing_address) {
          const states = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"];
          const foundState = states.find(s => vend.billing_address.toLowerCase().includes(s.toLowerCase()));
          if (foundState) setSupplierState(foundState);
        }
      }
    }
  }, [vendorId, vendors, isEditMode]);

  // Update GST Type when states change
  useEffect(() => {
    if (supplierState.toLowerCase().trim() === placeOfSupply.toLowerCase().trim()) {
      setGstType("intra_state");
    } else {
      setGstType("inter_state");
    }
  }, [supplierState, placeOfSupply]);

  const addItem = () => {
    setItems([...items, { item_id: "", item_name: "", description: "", quantity: 1, rate: 0, tax_rate: 0, discount: 0, discount_type: "flat", hsn_code: "", unit: "" }]);
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
        updated[index].rate        = catalogItem.purchase_price || 0;
        updated[index].tax_rate    = catalogItem.tax_rate || 0;
        updated[index].hsn_code    = catalogItem.hsn_code || "";
        updated[index].unit        = catalogItem.unit || "";
      }
    } else {
      updated[index].item_name = "";
      updated[index].hsn_code  = "";
      updated[index].unit      = "";
    }
    setItems(updated);
  };

  const calcLineAmount = (item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    let amt = qty * rate;
    const disc = parseFloat(item.discount) || 0;
    if (item.discount_type === "percent") {
      amt -= amt * (disc / 100);
    } else {
      amt -= disc;
    }
    return amt;
  };

  const getLineGst = (item) => {
    const taxableAmt = calcLineAmount(item);
    const rate = parseFloat(item.tax_rate) || 0;
    let cgstRate = 0, sgstRate = 0, igstRate = 0;
    
    if (gstType === "intra_state") {
      cgstRate = rate / 2;
      sgstRate = rate / 2;
    } else {
      igstRate = rate;
    }

    return {
      cgst_rate: cgstRate,
      sgst_rate: sgstRate,
      igst_rate: igstRate,
      cgst_amount: taxableAmt * (cgstRate / 100),
      sgst_amount: taxableAmt * (sgstRate / 100),
      igst_amount: taxableAmt * (igstRate / 100),
      tax_amount: taxableAmt * (rate / 100)
    };
  };

  const calcLineTax = (item) => getLineGst(item).tax_amount;

  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0), 0);
  const totalDiscount = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const disc = parseFloat(item.discount) || 0;
    if (item.discount_type === "percent") return sum + (qty * rate * disc / 100);
    return sum + disc;
  }, 0);

  let totalCGST = 0, totalSGST = 0, totalIGST = 0;
  items.forEach(item => {
    const gst = getLineGst(item);
    totalCGST += gst.cgst_amount;
    totalSGST += gst.sgst_amount;
    totalIGST += gst.igst_amount;
  });

  const totalTax = totalCGST + totalSGST + totalIGST;
  const grandTotal = subtotal - totalDiscount + totalTax;

  const handleSave = async () => {
    if (!vendorId) { toast.error("Please select a vendor"); return; }
    if (items.length === 0 || items.every(item => !item.description && !item.item_id)) {
      toast.error("Add at least one item"); return;
    }

    setLoading(true);
    try {
      const payload = {
        vendor_id: parseInt(vendorId),
        purchase_order_date: poDate,
        expected_delivery_date: expectedDeliveryDate || null,
        reference_number: referenceNumber,
        status: "Draft",
        notes: notes,
        terms_conditions: terms,
        customer_id: customerId ? parseInt(customerId) : null,
        salesperson_id: salespersonId ? parseInt(salespersonId) : null,
        project_id: projectId ? parseInt(projectId) : null,
        supplier_state: supplierState,
        place_of_supply: placeOfSupply,
        customer_gstin: customerGstin,
        gst_type: gstType,
        items: items.map(item => {
          const gst = getLineGst(item);
          return {
            ...item,
            item_id:   item.item_id   ? parseInt(item.item_id) : null,
            item_name: item.item_name || null,
            hsn_code:  item.hsn_code  || null,
            unit:      item.unit      || null,
            quantity:  parseFloat(item.quantity) || 0,
            rate:      parseFloat(item.rate) || 0,
            tax_rate:  parseFloat(item.tax_rate) || 0,
            discount:  parseFloat(item.discount) || 0,
            cgst_rate: gst.cgst_rate,
            cgst_amount: gst.cgst_amount,
            sgst_rate: gst.sgst_rate,
            sgst_amount: gst.sgst_amount,
            igst_rate: gst.igst_rate,
            igst_amount: gst.igst_amount,
          };
        }),
      };

      if (isEditMode) {
        await apiRequest(`/purchase-orders/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Purchase Order updated");
        navigate(`/purchase-orders/${id}/document`);
      } else {
        await apiRequest("/purchase-orders", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Purchase Order created");
        navigate("/purchase-orders");
      }
    } catch (err) {
      toast.error(isEditMode ? "Failed to update Purchase Order" : "Failed to create Purchase Order");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVendor = async () => {
    if (!newVendor.display_name && !newVendor.company_name) { toast.error("Vendor name required"); return; }
    try {
      const res = await apiRequest("/vendors", {
        method: "POST",
        body: JSON.stringify(newVendor),
      });
      if (res?.vendor) {
        setVendors(prev => [...prev, res.vendor]);
        setVendorId(String(res.vendor.id));
        toast.success("Vendor created");
      }
      setShowVendorModal(false);
      setNewVendor({ display_name: "", company_name: "", email: "", phone: "", billing_address: "", pan: "" });
    } catch (err) { toast.error("Failed to create vendor"); }
  };

  const handleSaveCustomerSuccess = (newCustomer) => {
    if (newCustomer) {
      setCustomers(prev => [...prev, newCustomer]);
      setCustomerId(String(newCustomer.id));
      toast.success("Customer created successfully!");
    }
    setShowCustomerModal(false);
  };

  const handleSaveSalesperson = async () => {
    if (!newSp.name) { toast.error("Name required"); return; }
    try {
      const res = await apiRequest("/salespersons", {
        method: "POST",
        body: JSON.stringify(newSp),
      });
      if (res?.salesperson) {
        setSalespersons(prev => [...prev, res.salesperson]);
        setSalespersonId(String(res.salesperson.id));
        toast.success("Salesperson created");
      }
      setShowSalespersonModal(false);
      setNewSp({ name: "", email: "", phone: "", employee_id: "" });
    } catch (err) { toast.error("Failed to create salesperson"); }
  };

  const handleSaveProject = async () => {
    if (!newProj.project_name) { toast.error("Project name required"); return; }
    try {
      const res = await apiRequest("/projects", {
        method: "POST",
        body: JSON.stringify(newProj),
      });
      if (res?.project) {
        setProjects(prev => [...prev, res.project]);
        setProjectId(String(res.project.id));
        toast.success("Project created");
      }
      setShowProjectModal(false);
      setNewProj({ project_name: "", customer_id: "", start_date: "", end_date: "", description: "", status: "active" });
    } catch (err) { toast.error("Failed to create project"); }
  };

  if (fetching) {
    return (
      <div style={{ maxWidth: "960px", margin: "auto", padding: "30px" }}>
        <h2 style={{ marginBottom: "25px" }}>{isEditMode ? "Edit Purchase Order" : "New Purchase Order"}</h2>
        <FormSkeleton fields={8} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', background: '#f9fafb' }}>
      
      {/* Header */}
      <div style={{ background: '#fff', padding: '20px 30px', borderBottom: '1px solid #e5e7eb' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '500', color: '#111827' }}>
          {isEditMode ? "Edit Purchase Order" : "New Purchase Order"}
        </h2>
      </div>

      {/* Main content body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '30px' }}>
        <div style={{ display: 'flex', gap: '40px', maxWidth: '1200px', margin: '0 auto', flexDirection: 'row', flexWrap: 'wrap' }}>
          
          {/* Left Form Column */}
          <div style={{ flex: '1 1 700px', minWidth: '320px' }}>
            
            {/* Vendor */}
            <div style={rowStyle}>
              <div style={labelContainerStyle}>
                <label style={redLabelStyle}>Vendor Name<span style={reqStyle}>*</span></label>
              </div>
              <div style={inputContainerStyle}>
                <div style={{ display: "flex", gap: "5px" }}>
                  <select value={vendorId} onChange={e => setVendorId(e.target.value)} style={{ ...inputFieldStyle, flex: 1 }}>
                    <option value="">Select vendor</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.display_name || v.company_name || v.email}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => setShowVendorModal(true)} style={addBtnSmall} title="New Vendor">+</button>
                </div>
              </div>
            </div>

            {/* Customer */}
            <div style={rowStyle}>
              <div style={labelContainerStyle}>
                <label style={blackLabelStyle}>Deliver To (Customer)</label>
              </div>
              <div style={inputContainerStyle}>
                <div style={{ display: "flex", gap: "5px" }}>
                  <select value={customerId} onChange={e => setCustomerId(e.target.value)} style={{ ...inputFieldStyle, flex: 1 }}>
                    <option value="">Select customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.display_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => setShowCustomerModal(true)} style={addBtnSmall} title="New Customer">+</button>
                </div>
              </div>
            </div>

            {/* PO Date */}
            <div style={rowStyle}>
              <div style={labelContainerStyle}>
                <label style={blackLabelStyle}>Purchase Order Date</label>
              </div>
              <div style={inputContainerStyle}>
                <input type="date" value={poDate} onChange={e => setPoDate(e.target.value)} style={inputFieldStyle} />
              </div>
            </div>

            {/* Expected Delivery Date */}
            <div style={rowStyle}>
              <div style={labelContainerStyle}>
                <label style={blackLabelStyle}>Expected Delivery Date</label>
              </div>
              <div style={inputContainerStyle}>
                <input type="date" value={expectedDeliveryDate} onChange={e => setExpectedDeliveryDate(e.target.value)} style={inputFieldStyle} />
              </div>
            </div>

            {/* Salesperson */}
            <div style={rowStyle}>
              <div style={labelContainerStyle}>
                <label style={blackLabelStyle}>Salesperson</label>
              </div>
              <div style={inputContainerStyle}>
                <div style={{ display: "flex", gap: "5px" }}>
                  <select value={salespersonId} onChange={e => setSalespersonId(e.target.value)} style={{ ...inputFieldStyle, flex: 1 }}>
                    <option value="">Select salesperson</option>
                    {salespersons.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                  </select>
                  <button onClick={() => setShowSalespersonModal(true)} style={addBtnSmall} title="New Salesperson">+</button>
                </div>
              </div>
            </div>

            {/* Project */}
            <div style={rowStyle}>
              <div style={labelContainerStyle}>
                <label style={blackLabelStyle}>Project</label>
              </div>
              <div style={inputContainerStyle}>
                <div style={{ display: "flex", gap: "5px" }}>
                  <select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ ...inputFieldStyle, flex: 1 }}>
                    <option value="">Select project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                  </select>
                  <button onClick={() => setShowProjectModal(true)} style={addBtnSmall} title="New Project">+</button>
                </div>
              </div>
            </div>

            {/* Reference Number */}
            <div style={rowStyle}>
              <div style={labelContainerStyle}>
                <label style={blackLabelStyle}>Reference#</label>
              </div>
              <div style={inputContainerStyle}>
                <input type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} style={inputFieldStyle} placeholder="e.g. REF-1234" />
              </div>
            </div>

            {/* GST details */}
            <div style={rowStyle}>
              <div style={labelContainerStyle}>
                <label style={blackLabelStyle}>Supplier State</label>
              </div>
              <div style={inputContainerStyle}>
                <input type="text" value={supplierState} onChange={e => setSupplierState(e.target.value)} style={inputFieldStyle} placeholder="e.g. Jharkhand" />
              </div>
            </div>

            <div style={rowStyle}>
              <div style={labelContainerStyle}>
                <label style={blackLabelStyle}>Place of Supply</label>
              </div>
              <div style={inputContainerStyle}>
                <input type="text" value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} style={inputFieldStyle} placeholder="e.g. Jharkhand" />
              </div>
            </div>

            <div style={rowStyle}>
              <div style={labelContainerStyle}>
                <label style={blackLabelStyle}>Vendor GSTIN</label>
              </div>
              <div style={inputContainerStyle}>
                <input type="text" value={customerGstin} onChange={e => setCustomerGstin(e.target.value)} style={inputFieldStyle} placeholder="GSTIN/PAN" />
              </div>
            </div>

          </div>

          {/* Right Summary Column */}
          <div style={{ flex: '0 0 320px', minWidth: '300px' }}>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', background: '#fff', position: 'sticky', top: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', fontWeight: '600', color: '#111827' }}>GST & Tax Summary</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: '#374151' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Supplier State:</span>
                  <span style={{ fontWeight: '500' }}>{supplierState || "—"}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Place of Supply:</span>
                  <span style={{ fontWeight: '500' }}>{placeOfSupply || "—"}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Tax Scheme:</span>
                  <span style={{ fontWeight: '600', color: gstType === 'intra_state' ? '#0f766e' : '#b45309' }}>
                    {gstType === 'intra_state' ? 'Intra State (CGST/SGST)' : 'Inter State (IGST)'}
                  </span>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '8px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Sub Total:</span>
                  <span style={{ fontWeight: '500' }}>₹{subtotal.toFixed(2)}</span>
                </div>

                {totalDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                    <span>Discount:</span>
                    <span>- ₹{totalDiscount.toFixed(2)}</span>
                  </div>
                )}

                {gstType === 'intra_state' ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                      <span>CGST:</span>
                      <span>+ ₹{totalCGST.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                      <span>SGST:</span>
                      <span>+ ₹{totalSGST.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  totalIGST > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                      <span>IGST:</span>
                      <span>+ ₹{totalIGST.toFixed(2)}</span>
                    </div>
                  )
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '500', color: '#2563eb' }}>
                  <span>Total Tax:</span>
                  <span>+ ₹{totalTax.toFixed(2)}</span>
                </div>

                <hr style={{ border: 'none', borderTop: '2px solid #374151', margin: '8px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '15px', color: '#111827' }}>
                  <span>PO Amount:</span>
                  <span>₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Full Width Items Table Section */}
        <div style={{ maxWidth: '1200px', margin: '30px auto 0 auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#111827' }}>Line Items</h3>
            <button onClick={addItem} style={secondaryBtn}>+ Add Row</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "15px", minWidth: "800px" }}>
              <thead>
                <tr style={{ background: "#f9fafb", textAlign: "left", borderBottom: '1px solid #e5e7eb' }}>
                  <th style={thStyle}>Item</th>
                  <th style={thStyle}>Description</th>
                  <th style={{ ...thStyle, width: "75px" }}>Qty</th>
                  <th style={{ ...thStyle, width: "105px" }}>Rate</th>
                  <th style={{ ...thStyle, width: "115px" }}>Discount</th>
                  <th style={{ ...thStyle, width: "75px" }}>Tax %</th>
                  <th style={{ ...thStyle, width: "105px" }}>Amount</th>
                  <th style={{ ...thStyle, width: "45px" }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={tdStyle}>
                      <select value={item.item_id} onChange={e => handleItemSelect(idx, e.target.value)}
                        style={{ ...inputFieldStyle, minWidth: "120px" }}>
                        <option value="">— Select item —</option>
                        {catalogItems.map(ci => (
                          <option key={ci.id} value={ci.id}>{ci.name}</option>
                        ))}
                      </select>
                      {(item.hsn_code || item.unit) && (
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px", display: "flex", gap: "6px" }}>
                          {item.hsn_code && <span style={{ background: "#f0f4ff", border: "1px solid #c7d2fe", borderRadius: "3px", padding: "1px 5px" }}>HSN: {item.hsn_code}</span>}
                          {item.unit && <span style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "3px", padding: "1px 5px" }}>Unit: {item.unit}</span>}
                        </div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <input type="text" placeholder="Description" value={item.description}
                        onChange={e => updateItem(idx, "description", e.target.value)} style={{ ...inputFieldStyle, minWidth: "140px" }} />
                    </td>
                    <td style={tdStyle}>
                      <input type="number" min="0" value={item.quantity}
                        onChange={e => updateItem(idx, "quantity", e.target.value)} style={{ ...inputFieldStyle, width: "70px" }} />
                    </td>
                    <td style={tdStyle}>
                      <input type="number" min="0" step="0.01" value={item.rate}
                        onChange={e => updateItem(idx, "rate", e.target.value)} style={{ ...inputFieldStyle, width: "100px" }} />
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                        <input type="number" min="0" step="0.01" value={item.discount}
                          onChange={e => updateItem(idx, "discount", e.target.value)} style={{ ...inputFieldStyle, width: "70px" }} />
                        <select value={item.discount_type} onChange={e => updateItem(idx, "discount_type", e.target.value)}
                          style={{ ...inputFieldStyle, width: "40px", padding: "4px" }}>
                          <option value="flat">₹</option>
                          <option value="percent">%</option>
                        </select>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <input type="number" min="0" max="100" value={item.tax_rate}
                        onChange={e => updateItem(idx, "tax_rate", e.target.value)} style={{ ...inputFieldStyle, width: "65px" }} />
                    </td>
                    <td style={{ ...tdStyle, fontWeight: "500", verticalAlign: 'middle' }}>
                      ₹{(calcLineAmount(item) + calcLineTax(item)).toFixed(2)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', verticalAlign: 'middle' }}>
                      {items.length > 1 && (
                        <button onClick={() => removeItem(idx)} style={deleteItemBtn}>✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes and Terms section */}
        <div style={{ maxWidth: '1200px', margin: '30px auto 0 auto', display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <label style={{ ...blackLabelStyle, display: 'block', marginBottom: '8px' }}><strong>Notes</strong></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} style={{ ...inputFieldStyle, resize: 'vertical' }} placeholder="Looking forward to doing business with you." />
          </div>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <label style={{ ...blackLabelStyle, display: 'block', marginBottom: '8px' }}><strong>Terms & Conditions</strong></label>
            <textarea value={terms} onChange={e => setTerms(e.target.value)}
              rows={3} style={{ ...inputFieldStyle, resize: 'vertical' }} placeholder="Enter the terms and conditions..." />
          </div>
        </div>

      </div>

      {/* Sticky Bottom Action Bar */}
      <div style={{ background: '#fff', borderTop: '1px solid #e5e7eb', padding: '15px 30px', display: 'flex', gap: '10px', position: 'sticky', bottom: 0, justifyContent: 'flex-start', zIndex: 10 }}>
        <button onClick={handleSave} disabled={loading} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
          {loading ? "Saving..." : (isEditMode ? "Update Purchase Order" : "Save Purchase Order")}
        </button>
        <button onClick={() => navigate(isEditMode ? `/purchase-orders/${id}/document` : "/purchase-orders")} disabled={loading} style={{ background: '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>

      {/* ===== NEW VENDOR MODAL ===== */}
      {showVendorModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3 style={{ marginTop: 0 }}>+ New Vendor</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label>Display Name *</label>
                <input value={newVendor.display_name} onChange={e => setNewVendor({ ...newVendor, display_name: e.target.value })} style={modalInputStyle} />
              </div>
              <div>
                <label>Company Name</label>
                <input value={newVendor.company_name} onChange={e => setNewVendor({ ...newVendor, company_name: e.target.value })} style={modalInputStyle} />
              </div>
              <div>
                <label>Email</label>
                <input type="email" value={newVendor.email} onChange={e => setNewVendor({ ...newVendor, email: e.target.value })} style={modalInputStyle} />
              </div>
              <div>
                <label>Phone</label>
                <input value={newVendor.phone} onChange={e => setNewVendor({ ...newVendor, phone: e.target.value })} style={modalInputStyle} />
              </div>
              <div>
                <label>GSTIN / Tax Number</label>
                <input value={newVendor.pan} onChange={e => setNewVendor({ ...newVendor, pan: e.target.value })} style={modalInputStyle} />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label>Billing Address</label>
                <input value={newVendor.billing_address} onChange={e => setNewVendor({ ...newVendor, billing_address: e.target.value })} style={modalInputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "15px" }}>
              <button onClick={() => setShowVendorModal(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleSaveVendor} style={primaryBtn}>Save Vendor</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== NEW CUSTOMER MODAL ===== */}
      {showCustomerModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: "950px", maxWidth: "95vw", maxHeight: "90vh", padding: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px 0 20px" }}>
              <h3 style={{ margin: 0 }}>+ New Customer</h3>
              <button onClick={() => setShowCustomerModal(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#666" }}>&times;</button>
            </div>
            <AddCustomer isModal={true} onSaveSuccess={handleSaveCustomerSuccess} onCancel={() => setShowCustomerModal(false)} />
          </div>
        </div>
      )}

      {/* ===== NEW SALESPERSON MODAL ===== */}
      {showSalespersonModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: "400px" }}>
            <h3 style={{ marginTop: 0 }}>+ New Salesperson</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div><label>Name *</label><input value={newSp.name} onChange={e => setNewSp({ ...newSp, name: e.target.value })} style={modalInputStyle} /></div>
              <div><label>Email</label><input type="email" value={newSp.email} onChange={e => setNewSp({ ...newSp, email: e.target.value })} style={modalInputStyle} /></div>
              <div><label>Phone</label><input value={newSp.phone} onChange={e => setNewSp({ ...newSp, phone: e.target.value })} style={modalInputStyle} /></div>
              <div><label>Employee ID</label><input value={newSp.employee_id} onChange={e => setNewSp({ ...newSp, employee_id: e.target.value })} style={modalInputStyle} /></div>
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "15px" }}>
              <button onClick={() => setShowSalespersonModal(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleSaveSalesperson} style={primaryBtn}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== NEW PROJECT MODAL ===== */}
      {showProjectModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: "450px" }}>
            <h3 style={{ marginTop: 0 }}>+ New Project</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div><label>Project Name *</label><input value={newProj.project_name} onChange={e => setNewProj({ ...newProj, project_name: e.target.value })} style={modalInputStyle} /></div>
              <div>
                <label>Customer</label>
                <select value={newProj.customer_id} onChange={e => setNewProj({ ...newProj, customer_id: e.target.value })} style={modalInputStyle}>
                  <option value="">Select customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.display_name || c.email}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}><label>Start Date</label><input type="date" value={newProj.start_date} onChange={e => setNewProj({ ...newProj, start_date: e.target.value })} style={modalInputStyle} /></div>
                <div style={{ flex: 1 }}><label>End Date</label><input type="date" value={newProj.end_date} onChange={e => setNewProj({ ...newProj, end_date: e.target.value })} style={modalInputStyle} /></div>
              </div>
              <div><label>Description</label><textarea value={newProj.description} onChange={e => setNewProj({ ...newProj, description: e.target.value })} rows={2} style={modalInputStyle} /></div>
              <div>
                <label>Status</label>
                <select value={newProj.status} onChange={e => setNewProj({ ...newProj, status: e.target.value })} style={modalInputStyle}>
                  <option value="active">Active</option><option value="on_hold">On Hold</option><option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "15px" }}>
              <button onClick={() => setShowProjectModal(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleSaveProject} style={primaryBtn}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const rowStyle = { display: 'flex', marginBottom: '20px', alignItems: 'flex-start' };
const labelContainerStyle = { width: '180px', paddingTop: '8px' };
const inputContainerStyle = { flex: 1, maxWidth: '400px' };
const inputFieldStyle = { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: '#111827' };
const reqStyle = { color: '#ef4444', marginLeft: '2px' };

const redLabelStyle = { color: '#ef4444', fontSize: '13px', fontWeight: '500' };
const blackLabelStyle = { color: '#111827', fontSize: '13px', fontWeight: '500' };

const thStyle = { padding: "10px", borderBottom: "2px solid #cbd5e1", whiteSpace: "nowrap", fontSize: "13px" };
const tdStyle = { padding: "8px 6px" };
const modalInputStyle = { width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc", boxSizing: "border-box", fontSize: "13px" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "500" };
const secondaryBtn = { padding: "8px 14px", background: "#f0f0f0", color: "#333", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer", fontSize: "13px" };
const cancelBtnStyle = { padding: "10px 20px", background: "#ccc", color: "#333", border: "none", borderRadius: "5px", cursor: "pointer" };
const deleteItemBtn = { background: "red", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", padding: "4px 8px" };
const addBtnSmall = { padding: "6px 10px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" };
const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalBox = { background: "#fff", borderRadius: "8px", padding: "25px", width: "550px", maxWidth: "95%", maxHeight: "85vh", overflow: "auto", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" };

export default AddPurchaseOrder;
