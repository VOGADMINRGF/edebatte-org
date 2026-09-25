import { VOXY_SIGNATURE } from "./dualVoiceArchitecture";
import {
  VOXY_DUAL_VOICE_PILOT_VOICE_BINDINGS,
  type VoxyBroadcastMeta,
  type VoxyDualVoicePilotSpeakerEntry,
  type VoxyDualVoicePilotVisualEntry,
  type VoxyLowerThirdEntry,
  type VoxyPilotEvidence,
} from "./dualVoiceExplainerPilot";
import { VOXY_FIRST_PARTY_VISUAL_BINDING } from "./firstPartyVoiceClone";
import {
  VOXY_HOMEPAGE_FILM_LAYOUTS,
  type HomepageFilmLayoutProfile,
} from "./homepageReferenceFilmLayouts";

export const VOXY_HOMEPAGE_REFERENCE_FILMS_SCHEMA_VERSION =
  "voxy-homepage-reference-films-v1" as const;

export type VoxyHomepageFilmId = "edebatte" | "voiceopengov";
export type VoxyHomepageContextMode = "evergreen" | "election_window";
export type VoxyHomepageVisualLanguage = "media_forensics" | "democratic_journey";

export const VOXY_HOMEPAGE_REFERENCE_FILMS_OUTPUT = {
  edebatte: {
    directory: "edebatte",
    mp4: "voxy-edebatte-homepage-reference-v1.mp4",
    masterAudio: "master-audio.wav",
    preview: "preview.png",
    contactSheet: "contact-sheet.png",
    manifest: "manifest.json",
    captionsVtt: "captions.de.vtt",
    captionsSrt: "captions.de.srt",
    sourceManifest: "source-manifest.json",
    evidenceTimeline: "evidence-timeline.json",
    motionTimeline: "motion-timeline.json",
    lowerThirdTimeline: "lower-third-timeline.json",
    speakerTimeline: "speaker-timeline.json",
    visualStateTimeline: "visual-state-timeline.json",
    audioPreservation: "audio-preservation.json",
    durationSeconds: { min: 55, max: 70 },
  },
  voiceopengov: {
    directory: "voiceopengov",
    mp4: "voxy-voiceopengov-homepage-reference-v1.mp4",
    masterAudio: "master-audio.wav",
    preview: "preview.png",
    contactSheet: "contact-sheet.png",
    manifest: "manifest.json",
    captionsVtt: "captions.de.vtt",
    captionsSrt: "captions.de.srt",
    sourceManifest: "source-manifest.json",
    evidenceTimeline: "evidence-timeline.json",
    motionTimeline: "motion-timeline.json",
    lowerThirdTimeline: "lower-third-timeline.json",
    speakerTimeline: "speaker-timeline.json",
    visualStateTimeline: "visual-state-timeline.json",
    audioPreservation: "audio-preservation.json",
    durationSeconds: { min: 60, max: 75 },
  },
  width: 1920,
  height: 1080,
  fps: 24,
} as const;

export const VOXY_HOMEPAGE_SOURCE_REGISTRY = [
  {
    id: "edebatte-homepage",
    publisher: "eDebatte",
    title: "eDebatte – Stimmen prüfen, Perspektiven verstehen",
    url: "https://www.edebatte.org/",
    sourceClass: "first_party_product_surface",
    retrievedAt: "2026-08-18",
    revision: "live-page-check-2026-08-18",
  },
  {
    id: "edebatte-statements",
    publisher: "eDebatte",
    title: "Statements",
    url: "https://www.edebatte.org/statements",
    sourceClass: "first_party_product_surface",
    retrievedAt: "2026-08-18",
    revision: "live-page-check-2026-08-18",
  },
  {
    id: "voiceopengov-homepage",
    publisher: "VoiceOpenGov",
    title: "VoiceOpenGov – Mitmachen und informiert bleiben",
    url: "https://www.voiceopengov.org/",
    sourceClass: "first_party_product_surface",
    retrievedAt: "2026-08-18",
    revision: "live-page-check-2026-08-18",
  },
  {
    id: "federal-election-calendar-2026",
    publisher: "Die Bundeswahlleiterin",
    title: "Künftige Wahltermine in Deutschland",
    url: "https://www.bundeswahlleiterin.de/service/wahltermine.html",
    sourceClass: "official_election_authority",
    retrievedAt: "2026-08-18",
    revision: "live-page-check-2026-08-18",
  },
  {
    id: "berlin-election-2026-faq",
    publisher: "Die Landeswahlleiterin für Berlin",
    title: "Fragen und Antworten zu den Berliner Wahlen 2026",
    url: "https://www.berlin.de/wahlen/wahlen/berliner-wahlen-2026/fragen-und-antwortkatalog/artikel.1646712.php",
    sourceClass: "official_election_authority",
    retrievedAt: "2026-08-18",
    revision: "live-page-check-2026-08-18",
  },
  {
    id: "luebbe-wolff-demophobie-2023",
    publisher: "Vittorio Klostermann",
    title: "Gertrude Lübbe-Wolff: Demophobie. Muss man die direkte Demokratie fürchten?",
    url: "https://www.klostermann.de/Luebbe-Wolff-Getrude-Demophobie",
    sourceClass: "first_party_publisher_surface",
    retrievedAt: "2026-08-18",
    revision: "publisher-page-check-2026-08-18",
  },
] as const;

