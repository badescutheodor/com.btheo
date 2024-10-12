"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@/app/contexts/UserContext";
import { useFileManagement } from "@/hooks/useFiles";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

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

const UsersPage = () => {
  const { user } = useUser();
  const { files, uploadFile, deleteFile } = useFileManagement();
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState<
    Omit<User, "id" | "avatar"> & { avatar?: File }
  >({
    name: "",
    email: "",
    role: "",
    password: "",
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newUserCrop, setNewUserCrop] = useState<Crop>({
    unit: "px",
    width: 180,
    height: 180,
  });
  const [editUserCrop, setEditUserCrop] = useState<Crop>({
    unit: "px",
    width: 180,
    height: 180,
  });
  const [newUserCompletedCrop, setNewUserCompletedCrop] =
    useState<PixelCrop | null>(null);
  const [editUserCompletedCrop, setEditUserCompletedCrop] =
    useState<PixelCrop | null>(null);
  const [newUserImageSrc, setNewUserImageSrc] = useState<string | null>(null);
  const [editUserImageSrc, setEditUserImageSrc] = useState<string | null>(null);
  const [newUserImageRef, setNewUserImageRef] =
    useState<HTMLImageElement | null>(null);
  const [editUserImageRef, setEditUserImageRef] =
    useState<HTMLImageElement | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    isNewUser: boolean
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (isNewUser) {
          setNewUserImageSrc(reader.result as string);
        } else {
          setEditUserImageSrc(reader.result as string);
        }
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

  const handleImageUpload = useCallback(
    async (isNewUser: boolean) => {
      const imageRef = isNewUser ? newUserImageRef : editUserImageRef;
      const completedCrop = isNewUser
        ? newUserCompletedCrop
        : editUserCompletedCrop;

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
    },
    [
      newUserImageRef,
      editUserImageRef,
      newUserCompletedCrop,
      editUserCompletedCrop,
      uploadFile,
      getCroppedImg,
    ]
  );

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const uploadedAvatar = await handleImageUpload(true);
      const userToAdd = { ...newUser };
      if (uploadedAvatar) {
        userToAdd.avatar = uploadedAvatar;
      }
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userToAdd),
      });
      if (response.ok) {
        fetchUsers();
        setNewUser({ name: "", email: "", role: "", password: "" });
        setNewUserImageSrc(null);
      }
    } catch (error) {
      console.error("Failed to add user:", error);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const userToEdit = { ...editingUser };
    if (!userToEdit.password) delete userToEdit.password;
    const confirmation = confirm("Are you sure you want to save changes?");
    if (!confirmation) return;

    try {
      const uploadedAvatar = await handleImageUpload(false);
      if (uploadedAvatar) {
        userToEdit.avatar = uploadedAvatar;
      }
      const response = await fetch(`/api/users/${userToEdit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userToEdit),
      });
      if (response.ok) {
        fetchUsers();
        setEditingUser(null);
        setEditUserImageSrc(null);
      }
    } catch (error) {
      console.error("Failed to edit user:", error);
    }
  };

  const handleDeleteUser = async (id: number) => {
    const confirmation = confirm("Are you sure you want to delete the user?");
    if (!confirmation) return;

    try {
      const response = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  return (
    <div>
      <h1>Users Management</h1>

      <h2>Add New User</h2>
      <form onSubmit={handleAddUser}>
        <input
          type="text"
          placeholder="Name"
          value={newUser.name}
          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
        />
        <input
          type="email"
          placeholder="Email"
          value={newUser.email}
          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
        />
        <input
          type="password"
          placeholder="Password"
          value={newUser.password}
          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
        />
        <select
          value={newUser.role}
          onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileSelect(e, true)}
        />
        {newUserImageSrc && (
          <ReactCrop
            crop={newUserCrop}
            locked
            onChange={(c) => setNewUserCrop(c)}
            onComplete={(c) => setNewUserCompletedCrop(c)}
            aspect={1}
          >
            <img
              ref={(ref) => setNewUserImageRef(ref)}
              src={newUserImageSrc}
              style={{ maxWidth: "100%" }}
              alt="Crop me"
            />
          </ReactCrop>
        )}
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit">Add User</button>
      </form>

      <h2>Users List</h2>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            {editingUser && editingUser.id === user.id ? (
              <form onSubmit={handleEditUser}>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, name: e.target.value })
                  }
                />
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }
                />
                <select
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, role: e.target.value })
                  }
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, false)}
                />
                {editUserImageSrc && (
                  <ReactCrop
                    locked
                    crop={editUserCrop}
                    onChange={(c) => setEditUserCrop(c)}
                    onComplete={(c) => setEditUserCompletedCrop(c)}
                    aspect={1}
                  >
                    <img
                      ref={(ref) => setEditUserImageRef(ref)}
                      src={editUserImageSrc}
                      style={{ maxWidth: "100%" }}
                      alt="Crop me"
                    />
                  </ReactCrop>
                )}
                {editingUser.avatar && !editUserImageSrc && (
                  <img
                    src={editingUser.avatar.url}
                    alt="User avatar"
                    width="50"
                    height="50"
                  />
                )}
                {error && <p style={{ color: "red" }}>{error}</p>}
                <button type="submit">Save</button>
                <button onClick={() => setEditingUser(null)}>Cancel</button>
              </form>
            ) : (
              <>
                {user.avatar && (
                  <img
                    src={user.avatar.url}
                    alt={`${user.name}'s avatar`}
                    width="50"
                    height="50"
                  />
                )}
                {user.name} ({user.email}) - {user.role}
                <button onClick={() => setEditingUser(user)}>Edit</button>
                <button onClick={() => handleDeleteUser(user.id)}>
                  Delete
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UsersPage;
