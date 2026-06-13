import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { DetailSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function BillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [items, setItems] = useState([]);
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillData();
  }, [id]);

  const fetchBillData = async () => {
    try {
      const res = await apiRequest(`/bills/${id}`);
      if (res?.bill) {
        setBill(res.bill);
        setItems(res.items || []);
        
        // Fetch vendor details
        if (res.bill.vendor_id) {
          try {
            const vRes = await apiRequest(`/vendors/${res.bill.vendor_id}`);
            if (vRes?.vendor) setVendor(vRes.vendor);
          } catch (e) {
            console.error("Failed to load vendor for bill", e);
          }
        }
      } else {
        toast.error("Bill not found");
        navigate("/bills");
      }
    } catch (err) {
      toast.error("Failed to load bill details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ padding: "30px", maxWidth: "1200px", margin: "auto" }}>
      <DetailSkeleton />
    </div>
  );
  if (!bill) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f9fafb" }}>
      {/* Action Bar */}
      <div style={{ display: "flex", gap: "10px", padding: "15px 30px", background: "#fff", borderBottom: "1px solid #e2e8f0", alignItems: "center" }}>
        <h2 style={{ margin: "0 20px 0 0", fontSize: "18px" }}>{bill.bill_number}</h2>
        
        <button onClick={() => navigate(`/bills/${id}/edit`)} style={actionBtn}>✎ Edit</button>
        <button onClick={() => window.print()} style={actionBtn}>📄 PDF/Print</button>
        
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "14px", color: "#64748b" }}>Status:</span>
          {bill.status === 'draft' && <span style={{ ...badgeStyle, background: "#e2e8f0", color: "#475569" }}>Draft</span>}
          {bill.status === 'open' && <span style={{ ...badgeStyle, background: "#dbeafe", color: "#1e40af" }}>Open</span>}
          {bill.status === 'paid' && <span style={{ ...badgeStyle, background: "#dcfce7", color: "#166534" }}>Paid</span>}
        </div>
      </div>

      {/* Bill Content */}
      <div style={{ padding: "40px", overflowY: "auto", flex: 1 }}>
        <div style={{ maxWidth: "900px", margin: "auto", background: "#fff", padding: "40px", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)" }}>
          
          {/* Header Info */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px", paddingBottom: "30px", borderBottom: "2px solid #f1f5f9" }}>
            <div>
              <h1 style={{ margin: "0 0 5px 0", color: "#0f172a", fontSize: "24px" }}>BILL</h1>
              <div style={{ fontSize: "14px", color: "#64748b" }}>#{bill.bill_number}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "4px" }}>Balance Due</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ef4444" }}>₹{parseFloat(bill.balance_due).toFixed(2)}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "50px", marginBottom: "40px" }}>
            {/* Vendor Info */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Vendor Details</div>
              {vendor ? (
                <div>
                  <div style={{ fontWeight: "bold", fontSize: "16px", color: "#333", marginBottom: "4px" }}>{vendor.display_name}</div>
                  {vendor.company_name && <div style={{ fontSize: "14px", color: "#64748b" }}>{vendor.company_name}</div>}
                  {vendor.billing_address && <div style={{ fontSize: "14px", color: "#64748b", marginTop: "4px", whiteSpace: "pre-wrap" }}>{vendor.billing_address}</div>}
                  {vendor.gstin && <div style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>GSTIN: {vendor.gstin}</div>}
                </div>
              ) : (
                <div style={{ color: "#94a3b8" }}>Loading vendor...</div>
              )}
            </div>

            {/* Bill Info */}
            <div style={{ width: "250px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "14px" }}>
                <span style={{ color: "#64748b" }}>Bill Date:</span>
                <span style={{ fontWeight: "500", color: "#333" }}>{bill.bill_date ? new Date(bill.bill_date).toLocaleDateString() : "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "#64748b" }}>Due Date:</span>
                <span style={{ fontWeight: "500", color: "#333" }}>{bill.due_date ? new Date(bill.due_date).toLocaleDateString() : "—"}</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "30px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #cbd5e1" }}>
                <th style={{ ...thStyle, textAlign: "left" }}>Item & Description</th>
                <th style={{ ...thStyle, textAlign: "center", width: "80px" }}>HSN</th>
                <th style={{ ...thStyle, textAlign: "right", width: "80px" }}>Qty</th>
                <th style={{ ...thStyle, textAlign: "right", width: "100px" }}>Rate</th>
                <th style={{ ...thStyle, textAlign: "right", width: "80px" }}>Tax %</th>
                <th style={{ ...thStyle, textAlign: "right", width: "120px" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ ...tdStyle, padding: "15px 10px" }}>
                    <div style={{ fontWeight: "500", color: "#333" }}>{item.item_name || "—"}</div>
                    {item.description && <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>{item.description}</div>}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center", color: "#64748b" }}>{item.hsn_code || "—"}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{parseFloat(item.quantity).toFixed(2)} {item.unit || ""}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>₹{parseFloat(item.unit_price).toFixed(2)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: "#64748b" }}>{parseFloat(item.tax_rate) > 0 ? `${item.tax_rate}%` : "—"}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: "500" }}>₹{parseFloat(item.total).toFixed(2)}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>No items found</td></tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "40px" }}>
            <div style={{ width: "300px" }}>
              <div style={totalsRow}>
                <span style={{ color: "#64748b" }}>Subtotal</span>
                <span>₹{parseFloat(bill.subtotal).toFixed(2)}</span>
              </div>
              <div style={totalsRow}>
                <span style={{ color: "#64748b" }}>Discount</span>
                <span style={{ color: "#ef4444" }}>-₹{parseFloat(bill.discount_amount).toFixed(2)}</span>
              </div>
              <div style={totalsRow}>
                <span style={{ color: "#64748b" }}>Tax Amount</span>
                <span>₹{parseFloat(bill.tax_amount).toFixed(2)}</span>
              </div>
              <div style={{ ...totalsRow, borderTop: "2px solid #e2e8f0", paddingTop: "15px", marginTop: "15px" }}>
                <span style={{ fontWeight: "bold", fontSize: "16px" }}>Total</span>
                <span style={{ fontWeight: "bold", fontSize: "16px" }}>₹{parseFloat(bill.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {bill.notes && (
            <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Notes</div>
              <div style={{ fontSize: "14px", color: "#333", whiteSpace: "pre-wrap" }}>{bill.notes}</div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

const actionBtn = { padding: "8px 16px", background: "#fff", color: "#333", border: "1px solid #cbd5e1", borderRadius: "5px", cursor: "pointer", fontWeight: "500", fontSize: "13px" };
const badgeStyle = { padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase" };
const thStyle = { padding: "12px 10px", color: "#475569", fontSize: "13px", fontWeight: "600" };
const tdStyle = { padding: "15px 10px", fontSize: "14px" };
const totalsRow = { display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "14px" };

export default BillDetail;
