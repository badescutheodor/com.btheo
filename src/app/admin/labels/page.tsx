"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@/app/contexts/UserContext";
import { confirm } from "@/lib/utils-client";
import { FiPlusCircle, FiTrash2, FiSearch } from "react-icons/fi";
import Button from "@/app/components/Button";
import qs from "qs";
import Input from "@/app/components/Input";
import Table from "@/app/components/Table";
import { debounce } from "@/lib/utils-client";
import * as yup from "yup";
import Alert from "@/app/components/Alert";

// Types
interface Label {
  id: number;
  name: string;
  slug: string;
}

// LabelsTable Component
const LabelsTable: React.FC<{
  labels: Label[];
  labelsMeta: any;
  params: any;
  onSort: (field: string, order: string) => void;
  onPageChange: (page: number) => void;
  onDelete: (label: Label) => void;
  onUpdateLabel: (label: any) => void;
  loadMoreData: () => void;
}> = ({
  labels,
  labelsMeta,
  params,
  onSort,
  onPageChange,
  onDelete,
  onUpdateLabel,
  loadMoreData,
}) => {
  return (
    <Table
      onSort={(field, order) => onSort(field, order)}
      params={params}
      onLoadMore={loadMoreData}
      updateEntry={onUpdateLabel}
      onPageChange={(page) => onPageChange(page)}
      fields={[
        {
          name: "id",
          key: "id",
          label: "ID",
          sortable: true,
        },
        {
          name: "Name",
          key: "name",
          label: "Name",
          editable: true,
          type: "text",
          sortable: true,
          rules: [
            yup.string().required("Name is required"),
            yup.string().max(50, "Name must be at most 50 characters"),
          ],
        },
        {
          name: "Slug",
          key: "slug",
          label: "Slug",
          editable: true,
          type: "text",
          sortable: true,
          rules: [
            yup.string().required("Slug is required"),
            yup.string().max(50, "Slug must be at most 50 characters"),
            yup
              .string()
              .matches(
                /^[a-z0-9-]+$/,
                "Slug must contain only lowercase letters, numbers, and hyphens"
              ),
          ],
        },
      ]}
      actions={[
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
      meta={labelsMeta}
      data={labels}
    />
  );
};

// Main LabelsPage Component
const LabelsPage: React.FC = () => {
  const { user } = useUser();
  const [labels, setLabels] = useState<Label[]>([]);
  const [labelsMeta, setLabelsMeta] = useState<any>({});
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState({});

  useEffect(() => {
    const params = qs.parse(window.location.search.slice(1));
    fetchLabels(params);
    if (params.search) {
      setSearch(params.search);
    }
  }, []);

  const fetchLabels = async (newParams = {}, append?: boolean) => {
    const setParameters = { ...params, ...newParams };

    try {
      const response = await fetch(
        "/api/labels?" +
          qs.stringify(setParameters, {
            encode: false,
            ignoreQueryPrefix: true,
          })
      );
      if (response.ok) {
        const labelsData = await response.json();
        setLabels(append ? [...labels, ...labelsData.data] : labelsData.data);
        setLabelsMeta(labelsData.meta);
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
        throw new Error("Failed to fetch labels");
      }
    } catch (error) {
      console.error("Failed to fetch labels:", error);
      setError("Failed to fetch labels. Please try again.");
    }
  };

  const handleLabel = async (values = {}) => {
    try {
      if (values.id === "new" && (values.name === "" || values.slug === "")) {
        return;
      }

      if (values.id === "new") {
        delete values.id;
      }

      const response = await fetch("/api/labels", {
        method: values.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        await fetchLabels(params);
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to update label");
      }
    } catch (error) {
      console.error("Failed to update label:", error);
      setError(error.message || "Failed to update label. Please try again.");
      setLabels(labels.filter((l) => l.id !== "new"));
    }
  };

  const handleDeleteLabel = async (label: Label) => {
    const ok = await confirm({
      title: "Are you sure?",
      message: `Do you really want to delete this label (${label.name})?`,
    });

    if (!ok) {
      return;
    }

    try {
      if (!label.id || label.id === "new") {
        setLabels(labels.filter((l) => l.id !== "new"));
        return;
      }

      const response = await fetch("/api/labels", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: label.id }),
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

  const handleSearch = useCallback(
    debounce((value) => fetchLabels({ search: value }), 500),
    []
  );

  const loadMoreData = useCallback(() => {
    if (labelsMeta.currentPage >= labelsMeta.totalPages) {
      return;
    }

    debounce(fetchLabels({ page: labelsMeta.currentPage + 1 }, true), 500);
  }, [labelsMeta]);

  if (!user || user.role !== "admin") {
    return <div>You do not have permission to access this page.</div>;
  }

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
      <div className="row">
        <div className="col-lg-2">
          <h3 className="m-0">Labels</h3>
        </div>
        <div className="col-lg-4 col-sm-12 col-xs-12 md-mb-md">
          <Input
            iconLeft={<FiSearch />}
            name={"search"}
            placeholder={"Search labels..."}
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
                setLabels([
                  {
                    id: "new",
                    name: "",
                    slug: "",
                  },
                  ...labels.filter((l) => l.id !== "new"),
                ]);
              }}
            >
              <FiPlusCircle />
            </Button>
          </div>
        </div>
      </div>
      <LabelsTable
        labels={labels}
        labelsMeta={labelsMeta}
        params={params}
        loadMoreData={loadMoreData}
        onSort={(field, order) =>
          fetchLabels({ ...params, sort: `${field}:${order}` })
        }
        onPageChange={(page) => fetchLabels({ page })}
        onDelete={handleDeleteLabel}
        onUpdateLabel={(label) => handleLabel(label)}
      />
    </div>
  );
};

export default LabelsPage;
