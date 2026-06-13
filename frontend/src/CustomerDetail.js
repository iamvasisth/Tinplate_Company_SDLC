/**
 * CustomerDetail.js – Customer detail view with Overview tab,
 * addresses, contact persons, and edit button.
 * Dependencies: apiRequest, react‑router‑dom
 */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { DetailSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";
import CustomerStatement from "./CustomerStatement";

function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        const res = await apiRequest(`/customers/${id}`);
        if (res) {
          setCustomer(res.customer);
          setAddresses(res.addresses || []);
          setContacts(res.contacts || []);
        }
      } catch (err) {
        toast.error("Failed to load customer");
      } finally {
        setLoading(false);
      }
    };
    fetchCustomer();
  }, [id]);

  const [activeTab, setActiveTab] = useState("Overview");

  if (loading) return (
    <div style={{ padding: "30px", maxWidth: "1200px", margin: "auto" }}>
      <DetailSkeleton />
    </div>
  );
  if (!customer) return <p>Customer not found.</p>;

  const billing = addresses.find(a => a.type === "billing");
  const shipping = addresses.find(a => a.type === "shipping");

  return (
    <div className="customer-detail-container" style={{ padding: "30px", maxWidth: "1200px", margin: "auto" }}>
      <style>{`
        @media (max-width: 768px) {
          .customer-detail-container { padding: 15px !important; }
          .customer-detail-grid { grid-template-columns: 1fr !important; gap: 15px !important; }
          .customer-detail-header { flex-direction: column; align-items: flex-start !important; gap: 10px; }
          .customer-detail-tabs { overflow-x: auto; white-space: nowrap; padding-bottom: 5px; }
        }
      `}</style>
      {/* Header */}
      <div className="customer-detail-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h1 style={{ margin: 0 }}>{customer.display_name || `${customer.first_name} ${customer.last_name}`}</h1>
        <button
          onClick={() => navigate(`/customers/${id}/edit`)}
          style={{ padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "500" }}
        >
          Edit
        </button>
      </div>

      {/* Tabs */}
      <div className="customer-detail-tabs" style={{ display: "flex", borderBottom: "2px solid #e2e8f0", marginBottom: "30px", gap: "20px" }}>
        {["Overview", "Statement"].map(tab => (
          <div 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ 
              padding: "10px 0", 
              borderBottom: activeTab === tab ? "3px solid #4a90e2" : "3px solid transparent", 
              fontWeight: activeTab === tab ? "bold" : "normal", 
              color: activeTab === tab ? "#4a90e2" : "#64748b", 
              cursor: "pointer" 
            }}
          >
            {tab}
          </div>
        ))}
      </div>

      {activeTab === "Overview" && (
        <div className="customer-detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
          {/* Left column – Addresses */}
        <div>
          <h3 style={{ marginBottom: "15px" }}>Billing Address</h3>
          <div style={cardStyle}>
            {billing ? (
              <div>
                <p><strong>{billing.attention}</strong></p>
                <p>{billing.address_line1}</p>
                <p>{billing.address_line2}</p>
                <p>{billing.city}, {billing.state} {billing.pin_code}</p>
                <p>{billing.country}</p>
                <p>Phone: {billing.phone}</p>
                {billing.fax && <p>Fax: {billing.fax}</p>}
              </div>
            ) : (
              <p style={{ color: "gray" }}>No billing address yet. <button onClick={() => navigate(`/customers/${id}/edit`)} style={{ background: "none", border: "none", color: "#4a90e2", cursor: "pointer", textDecoration: "underline" }}>Add Address</button></p>
            )}
          </div>

          <h3 style={{ marginTop: "30px", marginBottom: "15px" }}>Shipping Address</h3>
          <div style={cardStyle}>
            {shipping ? (
              <div>
                <p><strong>{shipping.attention}</strong></p>
                <p>{shipping.address_line1}</p>
                <p>{shipping.address_line2}</p>
                <p>{shipping.city}, {shipping.state} {shipping.pin_code}</p>
                <p>{shipping.country}</p>
                <p>Phone: {shipping.phone}</p>
                {shipping.fax && <p>Fax: {shipping.fax}</p>}
              </div>
            ) : (
              <p style={{ color: "gray" }}>No shipping address. {!shipping && billing && <button onClick={() => navigate(`/customers/${id}/edit`)} style={{ background: "none", border: "none", color: "#4a90e2", cursor: "pointer", textDecoration: "underline" }}>Copy from Billing</button>}</p>
            )}
          </div>
        </div>

        {/* Right column – Contact Persons & Other Details */}
        <div>
          <h3 style={{ marginBottom: "15px" }}>Contact Persons</h3>
          <div style={cardStyle}>
            {contacts.length === 0 ? (
              <p style={{ color: "gray" }}>No contact persons.</p>
            ) : (
              contacts.map((p, idx) => (
                <div key={idx} style={{ marginBottom: "15px" }}>
                  <p><strong>{p.salutation} {p.first_name} {p.last_name}</strong></p>
                  <p>Email: {p.email}</p>
                  <p>Work Phone: {p.work_phone}</p>
                  <p>Mobile: {p.mobile}</p>
                </div>
              ))
            )}
          </div>

          <h3 style={{ marginTop: "30px", marginBottom: "15px" }}>Other Details</h3>
          <div style={cardStyle}>
            <p><strong>Customer Type:</strong> {customer.customer_type}</p>
            <p><strong>Sub‑Type:</strong> {customer.customer_sub_type || "—"}</p>
            <p><strong>PAN:</strong> {customer.pan || "—"}</p>
            <p><strong>Currency:</strong> {customer.currency}</p>
            <p><strong>Opening Balance:</strong> ₹{customer.opening_balance}</p>
            <p><strong>Payment Terms:</strong> {customer.payment_terms || "—"}</p>
            <p><strong>Enable Portal:</strong> {customer.enable_portal ? "Yes" : "No"}</p>
            {customer.enable_portal && <p><strong>Portal Language:</strong> {customer.portal_language}</p>}
            <p><strong>Remarks:</strong> {customer.remarks || "—"}</p>
          </div>
        </div>
        </div>
      )}

      {activeTab === "Statement" && (
        <CustomerStatement customerId={id} />
      )}
    </div>
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "20px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};

export default CustomerDetail;