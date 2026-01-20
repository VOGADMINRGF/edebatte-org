import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { pickHumanChallenge } from "@/lib/spam/humanChallenge";
import KontaktForm from "./KontaktForm";

export const dynamic = "force-dynamic";

export default function KontaktPage({
  searchParams,
}: {
  searchParams?: { sent?: string; error?: string };
}) {
  const sent = searchParams?.sent === "1";
  const error = searchParams?.error;
  const challenge = pickHumanChallenge();

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50 pb-16">
      <section className="mx-auto max-w-5xl px-4 pt-14">
        <div className="rounded-3xl bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 md:p-10">
          <header className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
              Kontakt & Support
            </p>
            <h1 className="text-3xl font-extrabold leading-tight md:text-4xl bg-gradient-to-r from-sky-600 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">
              Der schnellste Weg zu uns.
            </h1>
            <p className="text-sm leading-relaxed text-slate-600 md:text-base">
              Per Formular oder direkt per E-Mail.
            </p>
          </header>

          <section className="mt-8 rounded-2xl border border-slate-100 bg-slate-50/70 p-5 text-sm text-slate-800">
            <div className="grid gap-4 md:grid-cols-2 md:items-start">
              <div className="space-y-1">
                <p>
                  <span className="font-semibold">E-Mail:</span>{" "}
                  <a
                    href={`mailto:${BRAND.contactEmail}`}
                    className="font-semibold text-sky-700 underline underline-offset-4"
                  >
                    {BRAND.contactEmail}
                  </a>
                </p>
                <p>Direkt an das eDebatte-Team</p>
                <p className="text-xs text-slate-600">
                  Anfragen versuchen wir binnen von 24 Stunden zu beantworten.
                </p>
              </div>

              <div className="space-y-1 md:text-right">
                <p className="font-semibold text-slate-900">Ladungsfähige Anschrift</p>
                <p className="leading-relaxed text-slate-700">
                  Siehe{" "}
                  <Link
                    href="/impressum"
                    className="font-semibold text-sky-700 underline underline-offset-4"
                  >
                    Impressum
                  </Link>
                  .
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Weitere Angaben findest du im Impressum.
                </p>
              </div>
            </div>
          </section>

          <KontaktForm sent={sent} error={error} challenge={challenge} />

          <div className="mt-6 text-center text-xs text-slate-500">
            Sollte das Formular einmal nicht funktionieren, erreichst du uns jederzeit unter{" "}
            <a
              href={`mailto:${BRAND.contactEmail}`}
              className="font-semibold text-sky-700 underline underline-offset-4"
            >
              {BRAND.contactEmail}
            </a>
            .
          </div>
        </div>
      </section>
    </main>
  );
}
