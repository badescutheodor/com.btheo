"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@/app/contexts/UserContext";
import { confirm } from "@/lib/utils-client";
import { FiEye, FiTrash2, FiSearch } from "react-icons/fi";
import Button from "@/app/components/Button";
import qs from "qs";
import Input from "@/app/components/Input";
import Table from "@/app/components/Table";
import Modal from "@/app/components/Modal";
import { debounce } from "@/lib/utils-client";
import Alert from "@/app/components/Alert";
import moment from "moment";

// Types
interface GuestbookEntry {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
  location: string;
  isApproved: boolean;
  ipAddress: string;
  userAgent: string;
  website: string;
}

// GuestbookTable Component
const GuestbookTable: React.FC<{
  entries: GuestbookEntry[];
  entriesMeta: any;
  params: any;
  onSort: (field: string, order: string) => void;
  onPageChange: (page: number) => void;
  onDelete: (entry: GuestbookEntry) => void;
  onView: (entry: GuestbookEntry) => void;
  loadMoreData: () => void;
}> = ({
  entries,
  entriesMeta,
  params,
  onSort,
  onPageChange,
  onDelete,
  onView,
  loadMoreData,
}) => {
  return (
    <Table
      onSort={(field, order) => onSort(field, order)}
      params={params}
      onLoadMore={loadMoreData}
      onPageChange={(page) => onPageChange(page)}
      fields={[
        { name: "Name", key: "name", label: "Name", sortable: true },
        { name: "Email", key: "email", label: "Email", sortable: true },
        {
          name: "Date",
          key: "createdAt",
          label: "Date",
          sortable: true,
          transform: (value) => moment(value).format("YYYY-MM-DD HH:mm"),
        },
        {
          name: "Location",
          key: "location",
          label: "Location",
          sortable: true,
          transform: (value) => value || "Unknown",
        },
      ]}
      actions={[
        {
          key: "view",
          label: (
            <>
              <FiEye className="mr-xs" />
              View
            </>
          ),
          onClick: (item: any) => onView(item),
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
      meta={entriesMeta}
      data={entries}
    />
  );
};

const GuestbookAdminPage: React.FC = () => {
  const { user } = useUser();
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [entriesMeta, setEntriesMeta] = useState<any>({});
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState({});
  const [selectedEntry, setSelectedEntry] = useState<GuestbookEntry | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const params = qs.parse(window.location.search.slice(1));
    fetchEntries(params);
    if (params.search) {
      setSearch(params.search);
    }
  }, []);

  const fetchEntries = async (newParams = {}, append?: boolean) => {
    const setParameters = { ...params, ...newParams };

    try {
      const response = await fetch(
        "/api/guestbook?" +
          qs.stringify(setParameters, {
            encode: false,
            ignoreQueryPrefix: true,
          })
      );
      if (response.ok) {
        const entriesData = await response.json();
        setEntries(
          append ? [...entries, ...entriesData.data] : entriesData.data
        );
        setEntriesMeta(entriesData.meta);
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
        throw new Error("Failed to fetch guestbook entries");
      }
    } catch (error) {
      console.error("Failed to fetch guestbook entries:", error);
      setError("Failed to fetch guestbook entries. Please try again.");
    }
  };

  const handleDeleteEntry = async (entry: GuestbookEntry) => {
    const ok = await confirm({
      title: "Are you sure?",
      message: `Do you really want to delete this guestbook entry by ${entry.name}?`,
    });

    if (!ok) {
      return;
    }

    try {
      const response = await fetch("/api/guestbook", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id }),
      });
      if (response.ok) {
        await fetchEntries(params);
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete guestbook entry");
      }
    } catch (error) {
      console.error("Failed to delete guestbook entry:", error);
      setError("Failed to delete guestbook entry. Please try again.");
    }
  };

  const handleViewEntry = (entry: GuestbookEntry) => {
    setSelectedEntry(entry);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEntry(null);
  };

  const handleSearch = useCallback(
    debounce((value) => fetchEntries({ search: value }), 500),
    []
  );

  const loadMoreData = useCallback(() => {
    if (entriesMeta.currentPage >= entriesMeta.totalPages) {
      return;
    }

    debounce(fetchEntries({ page: entriesMeta.currentPage + 1 }, true), 500);
  }, [entriesMeta]);

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
        <div className="col-lg-3">
          <h3 className="m-0">Guestbook</h3>
        </div>
        <div className="col-lg-4 col-sm-12 col-xs-12 md-mb-md">
          <Input
            iconLeft={<FiSearch />}
            name={"search"}
            placeholder={"Search entries..."}
            onChange={(value: any) => {
              setSearch(value);
              handleSearch(value);
            }}
            value={search}
          />
        </div>
      </div>
      <GuestbookTable
        entries={entries}
        entriesMeta={entriesMeta}
        params={params}
        loadMoreData={loadMoreData}
        onSort={(field, order) =>
          fetchEntries({ ...params, sort: `${field}:${order}` })
        }
        onPageChange={(page) => fetchEntries({ page })}
        onDelete={handleDeleteEntry}
        onView={handleViewEntry}
      />
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Guestbook Details"
      >
        {selectedEntry && (
          <div className="mt-lg">
            <div className="row">
              <div className="col-lg-6 col-md-6 col-sm-12 mb-sm-md">
                <Input
                  label="Name"
                  name="name"
                  value={selectedEntry.name}
                  readOnly
                />
              </div>
              <div className="col-lg-6 col-md-6 col-sm-12">
                <Input
                  label="Email"
                  name="email"
                  value={selectedEntry.email}
                  readOnly
                />
              </div>
            </div>
            <div className="row">
              <div className="col-12">
                <Input
                  label="Message"
                  name="message"
                  value={selectedEntry.message}
                  type="textarea"
                  readOnly
                />
              </div>
            </div>
            <div className="row">
              <div className="col-lg-6 col-md-6 col-sm-12 mb-sm-md">
                <Input
                  label="Date"
                  name="createdAt"
                  value={moment(selectedEntry.createdAt).format(
                    "YYYY-MM-DD HH:mm"
                  )}
                  readOnly
                />
              </div>
              <div className="col-lg-6 col-md-6 col-sm-12">
                <Input
                  label="Location"
                  name="location"
                  value={selectedEntry.location}
                  readOnly
                />
              </div>
            </div>
            <div className="row">
              <div className="col-lg-6 col-md-6 col-sm-12 mb-sm-md">
                <Input
                  label="Approved"
                  name="isApproved"
                  value={selectedEntry.isApproved ? "Yes" : "No"}
                  readOnly
                />
              </div>
              <div className="col-lg-6 col-md-6 col-sm-12">
                <Input
                  label="IP Address"
                  name="ipAddress"
                  value={selectedEntry.ipAddress}
                  readOnly
                />
              </div>
            </div>
            <div className="row">
              <div className="col-lg-6 col-md-6 col-sm-12 mb-sm-md">
                <Input
                  label="User Agent"
                  name="userAgent"
                  value={selectedEntry.userAgent}
                  readOnly
                />
              </div>
              <div className="col-lg-6 col-md-6 col-sm-12">
                <Input
                  label="Website"
                  name="website"
                  value={selectedEntry.website}
                  readOnly
                />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GuestbookAdminPage;
