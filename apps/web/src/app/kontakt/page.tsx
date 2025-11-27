import Link from "next/link";

export default function KontaktPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 space-y-8">
      <h1 className="text-3xl font-bold text-coral text-center">Kontakt</h1>

      <p className="text-gray-700 text-lg text-center">
        Die ladungsfähige Firmenanschrift wird nach Eintragung im Januar 2026
        ergänzt. Bis dahin sind wir selbstverständlich erreichbar.
      </p>

      <p className="text-gray-700 text-lg text-center">
        Für Anliegen zu Technik, Mitgliedschaft, Unterstützung,
        Presseanfragen oder anderen Themen nutze gerne unser{" "}
        <Link
          href="/contact"
          className="text-coral font-semibold underline decoration-2 underline-offset-4"
        >
          Kontaktformular
        </Link>{" "}
        oder schreibe uns an{" "}
        <a
          className="text-coral font-semibold underline decoration-2 underline-offset-4"
          href="mailto:impressum@voiceopengov.org"
        >
          impressum@voiceopengov.org
        </a>
        .
      </p>
    </main>
  );
}