export const VOXY_CURRENT_OFFER_INVENTORY = [
  {
    id: "edebatte-public-orientation",
    classification: "current_capability",
    product: "eDebatte",
    claim: "Öffentliche Themen, Statements und ihre Kontexte lassen sich aufrufen.",
    sourceIds: ["edebatte-homepage", "edebatte-statements"],
    marketable: true,
  },
  {
    id: "edebatte-check-contribution",
    classification: "current_capability",
    product: "eDebatte",
    claim: "Menschen können einen Beitrag zur Prüfung einreichen und freigegebene Beteiligungswege nutzen.",
    sourceIds: ["edebatte-homepage"],
    marketable: true,
  },
  {
    id: "voiceopengov-double-opt-in",
    classification: "current_capability",
    product: "VoiceOpenGov",
    claim: "Die Initiative bietet eine kostenfreie Eintragung mit Double-Opt-in.",
    sourceIds: ["voiceopengov-homepage"],
    marketable: true,
  },
  {
    id: "voiceopengov-voluntary-support",
    classification: "current_capability",
    product: "VoiceOpenGov",
    claim: "Freiwillige Unterstützung ist möglich und verschafft keine Stimmvorteile.",
    sourceIds: ["voiceopengov-homepage"],
    marketable: true,
  },
  {
    id: "verify-before-belief",
    classification: "editorial_principle",
    product: "shared",
    claim: "Quellen, Gegenpositionen, offene Fragen und Unsicherheit sichtbar halten.",
    sourceIds: [],
    marketable: false,
  },
  {
    id: "direct-democracy-question",
    classification: "editorial_principle",
    product: "VoiceOpenGov",
    claim: "Wie Beteiligung zwischen Wahlen nachvollziehbare politische Wirkung entfalten kann, bleibt eine offene demokratische Gestaltungsfrage und wird nicht als vorhandene Produktfunktion behauptet.",
    sourceIds: [],
    marketable: false,
  },
  {
    id: "continuous-democratic-mandate",
    classification: "future_intent",
    product: "VoiceOpenGov",
    claim: "Ein allgemeines kontinuierliches digitales Mandat ist nicht als aktuelles Produktangebot freigegeben.",
    sourceIds: [],
    marketable: false,
  },
] as const;

type FilmSegment = Readonly<{
  id: string;
  text: string;
  spokenText: string;
  pauseAfterMs: number;
  contexts: readonly VoxyHomepageContextMode[];
}>;

type HomepageFilmDefinition = Readonly<{
  id: VoxyHomepageFilmId;
  title: string;
  proposition: string;
  cta: string;
  visualLanguage: VoxyHomepageVisualLanguage;
  motionVocabulary: readonly string[];
  broadcastMeta: VoxyBroadcastMeta;
  segments: readonly FilmSegment[];
  evidence: readonly VoxyPilotEvidence[];
  sourceIds: readonly string[];
  marketedOfferIds: readonly string[];
}>;

const bothModes = ["evergreen", "election_window"] as const;

