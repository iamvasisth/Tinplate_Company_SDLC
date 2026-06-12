/**
 * AddVendor.js – Zoho Books‑style New / Edit Vendor form with tabs
 * Dependencies: apiRequest, react-router-dom, react-hot-toast
 */
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "./api";
import { FormSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

const BLUE = '#2563eb';
const BORDER_COLOR = '#e5e7eb';
const TEXT_PRIMARY = '#111827';
const TEXT_SECONDARY = '#6b7280';
const BG_PAGE = '#ffffff';

const ACTIVE_TAB_STYLE = {
  borderBottom: `2px solid ${BLUE}`,
  fontWeight: "500",
  color: BLUE,
  padding: "12px 20px",
  cursor: "pointer",
  background: "none",
  borderTop: "none",
  borderLeft: "none",
  borderRight: "none",
  fontSize: "14px",
};
const TAB_STYLE = {
  padding: "12px 20px",
  cursor: "pointer",
  background: "none",
  border: "none",
  color: TEXT_SECONDARY,
  borderBottom: "2px solid transparent",
  fontSize: "14px",
};

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '4px',
  border: '1px solid #d1d5db',
  boxSizing: 'border-box',
  fontSize: '14px',
  color: '#111827',
  outline: 'none',
};

const rowStyle = { display: 'flex', marginBottom: '20px', alignItems: 'center' };
const labelContainerStyle = { width: '220px', paddingRight: '20px' };
const inputContainerStyle = { flex: 1, maxWidth: '500px' };
const labelStyle = { color: '#111827', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' };
const redLabelStyle = { color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' };
const infoIcon = <span style={{ color: '#9ca3af', cursor: 'help', fontSize: '14px', border: '1px solid #9ca3af', borderRadius: '50%', width: '14px', height: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>i</span>;

function AddVendor({ onSaveSuccess, onCancel, isModal }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = require("react-router-dom").useLocation();
  const isEdit = Boolean(id);
  const cloneState = location.state?.cloneVendor;

  // ---------- Basic fields ----------
  const [isActive, setIsActive] = useState(true);
  const [additionalOpen, setAdditionalOpen] = useState(false);
  const [vendorType, setVendorType] = useState("Business");
  const [vendorSubType, setVendorSubType] = useState("");
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
  const [isMsmeRegistered, setIsMsmeRegistered] = useState(false);
  const [tds, setTds] = useState("");
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
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [showFilesPopover, setShowFilesPopover] = useState(false);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // ---------- Vendor Owner ----------
  const [users, setUsers] = useState([]);
  const [vendorOwnerId, setVendorOwnerId] = useState("");

  // ---------- Tab state ----------
  const [activeTab, setActiveTab] = useState(location.state?.initialTab || 0);

  // ---------- Loading / Saving ----------
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // ---------- Fetch users list ----------
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await apiRequest("/users");
        if (res) setUsers(res.users);
      } catch (err) { console.error("Failed to load users", err); }
    };
    fetchUsers();
  }, []);

  // ---------- If editing, load existing vendor ----------
  useEffect(() => {
    // If cloning, pre-fill from clone state
    if (!isEdit && cloneState) {
      const v = cloneState;
      setIsActive(v.is_active ?? true);
      setVendorType(v.vendor_type || "Business");
      setVendorSubType(v.vendor_sub_type || "");
      setSalutation(v.salutation || "");
      setFirstName(v.first_name || "");
      setLastName(v.last_name || "");
      setCompanyName(v.company_name || "");
      setDisplayName(v.display_name || "");
      setEmail(v.email || "");
      setPhone(v.phone || "");
      setWorkPhone(v.work_phone || "");
      setMobile(v.mobile || "");
      setLanguage(v.language || "");
      
      setPan(v.pan_number || v.pan || "");
      setCurrency(v.currency || "INR");
      setOpeningBalance(v.opening_balance != null ? String(v.opening_balance) : "0");
      setPaymentTerms(v.payment_terms || "");
      setIsMsmeRegistered(!!v.is_msme_registered);
      setTds(v.tds || "");
      setEnablePortal(!!v.enable_portal);
      setPortalLanguage(v.portal_language || "en");
      
      if (location.state?.cloneAddresses) {
        const addresses = location.state.cloneAddresses;
        const billing = addresses.find(a => a.type === "billing");
        const shipping = addresses.find(a => a.type === "shipping");
        if (billing) setBillingAddress(billing);
        if (shipping) setShippingAddress(shipping);
      }
      
      if (location.state?.cloneContacts && location.state.cloneContacts.length > 0) {
        setContactPersons(location.state.cloneContacts.map(ct => ({
          salutation: ct.salutation || "",
          first_name: ct.first_name || "",
          last_name: ct.last_name || "",
          email: ct.email || "",
          work_phone: ct.work_phone || "",
          mobile: ct.mobile || ""
        })));
      }
      return;
    }

    if (!isEdit) return;

    const loadVendor = async () => {
      setFetching(true);
      try {
        const res = await apiRequest(`/vendors/${id}`);
        if (!res?.vendor) {
          toast.error("Vendor not found");
          navigate("/vendors");
          return;
        }

        const v = res.vendor;
        // basic fields
        setIsActive(v.is_active ?? true);
        setVendorType(v.vendor_type || "Business");
        setVendorSubType(v.vendor_sub_type || "");
        setSalutation(v.salutation || "");
        setFirstName(v.first_name || "");
        setLastName(v.last_name || "");
        setCompanyName(v.company_name || "");
        setDisplayName(v.display_name || "");
        setEmail(v.email || "");
        setPhone(v.phone || "");
        setWorkPhone(v.work_phone || "");
        setMobile(v.mobile || "");
        setLanguage(v.language || "");

        // financial
        setPan(v.pan_number || v.pan || "");
        setCurrency(v.currency || "INR");
        setOpeningBalance(v.opening_balance != null ? String(v.opening_balance) : "0");
        setPaymentTerms(v.payment_terms || "");
        setIsMsmeRegistered(!!v.is_msme_registered);
        setTds(v.tds || "");
        setEnablePortal(!!v.enable_portal);
        setPortalLanguage(v.portal_language || "en");
        setDocuments(v.documents ? JSON.stringify(v.documents) : "[]");
        setCustomFields(v.custom_fields ? JSON.stringify(v.custom_fields) : "{}");
        setReportingTags(v.reporting_tags || "");
        setRemarks(v.remarks || "");
        setVendorOwnerId(v.vendor_owner_id ? String(v.vendor_owner_id) : "");

        // addresses
        const addresses = res.addresses || [];
        const billing = addresses.find(a => a.type === "billing");
        const shipping = addresses.find(a => a.type === "shipping");

        if (billing) setBillingAddress(billing);
        if (shipping) setShippingAddress(shipping);

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
        toast.error("Failed to load vendor data");
      } finally {
        setFetching(false);
      }
    };

    loadVendor();
  }, [id, isEdit, navigate]);

  const handleCopyBilling = (checked) => {
    setCopyBilling(checked);
    if (checked) setShippingAddress({ ...billingAddress });
  };

  useEffect(() => {
    if (copyBilling) setShippingAddress({ ...billingAddress });
  }, [billingAddress, copyBilling]);

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
        vendor_type: vendorType,
        vendor_sub_type: vendorSubType || null,
        salutation,
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
        display_name: displayName || companyName || `${firstName} ${lastName}`.trim() || 'Unknown Vendor',
        email,
        phone,
        work_phone: workPhone,
        mobile,
        language,
        pan_number: pan,
        currency,
        opening_balance: parseFloat(openingBalance) || 0,
        payment_terms: paymentTerms,
        is_msme_registered: isMsmeRegistered,
        tds,
        enable_portal: enablePortal,
        portal_language: portalLanguage,
        documents: documents ? JSON.parse(documents) : [],
        addresses,
        contacts: contactPersons,
        custom_fields: customFields ? JSON.parse(customFields) : {},
        reporting_tags: reportingTags,
        remarks,
        vendor_owner_id: vendorOwnerId ? parseInt(vendorOwnerId) : null,
      };

      if (isEdit) {
        const res = await apiRequest(`/vendors/${id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("Vendor updated");
        if (onSaveSuccess) return onSaveSuccess(res?.vendor);
        navigate(`/vendors/${id}`);
      } else {
        const res = await apiRequest("/vendors", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Vendor created");
        if (onSaveSuccess) return onSaveSuccess(res?.vendor);
        navigate(`/vendors/${res.vendor.id}`);
      }
    } catch (err) {
      toast.error(isEdit ? "Failed to update vendor" : "Failed to create vendor");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div style={{ maxWidth: "900px", margin: "auto", padding: "30px" }}>
        <FormSkeleton fields={8} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#ffffff', fontFamily: 'inherit' }}>
      
      {/* Header */}
      {!isModal && (
        <div style={{ padding: '20px 30px 10px', background: '#fff' }}>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '400', color: '#111827' }}>
            {isEdit ? "Edit Vendor" : "New Vendor"}
          </h2>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: isModal ? '10px' : '0 30px 30px' }}>
        


        {/* Main Form Fields */}
        <div style={{ maxWidth: '900px' }}>
          
          {/* Primary Contact */}
          <div style={rowStyle}>
            <div style={labelContainerStyle}>
              <label style={labelStyle}>Primary Contact</label>
            </div>
            <div style={{ ...inputContainerStyle, display: 'flex', gap: '10px' }}>
              <select value={salutation} onChange={e => setSalutation(e.target.value)} style={{ ...inputStyle, width: '120px' }}>
                <option value="">Salutation</option>
                <option value="Mr.">Mr.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Ms.">Ms.</option>
                <option value="Dr.">Dr.</option>
              </select>
              <input placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} style={inputStyle} />
              <input placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Company Name */}
          <div style={rowStyle}>
            <div style={labelContainerStyle}>
              <label style={labelStyle}>Company Name</label>
            </div>
            <div style={inputContainerStyle}>
              <input 
                value={companyName} 
                onChange={e => {
                  setCompanyName(e.target.value);
                  if (!displayName || displayName === companyName) setDisplayName(e.target.value);
                }} 
                style={inputStyle} 
              />
            </div>
          </div>

          {/* Display Name */}
          <div style={rowStyle}>
            <div style={labelContainerStyle}>
              <label style={redLabelStyle}>Display Name*</label>
            </div>
            <div style={inputContainerStyle}>
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
          </div>

          {/* Email Address */}
          <div style={rowStyle}>
            <div style={labelContainerStyle}>
              <label style={labelStyle}>Email Address</label>
            </div>
            <div style={{ ...inputContainerStyle, position: 'relative' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '10px' }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ ...inputStyle, paddingLeft: '32px' }} />
            </div>
          </div>

          {/* Phone */}
          <div style={rowStyle}>
            <div style={labelContainerStyle}>
              <label style={labelStyle}>Phone</label>
            </div>
            <div style={{ ...inputContainerStyle, display: 'flex', gap: '20px' }}>
              <div style={{ display: 'flex', flex: 1 }}>
                <select style={{ ...inputStyle, width: '70px', borderRadius: '4px 0 0 4px', borderRight: 'none', background: '#f9fafb' }}>
                  <option>+91</option>
                </select>
                <input placeholder="Work Phone" value={workPhone} onChange={e => setWorkPhone(e.target.value)} style={{ ...inputStyle, borderRadius: '0 4px 4px 0', flex: 1 }} />
              </div>
              <div style={{ display: 'flex', flex: 1 }}>
                <select style={{ ...inputStyle, width: '70px', borderRadius: '4px 0 0 4px', borderRight: 'none', background: '#f9fafb' }}>
                  <option>+91</option>
                </select>
                <input placeholder="Mobile" value={mobile} onChange={e => setMobile(e.target.value)} style={{ ...inputStyle, borderRadius: '0 4px 4px 0', flex: 1 }} />
              </div>
            </div>
          </div>

          {/* Tabs Section */}
          <div style={{ marginTop: '40px' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '20px' }}>
              {["Other Details", "Address", "Contact Persons", "Bank Details", "Custom Fields", "Reporting Tags", "Remarks"].map((tab, idx) => (
                <div 
                  key={tab} 
                  onClick={() => setActiveTab(idx)} 
                  style={activeTab === idx ? ACTIVE_TAB_STYLE : TAB_STYLE}
                >
                  {tab}
                </div>
              ))}
            </div>

            {/* TAB CONTENT */}
            <div style={{ paddingBottom: '40px' }}>
              
              {/* TAB 0: OTHER DETAILS */}
              {activeTab === 0 && (
                <div>
                  <div style={rowStyle}>
                    <div style={labelContainerStyle}>
                      <label style={labelStyle}>PAN</label>
                    </div>
                    <div style={inputContainerStyle}>
                      <input value={pan} onChange={e => setPan(e.target.value)} style={inputStyle} />
                    </div>
                  </div>

                  <div style={rowStyle}>
                    <div style={labelContainerStyle}>
                      <label style={labelStyle}>Currency</label>
                    </div>
                    <div style={inputContainerStyle}>
                      <select value={currency} onChange={e => setCurrency(e.target.value)} style={inputStyle}>
                        <option value="INR">INR- Indian Rupee</option>
                        <option value="USD">USD- US Dollar</option>
                        <option value="EUR">EUR- Euro</option>
                        <option value="GBP">GBP- British Pound</option>
                      </select>
                    </div>
                  </div>
                  {/* Opening Balance */}
                  <div style={rowStyle}>
                    <div style={labelContainerStyle}>
                      <label style={labelStyle}>Opening Balance</label>
                    </div>
                    <div style={{ ...inputContainerStyle, display: 'flex' }}>
                      <select style={{ ...inputStyle, width: '70px', borderRadius: '4px 0 0 4px', borderRight: 'none', background: '#f9fafb', pointerEvents: 'none' }} tabIndex="-1">
                        <option>{currency || 'INR'}</option>
                      </select>
                      <input type="number" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} style={{ ...inputStyle, borderRadius: '0 4px 4px 0', flex: 1 }} />
                    </div>
                  </div>

                  {/* Payment Terms */}
                  <div style={rowStyle}>
                    <div style={labelContainerStyle}>
                      <label style={labelStyle}>Payment Terms</label>
                    </div>
                    <div style={inputContainerStyle}>
                      <select value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} style={inputStyle}>
                        <option value="">Due on Receipt</option>
                        <option value="Net 15">Net 15</option>
                        <option value="Net 30">Net 30</option>
                      </select>
                    </div>
                  </div>

                  {/* TDS */}
                  <div style={rowStyle}>
                    <div style={labelContainerStyle}>
                      <label style={labelStyle}>TDS</label>
                    </div>
                    <div style={inputContainerStyle}>
                      <select value={tds} onChange={e => setTds(e.target.value)} style={inputStyle}>
                        <option value="">Select a Tax</option>
                        <option value="Commission or Brokerage - [2 %]">Commission or Brokerage - [2 %]</option>
                        <option value="Contractors - [1 %]">Contractors - [1 %]</option>
                        <option value="Contractors - [2 %]">Contractors - [2 %]</option>
                        <option value="Professional Fees - [10 %]">Professional Fees - [10 %]</option>
                        <option value="Rent - [10 %]">Rent - [10 %]</option>
                      </select>
                    </div>
                  </div>

                  {/* Documents */}
                  <div style={{ ...rowStyle, alignItems: 'flex-start' }}>
                    <div style={labelContainerStyle}>
                      <label style={labelStyle}>Documents</label>
                    </div>
                    <div style={inputContainerStyle}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input 
                          type="file" 
                          id="vendor-documents" 
                          multiple 
                          style={{ display: 'none' }} 
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              setUploadedFiles([...uploadedFiles, ...Array.from(e.target.files)]);
                            }
                            // Reset input value to allow selecting the same file again if removed
                            e.target.value = null;
                          }}
                        />
                        <div style={{ display: 'flex', border: '1px dashed #d1d5db', borderRadius: '4px', background: '#fff' }}>
                          <button 
                            type="button" 
                            onClick={() => document.getElementById('vendor-documents').click()}
                            style={{ background: 'none', border: 'none', padding: '8px 12px', color: '#374151', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRight: '1px solid #e5e7eb' }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                            Upload File
                          </button>
                          <button 
                            type="button" 
                            onClick={() => uploadedFiles.length > 0 && setShowFilesPopover(!showFilesPopover)}
                            style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                          </button>
                        </div>
                        
                        {/* Blue Badge */}
                        {uploadedFiles.length > 0 && (
                          <button 
                            type="button" 
                            onClick={() => setShowFilesPopover(!showFilesPopover)}
                            style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: '500' }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                            {uploadedFiles.length}
                          </button>
                        )}

                        {/* Files Popover */}
                        {showFilesPopover && uploadedFiles.length > 0 && (
                          <div style={{ position: 'absolute', top: '100%', left: '0', marginTop: '10px', width: '320px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', zIndex: 10, padding: '10px 0' }}>
                            {uploadedFiles.map((file, index) => (
                              <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: index < uploadedFiles.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', overflow: 'hidden' }}>
                                  <div style={{ color: '#3b82f6', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                    <span style={{ fontSize: '9px', fontWeight: 'bold', marginTop: '-4px', background: '#fff', padding: '0 2px' }}>
                                      {file.name.split('.').pop().toUpperCase().substring(0, 4)}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                    <span style={{ fontSize: '13px', color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={file.name}>
                                      {file.name}
                                    </span>
                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                      File Size: {formatBytes(file.size)}
                                    </span>
                                  </div>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    const newFiles = uploadedFiles.filter((_, i) => i !== index);
                                    setUploadedFiles(newFiles);
                                    if (newFiles.length === 0) setShowFilesPopover(false);
                                  }}
                                  style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '6px' }}>
                        You can upload a maximum of 10 files, 10MB each
                      </div>
                    </div>
                  </div>


                </div>
              )}

              {/* TAB 1: ADDRESS */}
              {activeTab === 1 && (
                <div>
                  <h4 style={{ color: '#111827', marginBottom: '20px' }}>Billing Address</h4>
                  {addressFields(billingAddress, setBillingAddress)}
                  <h4 style={{ marginTop: '40px', color: '#111827', marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
                    Shipping Address
                    <label style={{ fontSize: "14px", color: '#4b5563', display: "flex", alignItems: "center", marginLeft: '20px', fontWeight: '400' }}>
                      <input type="checkbox" checked={copyBilling} onChange={e => handleCopyBilling(e.target.checked)} style={{ marginRight: "8px" }} />
                      Same as Billing Address
                    </label>
                  </h4>
                  {addressFields(shippingAddress, copyBilling ? () => {} : setShippingAddress, copyBilling)}
                </div>
              )}

              {/* TAB 2: CONTACT PERSONS */}
              {activeTab === 2 && (
                <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '20px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1px solid #e5e7eb', marginBottom: '20px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e5e7eb', fontSize: '12px', color: '#6b7280', fontWeight: '600', letterSpacing: '0.05em' }}>
                        <th style={{ padding: '12px 10px', textAlign: 'left', borderRight: '1px solid #f3f4f6', width: '120px' }}>SALUTATION</th>
                        <th style={{ padding: '12px 10px', textAlign: 'left', borderRight: '1px solid #f3f4f6' }}>FIRST NAME</th>
                        <th style={{ padding: '12px 10px', textAlign: 'left', borderRight: '1px solid #f3f4f6' }}>LAST NAME</th>
                        <th style={{ padding: '12px 10px', textAlign: 'left', borderRight: '1px solid #f3f4f6' }}>EMAIL ADDRESS</th>
                        <th style={{ padding: '12px 10px', textAlign: 'left', borderRight: '1px solid #f3f4f6' }}>WORK PHONE</th>
                        <th style={{ padding: '12px 10px', textAlign: 'left', borderRight: '1px solid #f3f4f6' }}>MOBILE</th>
                        {contactPersons.length > 1 && <th style={{ padding: '12px', textAlign: 'center', width: '40px' }}></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {contactPersons.map((person, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '4px', borderRight: '1px solid #f3f4f6' }}>
                            <select value={person.salutation || ''} onChange={e => updateContactPerson(idx, 'salutation', e.target.value)} style={{ ...inputStyle, border: 'none', background: 'transparent' }}>
                              <option value=""></option>
                              <option value="Mr.">Mr.</option>
                              <option value="Mrs.">Mrs.</option>
                              <option value="Ms.">Ms.</option>
                              <option value="Dr.">Dr.</option>
                            </select>
                          </td>
                          <td style={{ padding: '4px', borderRight: '1px solid #f3f4f6' }}>
                            <input value={person.first_name} onChange={e => updateContactPerson(idx, 'first_name', e.target.value)} style={{ ...inputStyle, border: 'none', background: 'transparent' }} />
                          </td>
                          <td style={{ padding: '4px', borderRight: '1px solid #f3f4f6' }}>
                            <input value={person.last_name} onChange={e => updateContactPerson(idx, 'last_name', e.target.value)} style={{ ...inputStyle, border: 'none', background: 'transparent' }} />
                          </td>
                          <td style={{ padding: '4px', borderRight: '1px solid #f3f4f6' }}>
                            <input value={person.email} onChange={e => updateContactPerson(idx, 'email', e.target.value)} style={{ ...inputStyle, border: 'none', background: 'transparent' }} />
                          </td>
                          <td style={{ padding: '4px', borderRight: '1px solid #f3f4f6' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <select style={{ ...inputStyle, width: '60px', border: 'none', background: 'transparent', paddingRight: '0' }}>
                                <option>+91</option>
                              </select>
                              <input value={person.work_phone} onChange={e => updateContactPerson(idx, 'work_phone', e.target.value)} style={{ ...inputStyle, border: 'none', background: 'transparent', flex: 1 }} />
                            </div>
                          </td>
                          <td style={{ padding: '4px', borderRight: '1px solid #f3f4f6' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <select style={{ ...inputStyle, width: '60px', border: 'none', background: 'transparent', paddingRight: '0' }}>
                                <option>+91</option>
                              </select>
                              <input value={person.mobile} onChange={e => updateContactPerson(idx, 'mobile', e.target.value)} style={{ ...inputStyle, border: 'none', background: 'transparent', flex: 1 }} />
                            </div>
                          </td>
                          {contactPersons.length > 1 && (
                            <td style={{ padding: '4px', textAlign: 'center' }}>
                              <button onClick={() => removeContactPerson(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }} title="Remove">✕</button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <button onClick={addContactPerson} style={{ background: '#f5f5fa', color: '#4b5563', border: 'none', borderRadius: '4px', padding: '8px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" stroke="none" fill="#3b82f6" />
                      <line x1="12" y1="8" x2="12" y2="16"></line>
                      <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    Add Contact Person
                  </button>
                </div>
              )}

              {/* OTHER TABS */}
              {(activeTab > 2 && activeTab !== 6) && (
                <div style={{ color: '#6b7280', fontSize: '14px', fontStyle: 'italic' }}>
                  This section is available in full view.
                </div>
              )}

              {/* TAB 6: REMARKS */}
              {activeTab === 6 && (
                <div style={{ width: '100%', maxWidth: '800px' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ color: '#374151', fontSize: '14px', fontWeight: '500' }}>Remarks </span>
                    <span style={{ color: '#9ca3af', fontSize: '13px' }}>(For Internal Use)</span>
                  </div>
                  <textarea 
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    style={{ 
                      width: '100%', 
                      height: '100px', 
                      padding: '10px', 
                      borderRadius: '6px', 
                      border: '1px solid #93c5fd', 
                      boxSizing: 'border-box', 
                      fontSize: '14px', 
                      color: '#111827', 
                      outline: 'none', 
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.1)'
                    }} 
                    onFocus={e => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.boxShadow = '0 0 0 1px #3b82f6';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div style={{ background: '#fff', borderTop: '1px solid #e5e7eb', padding: '15px 30px', display: 'flex', gap: '10px', position: 'sticky', bottom: 0 }}>
        <button onClick={handleSave} disabled={loading} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
          {loading ? "Saving..." : isEdit ? "Update" : "Save"}
        </button>
        <button onClick={() => onCancel ? onCancel() : navigate("/vendors")} disabled={loading} style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
          Cancel
        </button>
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

export default AddVendor;
