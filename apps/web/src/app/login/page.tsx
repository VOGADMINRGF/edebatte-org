"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LoginPageShell } from "@/components/auth/LoginPageShell";

export default function LoginPage() {
  const params = useSearchParams();
  const redirectTo = params.get("next") || undefined;

  const registerHref = redirectTo
    ? `/register?next=${encodeURIComponent(redirectTo)}`
    : "/register";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <LoginPageShell redirectTo={redirectTo} />

      {/* Zusätzlicher Hinweis unter dem Formular */}
      <p className="mt-4 text-center text-xs text-slate-500">
        Noch kein Konto?{" "}
        <Link href={registerHref} className="font-semibold text-sky-600 underline">
          Jetzt registrieren
        </Link>
      </p>
    </div>
  );
}