export const VOXY_HOMEPAGE_REFERENCE_FILMS = {
  edebatte: {
    id: "edebatte",
    title: "eDebatte Homepage Reference Film",
    proposition: "Prüfen statt glauben.",
    cta: "Lies die Schlagzeile. Dann geh einen Schritt weiter.",
    visualLanguage: "media_forensics",
    motionVocabulary: [
      "headline_freeze",
      "source_scan",
      "primary_source_pull",
      "passage_highlight",
      "context_expand",
      "counterposition_split",
      "evidence_trace",
      "dossier_dock",
    ],
    broadcastMeta: {
      topicLabel: "MEDIEN-CHECK",
      topicTitle: "Von der Schlagzeile zur Primärquelle",
      displayDate: "WAHLFENSTER 2026",
      kicker: "PRÜFEN STATT GLAUBEN",
      headline: "Die Schlagzeile ist der Anfang",
      summary: "Headline, Primärquelle, Kontext, Gegenposition und offene Frage werden getrennt prüfbar.",
    },
    segments: [
      {
        id: "edebatte-greeting",
        text: "Hallo Nachbar. Jeden Tag erreichen uns Schlagzeilen, Zahlen und Zitate. Aber eine Schlagzeile ist der Anfang – nicht das Ende der Recherche.",
        spokenText: "Hallo Nachbar. Jeden Tag erreichen uns Schlagzeilen, Zahlen und Zitate. Aber eine Schlagzeile ist der Anfang, nicht das Ende der Recherche.",
        pauseAfterMs: 140,
        contexts: bothModes,
      },
      {
        id: "edebatte-election-noise",
        text: "Gerade vor Wahlen wird Tempo zum Problem: viele Antworten, wenig Zeit für die Frage, worauf sie eigentlich beruhen.",
        spokenText: "Gerade vor Wahlen wird Tempo zum Problem: viele Antworten, wenig Zeit für die Frage, worauf sie eigentlich beruhen.",
        pauseAfterMs: 120,
        contexts: ["election_window"],
      },
      {
        id: "edebatte-source-questions",
        text: "Wer hat es gesagt? Wo ist die Primärquelle? Von wann stammt sie? Und zeigt die Quelle wirklich das, was die Überschrift behauptet?",
        spokenText: "Wer hat es gesagt? Wo ist die Primärquelle? Von wann stammt sie? Und zeigt die Quelle wirklich das, was die Überschrift behauptet?",
        pauseAfterMs: 120,
        contexts: bothModes,
      },
      {
        id: "edebatte-media-forensics",
        text: "Eine Zahl ist noch kein Beleg. Ein Zitat noch kein Kontext. Und eine Studie ist nicht dasselbe wie ihre Interpretation.",
        spokenText: "Eine Zahl ist noch kein Beleg. Ein Zitat noch kein Kontext. Und eine Studie ist nicht dasselbe wie ihre Interpretation.",
        pauseAfterMs: 140,
        contexts: bothModes,
      },
      {
        id: "edebatte-product-model",
        text: "eDebatte ordnet Aussage, Originalquelle, Kontext, Gegenposition und offene Frage so, dass du den Weg zurück zum Beleg sehen kannst.",
        spokenText: "eDebatte ordnet Aussage, Originalquelle, Kontext, Gegenposition und offene Frage so, dass du den Weeg zurück zum Beleg sehen kannst.",
        pauseAfterMs: 130,
        contexts: bothModes,
      },
      {
        id: "edebatte-current-offer",
        text: "Du kannst öffentliche Themen und Statements mit Kontext aufrufen und einen Beitrag zur Prüfung einreichen.",
        spokenText: "Du kannst öffentliche Themen und Statements mit Kontext aufrufen und einen Beitrag zur Prüfung einreichen.",
        pauseAfterMs: 120,
        contexts: bothModes,
      },
      {
        id: "edebatte-next-generation",
        text: "Gute Berichterstattung braucht Vertrauen. Die nächste Generation braucht zusätzlich Nachprüfbarkeit.",
        spokenText: "Gute Berichterstattung braucht Vertrauen. Die nächste Generation braucht zusätzlich Nachprüfbarkeit.",
        pauseAfterMs: 150,
        contexts: bothModes,
      },
      {
        id: "edebatte-synthesis-questions",
        text: "Was wissen wir? Was spricht dagegen? Was fehlt? Und wo endet der Beleg?",
        spokenText: "Was wissen wir? Was spricht dagegen? Was fehlt? Und wo endet der Beleg?",
        pauseAfterMs: 160,
        contexts: bothModes,
      },
      {
        id: "edebatte-verifiability",
        text: "Du musst mir nichts glauben. Du sollst es prüfen können.",
        spokenText: "Du musst mir nichts glauben. Du sollst es prüfen können.",
        pauseAfterMs: 150,
        contexts: bothModes,
      },
      {
        id: "edebatte-cta",
        text: "Lies die Schlagzeile. Dann geh einen Schritt weiter.",
        spokenText: "Lies die Schlagzeile. Dann geh einen Schritt weiter.",
        pauseAfterMs: 0,
        contexts: bothModes,
      },
    ],
    evidence: [
      {
        id: "edebatte-source-chain",
        type: "HEADLINE-CHECK",
        title: "Headline → Primärquelle → Kontext",
        shortSummary: "Nicht nur lesen, was behauptet wird – zurückverfolgen, worauf es beruht.",
        sourceLabel: "eDebatte · öffentliche Produktoberflächen",
        provenance: "AKTUELLE PRODUKT-EVIDENZ",
        visualIdentity: "media-forensics-cyan-source-trace",
        visualPayload: { kind: "trend_line" },
        memoryPriority: 100,
      },
      {
        id: "edebatte-status-ladder",
        type: "MEDIENFORENSIK",
        title: "Zitat, Zahl, Studie: Was trägt?",
        shortSummary: "Quelle, Interpretation und Kontext werden nicht miteinander verwechselt.",
        sourceLabel: "redaktionelle Einordnung",
        provenance: "REDAKTIONELLES PRINZIP",
        visualIdentity: "media-forensics-blue-evidence-stack",
        visualPayload: { kind: "bar_series", values: [0.28, 0.48, 0.7, 1] },
        memoryPriority: 90,
      },
      {
        id: "edebatte-open-question",
        type: "OFFENE FRAGE",
        title: "Wo endet der Beleg?",
        shortSummary: "Unsicherheit bleibt sichtbar, statt zur Gewissheit umgedeutet zu werden.",
        provenance: "REDAKTIONELLES PRINZIP",
        visualIdentity: "media-forensics-amber-open-case",
        visualPayload: { kind: "open_question" },
        memoryPriority: 110,
      },
    ],
    sourceIds: ["edebatte-homepage", "edebatte-statements"],
    marketedOfferIds: ["edebatte-public-orientation", "edebatte-check-contribution"],
  },
  voiceopengov: {
    id: "voiceopengov",
    title: "VoiceOpenGov Homepage Reference Film",
    proposition: "Deine Stimme endet nicht am Wahltag.",
    cta: "Mitmachen. Informiert bleiben.",
    visualLanguage: "democratic_journey",
    motionVocabulary: [
      "ballot_cast",
      "timeline_extend",
      "coalition_transform",
      "status_chain_advance",
      "participation_design_reveal",
      "citizen_network_expand",
      "equal_voice_pulse",
      "participation_path",
    ],
    broadcastMeta: {
      topicLabel: "DEMOKRATIE",
      topicTitle: "Was passiert nach dem Wahltag?",
      displayDate: "SEPTEMBER 2026",
      kicker: "DEINE STIMME BLEIBT",
      headline: "Eine Wahl dauert einen Tag",
      summary: "Der demokratische Weg geht über Programme, Verhandlungen, Entscheidungen, Umsetzung und Wirkung weiter.",
    },
    segments: [
      {
        id: "vog-greeting",
        text: "Hallo Nachbar. Eine Wahl dauert einen Tag. Aber eine Entscheidung wirkt Jahre.",
        spokenText: "Hallo Nachbar. Eine Wahl dauert einen Tag. Aber eine Entscheidung wirkt Jahre.",
        pauseAfterMs: 140,
        contexts: bothModes,
      },
      {
        id: "vog-election-calendar",
        text: "Im September 2026 finden mehrere Wahlen statt: in Sachsen-Anhalt, Niedersachsen, Berlin und Mecklenburg-Vorpommern.",
        spokenText: "Im September zweitausendsechsundzwanzig finden mehrere Wahlen statt: in Sachsen-Anhalt, Niedersachsen, Berlin und Mecklenburg-Vorpommern.",
        pauseAfterMs: 120,
        contexts: ["election_window"],
      },
      {
        id: "vog-berlin-sixteen",
        text: "In Berlin dürfen bei der Abgeordnetenhauswahl erstmals auch Sechzehn- und Siebzehnjährige abstimmen.",
        spokenText: "In Berlin dürfen bei der Abgeordnetenhauswahl erstmals auch Sechzehn- und Siebzehnjährige abstimmen.",
        pauseAfterMs: 130,
        contexts: ["election_window"],
      },
      {
        id: "vog-after-election",
        text: "Dann ist der Wahltag vorbei. Aus Programmen werden Verhandlungen, Kompromisse, Anträge, Beschlüsse – oder eben nichts davon.",
        spokenText: "Dann ist der Wahltag vorbei. Aus Programmen werden Verhandlungen, Kompromisse, Anträge, Beschlüsse, oder eben nichts davon.",
        pauseAfterMs: 130,
        contexts: bothModes,
      },
      {
        id: "vog-program-not-contract",
        text: "Was genau davon hast du eigentlich gewählt? Ein Wahlprogramm ist kein Vertrag. Ein Wahlversprechen ist kein Gesetz.",
        spokenText: "Was genau davon hast du eigentlich gewählt? Ein Wahlprogramm ist kein Vertrag. Ein Wahlversprechen ist kein Gesetz.",
        pauseAfterMs: 140,
        contexts: bothModes,
      },
      {
        id: "vog-demophobie",
        text: "Wenn Beteiligung keine definierte Folge hat, ist sie noch keine Mitbestimmung. Die entscheidende Frage lautet: Wie wird aus einer Stimme nachvollziehbare politische Wirkung?",
        spokenText: "Wenn Beteiligung keine definierte Folge hat, ist sie noch keine Mitbestimmung. Die entscheidende Frage lautet: Wie wird aus einer Stimme nachvollziehbare politische Wirkung?",
        pauseAfterMs: 150,
        contexts: bothModes,
      },
      {
        id: "vog-participation-balance",
        text: "Das muss nicht heißen, über alles direkt abzustimmen. Aber es sollte auch nicht heißen: wählen – und danach nur zuschauen. Wirkung braucht Grundrechte, Minderheitenschutz und klare Verantwortung.",
        spokenText: "Das muss nicht heißen, über alles direkt abzustimmen. Aber es sollte auch nicht heißen: wählen, und danach nur zuschauen. Wirkung braucht Grundrechte, Minderheitenschutz und klare Verantwortung.",
        pauseAfterMs: 150,
        contexts: bothModes,
      },
      {
        id: "vog-current-offer",
        text: "VoiceOpenGov macht diese Beteiligungsfrage sichtbar. Aktuell kannst du dich kostenfrei eintragen oder die Initiative freiwillig unterstützen. Unterstützung schafft keine Stimmvorteile.",
        spokenText: "Voice Open Gov macht diese Beteiligungsfrage sichtbar. Aktuell kannst du dich kostenfrei eintragen oder die Initiative freiwillig unterstützen. Unterstützung schafft keine Stimmvorteile.",
        pauseAfterMs: 140,
        contexts: bothModes,
      },
      {
        id: "vog-synthesis",
        text: "Ein Kreuz ist eine Entscheidung. Nachvollziehbarkeit zeigt, was daraus geworden ist.",
        spokenText: "Ein Kreuz ist eine Entscheidung. Nachvollziehbarkeit zeigt, was daraus geworden ist.",
        pauseAfterMs: 170,
        contexts: bothModes,
      },
      {
        id: "vog-cta",
        text: "Deine Stimme ist mehr als ein Kreuz. Mitmachen. Informiert bleiben.",
        spokenText: "Deine Stimme ist mehr als ein Kreuz. Mitmachen. Informiert bleiben.",
        pauseAfterMs: 0,
        contexts: bothModes,
      },
    ],
    evidence: [
      {
        id: "vog-election-calendar",
        type: "WAHLTERMINE 2026",
        title: "Vier Termine im September",
        shortSummary: "06.09. Sachsen-Anhalt · 13.09. Niedersachsen · 20.09. Berlin und Mecklenburg-Vorpommern",
        sourceLabel: "Bundeswahlleiterin · Stand 18.08.2026",
        provenance: "AMTLICHE QUELLE",
        visualIdentity: "democracy-journey-cyan-election-path",
        visualPayload: { kind: "trend_line" },
        memoryPriority: 100,
      },
      {
        id: "vog-accountability-chain",
        type: "NACH DEM WAHLTAG",
        title: "Programm → Verhandlung → Beschluss → Wirkung",
        shortSummary: "Wahlprogramm, Kompromiss, Beschluss und Ergebnis sind nicht dasselbe.",
        sourceLabel: "VoiceOpenGov · eDebatte",
        provenance: "REDAKTIONELLES PRINZIP",
        visualIdentity: "democracy-journey-blue-process-path",
        visualPayload: { kind: "bar_series", values: [0.2, 0.38, 0.58, 0.78, 1] },
        memoryPriority: 95,
      },
      {
        id: "vog-open-question",
        type: "GESTALTUNGSFRAGE",
        title: "Wie wird aus Beteiligung nachvollziehbare Wirkung?",
        shortSummary: "Mehr Mitbestimmung braucht definierte Folgen und demokratische Leitplanken.",
        sourceLabel: "VoiceOpenGov · demokratische Gestaltungsfrage",
        provenance: "REDAKTIONELLES PRINZIP",
        visualIdentity: "democracy-journey-amber-design-question",
        visualPayload: { kind: "open_question" },
        memoryPriority: 110,
      },
    ],
    sourceIds: [
      "voiceopengov-homepage",
      "edebatte-homepage",
      "edebatte-statements",
      "federal-election-calendar-2026",
      "berlin-election-2026-faq",
    ],
    marketedOfferIds: ["voiceopengov-double-opt-in", "voiceopengov-voluntary-support"],
  },
} as const satisfies Record<VoxyHomepageFilmId, HomepageFilmDefinition>;

