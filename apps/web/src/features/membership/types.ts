export type MembershipProduct = "VOG_PRIVATE" | "EDBTT_ORG";

export type Rhythm = "monthly" | "once";

export type MembershipPlan = {
  product: MembershipProduct;
  label: string;
  description?: string;
  presets: number[];
  minPerPerson: number;
};

export type ContributionInput = {
  netIncome: number;
  rent: number;
  minPerPerson?: number;
};

export type MembershipQuote = {
  amountPerPerson: number;
  memberCount: number;
  totalAmount: number;
};

export type MembershipIntentPayload = {
  product: MembershipProduct;
  amountPerPerson: number;
  totalAmount: number;
  memberCount: number;
  rhythm: Rhythm;
  skills?: string;
  notes?: string;
};
