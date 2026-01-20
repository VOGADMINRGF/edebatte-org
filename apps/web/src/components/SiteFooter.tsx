import Link from "next/link";
import { BRAND } from "@/lib/brand";

const infoLinks = [
  { href: "/ueber-uns", label: "Über Uns" },
  { href: "/satzung", label: "Satzung (Entwurf)" },
  { href: "/faq", label: "FAQ & Hilfe" },
  { href: "/transparenzbericht", label: "Transparenzbericht" },
];

const platformLinks = [
  { href: "/swipes", label: "Abstimmen" },
  { href: "/statements", label: "Einreichen" },
  { href: "/stream", label: "Präsentieren" },
  { href: "/reports", label: "Archiv nachschlagen" },
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

export default function SiteFooter() {
  return (
    <footer
      className="mt-16 border-t border-slate-200 bg-slate-50/80"
      role="contentinfo"
    >
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand / Claim */}
          <div>
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
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {BRAND.tagline_de}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Infrastruktur statt Parteiprogramm: eDebatte bündelt Dossiers, Abstimmungen und
              Umsetzungs-Tracking für nachvollziehbare Entscheidungen.
            </p>
          </div>

          {/* Über eDebatte */}
          <FooterNav
            title="Über eDebatte"
            ariaLabel="Footer Navigation: Über eDebatte"
            links={infoLinks}
          />

          {/* Plattform nutzen */}
          <FooterNav
            title="Plattform nutzen"
            ariaLabel="Footer Navigation: Plattform nutzen"
            links={platformLinks}
          />

          {/* Kontakt & Rechtliches */}
          <FooterNav
            title="Kontakt & Rechtliches"
            ariaLabel="Footer Navigation: Kontakt und Rechtliches"
            links={legalLinks}
          />
        </div>

        <div className="mt-8 border-t border-slate-200/70 pt-6 text-xs text-slate-500 md:flex md:items-center md:justify-between">
          <p>© {currentYear} {BRAND.name}</p>
          <p className="mt-2 text-[11px] text-slate-500 md:mt-0">
            Kontakt: <a className="font-semibold text-slate-600 hover:text-slate-900" href={`mailto:${BRAND.contactEmail}`}>{BRAND.contactEmail}</a>
          </p>
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
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link
              href={link.href}
              className="transition hover:text-slate-900 hover:underline hover:underline-offset-4"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
