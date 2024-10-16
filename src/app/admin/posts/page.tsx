"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@/app/contexts/UserContext";
import dynamic from "next/dynamic";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import { confirm } from "@/lib/utils-client";
import { FiFilePlus } from "react-icons/fi";
import Modal from "@/app/components/Modal";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import { FormProvider } from "@/app/components/FormProvider";
import Accordion from "@/app/components/Accordion";

const MdEditor = dynamic(() => import("react-markdown-editor-lite"), {
  ssr: false,
});

import "react-markdown-editor-lite/lib/index.css";
import { In } from "typeorm";

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
  const [showModal, setShowModal] = useState(false);
  const [blogPost, setBlogPost] = useState<Partial<BlogPost>>({
    title: "",
    content: "",
    excerpt: "",
    date: new Date().toISOString().split("T")[0],
    readTime: "",
    isFeatured: false,
    labels: [],
    metaTags: {},
  });
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
        const posts = await response.json();
        setBlogPosts(posts.data);
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

  const handleBlogPost = async (values = {}) => {
    try {
      const readTime = calculateReadTime(values.content);
      const response = await fetch("/api/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...blogPost, readTime }),
      });

      if (response.ok) {
        await fetchBlogPosts();
        setBlogPost({});
        setShowModal(false);
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
    const ok = await confirm({
      title: "Are you sure?",
      message: "Do you really want to delete this blog post?",
    });

    if (!ok) {
      return;
    }

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
    setBlogPost({ ...blogPost, content: text });
  };

  return (
    <div>
      <Modal
        isOpen={showModal}
        onClose={() => {}}
        fullScreen
        title={`${blogPost.id ? "Edit Post" : "Add Post"}`}
      >
        <div className={"mt-md"}>
          <FormProvider onSubmit={handleBlogPost}>
            {(values) => {
              return (
                <div className="row editor-row">
                  <div className="col-lg-8">
                    <div className="h-full">
                      <MdEditor
                        style={{
                          height: "100%",
                          minHeight: 500,
                          marginBottom: 30,
                        }}
                        renderHTML={(text) => mdParser.render(text)}
                        onChange={handleEditorChange}
                        value={blogPost.content}
                      />
                    </div>
                  </div>
                  <div className="col-lg-4">
                    <div>
                      <Button
                        type="submit"
                        color="primary"
                        fullWidth
                        className="mb-lg"
                      >
                        Save
                      </Button>
                      <Input
                        name="title"
                        type="text"
                        maxLength={100}
                        placeholder="Title"
                        value={blogPost.title}
                        onChange={(value) =>
                          setBlogPost({
                            ...blogPost,
                            title: value,
                          })
                        }
                      />
                      <Input
                        name="excerpt"
                        type="textarea"
                        placeholder="Excerpt"
                        value={blogPost.excerpt}
                        maxLength={200}
                        onChange={(value) =>
                          setBlogPost({
                            ...blogPost,
                            excerpt: value,
                          })
                        }
                      />
                      <div className="flex">
                        <Input
                          type="switch"
                          label="Featured"
                          name="isFeatured"
                          onChange={(value) => {
                            setBlogPost({
                              ...blogPost,
                              isFeatured: value,
                            });
                          }}
                        />
                        <Input
                          type="switch"
                          label="Published"
                          name="status"
                          onChange={(value) => {
                            setBlogPost({
                              ...blogPost,
                              status: value ? "published" : "draft",
                            });
                          }}
                        />
                      </div>
                      <Input
                        type="date"
                        name="date"
                        value={blogPost.date}
                        placeholder="Created date"
                      />
                      <Input
                        type="react-select"
                        name="labels"
                        label="Labels"
                        placeholder=""
                        options={labels}
                        isMulti
                      />
                      <Accordion title="SEO">
                        <Input
                          name="metaTags.title"
                          type="text"
                          placeholder="Title"
                          value={blogPost.metaTags?.title}
                          onChange={(value) =>
                            setBlogPost({
                              ...blogPost,
                              metaTags: {
                                ...blogPost.metaTags,
                                title: value,
                              },
                            })
                          }
                        />
                        <Input
                          name="metaTags.description"
                          type="textarea"
                          placeholder="Description"
                          value={blogPost.metaTags?.description}
                          onChange={(value) =>
                            setBlogPost({
                              ...blogPost,
                              metaTags: {
                                ...blogPost.metaTags,
                                description: value,
                              },
                            })
                          }
                        />
                        <Input
                          name="metaTags.keywords"
                          type="react-select-creatable"
                          label="Keywords"
                          placeholder=""
                          options={[]}
                          onChange={(value) => {
                            console.log(value);
                            setBlogPost({
                              ...blogPost,
                              metaTags: {
                                ...blogPost.metaTags,
                                keywords: value,
                              },
                            });
                          }}
                          isMulti
                        />
                        <Input
                          name="metaTags.ogImage"
                          type="text"
                          placeholder="OG Image"
                          value={blogPost.metaTags?.ogImage}
                          onChange={(value) =>
                            setBlogPost({
                              ...blogPost,
                              metaTags: {
                                ...blogPost.metaTags,
                                ogImage: value,
                              },
                            })
                          }
                        />
                        <Input
                          name="metaTags.ogTitle"
                          type="text"
                          placeholder="OG Title"
                          value={blogPost.metaTags?.ogTitle}
                          onChange={(value) =>
                            setBlogPost({
                              ...blogPost,
                              metaTags: {
                                ...blogPost.metaTags,
                                ogTitle: value,
                              },
                            })
                          }
                        />
                        <Input
                          name="metaTags.ogDescription"
                          type="text"
                          placeholder="OG Description"
                          value={blogPost.metaTags?.ogDescription}
                          onChange={(value) =>
                            setBlogPost({
                              ...blogPost,
                              metaTags: {
                                ...blogPost.metaTags,
                                ogDescription: value,
                              },
                            })
                          }
                        />
                      </Accordion>
                    </div>
                  </div>
                </div>
              );
            }}
          </FormProvider>
        </div>
      </Modal>
      <div className="row">
        <div className="col-6">
          <h3 className="m-0">Posts</h3>
        </div>
        <div className="col-6 text-right">
          <div>
            <Button onClick={() => setShowModal(true)}>
              <FiFilePlus className={"mr-xs"} /> Create new post
            </Button>
          </div>
        </div>
      </div>
      <ul>
        {blogPosts.map((blogPost) => (
          <li key={blogPost.id}>
            <>
              <h3>{blogPost.title}</h3>
              <p>Author: {blogPost.author.name}</p>
              <p>Date: {blogPost.date}</p>
              <p>Read Time: {blogPost.readTime}</p>
              <p>Featured: {blogPost.isFeatured ? "Yes" : "No"}</p>
              <p>
                Labels: {blogPost.labels.map((label) => label.name).join(", ")}
              </p>
              <div>
                <h4>Meta Tags:</h4>
                <p>Title: {blogPost.metaTags?.title}</p>
                <p>Description: {blogPost.metaTags?.description}</p>
                <p>Keywords: {blogPost.metaTags?.keywords?.join(", ")}</p>
                <p>OG Image: {blogPost.metaTags?.ogImage}</p>
                <p>OG Title: {blogPost.metaTags?.ogTitle}</p>
                <p>OG Description: {blogPost.metaTags?.ogDescription}</p>
              </div>
              <div
                dangerouslySetInnerHTML={{
                  __html: mdParser.render(blogPost.content),
                }}
              />
              {(user.id === blogPost.author.id || user.role === "admin") && (
                <div>
                  <button onClick={() => setEditingBlogPost(blogPost)}>
                    Edit
                  </button>
                  <button onClick={() => handleDeleteBlogPost(blogPost.id)}>
                    Delete
                  </button>
                </div>
              )}
            </>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BlogPostsPage;
