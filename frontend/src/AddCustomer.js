/**
 * AddCustomer.js – Zoho Books‑style New / Edit Customer form with tabs
 * Dependencies: apiRequest, react-router-dom, react-hot-toast
 */
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

const ACTIVE_TAB_STYLE = {
  borderBottom: "2px solid #4a90e2",
  fontWeight: "bold",
  padding: "10px 15px",
  cursor: "pointer",
  background: "none",
  borderTop: "none",
  borderLeft: "none",
  borderRight: "none",
};
const TAB_STYLE = {
  padding: "10px 15px",
  cursor: "pointer",
  background: "none",
  border: "none",
  borderBottom: "2px solid transparent",
};

function AddCustomer() {
  const navigate = useNavigate();
  const { id } = useParams();          // ✅ edit mode when id exists
  const isEdit = Boolean(id);

  // ---------- Basic fields ----------
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
        await apiRequest(`/customers/${id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("Customer updated");
      } else {
        await apiRequest("/customers", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Customer created");
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
    return <p style={{ textAlign: "center", padding: "50px" }}>Loading customer data...</p>;
  }

  return (
    <div style={{ maxWidth: "900px", margin: "auto", padding: "30px" }}>
      <h2>{isEdit ? "Edit Customer" : "New Customer"}</h2>

      {/* The rest of the JSX is identical to the original AddCustomer.js, no changes needed. */}
      {/* For brevity, I'll include the entire JSX from the original AddCustomer here, unchanged. */}

      <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
        <div style={{ flex: 1 }}>
          <label>Customer Type</label>
          <select value={customerType} onChange={e => setCustomerType(e.target.value)} style={inputStyle}>
            <option value="Business">Business</option>
            <option value="Individual">Individual</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label>Customer Sub‑Type</label>
          <select value={customerSubType} onChange={e => setCustomerSubType(e.target.value)} style={inputStyle}>
            <option value="">None</option>
            <option value="Business">Business</option>
            <option value="Individual">Individual</option>
          </select>
        </div>
      </div>

      <h3>Primary Contact</h3>
      <div style={{ display: "flex", gap: "15px" }}>
        <div style={{ flex: 1 }}>
          <label>Salutation</label>
          <select value={salutation} onChange={e => setSalutation(e.target.value)} style={inputStyle}>
            <option value="">None</option>
            <option value="Mr.">Mr.</option>
            <option value="Mrs.">Mrs.</option>
            <option value="Ms.">Ms.</option>
            <option value="Dr.">Dr.</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label>First Name</label>
          <input value={firstName} onChange={e => setFirstName(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label>Last Name</label>
          <input value={lastName} onChange={e => setLastName(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ marginTop: "15px" }}>
        <label>Company Name</label>
        <input value={companyName} onChange={e => setCompanyName(e.target.value)} style={inputStyle} />
      </div>

      <div style={{ marginTop: "15px" }}>
        <label>Display Name *</label>
        <input
          list="display-name-list"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          style={inputStyle}
          placeholder="Select or type to add"
        />
        <datalist id="display-name-list">
          {firstName && lastName ? <option value={`${firstName} ${lastName}`} /> : null}
          {companyName ? <option value={companyName} /> : null}
        </datalist>
      </div>

      <h3>Contact Details</h3>
      <div style={{ display: "flex", gap: "15px" }}>
        <div style={{ flex: 1 }}>
          <label>Email Address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label>Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
        </div>
      </div>
      <div style={{ display: "flex", gap: "15px", marginTop: "15px" }}>
        <div style={{ flex: 1 }}>
          <label>Work Phone</label>
          <input value={workPhone} onChange={e => setWorkPhone(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label>Mobile</label>
          <input value={mobile} onChange={e => setMobile(e.target.value)} style={inputStyle} />
        </div>
      </div>
      <div style={{ marginTop: "15px" }}>
        <label>Customer Language</label>
        <input value={language} onChange={e => setLanguage(e.target.value)} style={inputStyle} />
      </div>

      {/* ======================== TABS ======================== */}
      <div style={{ marginTop: "30px", borderBottom: "1px solid #ccc", display: "flex" }}>
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
          <h4>Billing Address</h4>
          {addressFields(billingAddress, setBillingAddress)}
          <h4 style={{ marginTop: "20px" }}>Shipping Address</h4>
          <label>
            <input type="checkbox" checked={copyBilling} onChange={e => handleCopyBilling(e.target.checked)} />
            Same as Billing Address
          </label>
          <div style={{ marginTop: "10px" }}>
            {addressFields(shippingAddress, copyBilling ? () => {} : setShippingAddress, copyBilling)}
          </div>
        </div>
      )}

      {/* ===== TAB 1: CONTACT PERSONS ===== */}
      {activeTab === 1 && (
        <div style={{ marginTop: "20px" }}>
          {contactPersons.map((person, idx) => (
            <div key={idx} style={{ border: "1px solid #ddd", padding: "15px", marginBottom: "15px", borderRadius: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h4>Contact Person {idx + 1}</h4>
                {contactPersons.length > 1 && (
                  <button onClick={() => removeContactPerson(idx)} style={{ background: "red", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Remove</button>
                )}
              </div>
              <div style={{ display: "flex", gap: "15px", marginTop: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label>Salutation</label>
                  <select value={person.salutation} onChange={e => updateContactPerson(idx, 'salutation', e.target.value)} style={inputStyle}>
                    <option value="">None</option>
                    <option value="Mr.">Mr.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Dr.">Dr.</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label>First Name</label>
                  <input value={person.first_name} onChange={e => updateContactPerson(idx, 'first_name', e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Last Name</label>
                  <input value={person.last_name} onChange={e => updateContactPerson(idx, 'last_name', e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "15px", marginTop: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label>Email</label>
                  <input value={person.email} onChange={e => updateContactPerson(idx, 'email', e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Work Phone</label>
                  <input value={person.work_phone} onChange={e => updateContactPerson(idx, 'work_phone', e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Mobile</label>
                  <input value={person.mobile} onChange={e => updateContactPerson(idx, 'mobile', e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>
          ))}
          <button onClick={addContactPerson} style={{ padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>
            + Add Another Contact
          </button>
        </div>
      )}

      {/* ===== TAB 2: OTHER DETAILS ===== */}
      {activeTab === 2 && (
        <div style={{ marginTop: "20px" }}>
          <div style={{ display: "flex", gap: "15px" }}>
            <div style={{ flex: 1 }}>
              <label>PAN</label>
              <input value={pan} onChange={e => setPan(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Currency</label>
              <input value={currency} onChange={e => setCurrency(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginTop: "15px" }}>
            <label>Opening Balance</label>
            <input type="number" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginTop: "15px" }}>
            <label>Payment Terms</label>
            <input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} style={inputStyle} placeholder="e.g. Net 30" />
          </div>
          <div style={{ marginTop: "15px" }}>
            <label>Enable Portal</label>
            <input type="checkbox" checked={enablePortal} onChange={e => setEnablePortal(e.target.checked)} />
            <span style={{ marginLeft: "5px" }}>Allow portal access for this customer</span>
          </div>
          {enablePortal && (
            <div style={{ marginTop: "15px" }}>
              <label>Portal Language</label>
              <input value={portalLanguage} onChange={e => setPortalLanguage(e.target.value)} style={inputStyle} />
            </div>
          )}
          <div style={{ marginTop: "15px" }}>
            <label>Custom Fields (JSON)</label>
            <textarea value={customFields} onChange={e => setCustomFields(e.target.value)} rows="3" style={inputStyle} />
          </div>
          <div style={{ marginTop: "15px" }}>
            <label>Reporting Tags</label>
            <input value={reportingTags} onChange={e => setReportingTags(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginTop: "15px" }}>
            <label>Remarks</label>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows="3" style={inputStyle} />
          </div>
          <div style={{ marginTop: "15px" }}>
            <label>Documents (JSON)</label>
            <textarea value={documents} onChange={e => setDocuments(e.target.value)} rows="2" style={inputStyle} />
            <small>You can upload a maximum of 10 files, 10MB each</small>
          </div>
          <div style={{ marginTop: "15px" }}>
            <label>Customer Owner</label>
            <select value={customerOwnerId} onChange={e => setCustomerOwnerId(e.target.value)} style={inputStyle}>
              <option value="">None</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
            </select>
          </div>
        </div>
      )}

      <div style={{ marginTop: "30px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
        <button onClick={() => navigate("/customers")} style={{ padding: "10px 20px", background: "#ccc", border: "none", borderRadius: "5px", cursor: "pointer" }}>Cancel</button>
        <button onClick={handleSave} disabled={loading} style={{ padding: "10px 20px", background: "#28a745", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>
          {loading ? "Saving..." : isEdit ? "Update" : "Save"}
        </button>
      </div>
    </div>
  );
}

// Helper component for address form (unchanged)
const addressFields = (address, setAddress, disabled = false) => (
  <>
    <div style={{ marginTop: "10px" }}>
      <label>Attention</label>
      <input value={address.attention} onChange={e => setAddress({ ...address, attention: e.target.value })} disabled={disabled} style={inputStyle} />
    </div>
    <div style={{ marginTop: "10px" }}>
      <label>Country/Region</label>
      <input value={address.country} onChange={e => setAddress({ ...address, country: e.target.value })} disabled={disabled} style={inputStyle} />
    </div>
    <div style={{ marginTop: "10px" }}>
      <label>Address (Street 1)</label>
      <input value={address.address_line1} onChange={e => setAddress({ ...address, address_line1: e.target.value })} disabled={disabled} style={inputStyle} />
    </div>
    <div style={{ marginTop: "10px" }}>
      <label>Address (Street 2)</label>
      <input value={address.address_line2} onChange={e => setAddress({ ...address, address_line2: e.target.value })} disabled={disabled} style={inputStyle} />
    </div>
    <div style={{ display: "flex", gap: "15px", marginTop: "10px" }}>
      <div style={{ flex: 1 }}>
        <label>City</label>
        <input value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} disabled={disabled} style={inputStyle} />
      </div>
      <div style={{ flex: 1 }}>
        <label>State</label>
        <input value={address.state} onChange={e => setAddress({ ...address, state: e.target.value })} disabled={disabled} style={inputStyle} />
      </div>
      <div style={{ flex: 1 }}>
        <label>Pin Code</label>
        <input value={address.pin_code} onChange={e => setAddress({ ...address, pin_code: e.target.value })} disabled={disabled} style={inputStyle} />
      </div>
    </div>
    <div style={{ display: "flex", gap: "15px", marginTop: "10px" }}>
      <div style={{ flex: 1 }}>
        <label>Phone</label>
        <input value={address.phone} onChange={e => setAddress({ ...address, phone: e.target.value })} disabled={disabled} style={inputStyle} />
      </div>
      <div style={{ flex: 1 }}>
        <label>Fax</label>
        <input value={address.fax} onChange={e => setAddress({ ...address, fax: e.target.value })} disabled={disabled} style={inputStyle} />
      </div>
    </div>
  </>
);

const inputStyle = { width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc", boxSizing: "border-box" };

export default AddCustomer;