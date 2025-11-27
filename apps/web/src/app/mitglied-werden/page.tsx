import type { Metadata } from "next";
import * as pricing from "@/config/pricing";
import { MembershipPageClient } from "./MembershipPageClient";

export const metadata: Metadata = {
  title: "Mitglied werden – VoiceOpenGov",
};

export default function MitgliedWerdenPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-5xl px-4 py-16 space-y-10">
        <MembershipPageClient
          membershipPlan={pricing.VOG_MEMBERSHIP_PLAN}
          edebattePlans={pricing.EDEBATTE_PLANS}
        />
      </section>
    </main>
  );
}
