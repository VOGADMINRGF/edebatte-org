import type { BucketBlock } from "@/components/landing/ExamplesBackdrop";
import HomeSplitVoxyLanding from "@/features/home/HomeSplitVoxyLanding";
import type { StartExperienceModel } from "@/features/start/startExperience";

type LandingStartProps = {
  blocks?: BucketBlock[];
  experience?: StartExperienceModel;
};

const DEFAULT_START_EXPERIENCE: StartExperienceModel = {
  familiarity: "unknown_visitor",
  eyebrow: "Dein Anliegen zählt",
  title: "Was sollte sich ändern?",
  description:
    "Bring ein, was dich beschäftigt, oder entscheide schnell bei laufenden Themen mit. Der öffentliche Einstieg beginnt beim Menschen und seinem Anliegen.",
  helperText: "Ein Satz reicht zum Start. Ort, Thema und Kontext werden nur ergänzt, soweit sie wirklich gebraucht werden.",
  trustText:
    "Nichts wird automatisch veröffentlicht. Quellen, Positionen und offene Fragen bleiben voneinander unterscheidbar.",
  showExtendedOrientation: false,
  workspaceHref: null,
  workspaceLabel: null,
  quickActionCenter: {
    eyebrow: "Direkt loslegen",
    title: "Anliegen einbringen oder mitentscheiden.",
    description:
      "Starte frei mit deinem Anliegen oder beteilige dich schnell an laufenden Fragen. Professionelle Werkzeuge bleiben nachgelagert.",
    primaryActions: [],
    secondaryActions: [],
  },
};

export default function LandingStart({
  blocks,
  experience = DEFAULT_START_EXPERIENCE,
}: LandingStartProps) {
  return <HomeSplitVoxyLanding blocks={blocks} experience={experience} />;
}
