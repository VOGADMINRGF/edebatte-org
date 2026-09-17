"use client";

import { useEffect, useMemo, useState } from "react";

type Frequency = "important_only" | "daily" | "weekly";

type Center = {
  preferences: {
    frequency: Frequency;
    productUpdates: boolean;
    topicUpdates: boolean;
    regionUpdates: boolean;
    watchlistUpdates: boolean;
    ownWorkUpdates: boolean;
    importantAlerts: boolean;
    topicKeys: string[];
    regionKeys: string[];
  };
  personalizationSources: {
    profileTopics: boolean;
    profileRegion: boolean;
    watchlistActivity: boolean;
    ownWorkActivity: boolean;
  };
  quietHours: {
    enabled: boolean;
    timezone: string;
    startHourLocal: number;
    endHourLocal: number;
  };
  showRelevanceExplanation: boolean;
};

type State = {
  email: string;
  status: "active" | "pending" | "unsubscribed" | "suppressed" | "not_subscribed";
  audienceTier: string;
  center: Center;
};

const checkboxClass = "h-4 w-4 rounded border-[rgb(var(--border))] text-sky-500 focus:ring-sky-400";
const inputClass = "w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-400";

function csvToList(value: string) {
  return Array.from(new Set(value.split(",").map((entry) => entry.trim()).filter(Boolean))).slice(0, 50);
}

