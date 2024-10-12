"use client";
import React from "react";
import { useUser } from "../contexts/UserContext";

const AdminMenu = () => {
  const { user } = useUser();

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <nav>
      <ul>
        <li>
          <a href="/admin">Dashboard</a>
        </li>
        <li>
          <a href="/admin/users">Users</a>
        </li>
        <li>
          <a href="/admin/snippets">Snippets</a>
        </li>
        <li>
          <a href="/admin/posts">Blog Posts</a>
        </li>
        <li>
          <a href="/admin/guestbook">Guestbook</a>
        </li>
        <li>
          <a href="/admin/labels">Labels</a>
        </li>
        <li>
          <a href="/admin/settings">Settings</a>
        </li>
      </ul>
    </nav>
  );
};

export default AdminMenu;
