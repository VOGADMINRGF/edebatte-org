"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BRAND } from "@/lib/brand";
import { useLocale } from "@/context/LocaleContext";
import { mapTranslatableStrings, useAutoTranslateText } from "@/lib/i18n/autoTranslate";
import ReadingModeToggle from "@/components/ReadingModeToggle";
import { VOG_SUPPORT_URL } from "@/config/links";

const infoLinks = [
  { href: "/ueber-uns", label: "Über uns" },
  { href: "/howtoworks/edebatte", label: "So funktioniert’s" },
  { href: "/howtoworks/initiative", label: "Zur Initiative" },
  { href: "/pricing", label: "Preise" },
  { href: "/transparenzbericht", label: "Transparenzbericht" },
  { href: "/faq", label: "FAQ & Hilfe" },
];

const platformLinks = [
  { href: "/swipes", label: "Mitmachen" },
  { href: "/runden/new?gtm=1", label: "Etwas starten" },
  { href: "/themen", label: "Themen entdecken" },
  { href: "/reports", label: "Ergebnisse ansehen" },
];

const legalLinks = [
  { href: "/kontakt", label: "Kontakt" },
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutz", label: "Datenschutz" },
  { href: "/privatsphaere", label: "Privatsphäre" },
  { href: "/agb", label: "AGB" },
  { href: "/widerrufsbelehrung", label: "Widerrufsbelehrung" },
  { href: "/widerspruch", label: "Widerspruchserklärung" },
];

const currentYear = new Date().getFullYear();

const FOOTER_BG = "bg-[rgb(var(--bg))] text-[rgb(var(--fg))]";
const TOP_BORDER = "border-t border-[rgb(var(--border))]";
const SOFT_RULE = "h-px w-full bg-gradient-to-r from-[rgb(var(--grad-from))] to-transparent opacity-40";

export default function SiteFooter() {
  const { locale } = useLocale();
  const t = useAutoTranslateText({ locale, namespace: "site-footer" });

  const isNative = locale === "de" || locale === "en";

  const info = useMemo(() => {
    if (isNative) return infoLinks;
    return mapTranslatableStrings(infoLinks, t, { namespace: "infoLinks" });
  }, [isNative, t]);

  const platform = useMemo(() => {
    if (isNative) return platformLinks;
    return mapTranslatableStrings(platformLinks, t, { namespace: "platformLinks" });
  }, [isNative, t]);

  const legal = useMemo(() => {
    if (isNative) return legalLinks;
    return mapTranslatableStrings(legalLinks, t, { namespace: "legalLinks" });
  }, [isNative, t]);

  const taglineBase = locale === "en" ? BRAND.tagline_en : BRAND.tagline_de;
  const tagline = t(taglineBase, "tagline");

  const brandCopy = t(
    "Fragen öffnen, Perspektiven sichtbar machen und gemeinsam zu einem nachvollziehbaren nächsten Schritt kommen.",
    "brand.copy",
  );
  const supportLabel =
    locale === "en" ? "Support VoiceOpenGov:" : t("VoiceOpenGov unterstützen:", "support.label");

  return (
    <footer data-site-footer="true" className={`mt-10 ${TOP_BORDER} ${FOOTER_BG}`} role="contentinfo">
      <div className="mx-auto max-w-6xl px-4 py-4 md:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2">
          <Link
            href="/"
            className="inline-flex text-sm font-extrabold tracking-tight"
            style={{
              backgroundImage: "linear-gradient(120deg,var(--brand-cyan),var(--brand-blue))",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            {BRAND.name}
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[rgb(var(--muted))]">
            <Link href="/impressum" className="underline decoration-[rgb(var(--border))] underline-offset-4">
              Impressum
            </Link>
            <Link href="/datenschutz" className="underline decoration-[rgb(var(--border))] underline-offset-4">
              Datenschutz
            </Link>
            <Link href="/faq" className="underline decoration-[rgb(var(--border))] underline-offset-4">
              Hilfe
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto hidden max-w-6xl px-4 py-10 md:block">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <Link
              href="/"
              className="inline-flex text-lg font-extrabold tracking-tight"
              style={{
                backgroundImage:
                  "linear-gradient(120deg,var(--brand-cyan),var(--brand-blue))",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              {BRAND.name}
            </Link>
            <p className="text-sm font-semibold text-[rgb(var(--fg))]">{tagline}</p>
            <div className={SOFT_RULE} />
            <p className="text-sm leading-relaxed text-[rgb(var(--muted))]">{brandCopy}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <ReadingModeToggle />
            </div>
          </div>

          <FooterNav
            title={t("Über eDebatte", "nav.about")}
            ariaLabel={t("Footer Navigation: Über eDebatte", "aria.about")}
            links={info}
          />
          <FooterNav
            title={t("Auf eDebatte", "nav.platform")}
            ariaLabel={t("Footer Navigation: Auf eDebatte", "aria.platform")}
            links={platform}
          />
          <FooterNav
            title={t("Kontakt & Rechtliches", "nav.legal")}
            ariaLabel={t("Footer Navigation: Kontakt und Rechtliches", "aria.legal")}
            links={legal}
          />
        </div>

        <div className="mt-8 border-t border-[rgb(var(--border))] pt-6 text-xs text-[rgb(var(--muted))] md:flex md:items-center md:justify-between md:gap-6">
          <p>© {currentYear} {BRAND.name}</p>
          <div className="mt-2 flex flex-col gap-1 text-[11px] text-[rgb(var(--muted))] md:mt-0 md:items-end">
            <p>
              {t("Kontakt:", "contact.label")}{" "}
              <a
                className="font-semibold text-[rgb(var(--fg))] underline decoration-[rgb(var(--border))] underline-offset-4 hover:decoration-[rgb(var(--grad-from))]"
                href={`mailto:${BRAND.contactEmail}`}
              >
                {BRAND.contactEmail}
              </a>
            </p>
            <p>
              {supportLabel}{" "}
              <a
                className="font-semibold text-[rgb(var(--fg))] underline decoration-[rgb(var(--border))] underline-offset-4 hover:decoration-[rgb(var(--grad-from))]"
                href={VOG_SUPPORT_URL}
                target="_blank"
                rel="noreferrer"
              >
                VoiceOpenGov
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

type FooterNavProps = {
  title: string;
  ariaLabel: string;
  links: { href: string; label: string }[];
};

function FooterNav({ title, ariaLabel, links }: FooterNavProps) {
  return (
    <nav aria-label={ariaLabel}>
      <p className="text-sm font-semibold text-[rgb(var(--fg))]">{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-[rgb(var(--muted))]">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link
              href={link.href}
              className="transition hover:text-[rgb(var(--fg))] hover:underline hover:underline-offset-4 hover:decoration-[rgb(var(--grad-from))]"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
