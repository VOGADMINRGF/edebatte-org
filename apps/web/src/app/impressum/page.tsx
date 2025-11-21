"use client";

import { useLocale } from "@/context/LocaleContext";
import { getImpressumStrings } from "./strings";

export default function ImpressumPage() {
  const { locale } = useLocale();
  const strings = getImpressumStrings(locale);

  return (
    <main className="max-w-3xl mx-auto px-4 py-16 space-y-8">
      <h1 className="text-3xl font-bold text-coral text-center">{strings.title}</h1>

      <p className="text-gray-700 text-center text-lg">{strings.intro}</p>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4 text-gray-700">
        <p>
          <strong>{strings.responsibleTitle}</strong>
        </p>
        <p className="whitespace-pre-line">
          {strings.responsibleBody.replace(strings.emailLabel, "").trim()} <br />
          E-Mail:{" "}
          <a href="mailto:impressum@voiceopengov.org" className="underline text-coral">
            {strings.emailLabel}
          </a>
        </p>

        <p>
          <strong>{strings.legalTitle}</strong>
        </p>
        <p>
          {strings.legalBody}
        </p>

        <p>
          <strong>{strings.disclaimerTitle}</strong>
        </p>
        <p>{strings.disclaimerBody}</p>
      </div>
    </main>
  );
}
