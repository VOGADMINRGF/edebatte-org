const STORAGE_KEY = "vog:membershipDraft:v1";

export type MembershipDraft = {
  contributionPerPerson: number;
  householdSize: number;
  rhythm: "monthly" | "yearly" | "once";
  withMembership: boolean;
  withEdebate: boolean;
  edebattePlanKey?: string;
  edebatteBillingMode?: "monthly" | "yearly";
};

export function loadMembershipDraft(): MembershipDraft | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MembershipDraft;
  } catch {
    return null;
  }
}

export function saveMembershipDraft(draft: MembershipDraft) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function clearMembershipDraft() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}
