import Link from "next/link";

const infoLinks = [
  { href: "/ueber-uns", label: "Über uns" },
  { href: "/vision", label: "Vision & Mission" },
  { href: "/satzung", label: "Satzung (Entwurf)" },
  { href: "/faq", label: "FAQ" },
];

const platformLinks = [
  { href: "/swipe", label: "Swipe" },
  { href: "/start", label: "Beitrag einreichen" },
  { href: "/reports", label: "Reports" },
  { href: "/streams", label: "Streams & Events" },
];

const legalLinks = [
  { href: "/kontakt", label: "Kontakt" },
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutz", label: "Datenschutz" },
  { href: "/reports?filter=transparenz", label: "Transparenzbericht" },
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
              eDebatte
            </Link>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              Offene Infrastruktur für direkte Demokratie.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Keine Partei, kein Verein – wir finanzieren uns über
              Mitgliedsbeiträge und faire Nutzungsentgelte, nicht über
              Spendenquittungen oder versteckte Werbung.
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
          <p>© {currentYear} eDebatte</p>
          <p className="mt-2 text-[11px] text-slate-500 md:mt-0">
            Beta-Version – wir entwickeln diese Infrastruktur gemeinsam weiter.
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
          <li key={link.href}>
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