export function filmSegments(filmId: VoxyHomepageFilmId, contextMode: VoxyHomepageContextMode) {
  return VOXY_HOMEPAGE_REFERENCE_FILMS[filmId].segments
    .filter((segment) => (segment.contexts as readonly VoxyHomepageContextMode[]).includes(contextMode))
    .map((segment) => ({
      ...segment,
      speakerRole: "voxy" as const,
      voiceId: VOXY_SIGNATURE.voiceId,
      voiceBinding: VOXY_DUAL_VOICE_PILOT_VOICE_BINDINGS.voxy,
    }));
}

const seconds = (milliseconds: number): number => Number((milliseconds / 1_000).toFixed(3));

function lowerThird(
  input: Omit<
    VoxyLowerThirdEntry,
    "transitionMs" | "transition" | "minimumDwellSeconds" | "wordByWordAnimation" | "blinking" | "captionMirror"
  >,
): VoxyLowerThirdEntry {
  return {
    ...input,
    transitionMs: 360,
    transition: "soft_translate_fade",
    minimumDwellSeconds: Math.min(2.4, input.validUntil - input.validFrom),
    wordByWordAnimation: false,
    blinking: false,
    captionMirror: false,
  };
}

export function buildVoxyHomepageReferenceFilmPlan(input: {
  filmId: VoxyHomepageFilmId;
  contextMode: VoxyHomepageContextMode;
  exactHeadSha: string;
  speechDurationsMs: readonly number[];
  layoutProfile?: HomepageFilmLayoutProfile;
}) {
  const definition = VOXY_HOMEPAGE_REFERENCE_FILMS[input.filmId];
  const layoutProfile = input.layoutProfile ?? "landscape_16_9";
  const layout = VOXY_HOMEPAGE_FILM_LAYOUTS[layoutProfile];
  const segments = filmSegments(input.filmId, input.contextMode);
  if (segments.length !== input.speechDurationsMs.length) {
    throw new Error("homepage_film_speech_duration_count_mismatch");
  }

  let cursorMs = 600;
  const speakerTimeline: VoxyDualVoicePilotSpeakerEntry[] = segments.map((segment, index) => {
    const startMs = cursorMs;
    const endMs = startMs + input.speechDurationsMs[index]!;
    cursorMs = endMs + segment.pauseAfterMs;
    return {
      id: segment.id,
      start: seconds(startMs),
      end: seconds(endMs),
      speakerRole: "voxy",
      voiceId: VOXY_SIGNATURE.voiceId,
      text: segment.text,
    };
  });

  const totalDurationMs = cursorMs + 800;
  const end = seconds(totalDurationMs);
  const boundary = (ratio: number) => Number((end * ratio).toFixed(3));
  const e1 = definition.evidence[0]!.id;
  const e2 = definition.evidence[1]!.id;
  const e3 = definition.evidence[2]!.id;

  const visualStateTimeline: VoxyDualVoicePilotVisualEntry[] = [
    { start: 0, end: boundary(0.14), state: "HOST", activeEvidenceId: null, dockedEvidenceIds: [] },
    { start: boundary(0.14), end: boundary(0.24), state: "FOCUS", activeEvidenceId: e1, dockedEvidenceIds: [] },
    { start: boundary(0.24), end: boundary(0.34), state: "EXPLAIN", activeEvidenceId: e1, dockedEvidenceIds: [] },
    { start: boundary(0.34), end: boundary(0.4), state: "DOCK", activeEvidenceId: e1, dockedEvidenceIds: [e1] },
    { start: boundary(0.4), end: boundary(0.48), state: "HOST", activeEvidenceId: null, dockedEvidenceIds: [e1] },
    { start: boundary(0.48), end: boundary(0.59), state: "FOCUS", activeEvidenceId: e2, dockedEvidenceIds: [e1] },
    { start: boundary(0.59), end: boundary(0.7), state: "EXPLAIN", activeEvidenceId: e2, dockedEvidenceIds: [e1] },
    { start: boundary(0.7), end: boundary(0.76), state: "DOCK", activeEvidenceId: e2, dockedEvidenceIds: [e1, e2] },
    { start: boundary(0.76), end: boundary(0.89), state: "SYNTHESIS", activeEvidenceId: e3, dockedEvidenceIds: [e1, e2] },
    { start: boundary(0.89), end, state: "HOST", activeEvidenceId: null, dockedEvidenceIds: [e1, e2, e3] },
  ];

  const evidenceTimeline = visualStateTimeline
    .filter((entry) => entry.activeEvidenceId)
    .map((entry) => ({
      evidenceId: entry.activeEvidenceId!,
      start: entry.start,
      end: entry.end,
      action:
        entry.state === "DOCK"
          ? "continuous_scale_translation_to_memory"
          : entry.state.toLowerCase(),
      visualIdentity: definition.evidence.find(
        (evidence) => evidence.id === entry.activeEvidenceId,
      )!.visualIdentity,
      ...(entry.state === "SYNTHESIS" ? { relatedEvidenceIds: [e1, e2] } : {}),
    }));

  const motionTimeline = [] as Array<{
    id: string;
    at: number;
    state: string;
    activeEvidenceId: string | null;
    motion: string;
    semanticPurpose: string;
    decorativeOnly: false;
  }>;

  for (let at = 0, index = 0; at < end; index += 1) {
    const state =
      visualStateTimeline.find((entry) => at >= entry.start && at < entry.end) ??
      visualStateTimeline.at(-1)!;
    const motion = definition.motionVocabulary[index % definition.motionVocabulary.length]!;
    motionTimeline.push({
      id: `motion-${String(index + 1).padStart(2, "0")}`,
      at: Number(at.toFixed(3)),
      state: state.state,
      activeEvidenceId: state.activeEvidenceId,
      motion,
      semanticPurpose: state.activeEvidenceId
        ? `${definition.visualLanguage}_${motion}_${state.activeEvidenceId}`
        : `${definition.visualLanguage}_${motion}_${state.state.toLowerCase()}`,
      decorativeOnly: false,
    });
    at += at < 12 ? 2 : 3;
  }

  const lowerThirdTimeline = input.filmId === "edebatte"
    ? [
        lowerThird({
          id: "opening",
          kicker: "MEDIEN-CHECK",
          headline: "Die Schlagzeile ist der Anfang",
          summary: "Nicht nur lesen, was behauptet wird – zurück zur Primärquelle.",
          validFrom: 0,
          validUntil: boundary(0.24),
        }),
        lowerThird({
          id: "first-evidence",
          kicker: "QUELLENPRÜFUNG",
          headline: "Wer sagt was – und worauf beruht es?",
          summary: "Akteur, Datum, Originalquelle und relevante Passage bleiben sichtbar.",
          validFrom: boundary(0.24),
          validUntil: boundary(0.48),
        }),
        lowerThird({
          id: "second-evidence",
          kicker: "MEDIENFORENSIK",
          headline: "Quelle ist nicht Interpretation",
          summary: "Zitat, Zahl, Studie und Einordnung werden getrennt behandelt.",
          validFrom: boundary(0.48),
          validUntil: boundary(0.76),
        }),
        lowerThird({
          id: "synthesis",
          kicker: "NACHPRÜFBARKEIT",
          headline: "Wo endet der Beleg?",
          summary: "Gegenposition und offene Frage gehören zur Recherche dazu.",
          validFrom: boundary(0.76),
          validUntil: boundary(0.89),
        }),
        lowerThird({
          id: "cta",
          kicker: "eDEBATTE",
          headline: definition.cta,
          summary: definition.proposition,
          validFrom: boundary(0.89),
          validUntil: end,
        }),
      ]
    : [
        lowerThird({
          id: "opening",
          kicker: "WAHLTAG",
          headline: "Eine Wahl dauert einen Tag",
          summary: "Die politische Wirkung entsteht in den Jahren danach.",
          validFrom: 0,
          validUntil: boundary(0.24),
        }),
        lowerThird({
          id: "first-evidence",
          kicker: "DANACH",
          headline: "Programm ist nicht Beschluss",
          summary: "Verhandlung, Kompromiss, Entscheidung und Umsetzung verändern den Weg.",
          validFrom: boundary(0.24),
          validUntil: boundary(0.48),
        }),
        lowerThird({
          id: "second-evidence",
          kicker: "ZWISCHEN DEN WAHLEN",
          headline: "Was genau hast du gewählt?",
          summary: "Ein Wahlversprechen ist kein Gesetz – Nachvollziehbarkeit zeigt den Status.",
          validFrom: boundary(0.48),
          validUntil: boundary(0.76),
        }),
        lowerThird({
          id: "synthesis",
          kicker: "MITBESTIMMUNG",
          headline: "Was soll aus deiner Stimme folgen?",
          summary: "Beteiligung wird erst dann substanziell, wenn ihre mögliche politische Folge nachvollziehbar ist.",
          validFrom: boundary(0.76),
          validUntil: boundary(0.89),
        }),
        lowerThird({
          id: "cta",
          kicker: "VOICEOPENGOV",
          headline: definition.cta,
          summary: "Deine Stimme ist mehr als ein Kreuz.",
          validFrom: boundary(0.89),
          validUntil: end,
        }),
      ];

  const sourceIds = new Set<string>(definition.sourceIds);
  const marketedOfferIds = new Set<string>(definition.marketedOfferIds);
  const sources = VOXY_HOMEPAGE_SOURCE_REGISTRY.filter((source) => sourceIds.has(source.id));
  const marketedOffers = VOXY_CURRENT_OFFER_INVENTORY.filter((offer) =>
    marketedOfferIds.has(offer.id),
  );

  return {
    schemaVersion: VOXY_HOMEPAGE_REFERENCE_FILMS_SCHEMA_VERSION,
    filmId: input.filmId,
    title: definition.title,
    proposition: definition.proposition,
    cta: definition.cta,
    visualLanguage: definition.visualLanguage,
    contextMode: input.contextMode,
    layoutProfile,
    layout,
    exactHeadSha: input.exactHeadSha,
    visualMasterHeadSha: VOXY_FIRST_PARTY_VISUAL_BINDING.visualMasterHeadSha,
    output: {
      ...VOXY_HOMEPAGE_REFERENCE_FILMS_OUTPUT[input.filmId],
      width: layout.output.width,
      height: layout.output.height,
      aspectRatio: layout.output.aspectRatio,
      fps: 24,
      durationMs: totalDurationMs,
      frameCount: Math.ceil((totalDurationMs * 24) / 1_000),
    },
    broadcastMeta: definition.broadcastMeta,
    speakerTimeline,
    visualStateTimeline,
    evidenceTimeline,
    motionTimeline,
    lowerThirdTimeline,
    evidence: definition.evidence,
    sources,
    currentOfferInventory: VOXY_CURRENT_OFFER_INVENTORY,
    marketedOffers,
    voiceBindings: { voxy: VOXY_DUAL_VOICE_PILOT_VOICE_BINDINGS.voxy },
    activeVoiceBindings: { voxy: VOXY_DUAL_VOICE_PILOT_VOICE_BINDINGS.voxy },
    canonicalNarrationArchitecture: "single_voice_default",
    canonicalVoxyVoice: "D1 Conversational Dynamic",
    canonicalEditorialVoice: "W1 Natural Editorial / parked optional layer",
    captions: {
      sidecarsOnly: false,
      burnedIn: true,
      languages: ["de"],
      cueMode: "semantic_sentence_chunks",
      maximumVisualLines: 2,
      stablePositionPerProfile: true,
    },
    objectContinuity: {
      sameEvidenceId: true,
      sameVisualIdentity: true,
      scaleAndTranslation: true,
      hardSubstitution: false,
      crossfadeToDifferentObject: false,
    },
    mouth: {
      profile: VOXY_FIRST_PARTY_VISUAL_BINDING.mouthProfile,
      shapesChanged: false,
      anchorChanged: false,
      pivotChanged: false,
      syncSpeakerRole: "voxy",
      activeForEverySpokenSegment: true,
      editorialMouth: "not_applicable_single_voice",
    },
    waveform: { count: 1, reactsToActiveVoice: true, secondWaveform: false },
    broadcastLayout: {
      stableGrid: true,
      hostZone: "center_left",
      topicDateZone: "top_right",
      jacketBranding: { lapelPin: "VOG", pocketMark: "eDebatte", pocketMarkCount: 1 },
      memoryAnchor: { top: true, right: true, bottom: false, safeMarginPx: 56 },
      focusDockDestination: "upper_right_memory_slot",
      lowerThird: {
        persistent: true,
        avoidsEvidenceColumn: true,
        semanticEditorialCondensation: true,
        captionMirror: false,
      },
      dynamicEvidence: {
        dataDriven: true,
        maximumFullCards: layoutProfile === "landscape_16_9" ? 3 : 1,
        overflowBehavior: "compact_older_by_priority_and_recency",
        fixedEvidenceCount: false,
        profileBehavior: layout.evidenceMemory,
      },
      textMotion: {
        blinking: false,
        flashing: false,
        typewriter: false,
        wordByWordReveal: false,
        transitionMs: 360,
      },
    },
    contextArchitecture: {
      supportedModes: ["evergreen", "election_window"],
      renderedMode: input.contextMode,
      modeSwitchRequiresResynthesis: true,
    },
    motionPolicy: {
      adaptiveMotion: true,
      firstTwelveSecondsMaxGapSeconds: 2.5,
      laterMaxGapSeconds: 3.5,
      pilotEvidenceDwellTimesCanonical: false,
      slideshowMode: false,
      reducedMotionInformationEquivalent: true,
    },
    privacy: {
      privateRawVoiceInRepository: false,
      privateReferencePathInManifest: false,
      publicArtifact: false,
      upload: false,
    },
    homepageIntegrationIncluded: false,
    humanHomepageFilmAcceptance: "pending",
    humanNews5VisualAcceptance: "pending",
    productionEligible: false,
    autoPublish: false,
  } as const;
}

