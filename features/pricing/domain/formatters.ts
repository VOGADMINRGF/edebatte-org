import type { EDebattePackageDefinition } from "./types";
import type { PricingLocale } from "./i18n";

type PriceLabelInput = Pick<EDebattePackageDefinition, "preisMonat" | "preisJahr" | "mitgliederPreisMonat" | "preisLabel">;
type BillingLabelInput = Pick<EDebattePackageDefinition, "id" | "preisMonat" | "preisJahr" | "preisLabel">;

function formatCurrency(value: number, locale: PricingLocale) {
  const formatter = new Intl.NumberFormat(locale === "en" ? "en-US" : "de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
  return formatter.format(value);
}

export function formatPackagePriceLabel(pkg: PriceLabelInput, locale: PricingLocale = "de") {
  if (typeof pkg.preisLabel === "string" && pkg.preisLabel.trim()) {
    return pkg.preisLabel.trim();
  }
  if (typeof pkg.mitgliederPreisMonat === "number" && typeof pkg.preisMonat === "number") {
    if (locale === "en") {
      return `${formatCurrency(pkg.mitgliederPreisMonat, locale)} for VoiceOpenGov members · ${formatCurrency(pkg.preisMonat, locale)} regular`;
    }
    return `${formatCurrency(pkg.mitgliederPreisMonat, locale)} für VoiceOpenGov-Mitglieder · ${formatCurrency(pkg.preisMonat, locale)} regulär`;
  }
  if (typeof pkg.preisMonat === "number") return `${formatCurrency(pkg.preisMonat, locale)} / ${locale === "en" ? "month" : "Monat"}`;
  if (typeof pkg.preisJahr === "number") return `${formatCurrency(pkg.preisJahr, locale)} / ${locale === "en" ? "year" : "Jahr"}`;
  return locale === "en" ? "Price depends on model" : "Preis nach Modell";
}

export function formatPackageBillingModeLabel(pkg: BillingLabelInput, locale: PricingLocale = "de") {
  const monthly = locale === "en" ? "monthly" : "monatlich";
  const monthlyPreferred = locale === "en" ? "monthly · annual billing preferred" : "monatlich · jährliche Zahlung bevorzugt";
  const yearly = locale === "en" ? "yearly" : "jährlich";
  const projectBased = locale === "en" ? "project-based / editorial operating model" : "projektbezogen / redaktionelles Betriebsmodell";
  const oneTimeOrClarification =
    locale === "en" ? "one-time or after clarification" : "einmalig oder nach Klärung";

  if (pkg.id === "basis" || pkg.id === "start" || pkg.id === "pro") return monthly;
  if (pkg.id === "journal_basis" || pkg.id === "journal_pro") return projectBased;
  if (typeof pkg.preisJahr === "number") return yearly;
  if (typeof pkg.preisMonat === "number") return monthlyPreferred;

  const raw = typeof pkg.preisLabel === "string" ? pkg.preisLabel.toLowerCase() : "";
  if (/monat|month/.test(raw)) return monthlyPreferred;
  if (/jahr|year/.test(raw)) return yearly;
  if (/einmalig|one-time|projektbezogen|project-based|je einsatz|per engagement/.test(raw)) return oneTimeOrClarification;
  return oneTimeOrClarification;
}
