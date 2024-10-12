"use client";
import React, { useState, useEffect, useId } from "react";
import { useUser } from "@/app/contexts/UserContext";
import dynamic from "next/dynamic";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import { useFileManagement } from "@/hooks/useFiles";

// Dynamically import the markdown editor to avoid SSR issues
const MdEditor = dynamic(() => import("react-markdown-editor-lite"), {
  ssr: false,
});

// Import the editor CSS
import "react-markdown-editor-lite/lib/index.css";

interface Label {
  id: number;
  name: string;
  slug: string;
}

interface Snippet {
  id: number;
  title: string;
  content: string;
  language: string;
  isFeatured: boolean;
  author: {
    id: number;
    name: string;
  };
  labels: Label[];
}

interface Option {
  value: string;
  label: string;
}

const mdParser = new MarkdownIt({
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(lang, str).value;
      } catch (__) {}
    }
    return ""; // use external default escaping
  },
});

const SnippetsPage: React.FC = () => {
  const { user } = useUser();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [labels, setLabels] = useState<Option[]>([]);
  const [languages, setLanguages] = useState<Option[]>([]);
  const { uploadFile } = useFileManagement();
  const [newSnippet, setNewSnippet] = useState({
    title: "",
    content: "",
    language: "",
    isFeatured: false,
    labelIds: [] as number[],
  });
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<{ [key: string]: File }>(
    {}
  );

  const languageSelectId = useId();
  const labelsSelectId = useId();

  const mdParser = new MarkdownIt({
    highlight: function (str, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(lang, str).value;
        } catch (__) {}
      }
      return ""; // use external default escaping
    },
  });

  const handleImageUpload = (file: File, callback: (url: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageId = `pending-image-${Date.now()}`;
      const previewUrl = e.target?.result as string;
      setPendingImages((prev) => ({
        ...prev,
        [imageId]: { file, previewUrl },
      }));
      callback(previewUrl);
    };
    reader.readAsDataURL(file);
  };

  const uploadPendingImages = async (content: string): Promise<string> => {
    let updatedContent = content;
    for (const [imageId, { file, previewUrl }] of Object.entries(
      pendingImages
    )) {
      try {
        const uploadedFile = await uploadFile(file, { type: "snippet-image" });
        updatedContent = updatedContent.replace(
          new RegExp(previewUrl, "g"),
          uploadedFile.url
        );
      } catch (error) {
        console.error("Failed to upload image:", error);
        setError(`Failed to upload an image. Some images may not be saved.`);
      }
    }
    setPendingImages({});
    return updatedContent;
  };

  const handleAddSnippet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedContent = await uploadPendingImages(newSnippet.content);
      const snippetToAdd = { ...newSnippet, content: updatedContent };

      const response = await fetch("/api/snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snippetToAdd),
      });

      if (response.ok) {
        await fetchSnippets();
        setNewSnippet({
          title: "",
          content: "",
          language: "",
          isFeatured: false,
          labelIds: [],
        });
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to add snippet");
      }
    } catch (error) {
      console.error("Failed to add snippet:", error);
      setError(error.message || "Failed to add snippet. Please try again.");
    }
  };

  const handleUpdateSnippet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSnippet) return;

    try {
      const updatedContent = await uploadPendingImages(editingSnippet.content);
      const snippetToUpdate = {
        ...editingSnippet,
        content: updatedContent,
        labelIds: editingSnippet.labels.map((label) => label.id),
      };

      const response = await fetch("/api/snippets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snippetToUpdate),
      });

      if (response.ok) {
        await fetchSnippets();
        setEditingSnippet(null);
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to update snippet");
      }
    } catch (error) {
      console.error("Failed to update snippet:", error);
      setError(error.message || "Failed to update snippet. Please try again.");
    }
  };

  useEffect(() => {
    fetchSnippets();
    fetchLabels();
    fetchLanguages();
  }, []);

  const fetchSnippets = async () => {
    try {
      const response = await fetch("/api/snippets");
      if (response.ok) {
        const data = await response.json();
        setSnippets(data);
      } else {
        throw new Error("Failed to fetch snippets");
      }
    } catch (error) {
      console.error("Failed to fetch snippets:", error);
      setError("Failed to fetch snippets. Please try again.");
    }
  };

  const fetchLabels = async () => {
    try {
      const response = await fetch("/api/labels");
      if (response.ok) {
        const data = await response.json();
        setLabels(
          data.map((label: Label) => ({
            value: label.id.toString(),
            label: label.name + "-" + label.slug,
          }))
        );
      } else {
        throw new Error("Failed to fetch labels");
      }
    } catch (error) {
      console.error("Failed to fetch labels:", error);
      setError("Failed to fetch labels. Please try again.");
    }
  };

  const fetchLanguages = async () => {
    try {
      const response = await fetch("/api/snippets", { method: "PATCH" });
      if (response.ok) {
        const data = await response.json();
        setLanguages(
          data.map((lang: string) => ({ value: lang, label: lang }))
        );
      } else {
        throw new Error("Failed to fetch languages");
      }
    } catch (error) {
      console.error("Failed to fetch languages:", error);
      setError("Failed to fetch languages. Please try again.");
    }
  };

  const handleDeleteSnippet = async (id: number) => {
    try {
      const response = await fetch("/api/snippets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (response.ok) {
        await fetchSnippets();
        await fetchLanguages(); // Refresh languages after deleting a snippet
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete snippet");
      }
    } catch (error) {
      console.error("Failed to delete snippet:", error);
      setError(error.message || "Failed to delete snippet. Please try again.");
    }
  };

  const handleEditorChange = ({ text }: { text: string }) => {
    if (editingSnippet) {
      setEditingSnippet({ ...editingSnippet, content: text });
    } else {
      setNewSnippet({ ...newSnippet, content: text });
    }
  };

  if (!user) {
    return <div>You must be logged in to access this page.</div>;
  }

  return (
    <div>
      <h1>Snippets Management</h1>

      <h2>Add New Snippet</h2>
      <form onSubmit={handleAddSnippet}>
        <input
          type="text"
          placeholder="Title"
          value={newSnippet.title}
          onChange={(e) =>
            setNewSnippet({ ...newSnippet, title: e.target.value })
          }
        />
        <MdEditor
          style={{ height: "500px" }}
          renderHTML={(text) => mdParser.render(text)}
          onChange={({ text }) =>
            setNewSnippet({ ...newSnippet, content: text })
          }
          value={newSnippet.content}
          onImageUpload={handleImageUpload}
        />
        <CreatableSelect
          instanceId={`${languageSelectId}-edit`}
          isClearable
          options={languages}
          onChange={(newValue) =>
            setNewSnippet({
              ...newSnippet,
              language: newValue ? newValue.value : "",
            })
          }
          value={
            newSnippet.language
              ? { value: newSnippet.language, label: newSnippet.language }
              : null
          }
        />
        <label>
          <input
            type="checkbox"
            checked={newSnippet.isFeatured}
            onChange={(e) =>
              setNewSnippet({ ...newSnippet, isFeatured: e.target.checked })
            }
          />
          Featured
        </label>
        <Select
          isMulti
          instanceId={`${labelsSelectId}-edit-${editingSnippet?.id}`}
          options={labels}
          value={labels.filter((label) =>
            newSnippet.labelIds.includes(Number(label.value))
          )}
          onChange={(selectedOptions) =>
            setNewSnippet({
              ...newSnippet,
              labelIds: selectedOptions.map((option) => Number(option.value)),
            })
          }
        />
        <button type="submit">Add Snippet</button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <h2>Current Snippets</h2>
      <ul>
        {snippets.map((snippet) => (
          <li key={snippet.id}>
            {editingSnippet && editingSnippet.id === snippet.id ? (
              <form onSubmit={handleUpdateSnippet}>
                <input
                  type="text"
                  value={editingSnippet.title}
                  onChange={(e) =>
                    setEditingSnippet({
                      ...editingSnippet,
                      title: e.target.value,
                    })
                  }
                />
                <MdEditor
                  style={{ height: "500px" }}
                  renderHTML={(text) => mdParser.render(text)}
                  onChange={({ text }) =>
                    setEditingSnippet({ ...editingSnippet, content: text })
                  }
                  value={editingSnippet.content}
                  onImageUpload={handleImageUpload}
                />
                <CreatableSelect
                  isClearable
                  options={languages}
                  value={{
                    value: editingSnippet.language,
                    label: editingSnippet.language,
                  }}
                  onChange={(newValue) =>
                    setEditingSnippet({
                      ...editingSnippet,
                      language: newValue ? newValue.value : "",
                    })
                  }
                />
                <label>
                  <input
                    type="checkbox"
                    checked={editingSnippet.isFeatured}
                    onChange={(e) =>
                      setEditingSnippet({
                        ...editingSnippet,
                        isFeatured: e.target.checked,
                      })
                    }
                  />
                  Featured
                </label>
                <Select
                  isMulti
                  options={labels}
                  value={labels.filter((label) =>
                    editingSnippet.labels.some(
                      (l) => l.id === Number(label.value)
                    )
                  )}
                  onChange={(selectedOptions) =>
                    setEditingSnippet({
                      ...editingSnippet,
                      labels: selectedOptions.map((option) => ({
                        id: Number(option.value),
                        name: option.label,
                      })),
                    })
                  }
                />
                <button type="submit">Save</button>
                <button type="button" onClick={() => setEditingSnippet(null)}>
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <h3>{snippet.title}</h3>
                <p>Author: {snippet.author.name}</p>
                <p>Language: {snippet.language}</p>
                <p>Featured: {snippet.isFeatured ? "Yes" : "No"}</p>
                <p>
                  Labels: {snippet.labels.map((label) => label.name).join(", ")}
                </p>
                <div
                  dangerouslySetInnerHTML={{
                    __html: mdParser.render(snippet.content),
                  }}
                />
                {(user.id === snippet.author.id || user.role === "admin") && (
                  <>
                    <button onClick={() => setEditingSnippet(snippet)}>
                      Edit
                    </button>
                    <button onClick={() => handleDeleteSnippet(snippet.id)}>
                      Delete
                    </button>
                  </>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SnippetsPage;
