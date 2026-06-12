import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "./api";
import { TableSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";

function Bills() {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [billsRes, vendorsRes] = await Promise.all([
        apiRequest("/bills"),
        apiRequest("/vendors"),
      ]);
      setBills(billsRes?.bills || []);
      setVendors(vendorsRes?.vendors || []);
    } catch (err) {
      toast.error("Failed to load bills data");
    } finally {
      setLoading(false);
    }
  };

  const getVendorName = (vendorId) => {
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor ? vendor.display_name : "Unknown Vendor";
  };

  const deleteBill = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this bill?")) return;
    try {
      await apiRequest(`/bills/${id}`, { method: "DELETE" });
      setBills(bills.filter(b => b.id !== id));
      toast.success("Bill deleted");
    } catch (err) {
      toast.error("Failed to delete bill");
    }
  };

  const filteredBills = bills.filter(b => {
    const vendorName = getVendorName(b.vendor_id).toLowerCase();
    const matchSearch =
      b.bill_number.toLowerCase().includes(search.toLowerCase()) ||
      vendorName.includes(search.toLowerCase());
    
    if (statusFilter === "all") return matchSearch;
    return matchSearch && b.status === statusFilter;
  });

  const getStatusBadge = (status) => {
    switch(status) {
      case 'draft': return <span style={{ ...badgeStyle, background: "#e2e8f0", color: "#475569" }}>Draft</span>;
      case 'open': return <span style={{ ...badgeStyle, background: "#dbeafe", color: "#1e40af" }}>Open</span>;
      case 'paid': return <span style={{ ...badgeStyle, background: "#dcfce7", color: "#166534" }}>Paid</span>;
      default: return <span style={badgeStyle}>{status}</span>;
    }
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1100px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Bills</h2>
        <button onClick={() => navigate("/bills/new")} style={primaryBtn}>
          + New Bill
        </button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
        <input
          type="text"
          placeholder="Search by bill # or vendor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: "300px" }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: "150px" }}>
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="open">Open</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {loading ? (
        <TableSkeleton columns={8} rows={5} />
      ) : filteredBills.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px", color: "gray", background: "#f9fafb", borderRadius: "8px" }}>
          <p>No bills found.</p>
          <button onClick={() => navigate("/bills/new")} style={secondaryBtn}>Create Your First Bill</button>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Bill #</th>
              <th style={thStyle}>Vendor</th>
              <th style={thStyle}>Due Date</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Balance Due</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBills.map((bill) => (
              <tr
                key={bill.id}
                onClick={() => navigate(`/bills/${bill.id}`)}
                style={{ borderBottom: "1px solid #e2e8f0", cursor: "pointer", transition: "background 0.2s" }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#f8fafc")}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <td style={tdStyle}>{new Date(bill.bill_date).toLocaleDateString()}</td>
                <td style={tdStyle}><span style={{ color: "#4a90e2", fontWeight: "500" }}>{bill.bill_number}</span></td>
                <td style={tdStyle}>{getVendorName(bill.vendor_id)}</td>
                <td style={tdStyle}>{bill.due_date ? new Date(bill.due_date).toLocaleDateString() : '—'}</td>
                <td style={tdStyle}>₹{parseFloat(bill.total_amount).toFixed(2)}</td>
                <td style={tdStyle}>₹{parseFloat(bill.balance_due).toFixed(2)}</td>
                <td style={tdStyle}>{getStatusBadge(bill.status)}</td>
                <td style={tdStyle}>
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/bills/${bill.id}/edit`); }} style={actionBtn}>Edit</button>
                  <button onClick={(e) => deleteBill(bill.id, e)} style={{ ...actionBtn, color: "red", marginLeft: "8px" }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle = { padding: "12px", borderBottom: "2px solid #cbd5e1" };
const tdStyle = { padding: "12px" };
const primaryBtn = { padding: "10px 20px", background: "#4a90e2", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" };
const secondaryBtn = { padding: "10px 20px", background: "#f1f5f9", color: "#333", border: "1px solid #ccc", borderRadius: "5px", cursor: "pointer" };
const actionBtn = { padding: "4px 8px", background: "none", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer" };
const inputStyle = { padding: "8px", borderRadius: "4px", border: "1px solid #ccc" };
const badgeStyle = { padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" };

export default Bills;
