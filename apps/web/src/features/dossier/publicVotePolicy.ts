import type { Dossier } from "@features/dossier";

export type PublicDossierVoteOption = {
  id: string;
  label: string;
};

const PILOT_DOSSIER_IDS = new Set(["chatkontrolle"]);

export function collectPublicDossierVoteOptions(dossier: Dossier): PublicDossierVoteOption[] {
  const seen = new Map<string, PublicDossierVoteOption>();
  for (const claim of dossier.analyze.claims) {
    for (const option of claim.debateFrame?.options ?? []) {
      if (!seen.has(option.id)) {
        seen.set(option.id, { id: option.id, label: option.label });
      }
    }
  }
  return Array.from(seen.values());
}

export function resolvePublicDossierVotePolicy(dossier: Dossier) {
  const options = collectPublicDossierVoteOptions(dossier);
  const configured = dossier.voteConfig?.enabled === true;
  const pilotEnabled = PILOT_DOSSIER_IDS.has(dossier.meta.id);
  const enabled = dossier.meta.status === "published" && options.length >= 2 && (configured || pilotEnabled);

  return {
    enabled,
    options,
    policy: dossier.voteConfig?.policy ?? "civic",
    minOptions: dossier.voteConfig?.minOptions ?? 2,
    pilot: pilotEnabled && !configured,
    reason: enabled
      ? pilotEnabled && !configured
        ? "Öffentlicher Pilot auf einem veröffentlichten Dossier mit expliziten Entscheidungsoptionen."
        : "Öffentliche Abstimmung im Dossier freigegeben."
      : options.length < 2
        ? "Es fehlen mindestens zwei explizite Entscheidungsoptionen."
        : dossier.meta.status !== "published"
          ? "Das Dossier ist noch nicht veröffentlicht."
          : "Die öffentliche Abstimmung ist für dieses Dossier nicht freigegeben.",
  } as const;
}
