"use client";
import React, { useState, useEffect } from "react";
import { useUser } from "@/app/contexts/UserContext";
import { useFileManagement } from "@/hooks/useFiles";
import Modal from "@/app/components/Modal";
import Input from "@/app/components/Input";
import { useFormOperations, FormProvider } from "@/app/components/FormProvider";
import AutoFormBuilder from "@/app/components/AutoFormBuilder";
import FormError from "@/app/components/FormError";

interface Setting {
  id: number;
  key: string;
  value: string;
}

import * as yup from "yup";

const initialValues = {
  name: "",
  email: "",
  age: "",
  bio: "",
  agreeTerms: false,
  gender: "",
  country: "",
  birthdate: "",
  avatar: null,
};

const validationSchema = {
  name: {
    type: "text",
    rules: [yup.string().required("Name is required")],
  },
  email: {
    type: "email",
    rules: [yup.string().email("Invalid email").required("Email is required")],
  },
  age: {
    type: "number",
    rules: [
      yup.number().required("Age is required"),
      yup
        .number()
        .positive("Age must be positive")
        .integer("Age must be an integer"),
    ],
  },
  bio: {
    type: "textarea",
    rules: [yup.string().max(200, "Bio must be at most 200 characters")],
  },
  agreeTerms: {
    type: "checkbox",
    rules: [yup.boolean().oneOf([true], "You must agree to the terms")],
  },
  gender: {
    type: "radio",
    options: [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
      { value: "other", label: "Other" },
    ],
    rules: [yup.string().oneOf(["male", "female", "other"], "Invalid gender")],
  },
  country: {
    type: "select",
    options: [
      { value: "us", label: "United States" },
      { value: "ca", label: "Canada" },
      { value: "uk", label: "United Kingdom" },
    ],
    rules: [yup.string().required("Country is required")],
  },
  birthdate: {
    type: "date",
    rules: [yup.date().required("Birthdate is required")],
  },
  avatar: {
    type: "file",
    rules: [
      yup.mixed().test("fileSize", "File is too large", (value) => {
        if (!value) return true;
        return value[0]?.size <= 1024 * 1024; // 1MB
      }),
    ],
  },
};

const ExampleForm: React.FC = () => {
  const handleSubmit = (values: typeof initialValues) => {
    console.log(values);
    // Handle form submission
  };

  const FormActions = () => {
    const { resetForm, submitForm, resetErrors, hasErrors, isSubmitting } =
      useFormOperations();

    return (
      <div>
        <button type="button" onClick={resetForm} disabled={isSubmitting}>
          Reset Form
        </button>
        <button type="button" onClick={submitForm} disabled={isSubmitting}>
          Custom Submit
        </button>
        <button
          type="button"
          onClick={resetErrors}
          disabled={isSubmitting || !hasErrors}
        >
          Reset Errors
        </button>
        {isSubmitting && <p>Submitting...</p>}
        {hasErrors && <p>There are errors in the form</p>}
      </div>
    );
  };

  return (
    <FormProvider
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      <FormError />
      <AutoFormBuilder schema={validationSchema} />
      <FormActions />
    </FormProvider>
  );
};

const SettingsPage: React.FC = () => {
  const { user } = useUser();
  const { uploadFile } = useFileManagement();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [newSetting, setNewSetting] = useState({ key: "", value: "" });
  const [editingSetting, setEditingSetting] = useState<Setting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [homeImage, setHomeImage] = useState<File | null>(null);

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

      if (newSetting.key === "homeImage" && homeImage) {
        const uploadedFile = await uploadFile(homeImage, {
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
        setHomeImage(null);
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

      if (editingSetting.key === "homeImage" && homeImage) {
        const uploadedFile = await uploadFile(homeImage, {
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
        setHomeImage(null);
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
      setHomeImage(e.target.files[0]);
    }
  };

  if (!user || user.role !== "admin") {
    return <div>You do not have permission to access this page.</div>;
  }

  return (
    <div>
      {/* <Modal isOpen={true} title={"XXXX"} onClose={() => {}}>
        <h1>XXXX</h1>
      </Modal> */}
      <ExampleForm />
      <h3>Settings Management</h3>
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
        {newSetting.key === "homeImage" ? (
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
                {editingSetting.key === "homeImage" ? (
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
