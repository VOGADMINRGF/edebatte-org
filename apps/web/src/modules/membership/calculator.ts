import type { ContributionInput, MembershipQuote } from "./types";

const roundCents = (value: number): number =>
  Math.round(value * 100) / 100;

export function calcSuggestedPerPerson({
  netIncome,
  rent,
  minPerPerson = 5.63,
}: ContributionInput): number {
  const base = Math.max(0, netIncome - rent);
  const suggestion = Math.max(minPerPerson, base * 0.01);
  return roundCents(suggestion);
}

export function calcTotal(amountPerPerson: number, memberCount: number): number {
  return roundCents(amountPerPerson * Math.max(1, memberCount));
}

export function buildQuote(
  amountPerPerson: number,
  memberCount: number
): MembershipQuote {
  return {
    amountPerPerson: roundCents(amountPerPerson),
    memberCount: Math.max(1, Math.floor(memberCount) || 1),
    totalAmount: calcTotal(amountPerPerson, memberCount),
  };
}
