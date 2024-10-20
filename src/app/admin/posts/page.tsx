"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useUser } from "@/app/contexts/UserContext";
import dynamic from "next/dynamic";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import { confirm } from "@/lib/utils-client";
import { FiFilePlus, FiEye, FiTrash2, FiEdit, FiSearch } from "react-icons/fi";
import Modal from "@/app/components/Modal";
import Button from "@/app/components/Button";
import { FormProvider } from "@/app/components/FormProvider";
import moment from "moment";
import * as yup from "yup";
import qs from "qs";
import Input from "@/app/components/Input";
import Switch from "@/app/components/Switch";
import Label from "@/app/components/Label";
import Accordion from "@/app/components/Accordion";
import { debounce } from "@/lib/utils-client";
import { useFileManagement } from "@/hooks/useFiles";
import "react-markdown-editor-lite/lib/index.css";
import Table from "@/app/components/Table";

const MdEditor = dynamic(() => import("react-markdown-editor-lite"), {
  ssr: false,
});

// Types
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

const filePreviewPlugin = (md) => {
  const defaultRender = md.renderer.rules.image;

  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    let src = token.attrs[token.attrIndex("src")][1];

    src = decodeURIComponent(src);
    const match = src.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

    if (match) {
      const [, fileType, url] = match;
      return customRenderer(url, fileType);
    }

    // Default case: render as normal image
    return defaultRender(tokens, idx, options, env, self);
  };
};

// Update the customRenderer function to handle more file types
const customRenderer = (url, fileType) => {
  switch (fileType) {
    case "application/pdf":
      return `<iframe src="${url}" width="100%" height="500px"></iframe>`;
    case "audio/mpeg":
    case "audio/wav":
    case "audio/ogg":
      return `<audio controls><source src="${url}" type="${fileType}">Your browser does not support the audio element.</audio>`;
    case "video/mp4":
    case "video/webm":
    case "video/ogg":
      return `<video width="100%" height="auto" controls><source src="${url}" type="${fileType}">Your browser does not support the video tag.</video>`;
    case "image/jpeg":
    case "image/png":
    case "image/gif":
    case "image/svg+xml":
      return `<img src="${url}" alt="Uploaded file" style="max-width: 100%; height: auto;" />`;
    default:
      return `<a href="${url}" target="_blank">Download ${fileType} file</a>`;
  }
};

// Utility functions
const mdParser = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(lang, str).value;
      } catch (__) {}
    }
    return "";
  },
}).use(filePreviewPlugin);

const calculateReadTime = (content: string): string => {
  const wordsPerMinute = 200;
  content = content || "";
  const wordCount = content.trim().split(/\s+/).length;
  const readTime = Math.ceil(wordCount / wordsPerMinute);
  return `${readTime} min read`;
};

