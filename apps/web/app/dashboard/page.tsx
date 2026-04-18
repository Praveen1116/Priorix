"use client";

import { useEffect, useState } from "react";

type Task = {
  id: string;
  title: string;
  link: string | null;
  priority: string;
  status: "PENDING" | "COMPLETED" | "MISSED" | "AWAITING_CONFIRMATION";
  dateTime: string;
  timeZone: string;
};

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("P1");
  const [dateTime, setDateTime] = useState("");
  const [link, setLink] = useState("");
  const [timeZone, setTimeZone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : "";

  const timeZones =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : [timeZone];

  const formatTaskDate = (task: Task) => {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: task.timeZone,
    }).format(new Date(task.dateTime));
  };

  const getEffectiveStatus = (task: Task) => {
    if (task.status === "PENDING" && new Date(task.dateTime) < new Date()) {
      return "MISSED";
    }

    return task.status;
  };

  const getStatusMessage = (task: Task) => {
    const effectiveStatus = getEffectiveStatus(task);

    switch (effectiveStatus) {
      case "COMPLETED":
        return "Completed successfully.";
      case "MISSED":
        return "The scheduled time has passed and this task was not marked as completed.";
      case "AWAITING_CONFIRMATION":
        return "A reminder was sent and this task is awaiting confirmation.";
      case "PENDING":
      default:
        return "This task is scheduled and awaiting completion.";
    }
  };

  const getStatusStyles = (task: Task) => {
    const effectiveStatus = getEffectiveStatus(task);

    switch (effectiveStatus) {
      case "COMPLETED":
        return "text-green-700";
      case "MISSED":
        return "text-red-600";
      case "AWAITING_CONFIRMATION":
        return "text-yellow-700";
      case "PENDING":
      default:
        return "text-gray-600";
    }
  };

  const fetchTasks = async () => {
    const res = await fetch("http://localhost:4000/tasks", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    setTasks(data.tasks || []);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const createTask = async () => {
    if (!title || !dateTime) {
      alert("Title and DateTime required");
      return;
    }

    const res = await fetch("http://localhost:4000/task", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        priority,
        type: "FIXED",
        dateTimeLocal: dateTime,
        timeZone,
        link: link || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error || "Failed to create task");
      return;
    }

    setTitle("");
    setDateTime("");
    setLink("");
    setPriority("P1");

    fetchTasks();
  };

  const completeTask = async (id: string) => {
    const res = await fetch(`http://localhost:4000/task/${id}/complete`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error || "Failed to complete task");
      return;
    }

    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    const res = await fetch(`http://localhost:4000/task/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error || "Failed to delete task");
      return;
    }

    fetchTasks();
  };

  return (
    <div className="p-6 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="mb-8 flex flex-col gap-3 w-96">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          className="border p-2"
        />

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="border p-2"
        >
          <option value="P1">P1 (Highest)</option>
          <option value="P2">P2 (High)</option>
          <option value="P3">P3 (Medium)</option>
          <option value="P4">P4 (Low)</option>
          <option value="P5">P5 (Lowest)</option>
        </select>

        <input
          type="datetime-local"
          value={dateTime}
          onChange={(e) => setDateTime(e.target.value)}
          className="border p-2"
        />

        <select
          value={timeZone}
          onChange={(e) => setTimeZone(e.target.value)}
          className="border p-2"
        >
          {timeZones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>

        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Optional link"
          className="border p-2"
        />

        <button
          onClick={createTask}
          className="bg-black text-white p-2 rounded"
        >
          Create Task
        </button>
      </div>

      <div className="flex flex-col gap-3 w-96">
        {tasks.length === 0 && (
          <p className="text-gray-500">No tasks yet</p>
        )}

        {tasks.map((task) => {
          const effectiveStatus = getEffectiveStatus(task);

          return (
            <div
              key={task.id}
              className="border p-3 flex justify-between items-start gap-3 rounded"
            >
              <div className="flex-1">
                <p className="font-semibold">
                  {task.title} ({task.priority})
                </p>

                <p className="text-sm text-gray-600">
                  {formatTaskDate(task)} ({task.timeZone})
                </p>

                <p className={`text-sm mt-1 font-medium ${getStatusStyles(task)}`}>
                  {effectiveStatus}
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  {getStatusMessage(task)}
                </p>

                {task.link && (
                  <a
                    href={task.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 text-sm inline-block mt-2"
                  >
                    Open Link
                  </a>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {effectiveStatus === "PENDING" && (
                  <button
                    onClick={() => completeTask(task.id)}
                    className="bg-green-600 text-white px-3 py-1 rounded"
                  >
                    Complete
                  </button>
                )}

                <button
                  onClick={() => deleteTask(task.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
