"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@/app/contexts/UserContext";
import dynamic from "next/dynamic";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import { confirm } from "@/lib/utils-client";
import { FiFilePlus, FiTrash2, FiEdit, FiSearch } from "react-icons/fi";
import Modal from "@/app/components/Modal";
import Button from "@/app/components/Button";
import { FormProvider } from "@/app/components/FormProvider";
import qs from "qs";
import Input from "@/app/components/Input";
import Switch from "@/app/components/Switch";
import Label from "@/app/components/Label";
import { debounce } from "@/lib/utils-client";
import { useFileManagement } from "@/hooks/useFiles";
import "react-markdown-editor-lite/lib/index.css";
import Table from "@/app/components/Table";
import * as yup from "yup";
import Alert from "@/app/components/Alert";

const MdEditor = dynamic(() => import("react-markdown-editor-lite"), {
  ssr: false,
});

// Types
interface Label {
  id: number;
  name: string;
  slug: string;
}

interface Snippet {
  id: number;
  title: string;
  content: string;
  views: number;
  loved: number;
  language: string;
  isFeatured: boolean;
  author: {
    id: number;
    name: string;
  };
  labels: Label[];
}

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
});

const SnippetForm: React.FC<{
  snippet: Partial<Snippet>;
  labels: { value: string; label: string }[];
  languages: { value: string; label: string }[];
  onSubmit: (values: any) => void;
  onFileUpload: (file: File, callback: (url: string) => void) => void;
}> = ({ snippet, labels, languages, onSubmit, onFileUpload }) => {
  return (
    <FormProvider
      onSubmit={onSubmit}
      initialValues={snippet.id ? snippet : {}}
      validationSchema={{
        title: {
          rules: [
            yup.string().required("Title is required"),
            yup.string().max(255, "Title must be at most 255 characters"),
          ],
        },
        content: {
          rules: [yup.string().required("Content is required")],
        },
        language: {
          rules: [
            yup.string().required("Language is required"),
            yup.string().max(50, "Language must be at most 50 characters"),
          ],
        },
      }}
    >
      {({ values, submitForm, setFieldValue }) => (
        <div className="row editor-row">
          <div className="col-lg-8">
            <Input
              name="title"
              type="text"
              maxLength={255}
              placeholder="Title *"
            />
            <div>
              <MdEditor
                style={{ height: "500px" }}
                renderHTML={(text) => mdParser.render(text)}
                onChange={({ text }) => setFieldValue("content", text)}
                value={values.content}
                onImageUpload={onFileUpload}
              />
            </div>
          </div>
          <div className="col-lg-4 xs-mt-md">
            <div>
              <div className="row">
                <div className="col-lg-12">
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
              </div>
              <Input
                type="react-select-creatable"
                name="language"
                label="Language"
                placeholder=""
                flat
                options={languages}
              />
              <Input type="switch" label="Featured" name="isFeatured" />
              <Input
                type="react-select"
                name="labels"
                label="Labels"
                placeholder=""
                options={labels}
                isMulti
              />
            </div>
          </div>
        </div>
      )}
    </FormProvider>
  );
};

