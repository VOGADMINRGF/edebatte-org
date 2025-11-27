"use client";

import { useSearchParams } from "next/navigation";
import { LoginPageShell } from "@/components/auth/LoginPageShell";

export default function LoginPage() {
  const params = useSearchParams();
  const redirectTo = params.get("next") || undefined;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <LoginPageShell redirectTo={redirectTo} />
    </div>
  );
}
