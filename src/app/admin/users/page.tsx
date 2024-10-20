"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@/app/contexts/UserContext";
import { useFileManagement } from "@/hooks/useFiles";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { FiUserPlus, FiEdit, FiTrash2, FiSearch } from "react-icons/fi";
import Modal from "@/app/components/Modal";
import Button from "@/app/components/Button";
import { FormProvider } from "@/app/components/FormProvider";
import Input from "@/app/components/Input";
import Table from "@/app/components/Table";
import { confirm } from "@/lib/utils-client";
import { debounce } from "@/lib/utils-client";
import qs from "qs";
import * as yup from "yup";
import Alert from "@/app/components/Alert";

interface Upload {
  id: number;
  url: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar?: Upload;
  password?: string;
}

const UserForm: React.FC<{
  user: Partial<User>;
  onSubmit: (values: any) => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  imageSrc: string | null;
  crop: Crop;
  setCrop: (crop: Crop) => void;
  setCompletedCrop: (crop: PixelCrop) => void;
  setImageRef: (ref: HTMLImageElement | null) => void;
}> = ({
  user,
  onSubmit,
  onFileSelect,
  imageSrc,
  crop,
  setCrop,
  setCompletedCrop,
  setImageRef,
}) => {
  return (
    <FormProvider
      onSubmit={onSubmit}
      initialValues={user}
      validationSchema={{
        name: {
          rules: [
            yup.string().required("Name is required"),
            yup.string().max(255, "Name must be at most 255 characters"),
          ],
        },
        email: {
          rules: [
            yup.string().required("Email is required"),
            yup.string().email("Invalid email format"),
          ],
        },
        role: {
          rules: [yup.string().required("Role is required")],
        },
      }}
    >
      {({ values, submitForm, setFieldValue }) => (
        <div className="row">
          <div className="col-lg-6">
            <Input name="name" type="text" label={"Name *"} autoFocus />
          </div>
          <div className="col-lg-6">
            <Input name="email" type="email" label="Email *" />
          </div>
          <div className="col-lg-6">
            <Input
              name="password"
              type="password"
              placeholder="Password"
              label={"Password"}
            />
          </div>
          <div className="col-lg-6">
            <Input
              type="select"
              name="role"
              label="Role"
              options={[
                { value: "user", label: "User" },
                { value: "admin", label: "Admin" },
              ]}
            />
          </div>
          <div className="col-lg-12">
            <Input
              type="file"
              accept="image/*"
              label="Avatar"
              onChange={onFileSelect}
            />
            {imageSrc && (
              <ReactCrop
                crop={crop}
                locked
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
              >
                <img
                  ref={(ref) => setImageRef(ref)}
                  src={imageSrc}
                  style={{ maxWidth: "100%" }}
                  alt="Crop me"
                />
              </ReactCrop>
            )}
            {!imageSrc && user.avatar && (
              <img
                src={user.avatar}
                alt="User avatar"
                width="180"
                height="180"
              />
            )}
            <Input name="bio" type="textarea" autoScaleHeight label={"Bio"} />
          </div>
          <div className="col-lg-12 mt-md">
            <div>
              <Button
                type="submit"
                color="primary"
                onClick={submitForm}
                fullWidth
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </FormProvider>
  );
};

const UsersPage: React.FC = () => {
  const { user, setUser } = useUser();
  const { uploadFile } = useFileManagement();
  const [users, setUsers] = useState<User[]>([]);
  const [userMeta, setUserMeta] = useState<any>({});
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState({});
  const [crop, setCrop] = useState<Crop>({
    unit: "px",
    width: 180,
    height: 180,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const params = qs.parse(window.location.search.slice(1));
    fetchUsers(params);
    if (params.search) {
      setSearch(params.search);
    }
  }, []);

  const fetchUsers = async (newParams = {}, append?: boolean) => {
    const setParameters = { ...params, ...newParams };

    try {
      const response = await fetch(
        "/api/users?" +
          qs.stringify(setParameters, {
            encode: false,
            ignoreQueryPrefix: true,
          })
      );
      if (response.ok) {
        const usersData = await response.json();
        setUsers(append ? [...users, ...usersData.data] : usersData.data);
        setUserMeta(usersData.meta);
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
        throw new Error("Failed to fetch users");
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setError("Failed to fetch users. Please try again.");
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCroppedImg = useCallback(
    (image: HTMLImageElement, crop: PixelCrop) => {
      const canvas = document.createElement("canvas");
      canvas.width = 180;
      canvas.height = 180;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        ctx.drawImage(
          image,
          crop.x * scaleX,
          crop.y * scaleY,
          crop.width * scaleX,
          crop.height * scaleY,
          0,
          0,
          180,
          180
        );
      }

      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas is empty"));
          }
        }, "image/jpeg");
      });
    },
    []
  );

  const handleImageUpload = useCallback(async () => {
    if (imageRef && completedCrop) {
      try {
        const croppedImageBlob = await getCroppedImg(imageRef, completedCrop);
        const file = new File([croppedImageBlob], "cropped_image.jpg", {
          type: "image/jpeg",
        });
        const uploadedFile = await uploadFile(file, { type: "avatar" });
        return uploadedFile;
      } catch (error) {
        console.error("Failed to upload file:", error);
        setError("Failed to upload file. Please try again.");
        return null;
      }
    }
    return null;
  }, [imageRef, completedCrop, uploadFile, getCroppedImg]);

  const handleUser = async (values: any) => {
    try {
      const uploadedAvatar = await handleImageUpload();
      const userToSave = { ...values };
      if (uploadedAvatar) {
        userToSave.avatar = uploadedAvatar;
      }
      if (!userToSave.password) delete userToSave.password;

      const response = await fetch(
        userToSave.id ? `/api/users/${userToSave.id}` : "/api/users",
        {
          method: userToSave.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userToSave),
        }
      );

      if (response.ok) {
        await fetchUsers(params);
        setEditingUser(null);
        setImageSrc(null);
        setShowModal(false);

        if (user.id === userToSave.id) {
          setUser({
            ...user,
            ...userToSave,
          });
        }
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to save user");
      }
    } catch (error) {
      console.error("Failed to save user:", error);
      setError(error.message || "Failed to save user. Please try again.");
    }
  };

  const handleDeleteUser = async (user: User) => {
    const ok = await confirm({
      title: "Are you sure?",
      message: `Do you really want to delete this user (${user.name})?`,
    });

    if (!ok) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await fetchUsers();
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete user");
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
      setError(error.message || "Failed to delete user. Please try again.");
    }
  };

  const handleSearch = useCallback(
    debounce((value) => fetchUsers({ search: value }), 500),
    []
  );

  const loadMoreData = useCallback(() => {
    if (userMeta.currentPage >= userMeta.totalPages) {
      return;
    }

    debounce(fetchUsers({ page: userMeta.currentPage + 1 }, true), 500);
  }, [userMeta]);

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
        onClose={() => {
          setShowModal(false);
          setEditingUser(null);
          setImageSrc(null);
        }}
        style={{ maxWidth: "600px" }}
        title={`${editingUser ? "Edit User" : "Add User"}`}
      >
        <div className={"mt-md"}>
          <UserForm
            user={editingUser || {}}
            onSubmit={handleUser}
            onFileSelect={handleFileSelect}
            imageSrc={imageSrc}
            crop={crop}
            setCrop={setCrop}
            setCompletedCrop={setCompletedCrop}
            setImageRef={setImageRef}
          />
        </div>
      </Modal>
      <div className="row">
        <div className="col-lg-2">
          <h3 className="m-0">Users</h3>
        </div>
        <div className="col-lg-4 col-sm-12 col-xs-12 md-mb-md">
          <Input
            iconLeft={<FiSearch />}
            name={"search"}
            placeholder={"Search users..."}
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
                setEditingUser(null);
              }}
            >
              <FiUserPlus />
            </Button>
          </div>
        </div>
      </div>
      <Table
        onSort={(field, order) =>
          fetchUsers({ ...params, sort: `${field}:${order}` })
        }
        params={params}
        onLoadMore={loadMoreData}
        onPageChange={(page) => fetchUsers({ page })}
        fields={[
          {
            name: "id",
            key: "id",
            label: "ID",
            sortable: true,
          },
          {
            name: "Avatar",
            key: "avatar",
            label: "Avatar",
            transform: (value) =>
              value ? (
                <img
                  src={value}
                  alt="User avatar"
                  width="30"
                  height="30"
                  style={{ borderRadius: "50%" }}
                />
              ) : (
                "N/A"
              ),
          },
          {
            name: "Name",
            key: "name",
            label: "Name",
            sortable: true,
            editable: true,
          },
          {
            name: "Email",
            key: "email",
            label: "Email",
            sortable: true,
            editable: true,
          },
          {
            name: "Role",
            key: "role",
            label: "Role",
            sortable: true,
            style: { textTransform: "capitalize" },
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
            onClick: (item: User) => {
              setEditingUser(item);
              setShowModal(true);
            },
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
            onClick: handleDeleteUser,
          },
        ]}
        meta={userMeta}
        data={users}
      />
    </div>
  );
};

export default UsersPage;
