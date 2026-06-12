import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { DetailSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";
import { Printer, FileText } from "lucide-react";
import html2pdf from "html2pdf.js";

// Minimal styling constants
const BLUE = '#4a90e2';
const BORDER_COLOR = '#e2e8f0';
const TEXT_PRIMARY = '#1e293b';
const TEXT_SECONDARY = '#64748b';
const BG_PAGE = '#f8fafc';
const BG_CARD = '#ffffff';

const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box', marginTop: '4px' };
const labelStyle = { display: 'block', fontSize: '12px', color: '#475569', marginTop: '12px' };

function VendorDetail({ inlineVendorId, onClose }) {
  const { id: paramId } = useParams();
  const id = inlineVendorId || paramId;
  const isInline = !!inlineVendorId;
  const navigate = useNavigate();

  const [allVendors, setAllVendors] = useState([]);
  const [vendor, setVendor] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("Overview");
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [activeMenu, setActiveMenu] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  
  const fileInputRef = useRef(null);
  const profileInputRef = useRef(null);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const [editAddressType, setEditAddressType] = useState(null);
  const [editAddressForm, setEditAddressForm] = useState(null);
  const [savingAddress, setSavingAddress] = useState(false);

  const refreshDocuments = async (currentVendor) => {
    try {
      const docRes = await apiRequest('/documents');
      let docs = [];
      
      if (docRes && docRes.documents) {
        const uploadedDocs = docRes.documents.filter(d => d.related_module === 'vendors' && String(d.related_record_id) === String(id));
        docs = [...docs, ...uploadedDocs];
      }
      
      if (currentVendor && currentVendor.documents && Array.isArray(currentVendor.documents)) {
        docs = [...docs, ...currentVendor.documents];
      }
      
      setAttachedFiles(docs);
    } catch (e) {
      console.error("Failed to fetch documents", e);
    }
  };

  const handleDownloadPDF = () => {
    const element = document.querySelector('.printable-statement');
    if (!element) return;
    
    toast.loading("Generating PDF...", { id: "pdf-gen" });
    const opt = {
      margin:       0.5,
      filename:     `Vendor_Statement_${vendor?.display_name || 'Document'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save().then(() => {
      toast.success("PDF Downloaded successfully!", { id: "pdf-gen" });
    }).catch((err) => {
      console.error(err);
      toast.error("Failed to generate PDF", { id: "pdf-gen" });
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('document_name', file.name);
      uploadData.append('category', 'Vendor');
      uploadData.append('related_module', 'vendors');
      uploadData.append('related_record_id', id);
      uploadData.append('notes', 'Uploaded from Vendor Details');

      toast.loading("Attaching file...", { id: "upload" });
      
      const res = await fetch('http://localhost:5001/api/documents', {
        method: 'POST',
        credentials: 'include',
        body: uploadData
      });

      if (!res.ok) throw new Error('Upload failed');
      
      await refreshDocuments(vendor);
      
      toast.success("This file is attached", { id: "upload" });
    } catch (err) {
      toast.error("Failed to attach document", { id: "upload" });
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = null;
    }
  };

  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsUploadingProfile(true);
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('document_name', `profile_${file.name}`);
      uploadData.append('category', 'Profile Photo');
      uploadData.append('related_module', 'vendors');
      uploadData.append('related_record_id', id);
      uploadData.append('notes', 'Profile Photo');

      toast.loading("Uploading profile photo...", { id: "profile_upload" });
      
      // Delete any existing profile photos
      const oldPhotos = attachedFiles.filter(f => f.category === 'Profile Photo' || f.notes === 'Profile Photo');
      for (const p of oldPhotos) {
        try {
          await apiRequest(`/documents/${p.id}`, { method: "DELETE" });
        } catch (e) {
          console.error("Failed to delete old profile photo", e);
        }
      }

      const res = await fetch('http://localhost:5001/api/documents', {
        method: 'POST',
        credentials: 'include',
        body: uploadData
      });

      if (!res.ok) throw new Error('Upload failed');
      
      await refreshDocuments(vendor);
      
      toast.success("Profile photo updated!", { id: "profile_upload" });
    } catch (err) {
      toast.error("Failed to update profile photo", { id: "profile_upload" });
    } finally {
      setIsUploadingProfile(false);
      if (e.target) e.target.value = null;
    }
  };
  
  const [sections, setSections] = useState({
    address: true,
    otherDetails: true,
    contactPersons: true,
    bankAccounts: true
  });

  const toggleSection = (sec) => {
    setSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  useEffect(() => {
    fetchAllVendors();
  }, []);

  useEffect(() => {
    if (id) {
      fetchVendorDetails();
    }
  }, [id]);

  const fetchAllVendors = async () => {
    try {
      const res = await apiRequest("/vendors");
      if (res) setAllVendors(res.vendors || []);
    } catch (err) {
      toast.error("Failed to load vendors list");
    }
  };

  const handleDownload = (id) => {
    window.open(`http://localhost:5001/api/documents/${id}/download`, '_blank');
  };

  const handleRemove = async (docId, index) => {
    if (!window.confirm("Are you sure you want to remove this attachment?")) return;
    try {
      if (docId) {
        await apiRequest(`/documents/${docId}`, { method: "DELETE" });
      }
      setAttachedFiles(prev => prev.filter((_, i) => i !== index));
      setActiveMenu(null);
      toast.success("This file is deleted");
    } catch (err) {
      toast.error("Failed to remove attachment");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this vendor?")) return;
    try {
      await apiRequest(`/vendors/${id}`, { method: "DELETE" });
      toast.success("Vendor deleted successfully");
      if (isInline && onClose) {
        onClose(true);
      } else {
        navigate("/vendors");
      }
    } catch (error) {
      toast.error("Failed to delete vendor");
    }
  };

  const handleToggleStatus = async () => {
    try {
      const newStatus = vendor.is_active === false; 
      await apiRequest(`/vendors/${id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: newStatus })
      });
      toast.success(`Vendor marked as ${newStatus ? 'Active' : 'Inactive'}`);
      setVendor(prev => ({ ...prev, is_active: newStatus }));
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleClone = () => {
    navigate("/vendors/new", { state: { cloneVendor: vendor, cloneAddresses: addresses, cloneContacts: contacts } });
  };

  const handleOpenEditAddress = (type, addr) => {
    setEditAddressType(type);
    setEditAddressForm(addr || { attention: "", country: "", address_line1: "", address_line2: "", city: "", state: "", pin_code: "", phone: "", fax: "" });
  };

  const handleSaveAddress = async () => {
    if (!editAddressForm) return;
    const updatedAddresses = [...addresses];
    const existingIdx = updatedAddresses.findIndex(a => a.type === editAddressType);
    if (existingIdx >= 0) {
      updatedAddresses[existingIdx] = { ...updatedAddresses[existingIdx], ...editAddressForm, type: editAddressType };
    } else {
      updatedAddresses.push({ ...editAddressForm, type: editAddressType });
    }
    
    const payload = {
      is_active: vendor.is_active,
      vendor_type: vendor.vendor_type,
      salutation: vendor.salutation,
      first_name: vendor.first_name,
      last_name: vendor.last_name,
      company_name: vendor.company_name,
      display_name: vendor.display_name,
      email: vendor.email,
      phone: vendor.phone,
      mobile: vendor.mobile,
      work_phone: vendor.work_phone,
      currency: vendor.currency,
      opening_balance: vendor.opening_balance,
      addresses: updatedAddresses,
      contacts: contacts
    };
    
    try {
      setSavingAddress(true);
      await apiRequest(`/vendors/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      toast.success(`${editAddressType === 'billing' ? 'Billing' : 'Shipping'} Address updated`);
      await fetchVendorDetails();
      setEditAddressType(null);
    } catch (err) {
      toast.error('Failed to update address');
    } finally {
      setSavingAddress(false);
    }
  };

  const fetchVendorDetails = async () => {
    try {
      setLoading(true);
      const res = await apiRequest(`/vendors/${id}`);
      if (res && res.vendor) {
        setVendor(res.vendor);
        setAddresses(res.addresses || []);
        setContacts(res.contacts || []);
        setActiveTab("Overview"); 
        
        await refreshDocuments(res.vendor);
      } else {
        toast.error("Vendor not found");
        navigate("/vendors");
      }
    } catch (err) {
      toast.error("Failed to load vendor details");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !vendor) {
    return <div style={{ padding: "30px", background: BG_PAGE, minHeight: "100vh" }}><DetailSkeleton /></div>;
  }

  const billing = addresses.find(a => a.type === "billing");
  const shipping = addresses.find(a => a.type === "shipping");

  const openingBalance = vendor ? parseFloat(vendor.opening_balance) || 0 : 0;
  const outstandingPayables = openingBalance; 
  const isActive = vendor?.is_active !== false;

  const profilePhoto = attachedFiles.find(f => f.category === 'Profile Photo' || f.notes === 'Profile Photo');

  return (
    <>
      <style>
        {`
          @keyframes spinAnimation {
            to { transform: rotate(360deg); }
          }
          .more-menu-item {
            padding: 10px 16px;
            font-size: 13px;
            color: #334155;
            cursor: pointer;
            transition: background 0.1s, color 0.1s;
          }
          .more-menu-item:hover {
            background: #3b82f6;
            color: #fff;
          }
          @media print {
            .no-print, .sidebar, .topbar {
              display: none !important;
            }
            body, html, #root {
              height: auto !important;
              overflow: visible !important;
              background: #fff !important;
            }
            .print-reset {
              height: auto !important;
              overflow: visible !important;
              display: block !important;
              padding: 0 !important;
            }
            .printable-statement {
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
            }
          }
        `}
      </style>
      <div className="print-reset" style={{ display: "flex", height: isInline ? "100%" : "calc(100vh - 60px)", background: BG_PAGE, overflow: "hidden" }}>
      
      {!isInline && (
      <div className="no-print" style={{ width: "300px", background: BG_CARD, borderRight: `1px solid ${BORDER_COLOR}`, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "15px 20px", borderBottom: `1px solid ${BORDER_COLOR}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontWeight: "600", color: TEXT_PRIMARY }}>
            All Vendors <span style={{ color: BLUE }}>▾</span>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => navigate("/vendors/new")} style={{ ...actionBtn, background: BLUE, color: "#fff", border: "none", padding: "4px 8px" }}>+</button>
            <button style={{ ...actionBtn, padding: "4px 8px" }}>...</button>
          </div>
        </div>
        
        <div style={{ flex: 1, overflowY: "auto" }}>
          {allVendors.map(v => {
            const isSelected = v.id.toString() === id;
            return (
              <div 
                key={v.id} 
                onClick={() => navigate(`/vendors/${v.id}`)}
                style={{ 
                  padding: "15px 20px", 
                  borderBottom: `1px solid ${BORDER_COLOR}`, 
                  background: isSelected ? "#f1f5f9" : "transparent", 
                  cursor: "pointer", 
                  display: "flex", 
                  alignItems: "flex-start", 
                  gap: "12px",
                  transition: "background 0.2s"
                }}
              >
                <input type="checkbox" style={{ marginTop: "4px" }} onClick={(e) => e.stopPropagation()} />
                <div>
                  <div style={{ fontSize: "14px", color: TEXT_PRIMARY, fontWeight: isSelected ? "600" : "500", marginBottom: "4px" }}>
                    {v.display_name}
                  </div>
                  <div style={{ fontSize: "13px", color: TEXT_SECONDARY }}>
                    ₹{parseFloat(v.opening_balance || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {vendor ? (
        <div className="print-reset" style={{ flex: 1, display: "flex", flexDirection: "column", background: BG_PAGE, overflow: "hidden" }}>
          
          <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 30px", background: BG_CARD, borderBottom: `1px solid ${BORDER_COLOR}` }}>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600", color: TEXT_PRIMARY }}>{vendor.display_name}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", position: "relative" }}>
              <button onClick={() => navigate(`/vendors/${id}/edit`)} style={actionBtn}>Edit</button>
              
              <button onClick={() => setAttachmentOpen(!attachmentOpen)} style={{ ...actionBtn, background: attachmentOpen ? "#f1f5f9" : "transparent", display: "flex", alignItems: "center", gap: "4px" }} title="Attachments">
                <span>📎</span>
                {attachedFiles.length > 0 && <span style={{ fontWeight: "600", fontSize: "14px" }}>{attachedFiles.length}</span>}
              </button>
              
              {attachmentOpen && (
                <div style={{ position: "absolute", top: "100%", right: "140px", marginTop: "10px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)", width: "360px", zIndex: 100 }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#1e293b" }}>Attachments</h3>
                    <button onClick={() => setAttachmentOpen(false)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "16px" }}>✕</button>
                  </div>
                  
                  <div style={{ maxHeight: "300px", overflowY: "auto", borderBottom: "1px solid #e2e8f0" }}>
                    {attachedFiles.length > 0 ? (
                      <div>
                        {attachedFiles.map((doc, i) => {
                          const isMenuOpen = activeMenu === i;
                          const fileSize = doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : "Unknown Size";
                          const fileName = doc.file_name || doc.name || doc.document_name || "Document";
                          
                          return (
                            <div key={i} style={{ padding: "16px", borderBottom: i < attachedFiles.length - 1 ? "1px solid #e2e8f0" : "none", display: "flex", alignItems: "flex-start", gap: "12px", background: isMenuOpen ? "#f8fafc" : "transparent" }}>
                              <div style={{ width: "32px", height: "32px", background: "#eff6ff", color: "#3b82f6", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "bold", border: "1px solid #bfdbfe", textTransform: "uppercase" }}>
                                {fileName.split('.').pop().substring(0, 3)}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {fileName}
                                </div>
                                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                                  File Size: {fileSize}
                                </div>
                                
                                {isMenuOpen && (
                                  <div style={{ display: "flex", gap: "16px", marginTop: "10px", fontSize: "13px" }}>
                                    <span onClick={() => handleDownload(doc.id)} style={{ color: "#3b82f6", cursor: "pointer" }}>Download</span>
                                    <span onClick={() => handleRemove(doc.id, i)} style={{ color: "#3b82f6", cursor: "pointer" }}>Remove</span>
                                    <span onClick={() => window.open(`http://localhost:5001/api/documents/${doc.id}/download?inline=true`, '_blank')} style={{ color: "#3b82f6", cursor: "pointer", display: "flex", alignItems: "center", gap: "2px" }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "12px", color: isMenuOpen ? "#ef4444" : "#64748b" }}>
                                <span onClick={() => handleRemove(doc.id, i)} style={{ cursor: "pointer", fontSize: "16px" }} title="Delete">🗑</span>
                                <span onClick={() => setActiveMenu(isMenuOpen ? null : i)} style={{ cursor: "pointer", fontWeight: "bold", fontSize: "16px", padding: "0 4px" }}>⋮</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ padding: "30px 20px", textAlign: "center", color: "#475569", fontSize: "14px" }}>
                        No Files Attached
                      </div>
                    )}
                  </div>
                  
                  <div style={{ padding: "16px" }}>
                    <div 
                      onClick={() => !isUploading && fileInputRef.current && fileInputRef.current.click()}
                      style={{ 
                        border: "1px dashed #cbd5e1", 
                        borderRadius: "6px", 
                        padding: "15px", 
                        textAlign: "center", 
                        cursor: isUploading ? "wait" : "pointer", 
                        color: "#3b82f6", 
                        fontWeight: "500", 
                        fontSize: "14px", 
                        transition: "background 0.2s",
                        opacity: isUploading ? 0.7 : 1
                      }}
                      onMouseOver={e => !isUploading && (e.currentTarget.style.background = "#f8fafc")}
                      onMouseOut={e => !isUploading && (e.currentTarget.style.background = "transparent")}
                    >
                      {isUploading ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "#64748b" }}>
                          <svg style={{ animation: "spinAnimation 1s linear infinite" }} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                          Attaching file...
                        </div>
                      ) : (
                        <>
                          <span style={{ fontSize: "16px", marginRight: "6px" }}>↑</span> Upload your Files <span style={{ color: "#64748b", fontSize: "12px", marginLeft: "4px" }}>▼</span>
                        </>
                      )}
                    </div>
                    <div style={{ textAlign: "center", marginTop: "10px", color: "#94a3b8", fontSize: "11px" }}>
                      You can upload a maximum of 10 files, 10MB each
                    </div>
                  </div>
                </div>
              )}

              <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileUpload} />
              <button onClick={() => toast.success("Transaction initiated successfully!")} style={{ ...primaryBtn, padding: "6px 12px", fontSize: "13px" }}>New Transaction ▾</button>
              
              <div style={{ position: "relative" }}>
                <button onClick={() => setMoreMenuOpen(!moreMenuOpen)} style={actionBtn}>More ▾</button>
                {moreMenuOpen && (
                  <>
                    <div onClick={() => setMoreMenuOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}></div>
                    <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "5px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)", width: "200px", zIndex: 100, overflow: "hidden", padding: "4px 0" }}>
                      <div className="more-menu-item" onClick={() => { toast.success("Associate Templates action triggered"); setMoreMenuOpen(false); }}>Associate Templates</div>
                      <div className="more-menu-item" onClick={() => { toast.success("Add Bank Account action triggered"); setMoreMenuOpen(false); }}>Add Bank Account</div>
                      <div className="more-menu-item" onClick={() => { toast.success("Link to Customer action triggered"); setMoreMenuOpen(false); }} style={{ borderBottom: "1px solid #f1f5f9", marginBottom: "4px", paddingBottom: "10px" }}>Link to Customer</div>
                      <div className="more-menu-item" onClick={() => { handleClone(); setMoreMenuOpen(false); }}>Clone</div>
                      <div className="more-menu-item" onClick={() => { toast.success("Merge Vendors action triggered"); setMoreMenuOpen(false); }}>Merge Vendors</div>
                      <div className="more-menu-item" onClick={() => { handleToggleStatus(); setMoreMenuOpen(false); }} style={{ borderBottom: "1px solid #f1f5f9", marginBottom: "4px", paddingBottom: "10px" }}>{isActive ? 'Mark as Inactive' : 'Mark as Active'}</div>
                      <div className="more-menu-item" onClick={() => { handleDelete(); setMoreMenuOpen(false); }}>Delete</div>
                    </div>
                  </>
                )}
              </div>
              
              <button onClick={() => isInline ? onClose() : navigate("/vendors")} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: TEXT_SECONDARY, marginLeft: "10px" }}>✕</button>
            </div>
          </div>

          {/* Tabs */}
          <div className="no-print" style={{ display: "flex", borderBottom: `1px solid ${BORDER_COLOR}`, background: BG_CARD, padding: "0 30px" }}>
            {["Overview", "Comments", "Transactions", "Mails", "Statement"].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                style={{
                  padding: "15px 20px",
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === tab ? `3px solid ${BLUE}` : "3px solid transparent",
                  color: activeTab === tab ? BLUE : TEXT_SECONDARY,
                  fontWeight: activeTab === tab ? "600" : "500",
                  cursor: "pointer",
                  fontSize: "14px",
                  transition: "color 0.2s"
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content Area */}
          <div className="print-reset" style={{ flex: 1, overflowY: "auto", display: "flex" }}>
            
            {activeTab === "Overview" && (
              <React.Fragment>
                {/* Profile Sidebar (Left side of Overview) */}
                <div style={{ width: "300px", background: BG_CARD, borderRight: `1px solid ${BORDER_COLOR}`, overflowY: "auto" }}>
                  
                  {/* Profile Header */}
                  <div style={{ padding: "20px" }}>
                    <div style={{ fontSize: "15px", color: TEXT_PRIMARY, marginBottom: "15px" }}>
                      {vendor.company_name || vendor.display_name}
                    </div>
                    
                    <div style={{ background: "#f8fafc", border: `1px solid ${BORDER_COLOR}`, borderRadius: "8px", padding: "15px", position: "relative" }}>
                      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                        
                        {/* Profile Photo Placeholder / Image */}
                        <div style={{ position: "relative" }}>
                          <div 
                            onClick={() => {
                              if (isUploadingProfile) return;
                              if (profilePhoto) setProfileMenuOpen(!profileMenuOpen);
                              else if (profileInputRef.current) profileInputRef.current.click();
                            }}
                            style={{ 
                              width: "48px", 
                              height: "48px", 
                              background: "#4b5563", 
                              borderRadius: "8px", 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center", 
                              color: "#fff", 
                              cursor: isUploadingProfile ? "wait" : "pointer",
                              flexShrink: 0,
                              overflow: "hidden",
                              opacity: isUploadingProfile ? 0.6 : 1
                            }}
                            title={profilePhoto ? "Profile Options" : "Add Profile Photo"}
                          >
                            {isUploadingProfile ? (
                              <svg style={{ animation: "spinAnimation 1s linear infinite" }} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                            ) : profilePhoto ? (
                              <img 
                                crossOrigin="use-credentials"
                                src={`http://localhost:5001/api/documents/${profilePhoto.id}/download?inline=true`} 
                                alt="Profile" 
                                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                              />
                            ) : (
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            )}
                          </div>
                          
                          {profileMenuOpen && (
                            <>
                              <div onClick={() => setProfileMenuOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}></div>
                              <div style={{ position: "absolute", top: "100%", left: 0, marginTop: "5px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", width: "140px", zIndex: 100, overflow: "hidden", padding: "4px 0" }}>
                                <div className="more-menu-item" onClick={() => { setProfileMenuOpen(false); profileInputRef.current && profileInputRef.current.click(); }}>Replace Image</div>
                                <div className="more-menu-item" onClick={() => { setProfileMenuOpen(false); window.open(`http://localhost:5001/api/documents/${profilePhoto.id}/download?inline=true`, '_blank'); }}>View Image</div>
                                <div className="more-menu-item" onClick={() => { setProfileMenuOpen(false); handleRemove(profilePhoto.id, attachedFiles.findIndex(f => f.id === profilePhoto.id)); }} style={{ color: "#ef4444" }}>Delete Image</div>
                              </div>
                            </>
                          )}
                        </div>
                        
                        {/* Hidden Input for Profile Photo */}
                        <input type="file" ref={profileInputRef} style={{ display: "none" }} accept="image/*" onChange={(e) => { setProfileMenuOpen(false); handleProfilePhotoUpload(e); }} />

                        <div style={{ fontSize: "14px", color: TEXT_PRIMARY, lineHeight: "1.6", flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ fontWeight: "600", fontSize: "15px", color: "#0f172a", marginBottom: "2px" }}>
                              {vendor.salutation} {vendor.first_name} {vendor.last_name}
                            </div>
                            <button onClick={() => toast.success("Contact settings coming soon")} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: "0" }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                            </button>
                          </div>
                          
                          {vendor.email && <div style={{ color: "#334155" }}>{vendor.email}</div>}
                          
                          {(vendor.phone || vendor.mobile || vendor.work_phone) ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#334155", marginTop: "2px" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                              {vendor.phone || vendor.mobile || vendor.work_phone}
                            </div>
                          ) : (
                            <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px", verticalAlign: "middle" }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                              —
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ADDRESS */}
                  <div style={sectionContainer}>
                    <div style={sectionHeader} onClick={() => toggleSection('address')}>
                      <span>ADDRESS</span>
                      <span>{sections.address ? '⌃' : '⌄'}</span>
                    </div>
                    {sections.address && (
                      <div style={sectionContent}>
                        <div style={{ marginBottom: "15px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <div style={{ fontWeight: "600" }}>Billing Address</div>
                            <div style={{ color: TEXT_SECONDARY, cursor: "pointer" }} onClick={() => handleOpenEditAddress('billing', billing)} title="Edit Billing Address">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                            </div>
                          </div>
                          {billing ? (
                            <div style={{ color: TEXT_SECONDARY }}>
                              {billing.address_line1 && <div>{billing.address_line1}</div>}
                              {billing.address_line2 && <div>{billing.address_line2}</div>}
                              <div>{billing.city}{billing.city && billing.state ? ', ' : ''}{billing.state}</div>
                              <div>{billing.country} {billing.pin_code}</div>
                              {billing.phone && <div>Phone: {billing.phone}</div>}
                            </div>
                          ) : (
                            <div style={{ color: "#94a3b8", fontStyle: "italic" }}>No billing address</div>
                          )}
                        </div>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <div style={{ fontWeight: "600" }}>Shipping Address</div>
                            <div style={{ color: TEXT_SECONDARY, cursor: "pointer" }} onClick={() => handleOpenEditAddress('shipping', shipping)} title="Edit Shipping Address">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                            </div>
                          </div>
                          {shipping ? (
                            <div style={{ color: TEXT_SECONDARY }}>
                              {shipping.address_line1 && <div>{shipping.address_line1}</div>}
                              {shipping.address_line2 && <div>{shipping.address_line2}</div>}
                              <div>{shipping.city}{shipping.city && shipping.state ? ', ' : ''}{shipping.state}</div>
                              <div>{shipping.country} {shipping.pin_code}</div>
                            </div>
                          ) : (
                            <div style={{ color: "#94a3b8", fontStyle: "italic" }}>No shipping address</div>
                          )}
                        </div>
                        <div style={{ marginTop: "10px", color: BLUE, cursor: "pointer", fontSize: "13px" }} onClick={() => navigate(`/vendors/${id}/edit`, { state: { initialTab: 0 } })}>
                          Add additional address
                        </div>
                      </div>
                    )}
                  </div>

                  {/* OTHER DETAILS */}
                  <div style={sectionContainer}>
                    <div style={sectionHeader} onClick={() => toggleSection('otherDetails')}>
                      <span>OTHER DETAILS</span>
                      <span>{sections.otherDetails ? '⌃' : '⌄'}</span>
                    </div>
                    {sections.otherDetails && (
                      <div style={sectionContent}>
                        <div style={{ color: TEXT_SECONDARY, marginBottom: "4px" }}>Default Currency</div>
                        <div style={{ fontWeight: "500" }}>{vendor.currency ? vendor.currency.replace(/[^A-Za-z]/g, '') : "INR"}</div>
                      </div>
                    )}
                  </div>

                  {/* CONTACT PERSONS */}
                  <div style={sectionContainer}>
                    <div style={sectionHeader} onClick={() => toggleSection('contactPersons')}>
                      <span>CONTACT PERSONS ({contacts.length})</span>
                      <div>
                        <span style={{ color: BLUE, marginRight: "10px", cursor: "pointer", fontSize: "18px" }} onClick={(e) => { e.stopPropagation(); navigate(`/vendors/${id}/edit`, { state: { initialTab: 1 } }); }} title="Add/Edit Contact Persons">+</span>
                        <span>{sections.contactPersons ? '⌃' : '⌄'}</span>
                      </div>
                    </div>
                    {sections.contactPersons && (
                      <div style={sectionContent}>
                        {contacts.length === 0 ? (
                          <div style={{ color: "#94a3b8", fontStyle: "italic" }}>No contact persons.</div>
                        ) : (
                          contacts.map((c, idx) => (
                            <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "15px" }}>
                              <div style={{ width: "30px", height: "30px", background: "#e2e8f0", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: "#94a3b8" }}>👤</div>
                              <div style={{ fontSize: "12px", lineHeight: "1.5" }}>
                                <div style={{ fontWeight: "600" }}>{c.salutation} {c.first_name} {c.last_name}</div>
                                <div style={{ color: TEXT_SECONDARY }}>{c.email}</div>
                                <div style={{ color: TEXT_SECONDARY }}>📞 {c.mobile || c.work_phone || "—"}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* BANK ACCOUNT DETAILS */}
                  <div style={sectionContainer}>
                    <div style={sectionHeader} onClick={() => toggleSection('bankAccounts')}>
                      <span>BANK ACCOUNT DETAILS</span>
                      <div>
                        <span style={{ color: BLUE, marginRight: "10px", cursor: "pointer" }}>+</span>
                        <span>{sections.bankAccounts ? '⌃' : '⌄'}</span>
                      </div>
                    </div>
                    {sections.bankAccounts && (
                      <div style={sectionContent}>
                        <div style={{ color: "#94a3b8", fontStyle: "italic", textAlign: "center", padding: "10px 0" }}>
                          No bank account added yet
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Right Area of Overview (Payables, Expenses) */}
                <div style={{ flex: 1, padding: "30px", overflowY: "auto" }}>
                  <div style={{ marginBottom: "30px" }}>
                    <div style={{ color: TEXT_SECONDARY, fontSize: "13px", marginBottom: "4px" }}>Payment due period</div>
                    <div style={{ fontWeight: "500", color: TEXT_PRIMARY }}>{vendor.payment_terms || "Due on Receipt"}</div>
                  </div>

                  <div style={{ marginBottom: "40px" }}>
                    <h3 style={{ fontSize: "16px", margin: "0 0 15px 0", color: TEXT_PRIMARY }}>Payables</h3>
                    <table style={{ width: "100%", borderCollapse: "collapse", background: BG_CARD, borderRadius: "8px", overflow: "hidden", border: `1px solid ${BORDER_COLOR}` }}>
                      <thead>
                        <tr style={{ background: "#f1f5f9", textAlign: "left", fontSize: "12px", color: TEXT_SECONDARY }}>
                          <th style={{ padding: "12px 20px", fontWeight: "600" }}>CURRENCY</th>
                          <th style={{ padding: "12px 20px", fontWeight: "600", textAlign: "right" }}>OUTSTANDING PAYABLES</th>
                          <th style={{ padding: "12px 20px", fontWeight: "600", textAlign: "right" }}>UNUSED CREDITS</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ padding: "15px 20px", fontSize: "14px", color: TEXT_PRIMARY }}>{vendor.currency || "INR"}- Indian Rupee</td>
                          <td style={{ padding: "15px 20px", fontSize: "14px", color: BLUE, textAlign: "right", fontWeight: "500" }}>₹{outstandingPayables.toFixed(2)}</td>
                          <td style={{ padding: "15px 20px", fontSize: "14px", color: TEXT_PRIMARY, textAlign: "right", fontWeight: "500" }}>₹0.00</td>
                        </tr>
                      </tbody>
                    </table>
                    <div style={{ marginTop: "15px", color: BLUE, cursor: "pointer", fontSize: "13px" }}>
                      View Opening Balance
                    </div>
                  </div>

                  <div style={{ marginBottom: "40px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "15px" }}>
                      <h3 style={{ fontSize: "16px", margin: 0, color: TEXT_PRIMARY }}>Expenses</h3>
                      <span style={{ fontSize: "12px", color: TEXT_SECONDARY }}>This chart is displayed in the organization's base currency.</span>
                    </div>
                    
                    {/* Mock Chart Area */}
                    <div style={{ borderBottom: `1px solid ${BORDER_COLOR}`, paddingBottom: "20px", marginBottom: "40px" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "15px", marginBottom: "20px", fontSize: "13px", color: BLUE }}>
                        <span style={{ cursor: "pointer" }}>Last 6 Months ▾</span>
                        <span style={{ cursor: "pointer" }}>Accrual ▾</span>
                      </div>
                      
                      <div style={{ height: "150px", display: "flex", alignItems: "flex-end", gap: "20px", position: "relative", paddingLeft: "40px" }}>
                        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: "10px", color: TEXT_SECONDARY, paddingBottom: "20px" }}>
                          <span>2.5 K</span>
                          <span>2 K</span>
                          <span>1.5 K</span>
                          <span>1 K</span>
                          <span>500</span>
                          <span>0</span>
                        </div>
                        {['Dec 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026'].map((m, i) => (
                          <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                            <div style={{ width: "24px", height: i === 4 ? "120px" : "0px", background: "#eab308" }}></div>
                            <div style={{ fontSize: "10px", color: TEXT_SECONDARY, marginTop: "10px", textAlign: "center", height: "20px" }}>
                              {m.split(' ')[0]}<br/>{m.split(' ')[1]}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Activity Timeline */}
                  <div style={{ paddingLeft: "20px" }}>
                    <div style={{ position: "relative", paddingLeft: "30px" }}>
                      <div style={{ position: "absolute", left: "11px", top: "10px", bottom: "-10px", width: "2px", background: "#cbd5e1" }}></div>
                      <div style={{ position: "relative", marginBottom: "30px" }}>
                        <div style={{ position: "absolute", left: "-31px", top: "5px", width: "24px", height: "24px", background: "#fff", border: `2px solid ${BORDER_COLOR}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", zIndex: 2 }}>
                          💬
                        </div>
                        <div style={{ position: "absolute", left: "-100px", top: "5px", fontSize: "12px", color: TEXT_PRIMARY, textAlign: "right" }}>
                          <div>08/06/2026</div>
                          <div style={{ color: TEXT_SECONDARY }}>12:12 PM</div>
                        </div>
                        <div style={{ background: BG_CARD, border: `1px solid ${BORDER_COLOR}`, borderRadius: "8px", padding: "15px", marginLeft: "10px" }}>
                          <div style={{ fontWeight: "500", marginBottom: "8px", color: TEXT_PRIMARY }}>added</div>
                          <div style={{ color: TEXT_SECONDARY, fontSize: "13px", marginBottom: "8px" }}>Opening Balance of amount ₹{outstandingPayables.toFixed(2)} created.</div>
                          <div style={{ fontSize: "12px", color: TEXT_SECONDARY }}>by <span style={{ fontWeight: "500", color: TEXT_PRIMARY }}>admin</span></div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </React.Fragment>
            )}

            {/* Statement Tab */}
            {activeTab === "Statement" && (
              <div className="print-reset" style={{ flex: 1, padding: "40px", background: "#f8fafc", overflowY: "auto" }}>
                {/* Statement Top Actions */}
                <div className="no-print" style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <select style={{ padding: "6px 12px", borderRadius: "4px", border: `1px solid ${BORDER_COLOR}` }}>
                      <option>This Month</option>
                    </select>
                    <select style={{ padding: "6px 12px", borderRadius: "4px", border: `1px solid ${BORDER_COLOR}` }}>
                      <option>Filter By: All</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => window.print()} title="Print Statement" style={{ ...actionBtn, display: "flex", alignItems: "center", justifyContent: "center", padding: "6px" }}><Printer size={16} color="#334155" /></button>
                    <button onClick={handleDownloadPDF} title="Download PDF" style={{ ...actionBtn, display: "flex", alignItems: "center", justifyContent: "center", padding: "6px" }}><FileText size={16} color="#334155" /></button>
                    <button onClick={() => {
                      if (vendor.email) {
                        window.location.href = `mailto:${vendor.email}?subject=Vendor Statement from ${vendor.display_name}`;
                        toast.success("Opening email client...");
                      } else {
                        toast.error("Vendor email not found");
                      }
                    }} style={{ ...actionBtn, background: BLUE, color: "#fff", border: "none" }}>✉ Send Email</button>
                  </div>
                </div>

                {/* Statement Document View */}
                <div className="printable-statement" style={{ background: "#fff", padding: "40px", border: `1px solid ${BORDER_COLOR}`, borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", maxWidth: "800px", margin: "0 auto" }}>
                  <div style={{ textAlign: "center", marginBottom: "40px" }}>
                    <h2 style={{ margin: "0 0 10px 0", fontSize: "20px" }}>Vendor Statement For {vendor.display_name}</h2>
                    <div style={{ color: TEXT_SECONDARY, fontSize: "14px" }}>From 01/06/2026 To 30/06/2026</div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px" }}>
                    <div>
                      <div style={{ fontWeight: "bold", marginBottom: "5px" }}>To</div>
                      <div style={{ color: BLUE, fontWeight: "500" }}>{vendor.display_name}</div>
                      {billing ? (
                        <div style={{ color: TEXT_SECONDARY, fontSize: "13px", marginTop: "5px", lineHeight: "1.5" }}>
                          {billing.address_line1 && <div>{billing.address_line1}</div>}
                          <div>{billing.city}, {billing.state}</div>
                          <div>{billing.pin_code} {billing.country}</div>
                        </div>
                      ) : (
                        <div style={{ color: TEXT_SECONDARY, fontSize: "13px" }}>No address details</div>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: "bold", fontSize: "16px", marginBottom: "5px" }}>TINPLATE COMPUTER TRAINING CENTER</div>
                      <div style={{ color: TEXT_SECONDARY, fontSize: "13px", lineHeight: "1.5" }}>
                        <div>Jharkhand</div>
                        <div>India</div>
                        <div>91-7091222699</div>
                        <div>utsargtiwary55@gmail.com</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", padding: "10px 0", marginBottom: "30px", fontSize: "18px", fontWeight: "bold", textAlign: "right" }}>
                    Statement of Accounts
                  </div>

                  <table style={{ width: "300px", marginLeft: "auto", borderCollapse: "collapse", marginBottom: "40px", fontSize: "14px" }}>
                    <thead>
                      <tr><th colSpan="2" style={{ background: "#f1f5f9", padding: "10px", textAlign: "left" }}>Account Summary</th></tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: "10px", borderBottom: `1px solid ${BORDER_COLOR}` }}>Opening Balance</td>
                        <td style={{ padding: "10px", borderBottom: `1px solid ${BORDER_COLOR}`, textAlign: "right" }}>₹{outstandingPayables.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "10px", borderBottom: `1px solid ${BORDER_COLOR}` }}>Invoiced Amount</td>
                        <td style={{ padding: "10px", borderBottom: `1px solid ${BORDER_COLOR}`, textAlign: "right" }}>₹0.00</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "10px", borderBottom: `1px solid ${BORDER_COLOR}` }}>Amount Paid</td>
                        <td style={{ padding: "10px", borderBottom: `1px solid ${BORDER_COLOR}`, textAlign: "right" }}>₹0.00</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "10px", fontWeight: "bold" }}>Balance Due</td>
                        <td style={{ padding: "10px", fontWeight: "bold", textAlign: "right" }}>₹{outstandingPayables.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                  
                  <div style={{ textAlign: "center", color: TEXT_SECONDARY, padding: "20px" }}>
                    No transactions in this period.
                  </div>
                </div>
              </div>
            )}

            {/* Other Tabs Placeholders */}
            {activeTab === "Comments" && <div style={{ textAlign: "center", padding: "60px", color: TEXT_SECONDARY, width: "100%" }}>Comments feature coming soon.</div>}
            {activeTab === "Transactions" && <div style={{ textAlign: "center", padding: "60px", color: TEXT_SECONDARY, width: "100%" }}>Transactions feature coming soon.</div>}
            {activeTab === "Mails" && <div style={{ textAlign: "center", padding: "60px", color: TEXT_SECONDARY, width: "100%" }}>Mails feature coming soon.</div>}

          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: TEXT_SECONDARY }}>
          Select a vendor to view details
        </div>
      )}

        {/* Address Edit Popover/Modal */}
        {editAddressType && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: '8px', width: '450px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <div style={{ padding: '15px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#1e293b' }}>{editAddressType === 'billing' ? 'Billing Address' : 'Shipping Address'}</h3>
                <button onClick={() => setEditAddressType(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#64748b' }}>✕</button>
              </div>
              <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
                <div>
                  <label style={labelStyle}>Attention</label>
                  <input value={editAddressForm.attention || ''} onChange={(e) => setEditAddressForm({ ...editAddressForm, attention: e.target.value })} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                </div>
                <div>
                  <label style={labelStyle}>Country/Region</label>
                  <input value={editAddressForm.country || ''} onChange={(e) => setEditAddressForm({ ...editAddressForm, country: e.target.value })} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                </div>
                <div>
                  <label style={labelStyle}>Address</label>
                  <textarea rows="2" value={editAddressForm.address_line1 || ''} onChange={(e) => setEditAddressForm({ ...editAddressForm, address_line1: e.target.value })} style={{...inputStyle, resize: 'vertical'}} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                  <textarea rows="2" value={editAddressForm.address_line2 || ''} onChange={(e) => setEditAddressForm({ ...editAddressForm, address_line2: e.target.value })} style={{...inputStyle, resize: 'vertical'}} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                </div>
                <div>
                  <label style={labelStyle}>City</label>
                  <input value={editAddressForm.city || ''} onChange={(e) => setEditAddressForm({ ...editAddressForm, city: e.target.value })} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>State</label>
                    <input value={editAddressForm.state || ''} onChange={(e) => setEditAddressForm({ ...editAddressForm, state: e.target.value })} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Pin Code</label>
                    <input value={editAddressForm.pin_code || ''} onChange={(e) => setEditAddressForm({ ...editAddressForm, pin_code: e.target.value })} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Phone</label>
                    <input value={editAddressForm.phone || ''} onChange={(e) => setEditAddressForm({ ...editAddressForm, phone: e.target.value })} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Fax</label>
                    <input value={editAddressForm.fax || ''} onChange={(e) => setEditAddressForm({ ...editAddressForm, fax: e.target.value })} style={inputStyle} onFocus={e => e.target.style.borderColor = BLUE} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                  </div>
                </div>
              </div>
              <div style={{ padding: '15px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={() => setEditAddressType(null)} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', color: '#334155', fontWeight: '500' }}>Cancel</button>
                <button onClick={handleSaveAddress} disabled={savingAddress} style={{ padding: '8px 16px', background: BLUE, border: 'none', borderRadius: '4px', cursor: savingAddress ? 'not-allowed' : 'pointer', color: '#fff', fontWeight: '500', opacity: savingAddress ? 0.7 : 1 }}>
                  {savingAddress ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Styles
const actionBtn = { padding: "6px 12px", background: BG_CARD, border: `1px solid ${BORDER_COLOR}`, borderRadius: "4px", cursor: "pointer", color: TEXT_PRIMARY, fontSize: "13px" };
const primaryBtn = { background: BLUE, color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "500" };

const sectionContainer = { borderBottom: `1px solid ${BORDER_COLOR}` };
const sectionHeader = { padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontSize: "12px", fontWeight: "600", color: TEXT_SECONDARY, letterSpacing: "0.05em" };
const sectionContent = { padding: "0 20px 20px 20px", fontSize: "13px" };

export default VendorDetail;
