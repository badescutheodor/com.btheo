"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "../contexts/UserContext";
import ThemeToggle from "./ThemeToggle";
import { FiMenu, FiX } from "react-icons/fi";
import styles from "../styles/Header.module.css";

const Header: React.FC = () => {
  const { user, setUser } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navLinksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (navLinksRef.current) {
      navLinksRef.current.classList.toggle(styles.open, isMenuOpen);
    }
  }, [isMenuOpen]);

  const handleLogout = async () => {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    if (res.ok) {
      setUser(null);
      router.push("/");
    }
  };

  const isActive = (path: string) => pathname === path;

  return (
    <header className={styles.header}>
      <nav>
        <div className={styles.navContainer}>
          <div ref={navLinksRef} className={styles.navLinks}>
            <Link href="/" className={isActive("/") ? styles.active : ""}>
              Home
            </Link>
            <Link
              href="/guestbook"
              className={isActive("/guestbook") ? styles.active : ""}
            >
              Guestbook
            </Link>
            <Link
              href="/blog"
              className={isActive("/blog") ? styles.active : ""}
            >
              Blog
            </Link>
            <Link
              href="/snippets"
              className={isActive("/snippets") ? styles.active : ""}
            >
              Snippets
            </Link>
            {user && user.role === "admin" && (
              <Link
                href="/admin"
                className={isActive("/admin") ? styles.active : ""}
              >
                Admin
              </Link>
            )}
          </div>
          <div className={styles.themeToggle}>
            <ThemeToggle />
          </div>
        </div>
        <button
          className={styles.hamburger}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? (
            <FiX className={`${styles.menuIcon} ${styles.open}`} size={24} />
          ) : (
            <FiMenu className={styles.menuIcon} size={24} />
          )}
        </button>
      </nav>
    </header>
  );
};

export default Header;