// SnippetTable Component
const SnippetTable: React.FC<{
  snippets: Snippet[];
  snippetMeta: any;
  params: any;
  onSort: (field: string, order: string) => void;
  onPageChange: (page: number) => void;
  onEdit: (snippet: Snippet) => void;
  onDelete: (snippet: Snippet) => void;
  onUpdateSnippet: (snippet: any) => void;
  loadMoreData: () => void;
}> = ({
  snippets,
  snippetMeta,
  params,
  onSort,
  onPageChange,
  onEdit,
  onDelete,
  onUpdateSnippet,
  loadMoreData,
}) => {
  return (
    <Table
      onSort={(field, order) => onSort(field, order)}
      params={params}
      onLoadMore={loadMoreData}
      updateEntry={onUpdateSnippet}
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
          name: "Language",
          key: "language",
          label: "Language",
          editable: true,
          type: "text",
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
          transform: (value, snippet) => (
            <Switch
              checked={value}
              onChange={() =>
                onUpdateSnippet({ id: snippet.id, isFeatured: !value })
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
      meta={snippetMeta}
      data={snippets}
    />
  );
};

// Main SnippetsPage Component
const SnippetsPage: React.FC = () => {
  const { user } = useUser();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [snippetMeta, setSnippetMeta] = useState<any>({});
  const [labels, setLabels] = useState<{ value: string; label: string }[]>([]);
  const [languages, setLanguages] = useState<
    { value: string; label: string }[]
  >([]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [snippet, setSnippet] = useState<Partial<Snippet>>({
    title: "",
    content: "",
    language: "",
    isFeatured: false,
    labels: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState({});
  const [pendingFiles, setPendingFiles] = useState<{ [key: string]: File }>({});
  const { uploadFile } = useFileManagement();

  useEffect(() => {
    const params = qs.parse(window.location.search.slice(1));
    fetchSnippets(params);
    if (params.search) {
      setSearch(params.search);
    }
    fetchLabels();
    fetchLanguages();
  }, []);

  const fetchSnippets = async (newParams = {}, append?: boolean) => {
    const setParameters = { ...params, ...newParams };

    try {
      const response = await fetch(
        "/api/snippets?" +
          qs.stringify(setParameters, {
            encode: false,
            ignoreQueryPrefix: true,
          })
      );
      if (response.ok) {
        const snippetsData = await response.json();
        setSnippets(
          append ? [...snippets, ...snippetsData.data] : snippetsData.data
        );
        setSnippetMeta(snippetsData.meta);
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
        throw new Error("Failed to fetch snippets");
      }
    } catch (error) {
      console.error("Failed to fetch snippets:", error);
      setError("Failed to fetch snippets. Please try again.");
    }
  };

  const fetchLabels = async () => {
    try {
      const response = await fetch("/api/labels?limit=-1");
      if (response.ok) {
        const { data } = await response.json();
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

  const fetchLanguages = async () => {
    try {
      const response = await fetch("/api/snippets/languages");
      if (response.ok) {
        const languages = await response.json();
        setLanguages(
          languages.map((lang: string) => ({
            value: lang,
            label: lang,
          }))
        );
      } else {
        throw new Error("Failed to fetch languages");
      }
    } catch (error) {
      console.error("Failed to fetch languages:", error);
      setError("Failed to fetch languages. Please try again.");
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
        resolve(blobUrl);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const uploadPendingFiles = async (content: string): Promise<string> => {
    let updatedContent = content;
    for (const [blobUrl, file] of Object.entries(pendingFiles)) {
      try {
        const uploadedFile = await uploadFile(file, {
          type: "snippet-attachment",
        });
        updatedContent = updatedContent.replace(
          new RegExp(blobUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          uploadedFile.path
        );
        URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error("Failed to upload file:", error);
      }
    }
    setPendingFiles({});
    return updatedContent;
  };

  const processSnippet = (snippet: any) => {
    const newSnippet = { ...snippet };
    if (newSnippet.labels) {
      newSnippet.labels = snippet.labels.map((label: any) => ({
        value: label.id,
        label: label.name,
      }));
    }
    if (newSnippet.language?.value) {
      newSnippet.language = newSnippet.language.value;
    }
    return newSnippet;
  };

  const handleDeleteSnippet = async (snippet: any) => {
    const ok = await confirm({
      title: "Are you sure?",
      message: `Do you really want to delete this snippet (${snippet.title})?`,
    });

    if (!ok) {
      return;
    }

    try {
      const response = await fetch("/api/snippets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: snippet.id }),
      });
      if (response.ok) {
        await fetchSnippets();
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete snippet");
      }
    } catch (error) {
      console.error("Failed to delete snippet:", error);
      setError(error.message || "Failed to delete snippet. Please try again.");
    }
  };

  const handleSearch = useCallback(
    debounce((value) => fetchSnippets({ search: value }), 500),
    []
  );

  const loadMoreData = useCallback(() => {
    if (snippetMeta.currentPage >= snippetMeta.totalPages) {
      return;
    }

    debounce(fetchSnippets({ page: snippetMeta.currentPage + 1 }, true), 500);
  }, [snippetMeta]);

  const handleSnippet = async (values = {}) => {
    try {
      const updatedContent = await uploadPendingFiles(values.content || "");
      const response = await fetch("/api/snippets", {
        method: snippet.id || values.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          values.id
            ? {
                ...values,
                ...(values.content ? { content: updatedContent } : {}),
                ...(values.labels?.length
                  ? {
                      labels: values.labels.map((label) => ({
                        id: label.value,
                      })),
                    }
                  : {}),
              }
            : {
                ...snippet,
                ...values,
                content: updatedContent,
                labels:
                  values.labels?.map((label: any) => ({ id: label.value })) ||
                  [],
              }
        ),
      });

      if (response.ok) {
        await fetchSnippets(params);
        setSnippet({
          title: "",
          content: "",
          language: "",
          isFeatured: false,
          labels: [],
        });
        setShowModal(false);
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to update snippet");
      }
    } catch (error) {
      console.error("Failed to update snippet:", error);
      setError(error.message || "Failed to update snippet. Please try again.");
    }
  };

  return (
    <div>
      {error && (
        <div className="row">
          <div className="col-lg-12">
            <div>
              <Alert type="error">{error}</Alert>
            </div>
          </div>
        </div>
      )}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        fullScreen
        title={`${snippet.id ? "Edit Snippet" : "Add Snippet"}`}
      >
        <div className={"mt-md"}>
          <SnippetForm
            snippet={snippet}
            labels={labels}
            languages={languages}
            onSubmit={handleSnippet}
            onFileUpload={handleFileUpload}
          />
        </div>
      </Modal>
      <div className="row">
        <div className="col-lg-3">
          <h3 className="m-0">Snippets</h3>
        </div>
        <div className="col-lg-3 col-sm-12 col-xs-12 md-mb-md">
          <Input
            iconLeft={<FiSearch />}
            name={"search"}
            placeholder={"Search snippets..."}
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
                setSnippet({});
              }}
            >
              <FiFilePlus />
            </Button>
          </div>
        </div>
      </div>
      <SnippetTable
        snippets={snippets}
        snippetMeta={snippetMeta}
        params={params}
        loadMoreData={loadMoreData}
        onSort={(field, order) =>
          fetchSnippets({ ...params, sort: `${field}:${order}` })
        }
        onPageChange={(page) => fetchSnippets({ page })}
        onEdit={(snippet) => {
          setSnippet(processSnippet(snippet));
          setShowModal(true);
        }}
        onDelete={handleDeleteSnippet}
        onUpdateSnippet={(snippet) => handleSnippet(processSnippet(snippet))}
      />
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default SnippetsPage;
