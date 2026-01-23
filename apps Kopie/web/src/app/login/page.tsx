"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LoginPageShell } from "@/components/auth/LoginPageShell";

export default function LoginPage() {
  const params = useSearchParams();
  const redirectTo = params.get("next") || undefined;
  const stepParam = params.get("step");
  const methodParam = params.get("method");
  const initialStep = stepParam === "verify" || stepParam === "twofactor" ? "twofactor" : "credentials";
  const initialMethod =
    methodParam === "email" || methodParam === "otp" || methodParam === "totp" ? methodParam : undefined;
  const forceTwoFactor = initialStep === "twofactor";

  const registerHref = redirectTo
    ? `/register?next=${encodeURIComponent(redirectTo)}`
    : "/register";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <LoginPageShell
        redirectTo={redirectTo}
        initialStep={initialStep}
        initialMethod={initialMethod}
        forceTwoFactor={forceTwoFactor}
      />

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
