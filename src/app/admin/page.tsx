"use client";

import { useUser } from "@/app/contexts/UserContext";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const { user } = useUser();
  const router = useRouter();

  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>
      <p>Welcome, {user?.email}!</p>
      {/* Add admin-specific content here */}
    </div>
  );
}