const generateExcerpt = (content: string, length: number = 200): string => {
  content = content || "";
  content = content.replace(/#{1,6}\s?/g, "");

  // Remove emphasis (bold, italic)
  content = content.replace(/(\*\*|__)(.*?)\1/g, "$2");
  content = content.replace(/(\*|_)(.*?)\1/g, "$2");

  // Remove links
  content = content.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

  // Remove images (both standard markdown and UUID-based references)
  content = content.replace(/!\[([^\]]*)\]\([^\)]+\)/g, "");
  content = content.replace(/!\[[^\]]*\]$/gm, "");
  content = content.replace(
    /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpeg|jpg|png|gif)/gi,
    ""
  );

  // Remove code blocks
  content = content.replace(/```[\s\S]*?```/g, "");
  content = content.replace(/`([^`]+)`/g, "$1");

  // Remove blockquotes
  content = content.replace(/^\s*>\s?/gm, "");

  // Remove horizontal rules
  content = content.replace(/^(?:- *){3,}|(?:_ *){3,}|(?:\* *){3,}$/gm, "");

  // Remove list markers
  content = content.replace(/^[\*\-+]\s/gm, "");
  content = content.replace(/^\d+\.\s/gm, "");

  // Remove extra whitespace
  content = content.replace(/\s+/g, " ");

  // Trim and limit to specified length
  content = content.trim().slice(0, length);

  // Add ellipsis if content was truncated
  if (content.length === length) {
    content += "...";
  }

  return content;
};

const BlogPostForm: React.FC<{
  blogPost: Partial<BlogPost>;
  labels: { value: string; label: string }[];
  onSubmit: (values: any) => void;
  onFileUpload: (file: File, callback: (url: string) => void) => void;
}> = ({ blogPost, labels, onSubmit, onFileUpload }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <FormProvider
      onSubmit={onSubmit}
      initialValues={blogPost.id ? blogPost : {}}
      validationSchema={{
        title: {
          rules: [
            yup.string().required("Title is required"),
            yup.string().max(100, "Title must be at most 100 characters"),
          ],
        },
      }}
    >
      {({ values, submitForm, setFieldValue }) => (
        <div className="row editor-row">
          <div className="col-lg-8">
            <div
              className="h-full"
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const files = Array.from(e.dataTransfer.files);
                // files.forEach((file) => {
                //   onFileUpload(file).then((encodedUrl) => {
                //     const placeholder = `![](${encodedUrl})`;
                //     setFieldValue(
                //       "content",
                //       values.content + "\n " + placeholder
                //     );
                //   });
                // });
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <MdEditor
                style={{
                  height: "100%",
                  minHeight: 500,
                  marginBottom: 30,
                }}
                autoFocus
                onChange={({ text }) => {
                  setFieldValue("content", text);
                }}
                value={values.content}
                renderHTML={(text) => mdParser.render(text)}
                config={{
                  imageAccept: ".jpg,.jpeg,.png,.gif,.pdf,audio/*,video/*",
                }}
                onImageUpload={(file, callback) => {
                  onFileUpload(file).then((encodedUrl) => {
                    callback(encodedUrl);
                  });
                }}
              />
            </div>
          </div>
          <div className="col-lg-4 xs-mt-md">
            <div>
              <div className="row">
                <div className="col-lg-6">
                  <div>
                    <Button
                      type="submit"
                      color="primary"
                      fullWidth
                      className="mb-lg"
                      onClick={submitForm}
                    >
                      Save
                    </Button>
                  </div>
                </div>
                <div className="col-lg-6">
                  <div>
                    <Button
                      type="submit"
                      color="primary"
                      fullWidth
                      inverted
                      className="mb-lg"
                      onClick={submitForm}
                    >
                      <FiEye className="mr-xs" />
                      Preview
                    </Button>
                  </div>
                </div>
              </div>
              <Input
                name="title"
                type="text"
                maxLength={100}
                placeholder="Title *"
              />
              <Input
                name="excerpt"
                type="textarea"
                placeholder="Excerpt"
                maxLength={200}
              />
              <div className="flex">
                <Input type="switch" label="Featured" name="isFeatured" />
                <Input type="switch" label="Published" name="status" />
              </div>
              <Input type="date" name="date" placeholder="Created date" />
              <Input
                type="react-select"
                name="labels"
                label="Labels"
                placeholder=""
                options={labels}
                isMulti
              />
              <Accordion title="SEO">
                <Input name="metaTags.title" type="text" placeholder="Title" />
                <Input
                  name="metaTags.description"
                  type="textarea"
                  placeholder="Description"
                />
                <Input
                  name="metaTags.keywords"
                  type="react-select-creatable"
                  label="Keywords"
                  placeholder=""
                  isMulti
                />
                <Input
                  name="metaTags.ogImage"
                  type="text"
                  placeholder="OG Image"
                />
                <Input
                  name="metaTags.ogTitle"
                  type="text"
                  placeholder="OG Title"
                />
                <Input
                  name="metaTags.ogDescription"
                  type="text"
                  placeholder="OG Description"
                />
              </Accordion>
            </div>
          </div>
        </div>
      )}
    </FormProvider>
  );
};

// BlogPostTable Component
const BlogPostTable: React.FC<{
  blogPosts: BlogPost[];
  blogMeta: any;
  params: any;
  onSort: (field: string, order: string) => void;
  onPageChange: (page: number) => void;
  onEdit: (post: BlogPost) => void;
  onDelete: (post: BlogPost) => void;
  onUpdatePost: (post: any) => void;
  loadMoreData: () => void;
}> = ({
  blogPosts,
  blogMeta,
  params,
  onSort,
  onPageChange,
  onEdit,
  onDelete,
  onUpdatePost,
  loadMoreData,
}) => {
  return (
    <Table
      onSort={(field, order) => onSort(field, order)}
      params={params}
      onLoadMore={loadMoreData}
      updateEntry={onUpdatePost}
      onPageChange={(page) => onPageChange(page)}
      fields={[
        {
          name: "id",
          key: "id",
          label: "ID",
          sortable: true,
        },
        {
          name: "Title",
          key: "title",
          label: "Title",
          editable: true,
          type: "textarea",
          sortable: true,
          style: {
            maxWidth: 120,
            overflow: "hidden",
            textOverflow: "ellipsis",
          },
        },
        {
          name: "Date",
          key: "date",
          label: "Date",
          editable: true,
          type: "date",
          transform: (value: string) => moment(value).format("DD MMM YYYY"),
          sortable: true,
        },
        {
          name: "Author",
          key: "author",
          label: "Author",
          sortable: true,
        },
        {
          name: "Labels",
          key: "labels",
          label: "Labels",
          sortable: false,
          transform: (value: any) =>
            value && value.length
              ? value.map((label: any) => (
                  <Label key={label.id}>{label.name}</Label>
                ))
              : "N/A",
        },
        {
          name: "Is Featured",
          key: "isFeatured",
          label: "Is Featured",
          transform: (value, post) => (
            <Switch
              checked={value}
              onChange={() => onUpdatePost({ id: post.id, isFeatured: !value })}
            />
          ),
          sortable: true,
        },
        {
          name: "Published",
          key: "status",
          label: "Published",
          transform: (value, post) => (
            <Switch
              checked={value === "published"}
              onChange={() =>
                onUpdatePost({
                  id: post.id,
                  status: value === "published" ? "draft" : "published",
                })
              }
            />
          ),
          sortable: true,
        },
      ]}
      actions={[
        {
          key: "edit",
          label: (
            <>
              <FiEdit className="mr-xs" />
              Edit
            </>
          ),
          onClick: (item: any) => onEdit(item),
        },
        {
          key: "delete",
          labelClassName: "error",
          label: (
            <>
              <FiTrash2 className="mr-xs" />
              Delete
            </>
          ),
          onClick: (item: any) => onDelete(item),
        },
      ]}
      meta={blogMeta}
      data={blogPosts}
    />
  );
};

// Main BlogPostsPage Component
const BlogPostsPage: React.FC = () => {
  const { user } = useUser();
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [blogMeta, setBlogMeta] = useState<any>({});
  const [labels, setLabels] = useState<{ value: string; label: string }[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
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
  const [params, setParams] = useState({});
  const [pendingFiles, setPendingFiles] = useState<{ [key: string]: File }>({});
  const { uploadFile } = useFileManagement();

  useEffect(() => {
    const params = qs.parse(window.location.search.slice(1));
    fetchBlogPosts(params);
    if (params.search) {
      setSearch(params.search);
    }
    fetchLabels();
  }, []);

  const fetchBlogPosts = async (newParams = {}, append?: boolean) => {
    const setParameters = { ...params, ...newParams };

    try {
      const response = await fetch(
        "/api/posts?" +
          qs.stringify(setParameters, {
            encode: false,
            ignoreQueryPrefix: true,
          })
      );
      if (response.ok) {
        const posts = await response.json();
        setBlogPosts(append ? [...blogPosts, ...posts.data] : posts.data);
        setBlogMeta(posts.meta);
        setParams(setParameters);

        for (const key in setParameters) {
          if (setParameters[key] === "") {
            delete setParameters[key];
          }
        }

        const newQuery = qs.stringify(setParameters, {
          encode: false,
          addQueryPrefix: true,
        });

        window.history.pushState(
          {},
          "",
          Object.keys(setParameters).length > 0
            ? newQuery
            : window.location.pathname
        );
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
      const response = await fetch("/api/labels?limit=-1");
      if (response.ok) {
        const { data } = await response.json();
        setLabels(
          data.map((label: Label) => ({
            value: label.id,
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

  const handleFileUpload = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const blobUrl = URL.createObjectURL(file);
        setPendingFiles((prev) => ({
          ...prev,
          [blobUrl]: file,
        }));
        const fileType = file.type;
        const encodedUrl = `[${fileType}](${blobUrl})`;
        resolve(encodedUrl);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const uploadPendingFiles = async (content: string): Promise<string> => {
    let updatedContent = content;
    for (const [blobUrl, file] of Object.entries(pendingFiles)) {
      try {
        const uploadedFile = await uploadFile(file, {
          type: "blog-attachment",
        });
        const fileType = file.type;
        const encodedBlobUrl = `\\[${fileType}\\]\\(${blobUrl.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        )}\\)`;
        updatedContent = updatedContent.replace(
          new RegExp(encodedBlobUrl, "g"),
          `[${fileType}](${uploadedFile.path})`
        );
        URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error("Failed to upload file:", error);
      }
    }
    setPendingFiles({});
    return updatedContent;
  };

  const processPost = (post: any) => {
    const newPost = { ...post };
    if (newPost.labels) {
      newPost.labels = post.labels.map((label: any) => ({
        value: label.id,
        label: label.name,
      }));
    }
    if (newPost.metaTags?.keywords) {
      newPost.metaTags.keywords = post.metaTags.keywords.map(
        (keyword: any) => ({
          value: keyword,
          label: keyword,
        })
      );
    }
    return newPost;
  };

  const handleDeleteBlogPost = async (post: any) => {
    const ok = await confirm({
      title: "Are you sure?",
      message: `Do you really want to delete this blog post (${post.title})?`,
    });

    if (!ok) {
      return;
    }

    try {
      const response = await fetch("/api/posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id }),
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

  const handleSearch = useCallback(
    debounce((value) => fetchBlogPosts({ search: value }), 500),
    []
  );

  const loadMoreData = useCallback(() => {
    if (blogMeta.currentPage >= blogMeta.totalPages) {
      return;
    }

    debounce(fetchBlogPosts({ page: blogMeta.currentPage + 1 }, true), 500);
  }, [blogMeta]);

  const handleBlogPost = async (values = {}) => {
    try {
      const readTime = calculateReadTime(values.content);
      const updatedContent = await uploadPendingFiles(values.content || "");
      const response = await fetch("/api/posts", {
        method: blogPost.id || values.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          values.id
            ? { ...values, content: updatedContent }
            : {
                ...blogPost,
                ...values,
                readTime,
                content: updatedContent,
                excerpt: values.excerpt || generateExcerpt(values.content),
                status: values.status ? "published" : "draft",
                date: values.date || new Date().toISOString().split("T")[0],
                labels:
                  values.labels?.map((label: any) => ({ id: label.value })) ||
                  [],
                metaTags: {
                  ...blogPost.metaTags,
                  ...values.metaTags,
                  keywords:
                    values.metaTags?.keywords?.map(
                      (keyword) => keyword.value
                    ) || [],
                },
              }
        ),
      });

      if (response.ok) {
        await fetchBlogPosts(params);
        setBlogPost({
          title: "",
          content: "",
          excerpt: "",
          date: new Date().toISOString().split("T")[0],
          readTime: "",
          isFeatured: false,
          labels: [],
          metaTags: {},
        });
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

  return (
    <div>
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        fullScreen
        title={`${blogPost.id ? "Edit Post" : "Add Post"}`}
      >
        <div className={"mt-md"}>
          <BlogPostForm
            blogPost={blogPost}
            labels={labels}
            onSubmit={handleBlogPost}
            onFileUpload={handleFileUpload}
          />
        </div>
      </Modal>
      <div className="row">
        <div className="col-lg-2">
          <h3 className="m-0">Posts</h3>
        </div>
        <div className="col-lg-4 col-sm-12 col-xs-12 md-mb-md">
          <Input
            iconLeft={<FiSearch />}
            name={"search"}
            placeholder={"Search posts..."}
            onChange={(value: any) => {
              setSearch(value);
              handleSearch(value);
            }}
            value={search}
          />
        </div>
        <div className="col-lg-6 col-xs-12 text-right">
          <div>
            <Button
              color="primary"
              className="full-width-sm"
              onClick={() => {
                setShowModal(true);
                setBlogPost({});
              }}
            >
              <FiFilePlus />
            </Button>
          </div>
        </div>
      </div>
      <BlogPostTable
        blogPosts={blogPosts}
        blogMeta={blogMeta}
        params={params}
        loadMoreData={loadMoreData}
        onSort={(field, order) =>
          fetchBlogPosts({ ...params, sort: `${field}:${order}` })
        }
        onPageChange={(page) => fetchBlogPosts({ page })}
        onEdit={(post) => {
          setBlogPost(processPost(post));
          setShowModal(true);
        }}
        onDelete={handleDeleteBlogPost}
        onUpdatePost={(post) => handleBlogPost(processPost(post))}
      />
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default BlogPostsPage;
