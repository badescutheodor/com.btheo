"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "../contexts/UserContext";
import ThemeToggle from "./ThemeToggle";
import { FiMenu, FiX } from "react-icons/fi";
import Dropdown from "./Dropdown";
import styles from "../styles/Header.module.css";
import Button from "./Button";
import cx from "classnames";
import { FiFileText } from "react-icons/fi";

interface Settings {
  [key: string]: any;
}

const Header = ({ settings }: Settings) => {
  const { user, setUser } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navLinksRef = useRef<HTMLDivElement>(null);
  const menuIconRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (navLinksRef.current) {
      navLinksRef.current.classList.toggle(styles.open, isMenuOpen);
    }
    if (menuIconRef.current) {
      menuIconRef.current.classList.toggle(styles.open, isMenuOpen);
    }
  }, [isMenuOpen]);
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

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
        <div ref={navLinksRef} className={styles.navContainer}>
          <div className={styles.navLinks}>
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
            <div className={cx("visible-sm", styles.resumeButton)}>
              <Button inverted href={settings.resumeLink} icon={FiFileText}>
                My Resume
              </Button>
            </div>
          </div>
        </div>
        <div className={styles.right}>
          {user && (
            <Dropdown
              withHover
              className={styles.userDropdown}
              options={[
                { label: "Admin", href: "/admin" },
                { label: "Logout", onClick: handleLogout },
              ]}
              onSelect={() => {}}
            >
              {user.avatar && (
                <img
                  src={user.avatar}
                  alt={user.name}
                  width={30}
                  height={30}
                  className="circle mr-sm"
                />
              )}
              {user.name.split(" ")[0]}
            </Dropdown>
          )}
          <div className={styles.themeToggle}>
            <ThemeToggle />
          </div>
          <button
            className={styles.hamburger}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span ref={menuIconRef} className={styles.menuIcon}>
              <FiMenu className={styles.menuOpenIcon} size={24} />
              <FiX className={styles.menuCloseIcon} size={24} />
            </span>
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Header;
