import type { Metadata } from "next";
import Link from "next/link";
import { buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";

const TITLE = "Global civic-tech landscape: where eDebatte fits";
const DESCRIPTION =
  "A global map of participatory democracy, deliberation, community engagement and civic collective intelligence — and the layer eDebatte aims to connect.";

export const metadata: Metadata = {
  ...buildPublicPageMetadata({
    path: "/en/civic-tech-landscape",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    ogType: "website",
  }),
  title: { absolute: TITLE },
};

const groups = [
  [
    "Participatory democracy frameworks",
    "CONSUL Democracy and Decidim provide configurable democratic processes such as proposals, initiatives, participatory budgets and consultation spaces.",
  ],
  [
    "Community and government engagement",
    "Platforms such as Go Vocal / CitizenLab, CrowdInsights and wer|denkt|was help institutions run consultations, surveys, idea collection, mapping and engagement projects.",
  ],
  [
    "Mass participation and computational deliberation",
    "Polis and Make.org help large groups surface opinion structures, priorities, proposals and areas of agreement at scale.",
  ],
  [
    "AI and civic collective intelligence",
    "Your Priorities and Policy Synth move closer to problem definition, AI-supported research and solution development combined with human participation.",
  ],
] as const;

const stack = [
  ["Signal", "A concern, observation, question, experience or source enters the public space."],
  ["Sensemaking", "Problem framing, causes, context, evidence, contradictions and uncertainty become inspectable."],
  ["Options", "Alternative courses of action, consequences and trade-offs are developed before prioritisation."],
  ["Deliberation", "People support, challenge, refine and prioritise positions on a shared information base."],
  ["Institutional connection", "Results can connect to civil society, municipalities, parliaments, governments, science, media and international organisations."],
  ["Democratic memory", "Evidence, reasoning and decisions remain traceable beyond a single project, organisation or election cycle."],
] as const;

export default function CivicTechLandscapeEnglishPage() {
  return (
    <main lang="en" id="main-content" className="min-h-[100svh] bg-[color:var(--background)] text-[color:var(--foreground)]">
      <section className="border-b border-[color:var(--border)]">
        <div className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Global civic-tech landscape</p>
          <h1 className="mt-4 max-w-6xl text-balance text-4xl font-black tracking-[-0.04em] sm:text-6xl lg:text-7xl">
            eDebatte is not simply another citizen-participation platform.
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-[color:var(--muted)] sm:text-xl">
            The international landscape already contains strong systems for participatory democracy, deliberation, community engagement and collective intelligence. The useful question is therefore not “Who has voting, comments or AI?” but <strong className="text-[color:var(--foreground)]">which part of democratic problem-solving a system makes its core.</strong>
          </p>
          <p className="mt-4 max-w-4xl text-lg leading-8 text-[color:var(--muted)] sm:text-xl">
            eDebatte aims to connect the layer from an unresolved social signal to an evidence-linked, institutionally actionable public reasoning process — across projects, institutions, regions and languages.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/en/why-edebatte" className="inline-flex min-h-12 items-center justify-center rounded-full bg-cyan-500 px-6 py-3 font-black text-slate-950">
              Why eDebatte? →
            </Link>
            <Link href="/vergleich" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[color:var(--border)] px-6 py-3 font-black">
              Deutsch
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-16 lg:px-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Several technology classes, not one market</p>
        <h2 className="mt-3 max-w-5xl text-3xl font-black tracking-[-0.03em] sm:text-5xl">
          Different systems are strong at different stages of democracy.
        </h2>
        <div className="mt-9 grid gap-5 md:grid-cols-2">
          {groups.map(([title, body]) => (
            <article key={title} className="rounded-[1.6rem] border border-[color:var(--border)] p-6">
              <h3 className="text-2xl font-black">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-950 py-14 text-white sm:py-16">
        <div className="mx-auto max-w-[76rem] px-5 sm:px-8 lg:px-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">The eDebatte ambition</p>
          <h2 className="mt-3 max-w-5xl text-3xl font-black tracking-[-0.03em] sm:text-5xl">
            From social signal to democratic memory.
          </h2>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stack.map(([title, body]) => (
              <article key={title} className="rounded-[1.5rem] border border-slate-700 p-6">
                <h3 className="text-xl font-black text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-16 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">A fair comparison</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-5xl">The moat cannot be a feature checklist.</h2>
          </div>
          <div className="space-y-4 text-base leading-7 text-[color:var(--muted)]">
            <p>
              CONSUL and Decidim already contain bottom-up mechanisms. Polis is exceptionally strong at mapping large-scale opinion. Your Priorities and Policy Synth move close to community-defined problems and AI-supported policy exploration. eDebatte should acknowledge those strengths rather than invent artificial exclusivity.
            </p>
            <p>
              The longer-term differentiation is the connective layer: persistent evidence and claim relationships, transparent reasoning, alternatives, cross-institutional continuity and a public democratic memory that can survive individual participation projects and election cycles.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
