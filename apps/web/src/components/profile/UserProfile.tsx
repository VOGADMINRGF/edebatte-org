"use client";

import { useEffect, useState } from "react";
import type { AccountOverview } from "@features/account/types";
import { getProfilePackageForAccessTier } from "@features/account/profilePackages";

export default function UserProfile() {
  const [data, setData] = useState<AccountOverview | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "anon">("loading");

  useEffect(() => {
    let active = true;
    fetch("/api/account/overview", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!active) return;
        if (!res.ok || !body?.overview) {
          setStatus(res.status === 401 ? "anon" : "error");
          return;
        }
        setData(body.overview as AccountOverview);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  if (status === "loading") {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 text-center text-slate-500 shadow-sm">
        Profil wird geladen …
      </section>
    );
  }
  if (status === "anon") {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-900">Bitte melde dich an, um dein Profil zu sehen.</p>
        <a
          href="/login"
          className="mt-4 inline-flex items-center justify-center rounded-full bg-brand-grad px-6 py-3 text-white font-semibold shadow-md"
        >
          Login öffnen
        </a>
      </section>
    );
  }
  if (status === "error" || !data) {
    return (
      <section className="rounded-3xl border border-rose-200 bg-rose-50/80 p-6 text-center shadow-sm">
        <p className="text-lg font-semibold text-rose-700">Profil konnte nicht geladen werden.</p>
        <p className="text-sm text-rose-500">Bitte versuche es später erneut.</p>
      </section>
    );
  }

  const stats = data.stats;
  const profile = data.profile ?? {};
  const displayName = data.displayName || data.email || "Bürger:in";
  const plan = data.accessTier;
  const profilePackage = data.profilePackage ?? getProfilePackageForAccessTier(plan);
  const publicFlags = profile.publicFlags ?? {};
  const showStats = publicFlags.showStats ?? false;
  const showEngagementLevel = publicFlags.showEngagementLevel ?? false;
  const showJoinDate = publicFlags.showJoinDate ?? false;
  const topTopics = profile.topTopics ?? [];
  const hasPublicContent =
    !!profile.headline ||
    !!profile.bio ||
    topTopics.length > 0 ||
    showStats ||
    showEngagementLevel ||
    showJoinDate;

  return (
    <div className="space-y-8">
      <section className="rounded-4xl border border-slate-200 bg-white/95 p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-2xl font-semibold text-white">
            {getInitials(displayName)}
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wide text-slate-500">Citizen Core Journey</p>
            <h1 className="text-3xl font-semibold text-slate-900">{displayName}</h1>
            <p className="text-sm text-slate-500">{data.email}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700">
            <div>Aktiver Plan: <span className="font-semibold">{plan}</span></div>
            <div className="text-xs text-slate-500">Profil-Paket: {profilePackage}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <StatCard label="XP & Level" value={`${stats.xp} XP`} hint={`Engagement-Level: ${stats.engagementLevel}`} />
          <StatCard
            label="Contribution-Credits"
            value={stats.contributionCredits}
            hint="1 Credit = 1 Beitrag mit bis zu 3 Statements"
          />
          <StatCard
            label="Swipes gesamt"
            value={stats.swipeCountTotal}
            hint={`Noch ${stats.nextCreditIn} Swipes bis zum nächsten Credit`}
          />
          <StatCard
            label="Swipes diesen Monat"
            value={stats.swipesThisMonth}
            hint="Swipes zählen für XP & Credits"
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <a
            href="/swipe"
            className="flex-1 rounded-full bg-brand-grad px-6 py-3 text-center text-white font-semibold shadow-lg"
          >
            Weiter swipen
          </a>
          <a
            href="/contributions/new"
            className="flex-1 rounded-full border border-slate-200 px-6 py-3 text-center font-semibold text-slate-700"
          >
            Neue Contribution starten
          </a>
        </div>
      </section>

      <section className="rounded-4xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Profil & Sichtbarkeit</h2>
        {hasPublicContent ? (
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            {profile.headline && (
              <p className="text-base font-semibold text-slate-900">{profile.headline}</p>
            )}
            {profile.bio && <p className="text-slate-700">{profile.bio}</p>}
            {topTopics.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Top-Themen</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {topTopics.map((topic) => (
                    <div
                      key={topic.key}
                      className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3"
                    >
                      <p className="text-sm font-semibold text-slate-900">{topic.title}</p>
                      {topic.statement && <p className="text-xs text-slate-600">{topic.statement}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {showEngagementLevel && (
              <p className="text-xs text-slate-500">Engagement-Level: {stats.engagementLevel}</p>
            )}
            {showJoinDate && data.createdAt && (
              <p className="text-xs text-slate-500">
                Mitglied seit {new Date(data.createdAt).toLocaleDateString("de-DE")}
              </p>
            )}
            {showStats && (
              <div className="grid gap-2 md:grid-cols-2">
                <StatCard label="XP & Level" value={`${stats.xp} XP`} hint={`Engagement-Level: ${stats.engagementLevel}`} />
                <StatCard
                  label="Swipes gesamt"
                  value={stats.swipeCountTotal}
                  hint={`Noch ${stats.nextCreditIn} Swipes bis zum nächsten Credit`}
                />
              </div>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">Es sind noch keine öffentlichen Angaben hinterlegt.</p>
        )}
      </section>

      <section className="rounded-4xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Deine nächsten Ziele</h2>
        <ul className="mt-4 space-y-3 text-sm text-slate-600">
          <li>• Noch {stats.nextCreditIn} Swipes bis zum nächsten Contribution-Credit.</li>
          <li>• citizenPremium, citizenPro oder citizenUltra schalten unbegrenzte Contributions frei.</li>
          <li>• Level-Aufstieg bringt dir mehr Sichtbarkeit innerhalb der E150-Journey.</li>
        </ul>
      </section>

      <section className="rounded-4xl border border-slate-200 bg-white/60 p-6 shadow-inner">
        <h3 className="text-xl font-semibold text-slate-900">Impact deiner Statements</h3>
        <p className="mt-2 text-sm text-slate-600">
          Demnächst zeigen wir dir hier, wo deine Beiträge eingeflossen sind (Reports, Streams, Kampagnen).
        </p>
        <p className="mt-1 text-sm text-slate-500">TODO: Impact-Ansicht für Bürger:innen implementieren.</p>
      </section>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
