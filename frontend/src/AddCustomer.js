/**
 * AddCustomer.js – Zoho Books‑style New / Edit Customer form with tabs
 * Dependencies: apiRequest, react-router-dom, react-hot-toast
 */
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "./api";
import { FormSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";


const BLUE = '#4a90e2';
const BORDER_COLOR = '#e2e8f0';
const TEXT_PRIMARY = '#1e293b';
const TEXT_SECONDARY = '#64748b';
const BG_PAGE = '#f8fafc';
const BG_CARD = '#ffffff';
const RADIUS = '8px';
const SHADOW = '0 1px 4px rgba(0,0,0,0.06)';

const ACTIVE_TAB_STYLE = {
  borderBottom: `2px solid ${BLUE}`,
  fontWeight: "bold",
  color: BLUE,
  padding: "12px 20px",
  cursor: "pointer",
  background: "none",
  borderTop: "none",
  borderLeft: "none",
  borderRight: "none",
};
const TAB_STYLE = {
  padding: "12px 20px",
  cursor: "pointer",
  background: "none",
  border: "none",
  color: TEXT_SECONDARY,
  borderBottom: "2px solid transparent",
};

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  boxSizing: 'border-box',
  fontSize: '14px',
  color: '#374151',
  outline: 'none',
  transition: 'border-color 0.15s',
};

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: '500',
  color: '#374151',
  marginBottom: '6px',
};

