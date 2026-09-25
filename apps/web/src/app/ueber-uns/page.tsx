"use client";

import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import { useAutoTranslateText } from "@/lib/i18n/autoTranslate";

const CARD = "rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm";
const CONTRIBUTION_HREF = "/create?mode=source&intent=contribution&entryIntent=content_companion&entryMode=direct";

export default function UeberUnsPage() {
  const { locale } = useLocale();
  const t = useAutoTranslateText({ locale, namespace: "ueber-uns-simple" });
  const de = String(locale ?? "de").startsWith("de");
  const tr = (deText: string, enText: string, key: string) => t(de ? deText : enText, key);

  const principles = [
    ["Eine Frage muss verständlich sein.", "A question should be easy to understand."],
    ["Quellen, Erfahrungen und Gegenpositionen sollen sichtbar bleiben.", "Sources, experiences and opposing views should remain visible."],
    ["Offene Punkte werden nicht versteckt.", "Open questions should not be hidden."],
    ["KI darf unterstützen, aber nicht für Menschen entscheiden.", "AI may assist, but must not decide for people."],
  ];

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
      <section className="mx-auto max-w-5xl space-y-12 px-4 py-14 sm:px-6 lg:px-8">
        <header className="max-w-3xl space-y-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
            {tr("Über eDebatte", "About eDebatte", "hero.kicker")}
          </p>
          <h1 className="headline-grad text-4xl font-extrabold tracking-tight sm:text-6xl">
            {tr("Damit aus vielen Stimmen ein nachvollziehbares Bild wird.", "Turn many voices into a clearer picture.", "hero.title")}
          </h1>
          <p className="text-lg leading-8 text-[rgb(var(--muted))]">
            {tr(
              "eDebatte hilft Menschen, Fragen gemeinsam zu klären: abstimmen, eigene Perspektiven ergänzen, Gründe nennen, Quellen beitragen und sichtbar machen, was noch offen ist.",
              "eDebatte helps people clarify questions together: vote, add perspectives, explain reasons, contribute sources and show what is still open.",
              "hero.lead",
            )}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/swipes" className="btn btn-primary">{tr("Mitmachen", "Participate", "cta.participate")}</Link>
            <Link href="/runden/new?gtm=1" className="btn btn-ghost">{tr("Etwas starten", "Start something", "cta.start")}</Link>
            <Link href="/howtoworks/edebatte" className="btn btn-ghost">{tr("So funktioniert es", "How it works", "cta.how")}</Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <article className={CARD}>
            <h2 className="text-xl font-black">{tr("Worum geht es?", "What is this about?", "what.title")}</h2>
            <p className="mt-3 text-sm leading-6 text-[rgb(var(--muted))]">
              {tr("Nicht die lauteste Stimme soll gewinnen. Unterschiedliche Sichtweisen sollen so zusammenkommen, dass man sie verstehen und mit ihnen weiterarbeiten kann.", "The loudest voice should not win. Different perspectives should come together in a way people can understand and use.", "what.body")}
            </p>
          </article>
          <article className={CARD}>
            <h2 className="text-xl font-black">{tr("Was kannst du tun?", "What can you do?", "do.title")}</h2>
            <p className="mt-3 text-sm leading-6 text-[rgb(var(--muted))]">
              {tr("Du kannst abstimmen, eine Alternative vorschlagen, deine Erfahrung teilen, eine Quelle einreichen oder eine offene Frage ergänzen.", "You can vote, suggest an alternative, share experience, submit a source or add an open question.", "do.body")}
            </p>
          </article>
          <article className={CARD}>
            <h2 className="text-xl font-black">{tr("Was passiert danach?", "What happens next?", "next.title")}</h2>
            <p className="mt-3 text-sm leading-6 text-[rgb(var(--muted))]">
              {tr("eDebatte soll nicht bei Prozentzahlen enden. Gründe, Quellen, Widersprüche und offene Punkte helfen dabei, den nächsten gemeinsamen Schritt zu erkennen.", "eDebatte should not end at percentages. Reasons, sources, disagreements and open questions help reveal the next shared step.", "next.body")}
            </p>
          </article>
        </section>

        <section className="rounded-3xl bg-slate-950 p-7 text-white sm:p-9">
          <h2 className="text-3xl font-black">{tr("Einfach vorne. Sorgfältig im Hintergrund.", "Simple in front. Careful underneath.", "principles.title")}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            {tr("Die Technik darf komplex sein. Die Nutzung soll es nicht sein. Deshalb zeigen wir zuerst, was du jetzt tun kannst – und Details erst dann, wenn du sie brauchst.", "The technology may be complex. Using it should not be. We show what you can do now, and details only when you need them.", "principles.lead")}
          </p>
          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {principles.map(([deText, enText], index) => (
              <li key={deText} className="rounded-2xl border border-white/15 p-4 text-sm leading-6 text-slate-200">
                {tr(deText, enText, `principles.${index}`)}
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-2xl font-black">{tr("Du siehst eine Lücke? Dann sollst du helfen können.", "See a gap? You should be able to help.", "help.title")}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[rgb(var(--muted))]">
              {tr("Wenn eine Quelle fehlt, eine Frage offen ist oder eine Perspektive nicht vorkommt, soll der passende Beitrag möglichst direkt an dieser Stelle möglich sein. Für das dauerhafte Einreichen meldest du dich an; der gewählte Kontext wird dabei erhalten, wenn du aus einem konkreten Thema kommst.", "If a source is missing, a question is open or a perspective is absent, the relevant contribution should be possible right there. For a durable submission, sign in; when you come from a specific topic, that context is preserved.", "help.body")}
            </p>
          </div>
          <Link href={CONTRIBUTION_HREF} className="btn btn-primary">{tr("Beitrag einreichen", "Contribute", "help.cta")}</Link>
        </section>
      </section>
    </main>
  );
}