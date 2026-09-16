import Link from "next/link";
import { notFound } from "next/navigation";
import { DossierViewer } from "@/components/dossier/DossierViewer";
import {
  buildParliamentaryTestDossier,
  isParliamentaryDemoTopic,
} from "../parliamentaryTestDossiers";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ topic: "chatkontrolle" }, { topic: "informationsfreiheit" }];
}

export default async function ParliamentaryDemoDossierPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  if (!isParliamentaryDemoTopic(topic)) notFound();

  const dossier = buildParliamentaryTestDossier(topic);

  return (
    <main className="dossier-editorial min-h-screen bg-[radial-gradient(circle_at_top,var(--dossier-top)_0%,var(--dossier-mid)_45%,var(--dossier-bottom)_100%)] text-[rgb(var(--fg))]">
      <div className="mx-auto w-full max-w-[1440px] px-6 py-10 lg:px-10 space-y-5">
        <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-soft space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted))]">
                Öffentliche Testansicht · Parlamentarischer Kontext
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-[rgb(var(--fg))]">{dossier.meta.title}</h1>
              <p className="mt-2 max-w-3xl text-sm text-[rgb(var(--muted))]">
                Diese Route ist eine kontrollierte Sichtprüfungs-Fixture. Relevant ist insbesondere der Bereich
                „Transparenz & Protokoll“ → „Parlamentarischer Kontext“. Die übrigen Demo-Bausteine stammen aus
                der bestehenden Dossier-Demo und sind nicht als vollständiges Fachdossier zu diesem Thema zu lesen.
              </p>
            </div>
            <span className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
              Stand 16.09.2026
            </span>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <a href="#parlamentarischer-kontext" className="btn btn-primary text-xs">
              Direkt zum parlamentarischen Kontext
            </a>
            <Link
              href={topic === "chatkontrolle" ? "/demo/dossier/informationsfreiheit" : "/demo/dossier/chatkontrolle"}
              className="btn text-xs"
            >
              {topic === "chatkontrolle" ? "IFG-Test öffnen" : "Chatkontrolle-Test öffnen"}
            </Link>
            <Link href="/demo/dossier" className="btn text-xs">
              Zur allgemeinen Dossier-Demo
            </Link>
          </div>
        </section>

        <DossierViewer dossier={dossier} hideExternalCreateLinks />
      </div>
    </main>
  );
}
