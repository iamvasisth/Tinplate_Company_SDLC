import React, { useEffect, useState } from "react";
import { apiRequest } from "./api";
import toast from "react-hot-toast";

function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Load tasks
  const loadTasks = async () => {
    try {
      setLoading(true);

      const res = await apiRequest("/tasks");
      if (res) setTasks(res.tasks);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // ✅ Add task
  const addTask = async () => {
    if (!title) return;

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

  // ✅ Delete task
  const deleteTask = async (id) => {
    try {
      setLoading(true);

      await apiRequest(`/tasks/${id}`, {
        method: "DELETE",
      });

      loadTasks();

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Start editing
  const startEdit = (task) => {
    setEditingId(task.id);
    setEditText(task.title);
  };

  // ✅ Save edit
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

  return (
    <div style={{ padding: "30px", maxWidth: "600px", margin: "auto" }}>
      <h2>Task Manager</h2>

      {/* ✅ LOADING UI */}
      {loading && (
        <p style={{ color: "gray", marginBottom: "10px" }}>
          Processing...
        </p>
      )}

      {/* Add Task */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Enter task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
        />
        <button onClick={addTask} style={btnStyle}>
          Add
        </button>
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <p>No tasks yet</p>
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
                </>
              ) : (
                <>
                  <span>{task.title}</span>
                  <div>
                    <button
                      onClick={() => startEdit(task)}
                      style={editBtn}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      style={deleteBtn}
                    >
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

// 🎨 Styles
const inputStyle = {
  padding: "8px",
  borderRadius: "5px",
  border: "1px solid #ccc",
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

const taskStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px",
  borderBottom: "1px solid #eee",
};

export default Dashboard;