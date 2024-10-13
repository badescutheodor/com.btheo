"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "../contexts/UserContext";
import {
  FiHome,
  FiUsers,
  FiCode,
  FiFileText,
  FiBook,
  FiTag,
  FiSettings,
  FiChevronRight,
} from "react-icons/fi";
import { IconType } from "react-icons";

interface MenuItem {
  href: string;
  icon: IconType;
  label: string;
}

const AdminMenu: React.FC = () => {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  if (!user || user.role !== "admin") {
    return null;
  }

  const menuItems: MenuItem[] = [
    { href: "/admin", icon: FiHome, label: "Dashboard" },
    { href: "/admin/users", icon: FiUsers, label: "Users" },
    { href: "/admin/snippets", icon: FiCode, label: "Snippets" },
    { href: "/admin/posts", icon: FiFileText, label: "Blog Posts" },
    { href: "/admin/guestbook", icon: FiBook, label: "Guestbook" },
    { href: "/admin/labels", icon: FiTag, label: "Labels" },
    { href: "/admin/settings", icon: FiSettings, label: "Settings" },
  ];

  return (
    <nav className={`admin-nav ${isOpen ? "open" : ""}`}>
      <button onClick={() => setIsOpen(!isOpen)} className="toggle-button">
        <FiChevronRight className={isOpen ? "rotate-icon" : ""} />
      </button>
      <ul>
        {menuItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`menu-link ${pathname === item.href ? "active" : ""}`}
            >
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default AdminMenu;
