"use client";
// E200: Public marketing landing page with HumanCheck-protected updates form.

import Link from "next/link";
import { useEffect, useState } from "react";
import { HumanCheck } from "@/components/security/HumanCheck";
import { useLocale } from "@/context/LocaleContext";
import { publicOrigin } from "@/utils/publicOrigin";
import { getHomeStrings } from "./homeStrings";

type Notice = { ok: boolean; msg: string } | null;

export default function Home() {
  const { locale } = useLocale();
  const strings = getHomeStrings(locale);
  const [email, setEmail] = useState("");
  const [interests, setInterests] = useState("");
  const [humanToken, setHumanToken] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [updatesFormStartedAt, setUpdatesFormStartedAt] = useState<number | null>(null);
  const [updatesHoneypot, setUpdatesHoneypot] = useState("");

  const baseUrl = publicOrigin().replace(/\/$/, "");
  const shareUrl = `${baseUrl}/`;
  const shareText = strings.membershipHighlight.shareText;
  const shareMessage = `${shareText} ${shareUrl}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  const emailHref = `mailto:?subject=${encodeURIComponent(
    `VoiceOpenGov – ${strings.membershipHighlight.title}`
  )}&body=${encodeURIComponent(shareMessage)}`;

  useEffect(() => {
    setUpdatesFormStartedAt(Date.now());
  }, []);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "VoiceOpenGov",
          text: shareText,
          url: shareUrl,
        });
        setShareNote(null);
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareMessage);
        setShareNote(strings.membershipHighlight.shareSuccess);
        return;
      }

      setShareNote(strings.membershipHighlight.shareError);
    } catch {
      setShareNote(strings.membershipHighlight.shareError);
    }
  };

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareNote(strings.membershipHighlight.shareSuccess);
        return;
      }

      setShareNote(strings.membershipHighlight.shareError);
    } catch {
      setShareNote(strings.membershipHighlight.shareError);
    }
  };

  const handleUpdatesSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNotice(null);

    if (!humanToken) {
      setNotice({ ok: false, msg: strings.updatesForm.invalid });
      return;
    }

    setIsSubmitting(true);
    try {
      const startedAt = updatesFormStartedAt ?? Date.now();
      const res = await fetch("/api/public/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          interests,
          humanToken,
          formStartedAt: startedAt,
          hp_updates: updatesHoneypot,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        setNotice({ ok: true, msg: strings.updatesForm.success });
        setEmail("");
        setInterests("");
        setHumanToken(null);
      } else {
        setNotice({ ok: false, msg: strings.updatesForm.error });
      }
    } catch {
      setNotice({ ok: false, msg: strings.updatesForm.error });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16"
      aria-label="VoiceOpenGov Startseite"
    >
      {/* HERO */}
      <section
        id="hero"
        className="border-b border-slate-200/60 bg-gradient-to-b from-[var(--brand-from)] via-white to-[var(--brand-to)]"
        aria-labelledby="hero-heading"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-16 pt-14 lg:flex-row lg:items-start">
          {/* Linke Spalte: Titel, Intro, Bullets, CTAs */}
          <div className="flex-1 space-y-6">
            <div className="flex flex-wrap gap-2" aria-label="Schlagworte zu VoiceOpenGov">
              {strings.heroChips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    border: `1px solid ${"var(--chip-border)"}`,
                    background: "var(--chip-bg)",
                    color: "var(--chip-text)",
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>
            <div className="space-y-4">
              <h1
                id="hero-heading"
                className="text-4xl font-extrabold leading-tight text-slate-900 md:text-5xl"
              >
                {strings.heroHeadline.lines.map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
                <span className="bg-brand-grad bg-clip-text text-transparent">
                  {strings.heroHeadline.accent}
                </span>{" "}
                {strings.heroHeadline.suffix}
              </h1>

              {/* Text-Spalte mit begrenzter Breite für bessere Lesbarkeit */}
              <div className="space-y-3 max-w-2xl">
                <p
                  className="text-lg text-slate-700 md:text-xl"
                  dangerouslySetInnerHTML={{ __html: strings.heroIntro }}
                />
                <ul className="list-disc space-y-1 pl-5 text-base text-slate-700">
                  {strings.heroBullets.map((item) => (
                    <li key={item} dangerouslySetInnerHTML={{ __html: item }} />
                  ))}
                </ul>
              </div>

              {/* CTAs: zwei Haupt-Buttons + Mikrocopy */}
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/mitglied-werden"
                  className="btn btn-primary bg-brand-grad text-white"
                >
                  {strings.heroCtas.primary}
                </Link>
                <Link
                  href="/votes"
                  className="btn border border-slate-300 bg-white/80 hover:bg-white"
                >
                  {strings.heroCtas.secondary}
                </Link>
              </div>
              <p className="text-xs text-slate-500 max-w-xl">
                {strings.heroCtaNote}
              </p>

              {strings.heroVideoNote && strings.heroVideoLink && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-800">
                    {strings.heroVideoNote}
                  </span>
                  <Link
                    href="/faq"
                    className="font-semibold text-sky-700 underline underline-offset-2"
                  >
                    {strings.heroVideoLink}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Rechte Spalte: Evidenz-Graph-Kasten */}
          <div className="w-full max-w-xl space-y-4 lg:w-[40%] lg:pt-40">
            <div className="overflow-hidden rounded-3xl shadow-[0_18px_70px_rgba(14,116,144,0.08)]">
              <div className="aspect-video">
                <video
                  className="block h-full w-full object-cover"
                  src="/videos/WertderStimme_DE.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  aria-label="Wert der Stimme - Video"
                >
                  Dein Browser unterstützt das Abspielen von Videos nicht.
                </video>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200/50 bg-white shadow-[0_16px_60px_rgba(14,116,144,0.07)]">
              <div className="p-3">
                <div className="rounded-2xl bg-gradient-to-br from-emerald-500/90 via-sky-500/90 to-blue-500/80 p-5 text-white shadow-lg">
                  <p className="text-xs uppercase tracking-wide opacity-90">
                    eDebatte – unser Werkzeug
                  </p>
                  <p className="mt-2 text-lg font-semibold leading-snug">
                    Evidenz-Graph statt Meinungsrauschen.
                  </p>
                  <p className="mt-3 text-sm opacity-90">
                    In eDebatte verknüpfen wir Quellen, Argumente und Annahmen zu einem
                    offenen Faktennetz. So bleibt jede Entscheidung prüfbar – von der
                    Kommune bis zu globalen Fragen.
                  </p>
                  <Link
                    href="/mitglied-werden"
                    className="mt-4 inline-flex items-center justify-center rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur hover:bg-white/25"
                  >
                    eDebatte vorbestellen
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo / Screenshots */}
      <section
        className="mx-auto mt-12 max-w-6xl space-y-6 px-4"
        aria-labelledby="demo-heading"
      >
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            {strings.demoSection.overline}
          </p>
          <h2
            id="demo-heading"
            className="text-2xl font-bold text-slate-900"
          >
            {strings.demoSection.title}
          </h2>
          <p className="max-w-3xl text-sm text-slate-600">
            {strings.demoSection.lead}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {strings.demoSection.items.map((item) => (
            <article
              key={item.title}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                <img
                  src={item.image}
                  alt={item.alt}
                  className="h-full w-full object-cover object-center"
                  style={{
                    objectPosition: item.objectPosition ?? "center",
                  }}
                  loading="lazy"
                />
              </div>
              <div className="space-y-2 p-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                  {item.tag}
                </span>
                <h3 className="text-base font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-600">{item.body}</p>
                <Link
                  href={item.href}
                  className="group inline-flex items-center gap-2 text-sm font-semibold text-sky-700"
                >
                  {item.cta}
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
              </div>
            </article>
          ))}
        </div>
        <p className="text-xs text-slate-500">{strings.demoSection.note}</p>
      </section>

      {/* Rollen */}
      <section
        className="mx-auto mt-12 max-w-6xl space-y-6 px-4"
        aria-labelledby="audience-heading"
      >
        <div className="space-y-2 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            {strings.audienceTitle}
          </p>
          <h2
            id="audience-heading"
            className="text-2xl font-bold text-slate-900"
          >
            {strings.audienceLead}
          </h2>
          <p className="text-sm text-slate-600 max-w-3xl">
            {strings.audienceNote}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {strings.heroCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group block"
              aria-label={`${card.title} – ${card.cta}`}
            >
              <article className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div>
                  <div
                    className="mb-3 h-10 w-10 rounded-full bg-gradient-to-br from-sky-100 via-emerald-100 to-white"
                    aria-hidden="true"
                  />
                  <h3 className="text-base font-semibold text-slate-900">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">{card.body}</p>
                  <ul className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                    {card.actions.map((action) => (
                      <li
                        key={action}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1"
                      >
                        {action}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 rounded-xl bg-slate-50/80 p-3 text-xs text-slate-600">
                    {card.example}
                  </p>
                </div>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-sky-700">
                  {card.cta}
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                    →
                  </span>
                </span>
              </article>
            </Link>
          ))}
        </div>
      </section>

      {/* Membership Highlight */}
      <section
        className="mx-auto mt-12 max-w-6xl px-4"
        aria-labelledby="membership-heading"
      >
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-[0_20px_70px_rgba(15,23,42,0.28)]">
          <div className="grid gap-6 p-8 md:grid-cols-[1.1fr_0.9fr] md:p-10">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-wide text-emerald-200">
                {strings.membershipHighlight.overline}
              </p>
              <h2
                id="membership-heading"
                className="text-2xl font-bold leading-tight md:text-3xl"
              >
                {strings.membershipHighlight.title}
              </h2>
              <p className="text-sm text-slate-200 md:text-base">
                {strings.membershipHighlight.body}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/mitglied-werden"
                  className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-500"
                >
                  {strings.membershipHighlight.button}
                </Link>
              </div>
            </div>
            <div className="relative rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="relative space-y-3 text-sm text-slate-100">
                <p className="text-base font-semibold">
                  {strings.membershipHighlight.asideTitle}
                </p>
                <p className="text-slate-200">{strings.membershipHighlight.asideBody}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center justify-center rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-white/25"
                  >
                    {strings.membershipHighlight.shareLabel}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/90 hover:bg-white/10"
                  >
                    {strings.membershipHighlight.shareCopyLabel}
                  </button>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/90 hover:bg-white/10"
                  >
                    {strings.membershipHighlight.shareWhatsappLabel}
                  </a>
                  <a
                    href={emailHref}
                    className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/90 hover:bg-white/10"
                  >
                    {strings.membershipHighlight.shareEmailLabel}
                  </a>
                </div>
                {shareNote && (
                  <p className="text-[11px] text-slate-300" role="status">
                    {shareNote}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* USP / Schritte */}
      <section
        className="mx-auto mt-14 max-w-6xl space-y-6 px-4"
        aria-labelledby="process-heading"
      >
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            {strings.processTitle}
          </p>
          <h2
            id="process-heading"
            className="sr-only"
          >
            Vom Anliegen zur Entscheidung – Prozessbeschreibung
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {strings.uspItems.map((item, index) => (
            <article
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-sky-700">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-50 text-sky-800">
                  {index + 1}
                </span>
                <span>Schritt {index + 1}</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Majority & Quality */}
      <section
        className="mx-auto mt-14 max-w-6xl px-4"
        aria-labelledby="majority-quality-heading"
      >
        <h2
          id="majority-quality-heading"
          className="sr-only"
        >
          Mehrheiten und Qualitätsstandard
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
            <h3 className="text-2xl font-bold text-slate-900">
              {strings.majoritySection.title}
            </h3>
            <p className="mt-3 text-sm text-slate-700">
              {strings.majoritySection.lead}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {strings.majoritySection.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm font-semibold text-slate-800">
              {strings.majoritySection.closing}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 shadow-sm">
            <h3 className="text-2xl font-bold text-slate-900">
              {strings.qualitySection.title}
            </h3>
            <p className="mt-3 text-sm text-slate-700">
              {strings.qualitySection.body}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {strings.qualitySection.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-sky-500" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <Link
                href="/faq"
                className="btn border border-slate-300 bg-white/80 hover:bg-white"
              >
                {strings.qualitySection.ctaFaq}
              </Link>
              <p className="mt-2 text-xs text-slate-600">
                Unsere Satzung und ausführliche Verfahrensbeschreibung findest du in
                der FAQ.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Updates & HumanCheck */}
      <section
        className="mx-auto mt-14 max-w-6xl px-4"
        aria-labelledby="updates-heading"
      >
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
            <h3
              id="updates-heading"
              className="text-xl font-semibold text-slate-900"
            >
              {strings.updatesForm.title}
            </h3>
            <p className="mt-2 text-sm text-slate-700">
              {strings.updatesForm.body}
            </p>
            <form
              onSubmit={handleUpdatesSubmit}
              className="mt-5 space-y-4"
              aria-label="Updates abonnieren"
            >
              <div className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
                <label htmlFor="hp_updates">Bitte leer lassen</label>
                <input
                  id="hp_updates"
                  name="hp_updates"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={updatesHoneypot}
                  onChange={(e) => setUpdatesHoneypot(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  {strings.updatesForm.emailLabel}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    if (!updatesFormStartedAt) setUpdatesFormStartedAt(Date.now());
                    setEmail(e.target.value);
                  }}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  placeholder="name@beispiel.de"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  {strings.updatesForm.interestsLabel}
                </label>
                <textarea
                  rows={3}
                  value={interests}
                  onChange={(e) => {
                    if (!updatesFormStartedAt) setUpdatesFormStartedAt(Date.now());
                    setInterests(e.target.value);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  placeholder="z. B. Kommunale Themen, Transparenz, Bildung …"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:brightness-105 disabled:opacity-70"
                >
                  {isSubmitting ? "Senden …" : strings.updatesForm.submit}
                </button>
                {notice && (
                  <span
                    className={`text-xs ${
                      notice.ok ? "text-emerald-700" : "text-red-600"
                    }`}
                    role="status"
                  >
                    {notice.msg}
                  </span>
                )}
              </div>
            </form>
          </div>
          <div className="w-full lg:justify-self-end lg:max-w-sm">
            <HumanCheck
              formId="public-updates"
              variant="compact"
              onSolved={(res) => {
                setHumanToken(res.token);
                setNotice({
                  ok: true,
                  msg: "Danke – Sicherheitscheck bestanden.",
                });
              }}
              onError={() =>
                setNotice({ ok: false, msg: strings.updatesForm.error })
              }
            />
          </div>
        </div>
      </section>

      {/* Closing / Bewegung */}
      <section
        className="mx-auto mt-16 max-w-6xl px-4"
        aria-labelledby="closing-heading"
      >
        <div className="overflow-hidden rounded-3xl bg-slate-900 text-white shadow-[0_20px_70px_rgba(15,23,42,0.28)]">
          <div className="grid gap-6 p-8 md:grid-cols-[1.1fr_0.9fr] md:p-10">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-wide text-emerald-200">
                VoiceOpenGov – direktdemokratische Bewegung
              </p>
              <h2
                id="closing-heading"
                className="text-3xl font-bold leading-tight md:text-4xl"
              >
                {strings.closingSection.title}
              </h2>
              <p className="text-sm text-slate-200 md:text-base">
                {strings.closingSection.body}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/mitglied-werden"
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:brightness-105"
                >
                  {strings.closingSection.primaryCta}
                </Link>
                <Link
                  href="/votes"
                  className="inline-flex items-center justify-center rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
                >
                  {strings.closingSection.secondaryCta}
                </Link>
              </div>
            </div>
            <div className="relative rounded-2xl bg-gradient-to-br from-emerald-500/20 via-sky-500/10 to-white/5 p-6">
              <div
                className="absolute inset-0 rounded-2xl border border-white/20"
                aria-hidden="true"
              />
              <div className="relative space-y-4 text-sm text-slate-100">
                <p className="text-base font-semibold">Was du mitbringst, zählt.</p>
                <p>
                  Jede Stimme stärkt die Bewegung. Jede Quelle macht eDebatte besser
                  und Entscheidungen belastbarer. Jede Mitgliedschaft finanziert
                  Moderation, Technik und offene Prüfprotokolle.
                </p>
                <p className="text-emerald-100">
                  Lass uns gemeinsam beweisen, dass Mehrheiten fair, informiert und
                  transparent entscheiden können.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