export type VoxyHomepageReferenceFilmPlan = ReturnType<
  typeof buildVoxyHomepageReferenceFilmPlan
>;

export function validateVoxyHomepageReferenceFilmPlan(
  plan: VoxyHomepageReferenceFilmPlan,
): string[] {
  const errors: string[] = [];
  const expected = VOXY_HOMEPAGE_REFERENCE_FILMS[plan.filmId];
  const duration = plan.output.durationMs / 1_000;

  if (!/^[0-9a-f]{40}$/.test(plan.exactHeadSha)) errors.push("exact_head_invalid");
  if (
    plan.output.width !== plan.layout.output.width ||
    plan.output.height !== plan.layout.output.height ||
    plan.output.fps !== 24 ||
    duration < plan.output.durationSeconds.min ||
    duration > plan.output.durationSeconds.max
  ) {
    errors.push("media_contract_invalid");
  }
  if (
    plan.speakerTimeline.some(
      (entry) => entry.speakerRole !== "voxy" || entry.voiceId !== VOXY_SIGNATURE.voiceId,
    ) ||
    Object.keys(plan.activeVoiceBindings).length !== 1
  ) {
    errors.push("d1_only_gate_invalid");
  }
  if (plan.speakerTimeline.filter((entry) => entry.text.includes("Hallo Nachbar")).length !== 1) {
    errors.push("greeting_count_invalid");
  }
  if (
    plan.visualStateTimeline.map((entry) => entry.state).join(",") !==
    "HOST,FOCUS,EXPLAIN,DOCK,HOST,FOCUS,EXPLAIN,DOCK,SYNTHESIS,HOST"
  ) {
    errors.push("news_5_sequence_invalid");
  }
  if (plan.waveform.count !== 1 || plan.waveform.secondWaveform || !plan.waveform.reactsToActiveVoice) {
    errors.push("waveform_contract_invalid");
  }
  if (
    plan.broadcastLayout.jacketBranding.lapelPin !== "VOG" ||
    plan.broadcastLayout.jacketBranding.pocketMark !== "eDebatte" ||
    plan.broadcastLayout.jacketBranding.pocketMarkCount !== 1
  ) {
    errors.push("brand_mark_contract_invalid");
  }
  if (
    !plan.broadcastLayout.memoryAnchor.top ||
    !plan.broadcastLayout.memoryAnchor.right ||
    plan.broadcastLayout.memoryAnchor.bottom
  ) {
    errors.push("memory_anchor_invalid");
  }
  if (
    plan.evidenceTimeline.filter(
      (entry) => entry.action === "continuous_scale_translation_to_memory",
    ).length !== 2 ||
    !plan.objectContinuity.sameEvidenceId ||
    !plan.objectContinuity.sameVisualIdentity ||
    !plan.objectContinuity.scaleAndTranslation
  ) {
    errors.push("focus_dock_continuity_invalid");
  }

  const firstMotionGaps = plan.motionTimeline
    .filter((entry) => entry.at <= 12)
    .slice(1)
    .map((entry, index) => entry.at - plan.motionTimeline[index]!.at);
  const later = plan.motionTimeline.filter((entry) => entry.at >= 12);
  const laterGaps = later
    .slice(1)
    .map((entry, index) => entry.at - later[index]!.at);
  if (
    !plan.motionPolicy.adaptiveMotion ||
    plan.motionPolicy.pilotEvidenceDwellTimesCanonical ||
    plan.motionPolicy.slideshowMode ||
    firstMotionGaps.some((gap) => gap > 2.5) ||
    laterGaps.some((gap) => gap > 3.5) ||
    plan.motionTimeline.some((entry) => entry.decorativeOnly)
  ) {
    errors.push("adaptive_motion_contract_invalid");
  }
  if (
    plan.captions.sidecarsOnly ||
    !plan.captions.burnedIn ||
    plan.captions.maximumVisualLines !== 2 ||
    plan.captions.cueMode !== "semantic_sentence_chunks" ||
    plan.lowerThirdTimeline.some(
      (entry) => entry.captionMirror || entry.blinking || entry.wordByWordAnimation,
    )
  ) {
    errors.push("caption_or_lower_third_contract_invalid");
  }
  if (
    !plan.contextArchitecture.supportedModes.includes("evergreen") ||
    !plan.contextArchitecture.supportedModes.includes("election_window")
  ) {
    errors.push("context_mode_contract_invalid");
  }
  if (
    plan.sources.some(
      (source) =>
        !source.url.startsWith("https://") ||
        !source.publisher ||
        !source.retrievedAt ||
        !source.revision,
    ) ||
    plan.sources.length !== expected.sourceIds.length
  ) {
    errors.push("source_integrity_invalid");
  }
  if (
    plan.marketedOffers.some(
      (offer) =>
        offer.classification !== "current_capability" ||
        !offer.marketable ||
        Array.from(offer.sourceIds).length < 1,
    )
  ) {
    errors.push("current_offer_fail_closed_invalid");
  }
  if (
    plan.currentOfferInventory.some(
      (offer) => offer.classification === "future_intent" && offer.marketable,
    )
  ) {
    errors.push("future_intent_marketed_invalid");
  }
  if (
    plan.filmId === "voiceopengov" &&
    plan.contextMode === "election_window" &&
    (!plan.sources.some((source) => source.id === "federal-election-calendar-2026") ||
      !plan.sources.some((source) => source.id === "berlin-election-2026-faq"))
  ) {
    errors.push("official_election_source_missing");
  }

  const electionWindowOnlySegmentIds = new Set([
    "edebatte-election-noise",
    "vog-election-calendar",
    "vog-berlin-sixteen",
  ]);
  if (
    plan.contextMode === "evergreen" &&
    plan.speakerTimeline.some((entry) => electionWindowOnlySegmentIds.has(entry.id))
  ) {
    errors.push("evergreen_contains_election_window_copy");
  }
  if (
    plan.homepageIntegrationIncluded ||
    plan.productionEligible ||
    plan.autoPublish ||
    plan.privacy.publicArtifact ||
    plan.privacy.upload ||
    plan.humanHomepageFilmAcceptance !== "pending"
  ) {
    errors.push("release_gate_invalid");
  }
  if (
    plan.filmId === "edebatte" &&
    (plan.visualLanguage !== "media_forensics" ||
      !plan.motionTimeline.some((entry) => entry.motion === "source_scan"))
  ) {
    errors.push("edebatte_visual_language_invalid");
  }
  if (
    plan.filmId === "voiceopengov" &&
    (plan.visualLanguage !== "democratic_journey" ||
      !plan.motionTimeline.some((entry) => entry.motion === "ballot_cast") ||
      !plan.speakerTimeline.some((entry) => entry.id === "vog-demophobie"))
  ) {
    errors.push("voiceopengov_visual_language_invalid");
  }

  return [...new Set(errors)];
}

