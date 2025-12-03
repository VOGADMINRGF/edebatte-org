import type { Metadata } from "next";
import * as pricing from "@/config/pricing";
import { MembershipPageClient } from "./MembershipPageClient";

export const metadata: Metadata = {
  title: "Mitglied werden – VoiceOpenGov",
  description:
    "Mitglied werden bei VoiceOpenGov: demokratische Infrastruktur finanzieren, Beitrag berechnen und den Mitgliedsantrag für die Bewegung stellen.",
};

export default function MitgliedWerdenPage() {
  return (
    <main
      className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16"
      aria-label="Mitgliedschaft VoiceOpenGov"
    >
      <section
        className="mx-auto max-w-5xl px-4 py-16 space-y-10"
        aria-labelledby="membership-hero-title"
      >
        <MembershipPageClient
          membershipPlan={pricing.VOG_MEMBERSHIP_PLAN}
          edebattePlans={pricing.EDEBATTE_PLANS}
        />
      </section>
    </main>
  );
}
