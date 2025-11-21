"use client";

import { useLocale } from "@/context/LocaleContext";
import { getDataStrings } from "./strings";

export default function DatenPage() {
  const { locale } = useLocale();
  const strings = getDataStrings(locale);

  return (
    <main className="max-w-3xl mx-auto px-4 py-16 space-y-10">
      <h1 className="text-3xl font-bold text-coral text-center">{strings.title}</h1>

      <section className="bg-gray-50 p-6 rounded-lg shadow space-y-4">
        <p className="text-gray-700 text-lg">{strings.intro}</p>

        <ul className="list-disc list-inside space-y-1 text-gray-700">
          {strings.list.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <p className="text-sm text-gray-600">
          {strings.contactPrefix}{" "}
          <a href={`mailto:${strings.contactEmail}`} className="text-coral underline">
            {strings.contactEmail}
          </a>
        </p>
      </section>

      <div className="text-center">
        <a
          href="/report"
          className="inline-block bg-coral text-white px-6 py-3 rounded font-semibold hover:opacity-90 transition"
        >
          {strings.cta}
        </a>
      </div>
    </main>
  );
}