function captionTime(value: number, separator: "." | ","): string {
  const ms = Math.round(value * 1_000);
  return `${String(Math.floor(ms / 3_600_000)).padStart(2, "0")}:${String(
    Math.floor((ms % 3_600_000) / 60_000),
  ).padStart(2, "0")}:${String(Math.floor((ms % 60_000) / 1_000)).padStart(
    2,
    "0",
  )}${separator}${String(ms % 1_000).padStart(3, "0")}`;
}

export function buildVoxyHomepageFilmVtt(
  timeline: readonly VoxyDualVoicePilotSpeakerEntry[],
): string {
  return `WEBVTT\n\n${timeline
    .map(
      (entry) =>
        `${captionTime(entry.start, ".")} --> ${captionTime(entry.end, ".")}\n<v Voxy>${entry.text}`,
    )
    .join("\n\n")}\n`;
}

export function buildVoxyHomepageFilmSrt(
  timeline: readonly VoxyDualVoicePilotSpeakerEntry[],
): string {
  return `${timeline
    .map(
      (entry, index) =>
        `${index + 1}\n${captionTime(entry.start, ",")} --> ${captionTime(
          entry.end,
          ",",
        )}\n[Voxy] ${entry.text}`,
    )
    .join("\n\n")}\n`;
}

export function homepageVisualStateAt(
  plan: VoxyHomepageReferenceFilmPlan,
  atSeconds: number,
) {
  return (
    plan.visualStateTimeline.find(
      (entry) => atSeconds >= entry.start && atSeconds < entry.end,
    ) ?? plan.visualStateTimeline.at(-1)!
  );
}

export function homepageLowerThirdAt(
  plan: VoxyHomepageReferenceFilmPlan,
  atSeconds: number,
) {
  return (
    plan.lowerThirdTimeline.find(
      (entry) => atSeconds >= entry.validFrom && atSeconds < entry.validUntil,
    ) ?? plan.lowerThirdTimeline.at(-1)!
  );
}
