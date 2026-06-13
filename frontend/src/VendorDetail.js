import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { DetailSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function VendorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchVendor = async () => {
    try {
      const res = await apiRequest(`/vendors/${id}`);
      if (res?.vendor) setVendor(res.vendor);
      else { toast.error("Vendor not found"); navigate("/vendors"); }
    } catch (err) {
      toast.error("Failed to load vendor");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ padding: "30px", maxWidth: "1200px", margin: "auto" }}>
      <DetailSkeleton />
    </div>
  );
  if (!vendor) return null;

  return (
    <div style={{ display: "flex", height: "100%", background: "#f9fafb" }}>
      {/* Left panel: Overview */}
      <div style={{ width: "350px", background: "#fff", borderRight: "1px solid #e2e8f0", padding: "20px", display: "flex", flexDirection: "column" }}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#e2e8f0", margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", color: "#64748b", fontWeight: "bold" }}>
            {vendor.display_name.charAt(0).toUpperCase()}
          </div>
          <h2 style={{ margin: "0 0 5px 0", fontSize: "20px" }}>{vendor.display_name}</h2>
          <p style={{ margin: 0, color: "#64748b" }}>{vendor.company_name}</p>
          <div style={{ marginTop: "10px" }}>
            {vendor.status === "active" ? (
              <span style={activeBadge}>Active</span>
            ) : (
              <span style={inactiveBadge}>Inactive</span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "30px", borderBottom: "1px solid #e2e8f0", paddingBottom: "20px" }}>
          <button onClick={() => navigate(`/vendors/${id}/edit`)} style={actionBtn}>Edit</button>
          <button onClick={() => navigate("/bills/new?vendor_id=" + id)} style={{ ...actionBtn, background: "#4a90e2", color: "#fff", border: "none" }}>+ New Bill</button>
        </div>

        <div style={{ fontSize: "14px", color: "#333", display: "flex", flexDirection: "column", gap: "15px" }}>
          <div>
            <div style={{ fontWeight: "600", color: "#64748b", marginBottom: "4px" }}>Contact Information</div>
            {vendor.email && <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>📧 {vendor.email}</div>}
            {vendor.phone && <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>📞 {vendor.phone}</div>}
            {!vendor.email && !vendor.phone && <div style={{ color: "#999", fontStyle: "italic" }}>No contact info</div>}
          </div>

          <div>
            <div style={{ fontWeight: "600", color: "#64748b", marginBottom: "4px" }}>Tax & Terms</div>
            {vendor.gstin && <div>GSTIN: {vendor.gstin}</div>}
            {vendor.pan && <div>PAN: {vendor.pan}</div>}
            {vendor.payment_terms && <div>Terms: {vendor.payment_terms}</div>}
          </div>

          <div>
            <div style={{ fontWeight: "600", color: "#64748b", marginBottom: "4px" }}>Opening Balance</div>
            <div style={{ fontWeight: "bold" }}>₹{parseFloat(vendor.opening_balance || 0).toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Right panel: Details & Transactions */}
      <div style={{ flex: 1, padding: "30px", overflowY: "auto" }}>
        
        <div style={{ display: "flex", gap: "20px", marginBottom: "30px" }}>
          <div style={{ flex: 1, background: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", color: "#475569" }}>Billing Address</h3>
            <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "#333", fontSize: "14px" }}>
              {vendor.billing_address || <span style={{ color: "#999", fontStyle: "italic" }}>Not provided</span>}
            </p>
          </div>
          <div style={{ flex: 1, background: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", color: "#475569" }}>Shipping Address</h3>
            <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "#333", fontSize: "14px" }}>
              {vendor.shipping_address || <span style={{ color: "#999", fontStyle: "italic" }}>Not provided</span>}
            </p>
          </div>
        </div>

        <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "30px" }}>
          <h3 style={{ margin: "0 0 10px 0", fontSize: "16px", color: "#475569" }}>Notes</h3>
          <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "#333", fontSize: "14px" }}>
            {vendor.notes || <span style={{ color: "#999", fontStyle: "italic" }}>No notes added.</span>}
          </p>
        </div>

        <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 15px 0", fontSize: "16px", color: "#475569" }}>Recent Transactions</h3>
          <div style={{ textAlign: "center", padding: "30px", color: "#94a3b8", background: "#f8fafc", borderRadius: "6px" }}>
            <p style={{ margin: 0 }}>No recent bills or expenses for this vendor.</p>
            <p style={{ margin: "5px 0 0", fontSize: "13px" }}>(Transactions module integration coming soon)</p>
          </div>
        </div>

      </div>
    </div>
  );
}

const activeBadge = { background: "#dcfce7", color: "#166534", padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" };
const inactiveBadge = { background: "#f1f5f9", color: "#475569", padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" };
const actionBtn = { padding: "8px 16px", background: "#fff", color: "#333", border: "1px solid #cbd5e1", borderRadius: "5px", cursor: "pointer", fontWeight: "500", fontSize: "13px" };

export default VendorDetail;
