"use client";
import React, { useState, useEffect, useCallback } from "react";
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

const MdEditor = dynamic(() => import("react-markdown-editor-lite"), {
  ssr: false,
});

import "react-markdown-editor-lite/lib/index.css";
import Table from "@/app/components/Table";

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

// Utility functions
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

const calculateReadTime = (content: string): string => {
  const wordsPerMinute = 200;
  content = content || "";
  const wordCount = content.trim().split(/\s+/).length;
  const readTime = Math.ceil(wordCount / wordsPerMinute);
  return `${readTime} min read`;
};

// BlogPostForm Component
const BlogPostForm: React.FC<{
  blogPost: Partial<BlogPost>;
  labels: { value: string; label: string }[];
  onSubmit: (values: any) => void;
}> = ({ blogPost, labels, onSubmit }) => {
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
            <div className="h-full">
              <MdEditor
                style={{
                  height: "100%",
                  minHeight: 500,
                  marginBottom: 30,
                }}
                autoFocus
                renderHTML={(text) => mdParser.render(text)}
                onChange={(value) => setFieldValue("content", value.text)}
                value={values.content}
              />
            </div>
          </div>
          <div className="col-lg-4 xs-mt-md">
            <div>
              <div className="row">
                <div className="col-lg-6">
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
                <div className="col-lg-6">
                  <Button
                    type="submit"
                    color="primary"
                    fullWidth
                    inverted
                    className="mb-lg"
                  >
                    <FiEye className="mr-xs" />
                    Preview
                  </Button>
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
  onUpdatePost: (post: BlogPost) => void;
}> = ({
  blogPosts,
  blogMeta,
  params,
  onSort,
  onPageChange,
  onEdit,
  onDelete,
  onUpdatePost,
}) => {
  return (
    <Table
      onSort={(field, order) => onSort(field, order)}
      params={params}
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
          sortable: true,
          style: {
            maxWidth: 120,
          },
        },
        {
          name: "Date",
          key: "date",
          label: "Date",
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
            value.map((label: any) => (
              <Label key={label.id}>{label.name}</Label>
            )),
        },
        {
          name: "Is Featured",
          key: "isFeatured",
          label: "Is Featured",
          transform: (value, post) => (
            <Switch
              checked={value}
              onChange={() => onUpdatePost({ ...post, isFeatured: !value })}
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
                  ...post,
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

  useEffect(() => {
    const params = qs.parse(window.location.search);
    fetchBlogPosts(params);
    fetchLabels();
  }, []);

  const fetchBlogPosts = async (newParams = {}) => {
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
        setBlogPosts(posts.data);
        setBlogMeta(posts.meta);
        setParams(setParameters);
        //window.location.search = qs.stringify(setParameters, { encode: false });
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

  const handleBlogPost = async (values = {}) => {
    try {
      const readTime = calculateReadTime(values.content);
      const response = await fetch("/api/posts", {
        method: blogPost.id || values.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...blogPost,
          ...values,
          readTime,
          content: values.content || "",
          excerpt:
            values.excerpt || (values.content || "").slice(0, 200) + "...",
          status: values.status || "draft",
          date: values.date || new Date().toISOString().split("T")[0],
          labels:
            values.labels?.map((label: any) => ({ id: label.value })) || [],
          metaTags: {
            ...blogPost.metaTags,
            ...values.metaTags,
            keywords:
              values.metaTags?.keywords?.map((keyword) => keyword.value) || [],
          },
        }),
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

  const processPost = (post: any) => {
    const newPost = { ...post };
    newPost.labels = post.labels.map((label: any) => ({
      value: label.id,
      label: label.name,
    }));
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
          />
        </div>
      </Modal>
      <div className="row">
        <div className="col-lg-2">
          <h3 className="m-0">Posts</h3>
        </div>
        <div className="col-lg-4 col-xs-12">
          <Input
            iconLeft={<FiSearch />}
            name={"search"}
            placeholder={"Search posts..."}
            onChange={(value) => {
              setSearch(value);
              handleSearch(value);
            }}
            value={search}
          />
        </div>
        <div className="col-6 text-right">
          <div>
            <Button
              onClick={() => {
                setShowModal(true);
                setBlogPost({});
              }}
            >
              <FiFilePlus className={"mr-xs"} /> Create new post
            </Button>
          </div>
        </div>
      </div>
      <BlogPostTable
        blogPosts={blogPosts}
        blogMeta={blogMeta}
        params={params}
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
