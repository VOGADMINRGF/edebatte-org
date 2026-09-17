import type { Metadata } from "next";
import Link from "next/link";
import { buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";

const TITLE = "Why eDebatte? Democratic problem-solving before the process";
const DESCRIPTION =
  "eDebatte starts before an institution has framed the question: from unresolved concerns to evidence, alternatives, deliberation and accountable democratic follow-through.";

export const metadata: Metadata = {
  ...buildPublicPageMetadata({
    path: "/en/why-edebatte",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    ogType: "website",
  }),
  title: { absolute: TITLE },
};

const journey = [
  ["Signal", "A problem, observation, open question, experience or source can be the starting point. A finished proposal is not required."],
  ["Sensemaking", "People can clarify what the problem actually is, what is known, what remains uncertain and which levels or communities are affected."],
  ["Evidence", "Sources, claims, lived experience, counter-evidence, contradictions and uncertainty should remain distinguishable and traceable."],
  ["Options", "Different courses of action, consequences, costs, opportunities and trade-offs can emerge before people are pushed into a binary choice."],
  ["Deliberation", "People can support, challenge, refine and prioritise positions on a shared and inspectable information base."],
  ["Connection", "Results can connect to civil society, municipalities, parliaments, governments, science, media, NGOs and international organisations."],
] as const;

export default function WhyEDebatteEnglishPage() {
  return (
    <main lang="en" id="main-content" className="min-h-[100svh] bg-[color:var(--background)] text-[color:var(--foreground)]">
      <section className="border-b border-[color:var(--border)]">
        <div className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
            Participation starts before the process.
          </p>
          <h1 className="mt-4 max-w-6xl text-balance text-4xl font-black tracking-[-0.04em] sm:text-6xl lg:text-7xl">
            Do not wait until the question has already been framed.
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-[color:var(--muted)] sm:text-xl">
            eDebatte is designed to start with a person and an unresolved concern — before a government, organisation, campaign or platform has already decided what the problem is or which options are available.
          </p>
          <p className="mt-4 max-w-4xl text-lg leading-8 text-[color:var(--muted)] sm:text-xl">
            The ambition is larger than another participation tool: <strong className="text-[color:var(--foreground)]">a public infrastructure for democratic problem-solving, civic collective intelligence and public reasoning — from local issues to global questions.</strong>
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/en/civic-tech-landscape" className="inline-flex min-h-12 items-center justify-center rounded-full bg-cyan-500 px-6 py-3 font-black text-slate-950">
              Explore the global landscape →
            </Link>
            <Link href="/warum-edebatte" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[color:var(--border)] px-6 py-3 font-black">
              Deutsch
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-16 lg:px-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">From concern to shared agenda</p>
        <h2 className="mt-3 max-w-5xl text-3xl font-black tracking-[-0.03em] sm:text-5xl">
          The first democratic question is often not “Which option do you choose?”
        </h2>
        <p className="mt-5 max-w-4xl text-base leading-7 text-[color:var(--muted)]">
          It is often: “What problem are we actually trying to solve?” Between a social signal and a formal consultation lies a critical space for problem definition, agenda-setting, evidence, competing explanations, alternatives and trade-offs. eDebatte aims to make that space part of democratic participation itself.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {journey.map(([title, body]) => (
            <article key={title} className="rounded-[1.5rem] border border-[color:var(--border)] p-6">
              <h3 className="text-xl font-black">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[color:var(--border)] bg-[color:var(--surface)]/35">
        <div className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-16 lg:px-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Citizen-first, institution-connected</p>
          <h2 className="mt-3 max-w-5xl text-3xl font-black tracking-[-0.03em] sm:text-5xl">
            Institutions are partners — not necessarily the start button.
          </h2>
          <p className="mt-5 max-w-4xl text-base leading-7 text-[color:var(--muted)]">
            Public administrations, parliaments, governments, researchers, media, NGOs, companies and international organisations remain essential for expertise, legitimacy, formal procedures and implementation. The difference is the sequence: a public concern should be able to become visible and structured before an institution opens its own process.
          </p>
        </div>
      </section>

      <section className="bg-slate-950 py-14 text-white sm:py-16">
        <div className="mx-auto max-w-[76rem] px-5 sm:px-8 lg:px-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">The larger category</p>
          <h2 className="mt-3 max-w-5xl text-balance text-3xl font-black tracking-[-0.03em] sm:text-5xl">
            Democratic problem-solving infrastructure. Civic collective intelligence. Public reasoning.
          </h2>
          <p className="mt-5 max-w-4xl text-base leading-7 text-slate-300">
            These terms are not meant to replace plain language for citizens. They describe the larger infrastructure ambition: connect social signals, evidence, alternatives, deliberation and institutional follow-through while preserving a transparent democratic memory across projects, organisations and election cycles.
          </p>
        </div>
      </section>
    </main>
  );
}
