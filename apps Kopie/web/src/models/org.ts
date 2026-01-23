export const ORG_TYPES = [
  "ngo",
  "gov",
  "company",
  "party",
  "media",
  "other",
] as const;
export type OrgType = (typeof ORG_TYPES)[number];
export function isOrgType(v: any): v is OrgType {
  return ORG_TYPES.includes(v);
}
