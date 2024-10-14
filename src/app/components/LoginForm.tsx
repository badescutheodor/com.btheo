"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/contexts/UserContext";
import { FormProvider } from "./FormProvider";
import Button from "./Button";
import AutoFormBuilder from "./AutoFormBuilder";
import { FiUser, FiLock } from "react-icons/fi";
import * as yup from "yup";
import FormErrors from "./FormErrors";

export default function LoginForm() {
  const router = useRouter();
  const { user, setUser } = useUser();

  useEffect(() => {
    let isMounted = true;
    if (user && isMounted) {
      router.replace("/admin");
    }
    return () => {
      isMounted = false;
    };
  }, [user, router]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (res.ok) {
      const { user } = await res.json();
      setUser(user);
      router.push("/");
    } else {
    }
  };

  if (user) {
    return <div>Redirecting...</div>;
  }

  return (
    <FormProvider
      onSubmit={handleSubmit}
      validationSchema={{
        email: {
          rules: [
            yup.string().email("Invalid email").required("Email is required"),
          ],
        },
        password: {
          rules: [
            yup.string().required("Password is required"),
            yup.string().min(8, "Password must be at least 8 characters"),
          ],
        },
      }}
    >
      <FormErrors />
      <AutoFormBuilder
        schema={{
          email: {
            type: "email",
            placeholder: "Email",
            autoFocus: true,
            iconLeft: <FiUser />,
          },
          password: {
            type: "password",
            placeholder: "Password",
            iconLeft: <FiLock />,
          },
        }}
      />
      <Button fullWidth type="submit" size="medium">
        Login
      </Button>
    </FormProvider>
  );
}
