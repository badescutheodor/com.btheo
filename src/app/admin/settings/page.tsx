"use client";
import React, { useState, useEffect } from "react";
import { useUser } from "@/app/contexts/UserContext";
import { useFileManagement } from "@/hooks/useFiles";

interface Setting {
  id: number;
  key: string;
  value: string;
}

const SettingsPage: React.FC = () => {
  const { user } = useUser();
  const { uploadFile } = useFileManagement();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [newSetting, setNewSetting] = useState({ key: "", value: "" });
  const [editingSetting, setEditingSetting] = useState<Setting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [landingImage, setLandingImage] = useState<File | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        throw new Error("Failed to fetch settings");
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      setError("Failed to fetch settings. Please try again.");
    }
  };

  const handleAddSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let settingValue = newSetting.value;

      if (newSetting.key === "landingImage" && landingImage) {
        const uploadedFile = await uploadFile(landingImage, {
          type: "landing-image",
        });
        settingValue = uploadedFile.path;
      }

      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newSetting, value: settingValue }),
      });

      if (response.ok) {
        await fetchSettings();
        setNewSetting({ key: "", value: "" });
        setLandingImage(null);
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to add setting");
      }
    } catch (error) {
      console.error("Failed to add setting:", error);
      setError(error.message || "Failed to add setting. Please try again.");
    }
  };

  const handleUpdateSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSetting) return;

    try {
      let settingValue = editingSetting.value;

      if (editingSetting.key === "landingImage" && landingImage) {
        const uploadedFile = await uploadFile(landingImage, {
          type: "landing-image",
        });
        settingValue = uploadedFile.path;
      }

      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editingSetting, value: settingValue }),
      });

      if (response.ok) {
        await fetchSettings();
        setEditingSetting(null);
        setLandingImage(null);
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to update setting");
      }
    } catch (error) {
      console.error("Failed to update setting:", error);
      setError(error.message || "Failed to update setting. Please try again.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLandingImage(e.target.files[0]);
    }
  };

  if (!user || user.role !== "admin") {
    return <div>You do not have permission to access this page.</div>;
  }

  return (
    <div>
      <h1>Settings Management</h1>

      <h2>Add New Setting</h2>
      <form onSubmit={handleAddSetting}>
        <input
          type="text"
          placeholder="Key"
          value={newSetting.key}
          onChange={(e) =>
            setNewSetting({ ...newSetting, key: e.target.value })
          }
        />
        {newSetting.key === "landingImage" ? (
          <input type="file" accept="image/*" onChange={handleFileChange} />
        ) : (
          <input
            type="text"
            placeholder="Value"
            value={newSetting.value}
            onChange={(e) =>
              setNewSetting({ ...newSetting, value: e.target.value })
            }
          />
        )}
        <button type="submit">Add Setting</button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <h2>Current Settings</h2>
      <ul>
        {settings.map((setting) => (
          <li key={setting.id}>
            {editingSetting && editingSetting.id === setting.id ? (
              <form onSubmit={handleUpdateSetting}>
                <input type="text" value={editingSetting.key} readOnly />
                {editingSetting.key === "landingImage" ? (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                ) : (
                  <input
                    type="text"
                    value={editingSetting.value}
                    onChange={(e) =>
                      setEditingSetting({
                        ...editingSetting,
                        value: e.target.value,
                      })
                    }
                  />
                )}
                <button type="submit">Save</button>
                <button type="button" onClick={() => setEditingSetting(null)}>
                  Cancel
                </button>
              </form>
            ) : (
              <>
                {setting.key}:{" "}
                {setting.key === "landingImage" ? (
                  <img
                    src={setting.value}
                    alt="Landing Image"
                    style={{ width: "100px", height: "auto" }}
                  />
                ) : (
                  setting.value
                )}
                <button onClick={() => setEditingSetting(setting)}>Edit</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SettingsPage;
