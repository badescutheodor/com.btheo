"use client";
import React, { useState, useEffect } from "react";
import { useUser } from "@/app/contexts/UserContext";

interface Label {
  id: number;
  name: string;
  slug: string;
}

const LabelsPage: React.FC = () => {
  const { user } = useUser();
  const [labels, setLabels] = useState<Label[]>([]);
  const [newLabel, setNewLabel] = useState({ name: "", slug: "" });
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLabels();
  }, []);

  const fetchLabels = async () => {
    try {
      const response = await fetch("/api/labels");
      if (response.ok) {
        const data = await response.json();
        setLabels(data);
      } else {
        throw new Error("Failed to fetch labels");
      }
    } catch (error) {
      console.error("Failed to fetch labels:", error);
      setError("Failed to fetch labels. Please try again.");
    }
  };

  const handleAddLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLabel),
      });
      if (response.ok) {
        await fetchLabels();
        setNewLabel({ name: "", slug: "" });
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to add label");
      }
    } catch (error) {
      console.error("Failed to add label:", error);
      setError(error.message || "Failed to add label. Please try again.");
    }
  };

  const handleUpdateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLabel) return;

    try {
      const response = await fetch("/api/labels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingLabel),
      });
      if (response.ok) {
        await fetchLabels();
        setEditingLabel(null);
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to update label");
      }
    } catch (error) {
      console.error("Failed to update label:", error);
      setError(error.message || "Failed to update label. Please try again.");
    }
  };

  const handleDeleteLabel = async (id: number) => {
    try {
      const response = await fetch("/api/labels", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (response.ok) {
        await fetchLabels();
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete label");
      }
    } catch (error) {
      console.error("Failed to delete label:", error);
      setError(error.message || "Failed to delete label. Please try again.");
    }
  };

  if (!user || user.role !== "admin") {
    return <div>You do not have permission to access this page.</div>;
  }

  return (
    <div>
      <h1>Labels Management</h1>

      <h2>Add New Label</h2>
      <form onSubmit={handleAddLabel}>
        <input
          type="text"
          placeholder="Name"
          value={newLabel.name}
          onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
        />
        <input
          type="text"
          placeholder="Slug"
          value={newLabel.slug}
          onChange={(e) => setNewLabel({ ...newLabel, slug: e.target.value })}
        />
        <button type="submit">Add Label</button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <h2>Current Labels</h2>
      <ul>
        {labels.map((label) => (
          <li key={label.id}>
            {editingLabel && editingLabel.id === label.id ? (
              <form onSubmit={handleUpdateLabel}>
                <input
                  type="text"
                  value={editingLabel.name}
                  onChange={(e) =>
                    setEditingLabel({ ...editingLabel, name: e.target.value })
                  }
                />
                <input
                  type="text"
                  value={editingLabel.slug}
                  onChange={(e) =>
                    setEditingLabel({ ...editingLabel, slug: e.target.value })
                  }
                />
                <button type="submit">Save</button>
                <button type="button" onClick={() => setEditingLabel(null)}>
                  Cancel
                </button>
              </form>
            ) : (
              <>
                {label.name}-{label.slug}
                <button onClick={() => setEditingLabel(label)}>Edit</button>
                <button onClick={() => handleDeleteLabel(label.id)}>
                  Delete
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LabelsPage;
