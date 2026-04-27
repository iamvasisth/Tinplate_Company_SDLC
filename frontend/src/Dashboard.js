import React, { useEffect, useState } from "react";
import { apiRequest } from "./api";

function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");

  // ✅ Fetch tasks
  const loadTasks = async () => {
    try {
      const res = await apiRequest("/tasks");
      if (res) setTasks(res.tasks);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // ✅ Add task
  const addTask = async () => {
    if (!title) return;

    try {
      await apiRequest("/tasks", {
        method: "POST",
        body: JSON.stringify({ title }),
      });

      setTitle("");
      loadTasks(); // refresh
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ Delete task
  const deleteTask = async (id) => {
    try {
      await apiRequest(`/tasks/${id}`, {
        method: "DELETE",
      });

      loadTasks();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Task Manager</h2>

      {/* Add Task */}
      <input
        type="text"
        placeholder="Enter task"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <button onClick={addTask}>Add</button>

      {/* Task List */}
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            {task.title}
            <button
              onClick={() => deleteTask(task.id)}
              style={{ marginLeft: "10px" }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Dashboard;