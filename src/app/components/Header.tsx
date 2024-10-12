"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "../contexts/UserContext";

export default function Header() {
  const { user, setUser } = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    if (res.ok) {
      setUser(null);
      router.push("/");
    }
  };

  return (
    <header>
      <nav>
        <Link href="/">Home</Link>
        <Link href="/guestbook">Guestbook</Link>
        <Link href="/blog">Blog</Link>
        <Link href="/snippets">Snippets</Link>
        {user ? (
          <>
            {user.role === "admin" && <Link href="/admin">Admin</Link>}
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : null}
      </nav>
    </header>
  );
}
