"use client";
import AdminMenu from "../components/AdminMenu";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "../contexts/UserContext";
import ErrorToastLayout from "@/app/components/ErrorToastLayout";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    if (!user || user.role !== "admin") {
      router.push("/login");
    }
  }, [user, router]);

  return (
    <ErrorToastLayout>
      <AdminMenu />
      <main>{children}</main>
    </ErrorToastLayout>
  );
}
