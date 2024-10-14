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
import styles from "@/app/styles/AdminMenu.module.css";
import cx from "classnames";

interface MenuItem {
  href: string;
  icon: IconType;
  label: string;
}

const AdminMenu = () => {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const menuItems: MenuItem[] = [
    { href: "/admin", icon: FiHome, label: "Dashboard" },
    { href: "/admin/users", icon: FiUsers, label: "Users" },
    { href: "/admin/snippets", icon: FiCode, label: "Snippets" },
    { href: "/admin/posts", icon: FiFileText, label: "Blog Posts" },
    { href: "/admin/guestbook", icon: FiBook, label: "Guestbook" },
    { href: "/admin/labels", icon: FiTag, label: "Labels" },
    { href: "/admin/settings", icon: FiSettings, label: "Settings" },
  ];

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <>
      <nav
        className={cx("admin-nav", styles.adminNav, {
          open: isOpen,
        })}
      >
        <button onClick={() => setIsOpen(!isOpen)} className={"toggle-button"}>
          <FiChevronRight
            className={cx({
              [styles.rotateIcon]: isOpen,
            })}
          />
        </button>
        <ul className={styles.menuList}>
          {menuItems.map((item) => (
            <li key={item.href} className={styles.menuItem}>
              <Link
                href={item.href}
                className={`${styles.menuLink} ${
                  pathname === item.href ? styles.active : ""
                }`}
              >
                <item.icon className={styles.menuLinkIcon} />
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
};

export default AdminMenu;
