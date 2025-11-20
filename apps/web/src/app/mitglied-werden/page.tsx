import { MembershipCalculator_VOG } from "@/features/membership";
import Link from "next/link";

export default function MitgliedWerdenPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-4xl px-4 py-16 space-y-8">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm">
          <h1
            className="text-4xl font-extrabold leading-tight"
            style={{
              backgroundImage:
                "linear-gradient(90deg,var(--brand-cyan),var(--brand-blue))",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Mitglied werden – Teil der Bewegung
          </h1>
          <p className="mt-4 text-lg text-slate-700">
            Als Mitglied stärkst du unabhängige digitale Beteiligung und hältst die
            VoiceOpenGov-Bewegung finanziell und politisch unabhängig. Deine Beiträge
            finanzieren Moderation, Faktenaufbereitung und öffentliche Audit-Trails.
          </p>
          <p className="text-sm text-slate-600">
            Der empfohlene Mindestbeitrag liegt bei <strong>5,63 €</strong> pro Person. Das entspricht
            dem Betrag, der für Bezieher:innen von Bürgergeld / Sozialhilfe (ALG&nbsp;II) realistisch
            leistbar ist – höhere Einkommen dürfen gern mehr geben.
          </p>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Diese Mitgliedschaft betrifft ausschließlich die VoG-Bewegung – nicht das Nutzungsmodell
            der eDbtt-App. Wer Mitglied ist, bleibt unabhängig von Beitragsschranken, erhält aber kleine
            Privilegien (Badges, frühere Einblicke). Das eDbtt-Pricing findest du separat unter
            <Link href="/nutzungsmodell" className="ml-1 font-semibold underline">
              /nutzungsmodell
            </Link>
            .
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <h3 className="text-base font-semibold text-slate-900">Was du bekommst</h3>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                <li>Früher Zugang zu Reports & Voting-Ergebnissen</li>
                <li>Einblick in Plattform-Entwicklung & Priorisierungen</li>
                <li>Exklusive Community-Einladungen & Offline-Formate</li>
                <li>Einige VoG-Badges und kleinere Privilegien im eDbtt-Ökosystem</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <h3 className="text-base font-semibold text-slate-900">Mitgliedsstufen</h3>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                <li>
                  <strong>5,63 € Basis</strong> – Mindestbeitrag orientiert am ALG&nbsp;II/Bürgergeld-Satz.
                </li>
                <li>
                  <strong>10 €/Monat:</strong> Aktivmitglied mit Reporting-Zugang
                </li>
                <li>
                  <strong>25 €/Monat:</strong> Engagiertes Mitglied
                </li>
                <li>
                  <strong>50 €/Monat:</strong> Fördermitglied mit Backstage-Einblicken
                </li>
              </ul>
            </div>
          </div>
        </div>

        <MembershipCalculator_VOG />

        <p className="text-center text-sm text-slate-600">
          eDbtt intensiv nutzen? Das Pricing für Beiträge, Bundles und Earned Credits
          findest du unter{" "}
          <Link href="/nutzungsmodell" className="text-emerald-600 underline">
            /nutzungsmodell
          </Link>
          .
        </p>

        <div className="text-center">
          <a
            href="https://voiceopengov.org/beitritt"
            className="btn bg-brand-grad text-white shadow-soft"
          >
            Jetzt Mitglied werden
          </a>
        </div>
      </section>
    </main>
  );
}
