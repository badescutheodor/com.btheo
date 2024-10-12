"use client";
import React, { useState, useEffect } from "react";
import { useUser } from "@/app/contexts/UserContext";

interface GuestbookEntry {
  id: number;
  name: string;
  email: string;
  message: string;
  createdAt: string;
  location: string;
  isApproved: boolean;
  ipAddress: string;
  userAgent: string;
}

const GuestbookPage: React.FC = () => {
  const { user } = useUser();
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [newEntry, setNewEntry] = useState({
    name: "",
    email: "",
    message: "",
    location: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const response = await fetch("/api/guestbook");
      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      } else {
        throw new Error("Failed to fetch guestbook entries");
      }
    } catch (error) {
      console.error("Failed to fetch guestbook entries:", error);
      setError("Failed to fetch guestbook entries. Please try again.");
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEntry),
      });

      if (response.ok) {
        await fetchEntries();
        setNewEntry({
          name: "",
          email: "",
          message: "",
          location: "",
        });
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to add guestbook entry");
      }
    } catch (error) {
      console.error("Failed to add guestbook entry:", error);
      setError(
        error.message || "Failed to add guestbook entry. Please try again."
      );
    }
  };

  const handleApproveEntry = async (id: number, isApproved: boolean) => {
    try {
      const response = await fetch("/api/guestbook", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isApproved }),
      });

      if (response.ok) {
        await fetchEntries();
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to update guestbook entry");
      }
    } catch (error) {
      console.error("Failed to update guestbook entry:", error);
      setError(
        error.message || "Failed to update guestbook entry. Please try again."
      );
    }
  };

  const handleDeleteEntry = async (id: number) => {
    try {
      const response = await fetch("/api/guestbook", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        await fetchEntries();
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete guestbook entry");
      }
    } catch (error) {
      console.error("Failed to delete guestbook entry:", error);
      setError(
        error.message || "Failed to delete guestbook entry. Please try again."
      );
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Guestbook</h1>

      <h2 className="text-2xl font-semibold mb-4">Leave a Message</h2>
      <form onSubmit={handleAddEntry} className="mb-8">
        <input
          type="text"
          placeholder="Name"
          value={newEntry.name}
          onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })}
          className="w-full p-2 mb-2 border rounded"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={newEntry.email}
          onChange={(e) => setNewEntry({ ...newEntry, email: e.target.value })}
          className="w-full p-2 mb-2 border rounded"
        />
        <textarea
          placeholder="Message"
          value={newEntry.message}
          onChange={(e) =>
            setNewEntry({ ...newEntry, message: e.target.value })
          }
          className="w-full p-2 mb-2 border rounded"
          required
        />
        <input
          type="text"
          placeholder="Location"
          value={newEntry.location}
          onChange={(e) =>
            setNewEntry({ ...newEntry, location: e.target.value })
          }
          className="w-full p-2 mb-4 border rounded"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Submit
        </button>
      </form>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <h2 className="text-2xl font-semibold mb-4">Guestbook Entries</h2>
      <ul>
        {entries.map((entry) => (
          <li key={entry.id} className="mb-4 p-4 border rounded">
            <h3 className="text-xl font-bold">{entry.name}</h3>
            <p className="mb-2">{entry.message}</p>
            <p className="text-sm text-gray-600">
              Posted on: {new Date(entry.createdAt).toLocaleString()}
            </p>
            {entry.location && (
              <p className="text-sm text-gray-600">
                Location: {entry.location}
              </p>
            )}
            {user && user.role === "admin" && (
              <div className="mt-2">
                <p className="text-sm text-gray-600">
                  IP Address: {entry.ipAddress}
                </p>
                <p className="text-sm text-gray-600">
                  User Agent: {entry.userAgent}
                </p>
                <div className="flex mt-2">
                  <button
                    onClick={() =>
                      handleApproveEntry(entry.id, !entry.isApproved)
                    }
                    className={`px-2 py-1 rounded mr-2 ${
                      entry.isApproved
                        ? "bg-yellow-500 hover:bg-yellow-600"
                        : "bg-green-500 hover:bg-green-600"
                    } text-white`}
                  >
                    {entry.isApproved ? "Unapprove" : "Approve"}
                  </button>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GuestbookPage;
