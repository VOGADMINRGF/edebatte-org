import type {
  CreateCitizenConcernKind,
  CreateCitizenIntakeContext,
  CreateRegionContextSource,
  CreateRegionContextStatus,
  JurisdictionCandidate,
  PlaceResolutionCandidate,
} from "@/features/create/createContributionPackageContract";
import { evaluateCreateInputSafety } from "@/features/create/safety/createInputSafety";

export type CreateRegionDirectoryEntry = {
  id: string;
  municipalityName: string;
  state?: string | null;
  country?: string | null;
  registryId?: string | null;
  authorityName?: string | null;
};

export type ResolveCreateCitizenIntakeContextInput = {
  text: string;
  directoryEntries?: readonly CreateRegionDirectoryEntry[];
  confirmedRegion?: string | null;
  profileRegion?: string | null;
  locale?: string | null;
};

const MATCH_DECISIONS = [
  "count_my_position",
  "count_as_opposition",
  "add_as_nuance",
  "keep_separate",
] as const;

const FEDERAL_SCOPE_RE =
  /\b(bundesweit|deutschlandweit|in\s+deutschland|bundestag|bundesregierung|bundesgesetz|auf\s+bundesebene)\b/iu;
const EU_SCOPE_RE = /\b(eu(?:ropa)?weit|europäische[nrms]?\s+union|eu-parlament|auf\s+eu-ebene|eu-regel)\b/iu;
const EMERGENCY_RE =
  /\b(akute?\s+gefahr|notfall|sofort\s+die\s+112|ruf(?:t)?\s+die\s+112|es\s+brennt|unfall\s+gerade|lebensgefahr)\b/iu;
const REQUEST_RE =
  /\b(soll(?:te|ten)?|muss|müssen|fordere|fordern|bitte|ändern|verbessern|einführen|abschaffen|prüfen|klären)\b/iu;
const SOURCE_RE = /https?:\/\/|\b(quelle|studie|bericht|artikel|dokument|pdf|video)\b/iu;
const MUNICIPAL_SIGNAL_RE =
  /\b(schule|grundschule|kita|straße|strasse|verkehr|tempo\s*30|radweg|gehweg|park|spielplatz|bezirk|stadtteil|kommune)\b/iu;
const PRIVATE_CASE_RE =
  /\b(mein(?:e|er|em|en)?\s+(?:nachbar|vermieter|arbeitgeber|arzt|familie)|private[rnms]?\s+streit|mein\s+einzelfall)\b/iu;
const STREET_RE =
  /\b([A-ZÄÖÜ][\p{L}-]{2,}(?:straße|strasse|weg|allee|platz|gasse|ring)|(?:Straße|Strasse)\s+[A-ZÄÖÜ][\p{L}-]*)\b/iu;

function clean(value?: string | null): string | null {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || null;
}

