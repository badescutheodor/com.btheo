"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/contexts/UserContext";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const { user } = useUser();
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { setUser } = useUser();

  useEffect(() => {
    let isMounted = true;
    if (user && isMounted) {
      router.replace("/admin");
    }
    return () => {
      isMounted = false;
    };
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      const userData = await res.json();
      setUser(userData.user);
      router.push("/");
    } else {
      alert("Login failed");
    }
  };

  if (user) {
    return <div>Redirecting...</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit">Login</button>
    </form>
  );
}
