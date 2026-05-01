/**
 * Dashboard.js – User dashboard with task manager & profile info
 * Dependencies: apiRequest, AuthContext, react-router-dom
 */
import React, { useEffect, useState } from "react";
import { apiRequest } from "./api";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Load tasks from backend
  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await apiRequest("/tasks");
      setTasks(res?.tasks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // ✅ Logout – correct endpoint
  const handleLogout = async () => {
    try {
      await apiRequest("/logout", { method: "POST" });
    } catch (err) {
      console.error(err);
    } finally {
      setUser(null);           // clear global state
      navigate("/");           // redirect to login
    }
  };

  // Add / Delete / Edit task functions (unchanged)
  const addTask = async () => {
    if (!title.trim()) return;
    try {
      setLoading(true);
      await apiRequest("/tasks", {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      setTitle("");
      loadTasks();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (id) => {
    try {
      setLoading(true);
      await apiRequest(`/tasks/${id}`, { method: "DELETE" });
      loadTasks();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (task) => {
    setEditingId(task.id);
    setEditText(task.title);
  };

  const saveEdit = async (id) => {
    try {
      setLoading(true);
      await apiRequest(`/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify({ title: editText }),
      });
      setEditingId(null);
      setEditText("");
      loadTasks();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") addTask();
  };

  return (
    <div style={{ padding: "30px", maxWidth: "600px", margin: "auto" }}>
      {/* ---- USER PROFILE SECTION ---- */}
      {user && (
        <div style={profileStyle}>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Business Type:</strong> {user.business_type || "Not set"}</p>
        </div>
      )}

      {/* Header + Logout */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ margin: 0 }}>Task Manager</h2>
        <button onClick={handleLogout} style={logoutBtn}>
          Logout
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <p style={{ color: "gray", marginBottom: "10px" }}>Processing...</p>
      )}

      {/* Add Task */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Enter task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          style={inputStyle}
        />
        <button onClick={addTask} style={btnStyle}>
          Add
        </button>
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <p style={{ color: "gray" }}>No tasks yet</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {tasks.map((task) => (
            <li key={task.id} style={taskStyle}>
              {editingId === task.id ? (
                <>
                  <input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    style={inputStyle}
                  />
                  <button onClick={() => saveEdit(task.id)} style={btnStyle}>
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} style={cancelBtn}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span>{task.title}</span>
                  <div>
                    <button onClick={() => startEdit(task)} style={editBtn}>
                      Edit
                    </button>
                    <button onClick={() => deleteTask(task.id)} style={deleteBtn}>
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---- Styles ----
const inputStyle = {
  padding: "8px",
  borderRadius: "5px",
  border: "1px solid #ccc",
  flex: 1,
};

const btnStyle = {
  padding: "8px 12px",
  background: "#4a90e2",
  color: "#fff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};

const editBtn = {
  background: "orange",
  color: "#fff",
  border: "none",
  padding: "5px 10px",
  borderRadius: "5px",
  marginRight: "5px",
  cursor: "pointer",
};

const deleteBtn = {
  background: "red",
  color: "#fff",
  border: "none",
  padding: "5px 10px",
  borderRadius: "5px",
  cursor: "pointer",
};

const cancelBtn = {
  background: "gray",
  color: "#fff",
  border: "none",
  padding: "5px 10px",
  borderRadius: "5px",
  marginLeft: "5px",
  cursor: "pointer",
};

const logoutBtn = {
  padding: "8px 16px",
  background: "#e74c3c",
  color: "#fff",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};

const taskStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px",
  borderBottom: "1px solid #eee",
};

const profileStyle = {
  background: "#f8f9fa",
  padding: "12px",
  borderRadius: "8px",
  marginBottom: "20px",
};

export default Dashboard;