function municipalityLabel(value: string): string {
  return value
    .replace(/,\s*(?:Stadt|Gemeinde|Landeshauptstadt|Hansestadt)$/iu, "")
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsLabel(text: string, label: string): boolean {
  if (label.length < 3) return false;
  return new RegExp(`(^|[^\\p{L}])${escapeRegex(label)}(?=$|[^\\p{L}])`, "iu").test(text);
}

function labelIndex(text: string, label: string): number {
  const index = text.toLocaleLowerCase("de").indexOf(label.toLocaleLowerCase("de"));
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

function explicitPlaceMention(text: string): string | null {
  return clean(
    text.match(/(?:^|[.!?]\s+|\s)(?:In|in|Für|für|Aus|aus|Bei|bei)\s+([A-ZÄÖÜ][\p{L}().-]{2,})/u)?.[1],
  );
}

function unique(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = clean(raw);
    if (!value) continue;
    const key = value.toLocaleLowerCase("de");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function toPlaceCandidate(
  entry: CreateRegionDirectoryEntry,
  label: string,
  ambiguous: boolean,
): PlaceResolutionCandidate {
  return {
    id: entry.id,
    city: label,
    municipality: label,
    state: clean(entry.state),
    country: clean(entry.country) ?? "DE",
    registryId: clean(entry.registryId),
    matchType: ambiguous ? "ambiguous" : "exact",
    confidence: ambiguous ? 0.58 : 0.96,
    reason: ambiguous
      ? "Mehr als ein amtlicher Ort passt zu dieser Ortsangabe."
      : "Ort wurde ausdrücklich im aktuellen Anliegen genannt.",
  };
}

function inferConcernKind(params: {
  text: string;
  safetyDecision: CreateCitizenIntakeContext["safety"]["decision"];
}): CreateCitizenConcernKind {
  if (EMERGENCY_RE.test(params.text)) return "emergency";
  if (params.safetyDecision === "blocked" || params.safetyDecision === "moderation_required") {
    return "unsafe_content";
  }
  if (PRIVATE_CASE_RE.test(params.text)) return "private_case";
  if (SOURCE_RE.test(params.text) && !REQUEST_RE.test(params.text)) {
    return "source_without_request";
  }
  return params.text.trim() ? "public_concern" : "unclear";
}

function jurisdictionFor(params: {
  text: string;
  regionStatus: CreateRegionContextStatus;
  selectedRegion: PlaceResolutionCandidate | null;
}): JurisdictionCandidate[] {
  if (EU_SCOPE_RE.test(params.text)) {
    return [{
      level: "eu",
      label: "Europäische Union",
      confidence: 0.9,
      reason: "Der Beitrag nennt ausdrücklich einen EU-weiten Regelungsrahmen.",
      needsReview: true,
    }];
  }
  if (FEDERAL_SCOPE_RE.test(params.text)) {
    return [{
      level: "federal",
      label: "Bund",
      confidence: 0.9,
      reason: "Der Beitrag nennt ausdrücklich einen bundesweiten Regelungsrahmen.",
      needsReview: true,
    }];
  }
  if (params.selectedRegion) {
    const traffic = /\b(tempo|verkehr|straße|strasse|radweg|gehweg|parken)\b/iu.test(params.text);
    return [{
      level: "municipality",
      label: traffic
        ? `Kommunale Straßenverkehrsbehörde für ${params.selectedRegion.city} (wahrscheinlich)`
        : `Kommune ${params.selectedRegion.city} (wahrscheinlich)`,
      authorityName: traffic
        ? `Straßenverkehrsbehörde der Stadt ${params.selectedRegion.city}`
        : `Stadtverwaltung ${params.selectedRegion.city}`,
      topicDependency: traffic ? "Straßenverkehr und Verkehrssicherheit" : null,
      confidence: traffic ? 0.76 : 0.68,
      reason: "Zuständigkeit wird aus Ort und Thema vorgeschlagen und muss bestätigt werden.",
      needsReview: true,
    }];
  }
  if (params.regionStatus === "needs_clarification" || MUNICIPAL_SIGNAL_RE.test(params.text)) {
    return [{
      level: "unknown",
      label: "Kommunale Zuständigkeit noch offen",
      confidence: 0.35,
      reason: "Für eine belastbare Zuständigkeitszuordnung fehlt eine eindeutige Sachregion.",
      needsReview: true,
    }];
  }
  return [];
}

export function buildCreateJurisdictionCandidateKey(
  candidate: JurisdictionCandidate,
): string {
  return `${candidate.level}:${candidate.label.trim().toLocaleLowerCase("de")}`;
}

export function applyCreateJurisdictionConfirmation(
  context: CreateCitizenIntakeContext,
  candidateKey: string | null | undefined,
): CreateCitizenIntakeContext {
  const normalizedKey = String(candidateKey ?? "").trim();
  const candidate = context.jurisdictionCandidates.find(
    (entry) => buildCreateJurisdictionCandidateKey(entry) === normalizedKey,
  );
  return {
    ...context,
    jurisdictionConfirmation: {
      status:
        context.jurisdictionCandidates.length === 0
          ? "not_required"
          : candidate
            ? "confirmed"
            : "unconfirmed",
      candidateKey: candidate
        ? buildCreateJurisdictionCandidateKey(candidate)
        : null,
    },
  };
}

export function applyCreateRegionPriority(
  context: CreateCitizenIntakeContext,
  input: { confirmedRegion?: string | null; profileRegion?: string | null },
): CreateCitizenIntakeContext {
  if (context.regionSource === "contribution_text" || context.regionStatus === "not_location_bound") {
    return context;
  }

  const confirmedRegion = clean(input.confirmedRegion);
  const profileRegion = clean(input.profileRegion);
  const selectedRegionLabel = confirmedRegion ?? profileRegion;
  if (!selectedRegionLabel) return context;

  const regionSource: CreateRegionContextSource = confirmedRegion
    ? "confirmed_context"
    : "profile_suggestion";
  const regionStatus: CreateRegionContextStatus = confirmedRegion ? "resolved" : "suggested";
  const selectedCandidate: PlaceResolutionCandidate = {
    id: `${regionSource}:${selectedRegionLabel.toLocaleLowerCase("de")}`,
    city: selectedRegionLabel,
    municipality: selectedRegionLabel,
    matchType: "profile_context",
    confidence: confirmedRegion ? 0.86 : 0.52,
    reason: confirmedRegion
      ? "Bestätigter aktueller Kontext."
      : "Nur aus dem Profil vorgeschlagen; nicht als Sachregion übernommen.",
  };
  const jurisdictionCandidates = jurisdictionFor({
    text: context.placeResolution.normalizedInput,
    regionStatus,
    selectedRegion: selectedCandidate,
  });

  return {
    ...context,
    regionSource,
    regionStatus,
    regionChipLabel: confirmedRegion
      ? `${confirmedRegion} · bestätigt`
      : `${profileRegion} · aus Profil vorgeschlagen`,
    selectedRegionLabel,
    detectedRegionLabels: [selectedRegionLabel],
    regionHierarchy: [selectedRegionLabel],
    clarificationQuestion:
      context.concernKind === "source_without_request"
        ? context.clarificationQuestion
        : null,
    jurisdictionCandidates,
    jurisdictionConfirmation: {
      status: jurisdictionCandidates.length > 0 ? "unconfirmed" : "not_required",
      candidateKey: null,
    },
    placeResolution: {
      ...context.placeResolution,
      candidates: [selectedCandidate],
      selectedCandidate,
      needsUserConfirmation: !confirmedRegion,
      confidence: confirmedRegion ? "high" : "low",
      jurisdictionCandidates,
    },
  };
}

export function resolveCreateCitizenIntakeContext(
  input: ResolveCreateCitizenIntakeContextInput,
): CreateCitizenIntakeContext {
  const text = String(input.text ?? "").trim();
  const safetyResult = evaluateCreateInputSafety({
    text,
    locale: input.locale ?? "de",
    routeStage: "analyze",
  });
  const emergencyNoticeRequired = EMERGENCY_RE.test(text);
  const concernKind = inferConcernKind({ text, safetyDecision: safetyResult.decision });
  const detectedStreetName = clean(text.match(STREET_RE)?.[1]);

  const exactDirectoryMatches = (input.directoryEntries ?? [])
    .map((entry) => {
      const label = municipalityLabel(entry.municipalityName);
      return { entry, label, candidateLabel: label, index: labelIndex(text, label) };
    })
    .filter(({ label }) => containsLabel(text, label));
  const shortMention = explicitPlaceMention(text);
  const shortMentionMatches =
    exactDirectoryMatches.length === 0 && shortMention
      ? (input.directoryEntries ?? [])
          .map((entry) => ({
            entry,
            label: shortMention,
            candidateLabel: municipalityLabel(entry.municipalityName),
            index: labelIndex(text, shortMention),
          }))
          .filter(({ candidateLabel }) => {
            const normalized = candidateLabel.toLocaleLowerCase("de");
            const prefix = shortMention.toLocaleLowerCase("de");
            return (
              normalized === prefix ||
              normalized.startsWith(`${prefix} `) ||
              normalized.startsWith(`${prefix} (`) ||
              normalized.startsWith(`${prefix}.`)
            );
          })
      : [];
  const dedupedDirectoryMatches = new Map<
    string,
    (typeof exactDirectoryMatches)[number]
  >();
  for (const match of [...exactDirectoryMatches, ...shortMentionMatches]) {
    const key = [match.label, match.candidateLabel, match.entry.state ?? "", match.entry.country ?? ""]
      .join(":")
      .toLocaleLowerCase("de");
    const current = dedupedDirectoryMatches.get(key);
    if (!current || String(match.entry.registryId ?? "").length > String(current.entry.registryId ?? "").length) {
      dedupedDirectoryMatches.set(key, match);
    }
  }
  const directoryMatches = Array.from(dedupedDirectoryMatches.values()).sort(
    (left, right) => left.index - right.index,
  );
  const detectedRegionLabels = unique(directoryMatches.map(({ label }) => label));
  const recordKeys = unique(directoryMatches.map(({ entry }) => entry.id));
  const multiplePlaces = detectedRegionLabels.length > 1;
  const ambiguousSinglePlace = detectedRegionLabels.length === 1 && recordKeys.length > 1;
  const explicitRegion = detectedRegionLabels.length > 0;
  const notLocationBound = !explicitRegion && (FEDERAL_SCOPE_RE.test(text) || EU_SCOPE_RE.test(text));
  const needsMunicipalRegion = !explicitRegion && !notLocationBound && MUNICIPAL_SIGNAL_RE.test(text);

  const candidates = directoryMatches.map(({ entry, candidateLabel }) =>
    toPlaceCandidate(entry, candidateLabel, ambiguousSinglePlace || multiplePlaces),
  );
  const selectedCandidate =
    !multiplePlaces && !ambiguousSinglePlace ? candidates[0] ?? null : null;

  let regionStatus: CreateRegionContextStatus = "unresolved";
  let regionSource: CreateRegionContextSource = "none";
  let regionChipLabel: string | null = null;
  let clarificationQuestion: string | null = null;

  if (selectedCandidate) {
    regionStatus = "resolved";
    regionSource = "contribution_text";
    regionChipLabel = `${selectedCandidate.city} · aus deinem Text`;
  } else if (multiplePlaces) {
    regionStatus = "needs_clarification";
    regionSource = "contribution_text";
    regionChipLabel = `${detectedRegionLabels.join(" + ")} · aus deinem Text`;
    clarificationQuestion = `Welcher Ort ist für das Anliegen maßgeblich: ${detectedRegionLabels.join(", ")} – oder geht es ausdrücklich um den Vergleich?`;
  } else if (ambiguousSinglePlace) {
    regionStatus = "needs_clarification";
    regionSource = "contribution_text";
    regionChipLabel = `${detectedRegionLabels[0]} · Ort klären`;
    clarificationQuestion = `Welchen Ort mit dem Namen ${detectedRegionLabels[0]} meinst du?`;
  } else if (notLocationBound) {
    regionStatus = "not_location_bound";
  } else if (needsMunicipalRegion) {
    regionStatus = "needs_clarification";
    clarificationQuestion = detectedStreetName
      ? `In welcher Stadt oder Gemeinde liegt ${detectedStreetName}?`
      : "Welche Stadt, Gemeinde oder welcher Bezirk ist betroffen?";
  }
  if (!clarificationQuestion && concernKind === "source_without_request") {
    clarificationQuestion = "Welche konkrete Veränderung oder Prüffrage verbindest du mit dieser Quelle?";
  }

  const regionHierarchy = selectedCandidate
    ? unique([selectedCandidate.city, selectedCandidate.state, selectedCandidate.country])
    : [];
  const jurisdictionCandidates = jurisdictionFor({ text, regionStatus, selectedRegion: selectedCandidate });
  const placeResolution: CreateCitizenIntakeContext["placeResolution"] = {
    normalizedInput: text,
    exactStreetMatch: false,
    exactPlaceMatch: Boolean(selectedCandidate),
    candidates,
    selectedCandidate,
    needsUserConfirmation: regionStatus === "needs_clarification",
    confidence: selectedCandidate ? ("high" as const) : explicitRegion ? ("medium" as const) : ("low" as const),
    warnings: [
      ...(multiplePlaces ? ["Mehrere Orte erkannt; keine stille Reduktion auf einen Ort."] : []),
      ...(ambiguousSinglePlace ? ["Ortsname ist im amtlichen Verzeichnis mehrdeutig."] : []),
      ...(safetyResult.findings.some((finding) => finding.kind === "street_address")
        ? ["Adressdaten nur redigiert und nach Sicherheitsprüfung weiterverwenden."]
        : []),
    ],
    jurisdictionCandidates,
    jurisdictionConfirmation: {
      status: jurisdictionCandidates.length > 0 ? "unconfirmed" : "not_required",
      candidateKey: null,
    },
  };

  const base: CreateCitizenIntakeContext = {
    concernKind,
    regionStatus,
    regionSource,
    regionChipLabel,
    selectedRegionLabel: selectedCandidate?.city ?? null,
    detectedRegionLabels,
    regionHierarchy,
    clarificationQuestion,
    detectedStreetName,
    placeResolution,
    jurisdictionCandidates,
    jurisdictionConfirmation: {
      status: jurisdictionCandidates.length > 0 ? "unconfirmed" : "not_required",
      candidateKey: null,
    },
    desiredChange: REQUEST_RE.test(text) ? text : null,
    safety: {
      decision: safetyResult.decision,
      sensitiveFindingKinds: unique(safetyResult.findings.map((finding) => finding.kind)),
      requiresHumanReview: safetyResult.requiresHumanReview,
      emergencyNoticeRequired,
    },
    matching: {
      requiresConfirmation: true,
      allowedDecisions: [...MATCH_DECISIONS],
      noSilentMerge: true,
    },
    guardrails: {
      noAutoPublish: true,
      noAutoMandate: true,
      noTruthDecision: true,
      noProfileRegionAsFact: true,
    },
  };

  return applyCreateRegionPriority(base, {
    confirmedRegion: input.confirmedRegion,
    profileRegion: input.profileRegion,
  });
}