export default function NewsletterPreferencesClient() {
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topicText, setTopicText] = useState("");
  const [regionText, setRegionText] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/account/newsletter/preferences", { cache: "no-store" });
    if (!response.ok) {
      setError(response.status === 401 ? "Bitte melde dich erneut an." : "Die Briefing-Einstellungen konnten nicht geladen werden.");
      setLoading(false);
      return;
    }
    const body = (await response.json()) as { state: State };
    setState(body.state);
    setTopicText(body.state.center.preferences.topicKeys.join(", "));
    setRegionText(body.state.center.preferences.regionKeys.join(", "));
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const canSave = useMemo(() => Boolean(state && state.status !== "not_subscribed"), [state]);

  function updateCenter(updater: (current: Center) => Center) {
    setState((current) => current ? { ...current, center: updater(current.center) } : current);
  }

  function togglePreference(key: keyof Center["preferences"]) {
    updateCenter((center) => ({
      ...center,
      preferences: {
        ...center.preferences,
        [key]: !center.preferences[key as keyof Center["preferences"]],
      },
    } as Center));
  }

  function toggleSource(key: keyof Center["personalizationSources"]) {
    updateCenter((center) => ({
      ...center,
      personalizationSources: {
        ...center.personalizationSources,
        [key]: !center.personalizationSources[key],
      },
    }));
  }

  async function save() {
    if (!state) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    const payload: Center = {
      ...state.center,
      preferences: {
        ...state.center.preferences,
        topicKeys: csvToList(topicText),
        regionKeys: csvToList(regionText),
      },
    };
    const response = await fetch("/api/account/newsletter/preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body?.ok) {
      setError(body?.error === "subscription_required"
        ? "Für diese E-Mail gibt es noch kein bestätigtes Updates-Abonnement. Bitte bestätige zuerst den Double-Opt-in-Link."
        : "Speichern ist fehlgeschlagen. Bitte versuche es erneut.");
      setSaving(false);
      return;
    }
    setState(body.state);
    setTopicText(body.state.center.preferences.topicKeys.join(", "));
    setRegionText(body.state.center.preferences.regionKeys.join(", "));
    setMessage("Gespeichert. Dein nächstes Briefing verwendet diese Einstellungen.");
    setSaving(false);
  }

  if (loading) {
    return <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 text-sm text-[rgb(var(--muted))]">Einstellungen werden geladen …</div>;
  }
  if (!state) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{error ?? "Einstellungen nicht verfügbar."}</div>;
  }

  const inactive = state.status !== "active";

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">Status</p>
            <p className="mt-1 font-semibold text-[rgb(var(--fg))]">{state.email}</p>
            <p className="mt-1 text-sm text-[rgb(var(--muted))]">Segment: {state.audienceTier} · Status: {state.status}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${inactive ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
            {inactive ? "Kein aktiver Versand" : "Aktiver Versand"}
          </span>
        </div>
        {inactive ? (
          <p className="mt-3 text-sm text-amber-800">
            Einstellungen können vorbereitet werden, aber ein Versand erfolgt nur mit aktivem, aktuellem Double-Opt-in. Eine Abmeldung wird hier niemals still reaktiviert.
          </p>
        ) : null}
      </section>

      <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[rgb(var(--fg))]">Rhythmus & Inhalte</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-[rgb(var(--fg))]">Wie oft?</span>
            <select
              className={inputClass}
              value={state.center.preferences.frequency}
              onChange={(event) => updateCenter((center) => ({ ...center, preferences: { ...center.preferences, frequency: event.target.value as Frequency } }))}
            >
              <option value="weekly">Wöchentlich</option>
              <option value="daily">Täglich, wenn es relevante Neuigkeiten gibt</option>
              <option value="important_only">Nur wichtige Hinweise</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-[rgb(var(--fg))]">Themen-Keys</span>
            <input className={inputClass} value={topicText} onChange={(event) => setTopicText(event.target.value)} placeholder="z. B. chatkontrolle, pflege" />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-[rgb(var(--fg))]">Regionen</span>
            <input className={inputClass} value={regionText} onChange={(event) => setRegionText(event.target.value)} placeholder="z. B. Berlin, DE-BE" />
          </label>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {([
            ["productUpdates", "Produkt-Neuerungen"],
            ["topicUpdates", "Updates zu gewählten Themen"],
            ["regionUpdates", "Regionale Updates"],
            ["watchlistUpdates", "Änderungen aus meiner Watchlist"],
            ["ownWorkUpdates", "Fortschritt bei eigenen Beiträgen/Dossiers"],
            ["importantAlerts", "Wichtige, geprüfte Hinweise"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--border))] p-3 text-sm">
              <input className={checkboxClass} type="checkbox" checked={Boolean(state.center.preferences[key])} onChange={() => togglePreference(key)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[rgb(var(--fg))]">Personalisierung</h2>
        <p className="mt-1 text-sm text-[rgb(var(--muted))]">
          Du entscheidest, welche expliziten Produkt-Signale zusätzlich zu deinen Newsletter-Themen genutzt werden. Politische Ideologie, Parteipräferenz oder Wahlabsicht werden nicht abgeleitet.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {([
            ["profileTopics", "Meine Profil-Themen berücksichtigen"],
            ["profileRegion", "Meine Profil-Region berücksichtigen"],
            ["watchlistActivity", "Watchlist-Aktivität berücksichtigen"],
            ["ownWorkActivity", "Eigene Arbeit berücksichtigen"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--border))] p-3 text-sm">
              <input className={checkboxClass} type="checkbox" checked={state.center.personalizationSources[key]} onChange={() => toggleSource(key)} />
              <span>{label}</span>
            </label>
          ))}
          <label className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--border))] p-3 text-sm md:col-span-2">
            <input
              className={checkboxClass}
              type="checkbox"
              checked={state.center.showRelevanceExplanation}
              onChange={() => updateCenter((center) => ({ ...center, showRelevanceExplanation: !center.showRelevanceExplanation }))}
            />
            <span>Im Briefing anzeigen, warum ein Update für mich ausgewählt wurde</span>
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[rgb(var(--fg))]">Ruhezeiten</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="flex items-center gap-3 text-sm">
            <input className={checkboxClass} type="checkbox" checked={state.center.quietHours.enabled} onChange={() => updateCenter((center) => ({ ...center, quietHours: { ...center.quietHours, enabled: !center.quietHours.enabled } }))} />
            <span>Ruhezeit aktiv</span>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Von</span>
            <input className={inputClass} type="number" min={0} max={23} value={state.center.quietHours.startHourLocal} onChange={(event) => updateCenter((center) => ({ ...center, quietHours: { ...center.quietHours, startHourLocal: Number(event.target.value) } }))} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Bis</span>
            <input className={inputClass} type="number" min={0} max={23} value={state.center.quietHours.endHourLocal} onChange={(event) => updateCenter((center) => ({ ...center, quietHours: { ...center.quietHours, endHourLocal: Number(event.target.value) } }))} />
          </label>
          <label className="space-y-1 text-sm md:col-span-3">
            <span className="font-medium">Zeitzone</span>
            <input className={inputClass} value={state.center.quietHours.timezone} onChange={(event) => updateCenter((center) => ({ ...center, quietHours: { ...center.quietHours, timezone: event.target.value } }))} />
          </label>
        </div>
      </section>

      {message ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
      {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!canSave || saving}
          onClick={() => void save()}
          className="rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Speichert …" : "Einstellungen speichern"}
        </button>
        <a href="/account" className="text-sm font-medium text-sky-600 hover:underline">Zurück zum Konto</a>
      </div>
    </div>
  );
}