function AddCustomer({ onSaveSuccess, onCancel, isModal }) {
  const navigate = useNavigate();
  const { id } = useParams();          // ✅ edit mode when id exists
  const isEdit = Boolean(id);

  // ---------- Basic fields ----------
    const [isActive, setIsActive] = useState(true);
  const [additionalOpen, setAdditionalOpen] = useState(false);
  const [customerType, setCustomerType] = useState("Business");
  const [customerSubType, setCustomerSubType] = useState("");
  const [salutation, setSalutation] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [workPhone, setWorkPhone] = useState("");
  const [mobile, setMobile] = useState("");
  const [language, setLanguage] = useState("");

  // ---------- Financial ----------
  const [pan, setPan] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [enablePortal, setEnablePortal] = useState(false);
  const [portalLanguage, setPortalLanguage] = useState("en");

  // ---------- Documents ----------
  const [documents, setDocuments] = useState("[]");

  // ---------- Addresses ----------
  const [billingAddress, setBillingAddress] = useState({
    attention: "", country: "", address_line1: "", address_line2: "",
    city: "", state: "", pin_code: "", phone: "", fax: ""
  });
  const [shippingAddress, setShippingAddress] = useState({
    attention: "", country: "", address_line1: "", address_line2: "",
    city: "", state: "", pin_code: "", phone: "", fax: ""
  });
  const [copyBilling, setCopyBilling] = useState(false);

  // ---------- Contact Persons ----------
  const [contactPersons, setContactPersons] = useState([
    { salutation: "", first_name: "", last_name: "", email: "", work_phone: "", mobile: "" }
  ]);

  // ---------- Other fields ----------
  const [customFields, setCustomFields] = useState("");
  const [reportingTags, setReportingTags] = useState("");
  const [remarks, setRemarks] = useState("");

  // ---------- Customer Owner ----------
  const [users, setUsers] = useState([]);
  const [customerOwnerId, setCustomerOwnerId] = useState("");

  // ---------- Tab state ----------
  const [activeTab, setActiveTab] = useState(0);

  // ---------- Loading / Saving ----------
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);   // ✅ for edit data fetch

  // ---------- Fetch users list (same for new & edit) ----------
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await apiRequest("/users");
        if (res) setUsers(res.users);
      } catch (err) { console.error("Failed to load users", err); }
    };
    fetchUsers();
  }, []);

  // ---------- If editing, load existing customer ----------
  useEffect(() => {
    if (!isEdit) return;

    const loadCustomer = async () => {
      setFetching(true);
      try {
        const res = await apiRequest(`/customers/${id}`);
        if (!res?.customer) {
          toast.error("Customer not found");
          navigate("/customers");
          return;
        }

        const c = res.customer;
        // basic fields
        setIsActive(c.is_active ?? true);
        setCustomerType(c.customer_type || "Business");
        setCustomerSubType(c.customer_sub_type || "");
        setSalutation(c.salutation || "");
        setFirstName(c.first_name || "");
        setLastName(c.last_name || "");
        setCompanyName(c.company_name || "");
        setDisplayName(c.display_name || "");
        setEmail(c.email || "");
        setPhone(c.phone || "");
        setWorkPhone(c.work_phone || "");
        setMobile(c.mobile || "");
        setLanguage(c.language || "");

        // financial
        setPan(c.pan || "");
        setCurrency(c.currency || "INR");
        setOpeningBalance(c.opening_balance != null ? String(c.opening_balance) : "0");
        setPaymentTerms(c.payment_terms || "");
        setEnablePortal(!!c.enable_portal);
        setPortalLanguage(c.portal_language || "en");
        setDocuments(c.documents ? JSON.stringify(c.documents) : "[]");
        setCustomFields(c.custom_fields ? JSON.stringify(c.custom_fields) : "{}");
        setReportingTags(c.reporting_tags || "");
        setRemarks(c.remarks || "");
        setCustomerOwnerId(c.customer_owner_id ? String(c.customer_owner_id) : "");

        // addresses
        const addresses = res.addresses || [];
        const billing = addresses.find(a => a.type === "billing");
        const shipping = addresses.find(a => a.type === "shipping");

        if (billing) setBillingAddress(billing);
        if (shipping) {
          setShippingAddress(shipping);
          // if billing and shipping are identical, we could set copyBilling, but leave as is
        }

        // contacts
        const contacts = res.contacts || [];
        if (contacts.length > 0) {
          setContactPersons(
            contacts.map(ct => ({
              salutation: ct.salutation || "",
              first_name: ct.first_name || "",
              last_name: ct.last_name || "",
              email: ct.email || "",
              work_phone: ct.work_phone || "",
              mobile: ct.mobile || "",
            }))
          );
        }
      } catch (err) {
        toast.error("Failed to load customer data");
      } finally {
        setFetching(false);
      }
    };

    loadCustomer();
  }, [id, isEdit, navigate]);

  // copy billing logic
  const handleCopyBilling = (checked) => {
    setCopyBilling(checked);
    if (checked) setShippingAddress({ ...billingAddress });
  };

  useEffect(() => {
    if (copyBilling) setShippingAddress({ ...billingAddress });
  }, [billingAddress, copyBilling]);

  // contact persons helpers
  const addContactPerson = () => {
    setContactPersons([...contactPersons, { salutation: "", first_name: "", last_name: "", email: "", work_phone: "", mobile: "" }]);
  };
  const removeContactPerson = (index) => {
    setContactPersons(contactPersons.filter((_, i) => i !== index));
  };
  const updateContactPerson = (index, field, value) => {
    const updated = [...contactPersons];
    updated[index][field] = value;
    setContactPersons(updated);
  };

  // ---------- Save ----------
  const handleSave = async () => {
    if (!displayName && !firstName) {
      toast.error("Please enter a display name or first name");
      return;
    }
    setLoading(true);
    try {
      const addresses = [
        { type: "billing", ...billingAddress },
        { type: "shipping", ...shippingAddress },
      ];

      const payload = {
        is_active: isActive,
        customer_type: customerType,
        customer_sub_type: customerSubType || null,
        salutation,
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
        display_name: displayName || `${firstName} ${lastName}`,
        email,
        phone,
        work_phone: workPhone,
        mobile,
        language,
        pan,
        currency,
        opening_balance: parseFloat(openingBalance) || 0,
        payment_terms: paymentTerms,
        enable_portal: enablePortal,
        portal_language: portalLanguage,
        documents: documents ? JSON.parse(documents) : [],
        addresses,
        contacts: contactPersons,
        contact_persons: [],
        custom_fields: customFields ? JSON.parse(customFields) : {},
        reporting_tags: reportingTags,
        remarks,
        customer_owner_id: customerOwnerId ? parseInt(customerOwnerId) : null,
      };

      if (isEdit) {
        const res = await apiRequest(`/customers/${id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("Customer updated");
        if (onSaveSuccess) {
          onSaveSuccess(res?.customer);
          return;
        }
      } else {
        const res = await apiRequest("/customers", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Customer created");
        if (onSaveSuccess) {
          onSaveSuccess(res?.customer);
          return;
        }
      }
      navigate("/customers");
    } catch (err) {
      toast.error(isEdit ? "Failed to update customer" : "Failed to create customer");
    } finally {
      setLoading(false);
    }
  };

  // loading state while fetching existing data
  if (fetching) {
    return (
      <div style={{ maxWidth: "900px", margin: "auto", padding: "30px" }}>
        <FormSkeleton fields={8} />
      </div>
    );
  }

  return (
    <div className="add-customer-container" style={isModal ? { padding: "10px", background: BG_CARD } : { maxWidth: "900px", margin: "auto", padding: "30px", background: BG_PAGE, minHeight: "100vh" }}>
      <style>{`
        @media (max-width: 768px) {
          .add-customer-container { padding: 15px !important; }
          .add-customer-container div[style*="gap: 15px"] { flex-direction: column !important; gap: 10px !important; }
          .tabs-container { overflow-x: auto; white-space: nowrap; flex-wrap: nowrap !important; }
        }
      `}</style>
      {/* Header */}
      {!isModal && (
        <div style={{ display: "flex", alignItems: "center", marginBottom: "20px", paddingBottom: "15px", borderBottom: `1px solid ${BORDER_COLOR}` }}>
          <button onClick={() => navigate("/customers")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: TEXT_SECONDARY, marginRight: "15px", padding: 0 }}>
            ← Back to Customers
          </button>
          <h2 style={{ margin: 0, color: TEXT_PRIMARY }}>{isEdit ? "Edit Customer" : "New Customer"}</h2>
        </div>
      )}

      <div style={isModal ? { background: BG_CARD } : { background: BG_CARD, border: `1px solid ${BORDER_COLOR}`, borderRadius: '10px', padding: '30px', boxShadow: SHADOW }}>
        
        {/* Main Visible Section */}
        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Customer Type</label>
          <select value={customerType} onChange={e => setCustomerType(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'}>
            <option value="Business">Business</option>
            <option value="Individual">Individual</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Salutation</label>
            <select value={salutation} onChange={e => setSalutation(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'}>
              <option value="">None</option>
              <option value="Mr.">Mr.</option>
              <option value="Mrs.">Mrs.</option>
              <option value="Ms.">Ms.</option>
              <option value="Dr.">Dr.</option>
            </select>
          </div>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>First Name</label>
            <input value={firstName} onChange={e => setFirstName(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
          </div>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>Last Name</label>
            <input value={lastName} onChange={e => setLastName(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
          </div>
        </div>

        {customerType === "Individual" ? (
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Father's Name</label>
            <input value={companyName} onChange={e => setCompanyName(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
          </div>
        ) : (
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Company Name</label>
            <input value={companyName} onChange={e => setCompanyName(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
          </div>
        )}

        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Display Name *</label>
          <input
            list="display-name-list"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            style={inputStyle}
            placeholder="Select or type to add"
            onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'}
          />
          <datalist id="display-name-list">
            {firstName && lastName ? <option value={`${firstName} ${lastName}`} /> : null}
            {companyName ? <option value={companyName} /> : null}
          </datalist>
        </div>

        <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Status</label>
          <div style={{ display: "flex", gap: "15px" }}>
            <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: TEXT_PRIMARY }}>
              <input type="radio" checked={isActive} onChange={() => setIsActive(true)} style={{ marginRight: "8px" }} /> Active
            </label>
            <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: TEXT_PRIMARY }}>
              <input type="radio" checked={!isActive} onChange={() => setIsActive(false)} style={{ marginRight: "8px" }} /> Inactive
            </label>
          </div>
        </div>

        {/* Collapsible Additional Details */}
        <div style={{ marginTop: '20px' }}>
          <button
            type="button"
            onClick={() => setAdditionalOpen(!additionalOpen)}
            style={{ background: 'none', border: 'none', color: BLUE, cursor: 'pointer', fontWeight: '600', padding: 0 }}
          >
            {additionalOpen ? '▼' : '▶'} Additional Details
          </button>
          {additionalOpen && (
            <div style={{ marginTop: '15px', padding: '20px', background: BG_PAGE, borderRadius: RADIUS, border: `1px solid ${BORDER_COLOR}` }}>
              <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Work Phone</label>
                  <input value={workPhone} onChange={e => setWorkPhone(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Mobile</label>
                  <input value={mobile} onChange={e => setMobile(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "15px" }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Customer Language</label>
                  <input value={language} onChange={e => setLanguage(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Customer Sub‑Type</label>
                  <select value={customerSubType} onChange={e => setCustomerSubType(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'}>
                    <option value="">None</option>
                    <option value="Business">Business</option>
                    <option value="Individual">Individual</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ======================== TABS ======================== */}
        <div className="tabs-container" style={{ marginTop: "30px", borderBottom: `2px solid ${BORDER_COLOR}`, display: "flex" }}>
          {["Address", "Contact Persons", "Other Details"].map((tab, idx) => (
            <button
              key={tab}
              onClick={() => setActiveTab(idx)}
              style={activeTab === idx ? ACTIVE_TAB_STYLE : TAB_STYLE}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ===== TAB 0: ADDRESS ===== */}
        {activeTab === 0 && (
          <div style={{ marginTop: "20px" }}>
            <h4 style={{ color: TEXT_PRIMARY }}>Billing Address</h4>
            {addressFields(billingAddress, setBillingAddress)}
            <h4 style={{ marginTop: "30px", color: TEXT_PRIMARY }}>Shipping Address</h4>
            <label style={{ fontSize: "14px", color: TEXT_PRIMARY, display: "flex", alignItems: "center", marginBottom: "15px" }}>
              <input type="checkbox" checked={copyBilling} onChange={e => handleCopyBilling(e.target.checked)} style={{ marginRight: "8px" }} />
              Same as Billing Address
            </label>
            <div>
              {addressFields(shippingAddress, copyBilling ? () => {} : setShippingAddress, copyBilling)}
            </div>
          </div>
        )}

        {/* ===== TAB 1: CONTACT PERSONS ===== */}
        {activeTab === 1 && (
          <div style={{ marginTop: "20px" }}>
            {contactPersons.map((person, idx) => (
              <div key={idx} style={{ border: `1px solid ${BORDER_COLOR}`, padding: "20px", marginBottom: "20px", borderRadius: RADIUS, background: BG_PAGE }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
                  <h4 style={{ margin: 0, color: TEXT_PRIMARY }}>Contact Person {idx + 1}</h4>
                  {contactPersons.length > 1 && (
                    <button onClick={() => removeContactPerson(idx)} style={{ background: "none", color: "#ef4444", border: "1px solid #ef4444", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Remove</button>
                  )}
                </div>
                <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Salutation</label>
                    <select value={person.salutation} onChange={e => updateContactPerson(idx, 'salutation', e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'}>
                      <option value="">None</option>
                      <option value="Mr.">Mr.</option>
                      <option value="Mrs.">Mrs.</option>
                      <option value="Ms.">Ms.</option>
                      <option value="Dr.">Dr.</option>
                    </select>
                  </div>
                  <div style={{ flex: 2 }}>
                    <label style={labelStyle}>First Name</label>
                    <input value={person.first_name} onChange={e => updateContactPerson(idx, 'first_name', e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
                  </div>
                  <div style={{ flex: 2 }}>
                    <label style={labelStyle}>Last Name</label>
                    <input value={person.last_name} onChange={e => updateContactPerson(idx, 'last_name', e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "15px" }}>
                  <div style={{ flex: 2 }}>
                    <label style={labelStyle}>Email</label>
                    <input value={person.email} onChange={e => updateContactPerson(idx, 'email', e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Work Phone</label>
                    <input value={person.work_phone} onChange={e => updateContactPerson(idx, 'work_phone', e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Mobile</label>
                    <input value={person.mobile} onChange={e => updateContactPerson(idx, 'mobile', e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addContactPerson} style={{ padding: "10px 20px", background: "none", color: BLUE, border: `1px solid ${BLUE}`, borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>
              + Add Another Contact
            </button>
          </div>
        )}

        {/* ===== TAB 2: OTHER DETAILS ===== */}
        {activeTab === 2 && (
          <div style={{ marginTop: "20px" }}>
            <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>PAN</label>
                <input value={pan} onChange={e => setPan(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Currency</label>
                <input value={currency} onChange={e => setCurrency(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
              </div>
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label style={labelStyle}>Opening Balance</label>
              <input type="number" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label style={labelStyle}>Payment Terms</label>
              <input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} style={inputStyle} placeholder="e.g. Net 30" onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: TEXT_PRIMARY }}>
                <input type="checkbox" checked={enablePortal} onChange={e => setEnablePortal(e.target.checked)} style={{ marginRight: "8px" }} />
                Allow portal access for this customer
              </label>
            </div>
            {enablePortal && (
              <div style={{ marginBottom: "15px" }}>
                <label style={labelStyle}>Portal Language</label>
                <input value={portalLanguage} onChange={e => setPortalLanguage(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
              </div>
            )}
            <div style={{ marginBottom: "15px" }}>
              <label style={labelStyle}>Custom Fields (JSON)</label>
              <textarea value={customFields} onChange={e => setCustomFields(e.target.value)} rows="3" style={{...inputStyle, resize: "vertical"}} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label style={labelStyle}>Reporting Tags</label>
              <input value={reportingTags} onChange={e => setReportingTags(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label style={labelStyle}>Remarks</label>
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows="3" style={{...inputStyle, resize: "vertical"}} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label style={labelStyle}>Documents (JSON)</label>
              <textarea value={documents} onChange={e => setDocuments(e.target.value)} rows="2" style={{...inputStyle, resize: "vertical"}} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
              <small style={{ color: TEXT_SECONDARY, fontSize: "12px" }}>You can upload a maximum of 10 files, 10MB each</small>
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label style={labelStyle}>Customer Owner</label>
              <select value={customerOwnerId} onChange={e => setCustomerOwnerId(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'}>
                <option value="">None</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ marginTop: "30px", paddingTop: "20px", borderTop: `1px solid ${BORDER_COLOR}`, display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button onClick={() => onCancel ? onCancel() : navigate("/customers")} style={{ padding: "10px 20px", background: "#fff", color: TEXT_PRIMARY, border: `1px solid #d1d5db`, borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>Cancel</button>
          <button onClick={handleSave} disabled={loading} style={{ padding: "10px 20px", background: BLUE, color: "#fff", border: "none", borderRadius: "6px", cursor: loading ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: "500", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Saving..." : isEdit ? "Update" : "Save"}
          </button>
        </div>

      </div>
    </div>
  );
}

const addressFields = (address, setAddress, disabled = false) => (
  <>
    <div style={{ marginBottom: "15px" }}>
      <label style={labelStyle}>Attention</label>
      <input value={address.attention} onChange={e => setAddress({ ...address, attention: e.target.value })} disabled={disabled} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
    </div>
    <div style={{ marginBottom: "15px" }}>
      <label style={labelStyle}>Country/Region</label>
      <input value={address.country} onChange={e => setAddress({ ...address, country: e.target.value })} disabled={disabled} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
    </div>
    <div style={{ marginBottom: "15px" }}>
      <label style={labelStyle}>Address (Street 1)</label>
      <input value={address.address_line1} onChange={e => setAddress({ ...address, address_line1: e.target.value })} disabled={disabled} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
    </div>
    <div style={{ marginBottom: "15px" }}>
      <label style={labelStyle}>Address (Street 2)</label>
      <input value={address.address_line2} onChange={e => setAddress({ ...address, address_line2: e.target.value })} disabled={disabled} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
    </div>
    <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
      <div style={{ flex: 1 }}>
        <label style={labelStyle}>City</label>
        <input value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} disabled={disabled} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
      </div>
      <div style={{ flex: 1 }}>
        <label style={labelStyle}>State</label>
        <input value={address.state} onChange={e => setAddress({ ...address, state: e.target.value })} disabled={disabled} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
      </div>
      <div style={{ flex: 1 }}>
        <label style={labelStyle}>Pin Code</label>
        <input value={address.pin_code} onChange={e => setAddress({ ...address, pin_code: e.target.value })} disabled={disabled} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
      </div>
    </div>
    <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
      <div style={{ flex: 1 }}>
        <label style={labelStyle}>Phone</label>
        <input value={address.phone} onChange={e => setAddress({ ...address, phone: e.target.value })} disabled={disabled} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
      </div>
      <div style={{ flex: 1 }}>
        <label style={labelStyle}>Fax</label>
        <input value={address.fax} onChange={e => setAddress({ ...address, fax: e.target.value })} disabled={disabled} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#d1d5db'} />
      </div>
    </div>
  </>
);

export default AddCustomer;
