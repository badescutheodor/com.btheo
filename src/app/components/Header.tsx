"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "../contexts/UserContext";
import ThemeToggle from "./ThemeToggle";
import { FiMenu, FiX } from "react-icons/fi";

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
      if (isMenuOpen) {
        navLinksRef.current?.classList.add("open");
      } else {
        navLinksRef.current?.classList.remove("open");
      }
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
    <header>
      <nav>
        <div className="nav-container">
          <div ref={navLinksRef} className="nav-links">
            <Link href="/" className={isActive("/") ? "active" : ""}>
              Home
            </Link>
            <Link
              href="/guestbook"
              className={isActive("/guestbook") ? "active" : ""}
            >
              Guestbook
            </Link>
            <Link href="/blog" className={isActive("/blog") ? "active" : ""}>
              Blog
            </Link>
            <Link
              href="/snippets"
              className={isActive("/snippets") ? "active" : ""}
            >
              Snippets
            </Link>
            {user && user.role === "admin" && (
              <Link
                href="/admin"
                className={isActive("/admin") ? "active" : ""}
              >
                Admin
              </Link>
            )}
          </div>
          <div className="theme-toggle">
            <ThemeToggle />
          </div>
        </div>
        <button
          className="hamburger"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? (
            <FiX className="menu-icon open" size={24} />
          ) : (
            <FiMenu className="menu-icon" size={24} />
          )}
        </button>
      </nav>
    </header>
  );
};

export default Header;
