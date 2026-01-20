"use client";
import { useState } from "react";
import Headline from "@/components/Headline";
import {
  UserIcon,
  BuildingLibraryIcon,
  NewspaperIcon,
  AcademicCapIcon,
  BuildingOffice2Icon,
  BanknotesIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

// Rollen-Array

export default function LoginPage() {
  const [role, setRole] = useState<string | null>(null);

  return (
    <main className="max-w-4xl mx-auto px-4 py-16 space-y-12">
      <Headline>Login & Registrierung</Headline>
      <p className="text-center text-lg font-semibold text-gray-800 mb-10 mt-2">
        Wähle, wie du eDebatte nutzen möchtest:
      </p>
      {!role ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              className={`
                flex flex-col items-start border-2 rounded-2xl px-6 py-6 bg-white
                transition-all duration-200
                border-gray-200
                shadow-md
                hover:border-[#9333ea]
                hover:shadow-[0_8px_36px_#9333ea25]
                focus:outline-none focus:ring-2 focus:ring-[#9333ea]
                active:scale-95
                relative
              `}
              aria-label={`${r.label} auswählen`}
            >
              <div>{r.icon}</div>
              <div
                className={`font-bold text-lg flex items-center gap-2 ${
                  r.id === "media"
                    ? "text-blue-900"
                    : r.id === "party"
                      ? "text-orange-700"
                      : ""
                }`}
              >
                {r.label}
                {r.id === "media" && (
                  <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-semibold">
                    Presse
                  </span>
                )}
                {r.id === "media" && (
                  <span title={r.pressHint} className="ml-1">
                    <InformationCircleIcon className="w-5 h-5 text-blue-400 inline align-middle" />
                  </span>
                )}
              </div>
              <div className="text-gray-700 text-sm mt-1">{r.desc}</div>
              {r.id === "media" && (
                <div className="text-xs text-blue-500 mt-2 underline underline-offset-2 cursor-pointer">
                  Presse-API, Sonderrechte & Kontakt für Redaktionen
                </div>
              )}
            </button>
          ))}
        </div>
      ) : (
        <section className="max-w-md mx-auto mt-8">
          <button
            onClick={() => setRole(null)}
            className="mb-4 text-[#9333ea] text-sm font-semibold hover:underline"
          >
            &larr; Zurück zur Auswahl
          </button>
          <LoginForm role={role} />
        </section>
      )}
    </main>
  );
}

function LoginForm({ role }: { role: string }) {
  return (
    <form className="space-y-4" autoComplete="off">
      {(role === "ngo" ||
        role === "company" ||
        role === "media" ||
        role === "school" ||
        role === "party") && (
        <input
          type="text"
          name="orgName"
          placeholder={
            role === "ngo"
              ? "Name der Organisation/Verein"
              : role === "company"
                ? "Name der Firma / Event"
                : role === "media"
                  ? "Name des Medienhauses"
                  : role === "school"
                    ? "Name der Schule / Bildungsträger"
                    : "Name der Partei / Bewegung"
          }
          className="w-full border-2 rounded px-3 py-2"
          required
        />
      )}
      <input
        type="email"
        name="email"
        placeholder="E-Mail"
        className="w-full border-2 rounded px-3 py-2"
        required
        autoComplete="username"
      />
      <input
        type="password"
        name="password"
        placeholder="Passwort"
        className="w-full border-2 rounded px-3 py-2"
        required
        autoComplete="current-password"
      />
      <button
        type="submit"
        className="w-full bg-[#9333ea] text-white font-semibold rounded py-2 mt-2 hover:bg-[#7c2bd0] transition"
      >
        Einloggen / Registrieren
      </button>
    </form>
  );
}
