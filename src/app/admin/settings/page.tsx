"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@/app/contexts/UserContext";
import { useFileManagement } from "@/hooks/useFiles";
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
interface Setting {
  id: number;
  key: string;
  value: string;
}

// SettingsTable Component
const SettingsTable: React.FC<{
  settings: Setting[];
  settingsMeta: any;
  params: any;
  onSort: (field: string, order: string) => void;
  onPageChange: (page: number) => void;
  onDelete: (setting: Setting) => void;
  onUpdateSetting: (setting: any) => void;
  loadMoreData: () => void;
}> = ({
  settings,
  settingsMeta,
  params,
  onSort,
  onPageChange,
  onDelete,
  onUpdateSetting,
  loadMoreData,
}) => {
  return (
    <Table
      onSort={(field, order) => onSort(field, order)}
      params={params}
      onLoadMore={loadMoreData}
      updateEntry={onUpdateSetting}
      onPageChange={(page) => onPageChange(page)}
      fields={[
        {
          name: "id",
          key: "id",
          label: "ID",
          sortable: true,
        },
        {
          name: "Key",
          key: "key",
          label: "Key",
          type: "text",
          rules: [
            yup.string().required("Key is required"),
            yup.string().max(255, "Key is too long"),
          ],
          sortable: true,
        },
        {
          name: "Value",
          key: "value",
          label: "Value",
          editable: true,
          rules: [
            yup.string().required("Value is required"),
            yup.string().max(255, "Value is too long"),
          ],
          type(item: any) {
            if (item.key === "homeImage") {
              return "file";
            }

            if (item.key === "homeDescription") {
              return "textarea";
            }

            if (item.key === "homeImage") {
              return "file";
            }

            return "text";
          },
          sortable: true,
          transform: (value: string, setting: Setting) =>
            setting.key === "homeImage" ? (
              <img
                src={value}
                alt="Home Image"
                style={{ width: "100px", height: "auto" }}
              />
            ) : (
              value
            ),
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
      meta={settingsMeta}
      data={settings}
    />
  );
};

// Main SettingsPage Component
const SettingsPage: React.FC = () => {
  const { uploadFile } = useFileManagement();
  const { user } = useUser();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [settingsMeta, setSettingsMeta] = useState<any>({});
  const [search, setSearch] = useState("");
  const [setting, setSetting] = useState<Partial<Setting>>({
    key: "",
    value: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState({});

  useEffect(() => {
    const params = qs.parse(window.location.search.slice(1));
    fetchSettings(params);
    if (params.search) {
      setSearch(params.search);
    }
  }, []);

  const fetchSettings = async (newParams = {}, append?: boolean) => {
    const setParameters = { ...params, ...newParams };

    try {
      const response = await fetch(
        "/api/settings?" +
          qs.stringify(setParameters, {
            encode: false,
            ignoreQueryPrefix: true,
          })
      );
      if (response.ok) {
        const settingsData = await response.json();
        setSettings(
          append ? [...settings, ...settingsData.data] : settingsData.data
        );
        setSettingsMeta(settingsData.meta);
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
        throw new Error("Failed to fetch settings");
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      setError("Failed to fetch settings. Please try again.");
      setSettings(settings.filter((s) => s.id !== "new"));
    }
  };

  const handleSetting = async (values = {}) => {
    try {
      if (values.id === "new" && (values.key === "" || values.value === "")) {
        return;
      }

      if (values.id === "new") {
        delete values.id;
      }

      if (values.key === "homeImage" && values.value[0]) {
        const file = values.value[0];
        const uploadedFile = await uploadFile(file, {
          type: "landing-image",
        });

        values.value = uploadedFile.path;
      }

      const response = await fetch("/api/settings", {
        method: setting.id || values.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        await fetchSettings(params);
        setSetting({
          key: "",
          value: "",
        });
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to update setting");
      }
    } catch (error) {
      console.error("Failed to update setting:", error);
      setError(error.message || "Failed to update setting. Please try again.");
    }
  };

  const handleDeleteSetting = async (setting: Setting) => {
    const ok = await confirm({
      title: "Are you sure?",
      message: `Do you really want to delete this setting (${setting.key})?`,
    });

    if (!ok) {
      return;
    }

    try {
      if (!setting.id || setting.id === "new") {
        setSettings(settings.filter((s) => s.id !== "new"));
        return;
      }

      const response = await fetch("/api/settings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: setting.id }),
      });
      if (response.ok) {
        await fetchSettings();
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete setting");
      }
    } catch (error) {
      console.error("Failed to delete setting:", error);
      setError(error.message || "Failed to delete setting. Please try again.");
    }
  };

  const handleSearch = useCallback(
    debounce((value) => fetchSettings({ search: value }), 500),
    []
  );

  const loadMoreData = useCallback(() => {
    if (settingsMeta.currentPage >= settingsMeta.totalPages) {
      return;
    }

    debounce(fetchSettings({ page: settingsMeta.currentPage + 1 }, true), 500);
  }, [settingsMeta]);

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
          <h3 className="m-0">Settings</h3>
        </div>
        <div className="col-lg-4 col-sm-12 col-xs-12 md-mb-md">
          <Input
            iconLeft={<FiSearch />}
            name={"search"}
            placeholder={"Search settings..."}
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
                setSettings([
                  {
                    id: "new",
                    key: "",
                    value: "",
                  },
                  ...settings.filter((s) => s.id !== "new"),
                ]);
              }}
            >
              <FiPlusCircle />
            </Button>
          </div>
        </div>
      </div>
      <SettingsTable
        settings={settings}
        settingsMeta={settingsMeta}
        params={params}
        loadMoreData={loadMoreData}
        onSort={(field, order) =>
          fetchSettings({ ...params, sort: `${field}:${order}` })
        }
        onPageChange={(page) => fetchSettings({ page })}
        onEdit={(setting) => {
          setSetting(setting);
        }}
        onDelete={handleDeleteSetting}
        onUpdateSetting={(setting) => handleSetting(setting)}
      />
    </div>
  );
};

export default SettingsPage;
