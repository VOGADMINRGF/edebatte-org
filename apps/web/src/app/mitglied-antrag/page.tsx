// apps/web/src/app/mitglied-antrag/page.tsx
import type { Metadata } from "next";
import { MembershipApplicationPageClient } from "./MembershipApplicationPageClient";

export const metadata: Metadata = {
  title: "Mitgliedsantrag – VoiceOpenGov",
  description:
    "Mitgliedsantrag für VoiceOpenGov ausfüllen, Haushaltsmitglieder angeben und Zahlungsart wählen.",
};

export default function MitgliedAntragPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-5xl px-4 py-10">
        <MembershipApplicationPageClient />
      </section>
    </main>
  );
}
