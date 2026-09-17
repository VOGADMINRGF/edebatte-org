import type { Dossier } from "@features/dossier";

export type PublicDossierVoteOption = {
  id: string;
  label: string;
};

const PUBLIC_VOTING_OVERRIDES: Record<
  string,
  NonNullable<Dossier["voteConfig"]>
> = {
  chatkontrolle: {
    enabled: true,
    policy: "standard",
    minOptions: 4,
    allowCommunityOptions: true,
  },
};

export function getPublicDossierVoteConfig(
  dossier: Dossier,
): NonNullable<Dossier["voteConfig"]> {
  return (
    PUBLIC_VOTING_OVERRIDES[dossier.meta.id] ??
    dossier.voteConfig ?? {
      enabled: false,
      policy: "civic",
      minOptions: 5,
      allowCommunityOptions: true,
    }
  );
}

export function withPublicDossierVoteConfig(dossier: Dossier): Dossier {
  const voteConfig = getPublicDossierVoteConfig(dossier);
  if (dossier.voteConfig === voteConfig) return dossier;
  return { ...dossier, voteConfig };
}

export function getPublicDossierVoteOptions(
  dossier: Dossier,
): PublicDossierVoteOption[] {
  const seen = new Set<string>();
  const options: PublicDossierVoteOption[] = [];

  for (const claim of dossier.analyze.claims) {
    for (const option of claim.debateFrame?.options ?? []) {
      const id = String(option.id ?? "").trim();
      const label = String(option.label ?? "").trim();
      if (!id || !label || seen.has(id)) continue;
      seen.add(id);
      options.push({ id, label });
    }
  }

  return options;
}
