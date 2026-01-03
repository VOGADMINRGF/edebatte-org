"use client";

import Link from "next/link";
import Button from "@ui/design/Button";

export default function IntroSection() {
  return (
    <section className="bg-gradient-to-b from-purple-50 to-white text-center px-6 py-16 md:py-20">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900">
          Demokratie. Offen. Gemeinsam.
        </h1>
        <p className="mt-5 text-lg md:text-xl text-gray-700">
          VoiceOpenGov ist die Plattform für digitale Beteiligung: Abstimmen,
          eigene Statements einbringen und faktenbasierte Reports mitgestalten –
          unabhängig, transparent, europaweit.
        </p>

        <div className="mt-8 flex justify-center gap-3 flex-wrap">
          <Link href="/swipes">
            <Button variant="secondary">Themen entdecken</Button>
          </Link>
          <Link href="/beitraege">
            <Button variant="ghost">Beiträge lesen</Button>
          </Link>
          <Link href="/beitraege/neu">
            <Button variant="primary">Eigenes Statement erstellen</Button>
          </Link>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Kein Social-Login erforderlich. Du behältst die Kontrolle über deine
          Daten.
        </p>
      </div>
    </section>
  );
}
