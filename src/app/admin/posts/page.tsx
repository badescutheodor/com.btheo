"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@/app/contexts/UserContext";
import dynamic from "next/dynamic";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";

const MdEditor = dynamic(() => import("react-markdown-editor-lite"), {
  ssr: false,
});

import "react-markdown-editor-lite/lib/index.css";

interface Label {
  id: number;
  name: string;
  slug: string;
}

interface BlogPost {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  date: string;
  readTime: string;
  isFeatured: boolean;
  author: {
    id: number;
    name: string;
  };
  labels: Label[];
  metaTags: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
    ogTitle?: string;
    ogDescription?: string;
  };
}

const BlogPostsPage: React.FC = () => {
  const { user } = useUser();
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [labels, setLabels] = useState<{ value: string; label: string }[]>([]);
  const [newBlogPost, setNewBlogPost] = useState<Partial<BlogPost>>({
    title: "",
    content: "",
    excerpt: "",
    date: new Date().toISOString().split("T")[0],
    readTime: "",
    isFeatured: false,
    labels: [],
    metaTags: {},
  });
  const [editingBlogPost, setEditingBlogPost] = useState<BlogPost | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mdParser = new MarkdownIt({
    highlight: function (str, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(lang, str).value;
        } catch (__) {}
      }
      return "";
    },
  });

  const calculateReadTime = useCallback((content: string): string => {
    const wordsPerMinute = 200;
    const wordCount = content.trim().split(/\s+/).length;
    const readTime = Math.ceil(wordCount / wordsPerMinute);
    return `${readTime} min read`;
  }, []);

  useEffect(() => {
    fetchBlogPosts();
    fetchLabels();
  }, []);

  const fetchBlogPosts = async () => {
    try {
      const response = await fetch("/api/posts");
      if (response.ok) {
        const data = await response.json();
        setBlogPosts(data);
      } else {
        throw new Error("Failed to fetch blog posts");
      }
    } catch (error) {
      console.error("Failed to fetch blog posts:", error);
      setError("Failed to fetch blog posts. Please try again.");
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
            label: label.name,
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

  const handleAddBlogPost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const readTime = calculateReadTime(newBlogPost.content || "");
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newBlogPost, readTime }),
      });

      if (response.ok) {
        await fetchBlogPosts();
        setNewBlogPost({
          title: "",
          content: "",
          excerpt: "",
          date: new Date().toISOString().split("T")[0],
          readTime: "",
          isFeatured: false,
          labels: [],
          metaTags: {},
        });
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to add blog post");
      }
    } catch (error) {
      console.error("Failed to add blog post:", error);
      setError(error.message || "Failed to add blog post. Please try again.");
    }
  };

  const handleUpdateBlogPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBlogPost) return;

    try {
      const readTime = calculateReadTime(editingBlogPost.content);
      const response = await fetch("/api/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editingBlogPost, readTime }),
      });

      if (response.ok) {
        await fetchBlogPosts();
        setEditingBlogPost(null);
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to update blog post");
      }
    } catch (error) {
      console.error("Failed to update blog post:", error);
      setError(
        error.message || "Failed to update blog post. Please try again."
      );
    }
  };

  const handleDeleteBlogPost = async (id: number) => {
    try {
      const response = await fetch("/api/posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (response.ok) {
        await fetchBlogPosts();
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete blog post");
      }
    } catch (error) {
      console.error("Failed to delete blog post:", error);
      setError(
        error.message || "Failed to delete blog post. Please try again."
      );
    }
  };

  const handleEditorChange = ({ text }: { text: string }) => {
    if (editingBlogPost) {
      setEditingBlogPost({ ...editingBlogPost, content: text });
    } else {
      setNewBlogPost({ ...newBlogPost, content: text });
    }
  };

  if (!user) {
    return <div>You must be logged in to access this page.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Blog Posts Management</h1>

      <h2 className="text-2xl font-semibold mb-4">Add New Blog Post</h2>
      <form onSubmit={handleAddBlogPost} className="mb-8">
        <input
          type="text"
          placeholder="Title"
          value={newBlogPost.title}
          onChange={(e) =>
            setNewBlogPost({ ...newBlogPost, title: e.target.value })
          }
          className="w-full p-2 mb-4 border rounded"
        />
        <MdEditor
          style={{ height: "400px" }}
          renderHTML={(text) => mdParser.render(text)}
          onChange={handleEditorChange}
          value={newBlogPost.content}
        />
        <input
          type="date"
          value={newBlogPost.date}
          onChange={(e) =>
            setNewBlogPost({ ...newBlogPost, date: e.target.value })
          }
          className="w-full p-2 my-4 border rounded"
        />
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={newBlogPost.isFeatured}
              onChange={(e) =>
                setNewBlogPost({ ...newBlogPost, isFeatured: e.target.checked })
              }
              className="mr-2"
            />
            Featured
          </label>
        </div>
        <Select
          isMulti
          options={labels}
          value={labels.filter((label) =>
            newBlogPost.labels?.some((l) => l.id === parseInt(label.value))
          )}
          onChange={(selectedOptions) =>
            setNewBlogPost({
              ...newBlogPost,
              labels: selectedOptions.map((option) => ({
                id: parseInt(option.value),
                name: option.label,
              })),
            })
          }
          className="mb-4"
        />
        <h3 className="text-xl font-semibold mb-2">Meta Tags</h3>
        <input
          type="text"
          placeholder="Meta Title"
          value={newBlogPost.metaTags?.title || ""}
          onChange={(e) =>
            setNewBlogPost({
              ...newBlogPost,
              metaTags: { ...newBlogPost.metaTags, title: e.target.value },
            })
          }
          className="w-full p-2 mb-2 border rounded"
        />
        <textarea
          placeholder="Meta Description"
          value={newBlogPost.metaTags?.description || ""}
          onChange={(e) =>
            setNewBlogPost({
              ...newBlogPost,
              metaTags: {
                ...newBlogPost.metaTags,
                description: e.target.value,
              },
            })
          }
          className="w-full p-2 mb-2 border rounded"
        />
        <CreatableSelect
          isMulti
          placeholder="Keywords"
          value={(newBlogPost.metaTags?.keywords || []).map((keyword) => ({
            value: keyword,
            label: keyword,
          }))}
          onChange={(newValue) =>
            setNewBlogPost({
              ...newBlogPost,
              metaTags: {
                ...newBlogPost.metaTags,
                keywords: newValue.map((item) => item.value),
              },
            })
          }
          className="mb-2"
        />
        <input
          type="text"
          placeholder="Excerpt"
          value={newBlogPost.excerpt || ""}
          onChange={(e) =>
            setNewBlogPost({
              ...newBlogPost,
              excerpt: e.target.value,
            })
          }
          className="w-full p-2 mb-2 border rounded"
        />
        <input
          type="text"
          placeholder="OG Image URL"
          value={newBlogPost.metaTags?.ogImage || ""}
          onChange={(e) =>
            setNewBlogPost({
              ...newBlogPost,
              metaTags: { ...newBlogPost.metaTags, ogImage: e.target.value },
            })
          }
          className="w-full p-2 mb-2 border rounded"
        />
        <input
          type="text"
          placeholder="OG Title"
          value={newBlogPost.metaTags?.ogTitle || ""}
          onChange={(e) =>
            setNewBlogPost({
              ...newBlogPost,
              metaTags: { ...newBlogPost.metaTags, ogTitle: e.target.value },
            })
          }
          className="w-full p-2 mb-2 border rounded"
        />
        <textarea
          placeholder="OG Description"
          value={newBlogPost.metaTags?.ogDescription || ""}
          onChange={(e) =>
            setNewBlogPost({
              ...newBlogPost,
              metaTags: {
                ...newBlogPost.metaTags,
                ogDescription: e.target.value,
              },
            })
          }
          className="w-full p-2 mb-4 border rounded"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Blog Post
        </button>
      </form>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <h2 className="text-2xl font-semibold mb-4">Current Blog Posts</h2>
      <ul>
        {blogPosts.map((blogPost) => (
          <li key={blogPost.id} className="mb-8 p-4 border rounded">
            {editingBlogPost && editingBlogPost.id === blogPost.id ? (
              <form onSubmit={handleUpdateBlogPost}>
                <input
                  type="text"
                  value={editingBlogPost.title}
                  onChange={(e) =>
                    setEditingBlogPost({
                      ...editingBlogPost,
                      title: e.target.value,
                    })
                  }
                  className="w-full p-2 mb-4 border rounded"
                />
                <MdEditor
                  style={{ height: "400px" }}
                  renderHTML={(text) => mdParser.render(text)}
                  onChange={({ text }) =>
                    setEditingBlogPost({ ...editingBlogPost, content: text })
                  }
                  value={editingBlogPost.content}
                />
                <input
                  type="date"
                  value={editingBlogPost.date}
                  onChange={(e) =>
                    setEditingBlogPost({
                      ...editingBlogPost,
                      date: e.target.value,
                    })
                  }
                  className="w-full p-2 my-4 border rounded"
                />
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingBlogPost.isFeatured}
                      onChange={(e) =>
                        setEditingBlogPost({
                          ...editingBlogPost,
                          isFeatured: e.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    Featured
                  </label>
                </div>
                <Select
                  isMulti
                  options={labels}
                  value={labels.filter((label) =>
                    editingBlogPost.labels.some(
                      (l) => l.id === parseInt(label.value)
                    )
                  )}
                  onChange={(selectedOptions) =>
                    setEditingBlogPost({
                      ...editingBlogPost,
                      labels: selectedOptions.map((option) => ({
                        id: parseInt(option.value),
                        name: option.label,
                      })),
                    })
                  }
                  className="mb-4"
                />
                <h3 className="text-xl font-semibold mb-2">Meta Tags</h3>
                <input
                  type="text"
                  placeholder="Meta Title"
                  value={editingBlogPost.metaTags?.title || ""}
                  onChange={(e) =>
                    setEditingBlogPost({
                      ...editingBlogPost,
                      metaTags: {
                        ...editingBlogPost.metaTags,
                        title: e.target.value,
                      },
                    })
                  }
                  className="w-full p-2 mb-2 border rounded"
                />
                <textarea
                  placeholder="Meta Description"
                  value={editingBlogPost.metaTags?.description || ""}
                  onChange={(e) =>
                    setEditingBlogPost({
                      ...editingBlogPost,
                      metaTags: {
                        ...editingBlogPost.metaTags,
                        description: e.target.value,
                      },
                    })
                  }
                  className="w-full p-2 mb-2 border rounded"
                />
                <CreatableSelect
                  isMulti
                  placeholder="Keywords"
                  value={(editingBlogPost.metaTags?.keywords || []).map(
                    (keyword) => ({ value: keyword, label: keyword })
                  )}
                  onChange={(newValue) =>
                    setEditingBlogPost({
                      ...editingBlogPost,
                      metaTags: {
                        ...editingBlogPost.metaTags,
                        keywords: newValue.map((item) => item.value),
                      },
                    })
                  }
                  className="mb-2"
                />
                <input
                  type="text"
                  placeholder="OG Image URL"
                  value={editingBlogPost.metaTags?.ogImage || ""}
                  onChange={(e) =>
                    setEditingBlogPost({
                      ...editingBlogPost,
                      metaTags: {
                        ...editingBlogPost.metaTags,
                        ogImage: e.target.value,
                      },
                    })
                  }
                  className="w-full p-2 mb-2 border rounded"
                />
                <input
                  type="text"
                  placeholder="OG Title"
                  value={editingBlogPost.metaTags?.ogTitle || ""}
                  onChange={(e) =>
                    setEditingBlogPost({
                      ...editingBlogPost,
                      metaTags: {
                        ...editingBlogPost.metaTags,
                        ogTitle: e.target.value,
                      },
                    })
                  }
                  className="w-full p-2 mb-2 border rounded"
                />
                <textarea
                  placeholder="OG Description"
                  value={editingBlogPost.metaTags?.ogDescription || ""}
                  onChange={(e) =>
                    setEditingBlogPost({
                      ...editingBlogPost,
                      metaTags: {
                        ...editingBlogPost.metaTags,
                        ogDescription: e.target.value,
                      },
                    })
                  }
                  className="w-full p-2 mb-4 border rounded"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-2"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingBlogPost(null)}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h3 className="text-xl font-bold mb-2">{blogPost.title}</h3>
                <p className="mb-2">Author: {blogPost.author.name}</p>
                <p className="mb-2">Date: {blogPost.date}</p>
                <p className="mb-2">Read Time: {blogPost.readTime}</p>
                <p className="mb-2">
                  Featured: {blogPost.isFeatured ? "Yes" : "No"}
                </p>
                <p className="mb-2">
                  Labels:{" "}
                  {blogPost.labels.map((label) => label.name).join(", ")}
                </p>
                <div className="mb-4">
                  <h4 className="font-semibold">Meta Tags:</h4>
                  <p>Title: {blogPost.metaTags?.title}</p>
                  <p>Description: {blogPost.metaTags?.description}</p>
                  <p>Keywords: {blogPost.metaTags?.keywords?.join(", ")}</p>
                  <p>OG Image: {blogPost.metaTags?.ogImage}</p>
                  <p>OG Title: {blogPost.metaTags?.ogTitle}</p>
                  <p>OG Description: {blogPost.metaTags?.ogDescription}</p>
                </div>
                <div
                  className="prose max-w-full mb-4"
                  dangerouslySetInnerHTML={{
                    __html: mdParser.render(blogPost.content),
                  }}
                />
                {(user.id === blogPost.author.id || user.role === "admin") && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setEditingBlogPost(blogPost)}
                      className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteBlogPost(blogPost.id)}
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BlogPostsPage;
