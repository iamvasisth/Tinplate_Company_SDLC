import React, { useState, useEffect } from "react";
import { apiRequest } from "./api";
import { TableSkeleton } from "./components/skeletons";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";
import { canAccess, MODULES, ACTIONS } from "./utils/permissions";

function UsersRoles() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await apiRequest("/users");
      setUsers(res?.users || []);
    } catch (err) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await apiRequest(`/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role: newRole })
      });
      toast.success("Role updated successfully!");
      fetchUsers();
    } catch (err) {
      toast.error("Failed to update role");
    }
  };

  return (
    <div style={{ padding: "30px", maxWidth: "1200px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Users & Roles</h2>
        <button style={primaryBtn} onClick={() => alert("Multi-user invitation system is under development!")}>+ Invite User</button>
      </div>

      <div style={{ background: "#f8fafc", padding: "15px", borderRadius: "6px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
        <h4 style={{ margin: "0 0 10px 0", color: "#334155" }}>Permissions Overview:</h4>
        <ul style={{ margin: 0, paddingLeft: "20px", color: "#475569", fontSize: "14px", lineHeight: "1.6" }}>
          <li><strong>Admin:</strong> Full access to all modules and settings.</li>
          <li><strong>Accountant:</strong> Access to Accounting, Reports, Taxes, and Banking modules.</li>
          <li><strong>Staff:</strong> Access to Sales and Purchase entries (Invoices, Bills, Customers, Vendors).</li>
          <li><strong>Viewer:</strong> Read-only access across the application.</li>
        </ul>
      </div>

      <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        {loading ? (
          <TableSkeleton columns={5} rows={3} />
        ) : users.length === 0 ? (
          <p style={{ color: "#64748b" }}>No users found.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Organization Name</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Created Date</th>
                <th style={thStyle}>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{...tdStyle, fontWeight: "500", color: "#1e293b"}}>{u.email}</td>
                  <td style={tdStyle}>{u.organization_name || "—"}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: "4px 8px", background: u.status === 'active' ? "#dcfce7" : "#f1f5f9", color: u.status === 'active' ? "#166534" : "#475569", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
                      {u.status}
                    </span>
                  </td>
                  <td style={tdStyle}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td style={tdStyle}>
                    <select 
                      value={u.role || "Admin"} 
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      style={{ padding: "6px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                      disabled={!canAccess(user?.role, MODULES.USERS, ACTIONS.MANAGE)}
                    >
                      <option value="Admin">Admin</option>
                      <option value="Accountant">Accountant</option>
                      <option value="Staff">Staff</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const thStyle = { padding: "12px 10px", color: "#475569", fontWeight: "600" };
const tdStyle = { padding: "12px 10px", color: "#334155" };
const primaryBtn = { padding: "8px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "500" };

export default UsersRoles;
