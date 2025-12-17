"use client";

import * as React from "react";
import AnalyzeWorkspace from "@/components/analyze/AnalyzeWorkspace";
import type { AccountOverview } from "@features/account/types";
import { getAccessTierConfigForUser, getUserAccessTier, hasUnlimitedContributions } from "@core/access/accessTiers";
import type { VerificationLevel } from "@core/auth/verificationTypes";

export type ContributionNewClientProps = {
  initialOverview: AccountOverview;
};

type GateState =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "allowed"; overview: AccountOverview }
  | { status: "blocked"; overview: AccountOverview };

function deriveGateFromOverview(overview?: AccountOverview | null): GateState {
  if (!overview) return { status: "anon" };
  const cfg = getAccessTierConfigForUser(overview);
  const tier = getUserAccessTier(overview);
  const tierLimit = cfg.monthlyContributionLimit ?? 0;
  const hasCredits = (overview.stats?.contributionCredits ?? 0) > 0;
  const allowed = hasUnlimitedContributions(tier) || (tierLimit > 0 && hasCredits);
  return { status: allowed ? "allowed" : "blocked", overview };
}

export function ContributionNewClient({ initialOverview }: ContributionNewClientProps) {
  const [verificationLevel, setVerificationLevel] = React.useState<VerificationLevel>(
    initialOverview?.verificationLevel ?? "none",
  );
  const [levelStatus, setLevelStatus] = React.useState<"loading" | "ok" | "login_required" | "error">(
    initialOverview ? "ok" : "login_required",
  );
  const [gate, setGate] = React.useState<GateState>(() => deriveGateFromOverview(initialOverview));

  React.useEffect(() => {
    let ignore = false;
    async function loadLevel() {
      try {
        const res = await fetch("/api/account/overview", { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body?.overview) {
          if (ignore) return;
          const unauthorized = res.status === 401 || body?.error === "UNAUTHORIZED";
          setLevelStatus(unauthorized ? "login_required" : "error");
          if (unauthorized) setGate({ status: "anon" });
          return;
        }
        if (ignore) return;
        const overview = body.overview as AccountOverview;
        setVerificationLevel(overview.verificationLevel ?? "none");
        setLevelStatus("ok");
        setGate(deriveGateFromOverview(overview));
      } catch {
        if (ignore) return;
        setLevelStatus("error");
      }
    }
    loadLevel();
    return () => {
      ignore = true;
    };
  }, []);

  if (gate.status === "loading") {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 text-center text-slate-500">
        Lade dein Profil …
      </main>
    );
  }
  if (gate.status === "anon") {
    return <ContributionGate variant="anon" overview={undefined} />;
  }
  if (gate.status === "blocked") {
    return <ContributionGate variant="blocked" overview={gate.overview} />;
  }

  const tierNameRaw =
    initialOverview?.pricingTier ?? initialOverview?.planSlug ?? initialOverview?.accessTier ?? null;
  const accountInfo = {
    tierName: tierNameRaw ? String(tierNameRaw) : null,
    coins: typeof initialOverview?.stats?.contributionCredits === "number" ? initialOverview.stats.contributionCredits : null,
    costs: { analyze: 1, save: 0, finalize: 1 },
  };

  return (
    <AnalyzeWorkspace
      mode="contribution"
      defaultLevel={2}
      storageKey="vog_contribution_draft_v2"
      analyzeEndpoint="/api/contributions/analyze"
      saveEndpoint="/api/contributions/save"
      finalizeEndpoint="/api/contributions/finalize"
      afterFinalizeNavigateTo="/swipes"
      verificationLevel={verificationLevel}
      verificationStatus={levelStatus}
      account={accountInfo}
    />
  );
}

type ContributionGateProps = {
  variant: "anon" | "blocked";
  overview?: AccountOverview;
};

function ContributionGate({ variant, overview }: ContributionGateProps) {
  const stats = overview?.stats;
  const tier = overview ? getUserAccessTier(overview) : "citizenBasic";
  const tierCfg = overview ? getAccessTierConfigForUser(overview) : null;
  const swipes = stats?.swipeCountTotal ?? 0;
  const credits = stats?.contributionCredits ?? 0;
  const xp = stats?.xp ?? 0;
  const levelLabel = (stats?.engagementLevel ?? "interessiert").toString();
  const nextCreditIn = stats?.nextCreditIn ?? 100;
  const tierLimit = tierCfg?.monthlyContributionLimit ?? 0;
  const tierLimitLabel = tierCfg?.monthlyContributionLimit === null ? "unbegrenzt" : tierLimit;

  const title =
    variant === "anon"
      ? "Registriere dich fuer deinen ersten E150-Beitrag"
      : "Du brauchst einen Contribution-Credit oder citizenPremium+";
  const description =
    variant === "anon"
      ? "Mit einem kostenlosen citizenBasic-Konto sammelst du XP, Swipes und erhaelst nach 100 Swipes einen Contribution-Credit (1 Beitrag mit bis zu 3 Statements)."
      : `Freie Plaene erlauben ${tierLimit || 0} Beitraege/Monat. Du hast ${swipes} Swipes gesammelt – dir fehlen noch ${nextCreditIn} bis zum naechsten Credit oder du wechselst auf citizenPremium, citizenPro oder citizenUltra.`;

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="space-y-6 rounded-4xl border border-slate-200 bg-white/95 p-8 shadow-xl">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Citizen Core Journey</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-3 text-base text-slate-600">{description}</p>
          <p className="mt-2 text-sm text-slate-500">
            Beim Abschicken eines Beitrags im Free-Plan wird genau 1 Contribution-Credit verbraucht.
          </p>
        </div>

        {stats && (
          <div className="grid gap-4 sm:grid-cols-2">
            <StatBox label="Plan" value={tier} hint="citizenPremium+ erlaubt unbegrenzt Contributions" />
            <StatBox label="Contribution-Credits" value={credits} hint="1 Credit = 1 Beitrag mit bis zu 3 Statements" />
            <StatBox label="XP & Level" value={`${xp} XP · ${levelLabel}`} hint="Swipes geben XP & steigern dein Level" />
            <StatBox label="Swipes" value={`${swipes} total`} hint={`Noch ${nextCreditIn} bis zum naechsten Credit`} />
            <StatBox label="Monatslimit" value={tierLimitLabel ?? tierLimit} hint="Beitraege pro Monat laut aktuellem Tier" />
          </div>
        )}

        <div className="flex flex-col gap-3 md:flex-row">
          <a
            href="/swipe"
            className="flex-1 rounded-full bg-brand-grad px-5 py-3 text-center text-white font-semibold shadow-lg"
          >
            Weiter swipen
          </a>
          <a
            href="/mitglied-werden"
            className="flex-1 rounded-full border border-slate-200 px-5 py-3 text-center font-semibold text-slate-700"
          >
            Mehr erfahren
          </a>
        </div>
      </div>
    </main>
  );
}

function StatBox({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
