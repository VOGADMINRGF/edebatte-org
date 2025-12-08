import Link from "next/link";

export default function KontaktPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-5xl px-4 pt-14">
        <div className="rounded-3xl bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 md:p-10">
          <header className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
              Kontakt & Support
            </p>
            <h1 className="text-3xl font-extrabold leading-tight text-slate-900 md:text-4xl">
              Der schnellste Weg zu uns.
            </h1>
            <p className="text-sm leading-relaxed text-slate-700 md:text-base">
              Per Formular oder direkt
              per E-Mail.             </p>
          </header>

          {/* kompakte Kontakt-/Anschrift-Box */}
          <section className="mt-8 rounded-2xl border border-slate-100 bg-slate-50/70 p-5 text-sm text-slate-800">
            <div className="grid gap-4 md:grid-cols-2 md:items-start">
              <div className="space-y-1">
                <p>
                  <span className="font-semibold">E-Mail:</span>{" "}
                  <a
                    href="mailto:kontakt@voiceopengov.org"
                    className="font-semibold text-sky-700 underline underline-offset-4"
                  >
                    kontakt@voiceopengov.org
                  </a>
                </p>
                <p>Direkt ans Team VoiceOpenGov</p>
                <p className="text-xs text-slate-600">
                  Anfragen versuchen wir binnen von 24 Stunden zu beantworten. 
                </p>
              </div>

              <div className="space-y-1 md:text-right">
                <p className="font-semibold text-slate-900">Ladungsfähige Geschäftsanschrift</p>
                <p>VoiceOpenGov UG (haftungsbeschränkt) i. G.</p>
                <p>Ricky G. Fleischer</p>
                <p>Kolonnenstraße 8</p>
                <p>10827 Berlin</p>
                <p>Deutschland</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Weitere Angaben findest du im Impressum.
                </p>
              </div>
            </div>
          </section>

          {/* Formular */}
          <section
            id="kontaktformular"
            className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-slate-100"
          >
            <h2 className="text-base font-semibold text-slate-900 text-center">Kontaktformular</h2>
            <p className="mt-1 text-center text-xs text-slate-600">
              Wir routen dein Anliegen intern an die passende Stelle.
            </p>

            <form className="mt-5 space-y-4 relative" action="/api/contact" method="POST">
              {/* Honeypot / „Spy-Captcha“ – von Menschen unsichtbar, Bots füllen es oft aus */}
              <div className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden">
                <label htmlFor="website">Bitte dieses Feld frei lassen</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-xs font-semibold text-slate-700">
                  Worum geht es?
                </label>
                <select
                  id="category"
                  name="category"
                  required
                  className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="">Bitte auswählen …</option>
                  <option value="juristisch">Juristische / rechtliche Anfrage</option>
                  <option value="presse">Presse- / Interviewanfrage</option>
                  <option value="medien">Medien / Kooperation</option>
                  <option value="partei">Partei, Fraktion oder Mandatsträger:in</option>
                  <option value="bewerbung">Bewerbung / Mitarbeit</option>
                  <option value="sonstiges">Sonstiges Anliegen</option>
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="name" className="block text-xs font-semibold text-slate-700">
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
                    E-Mail
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="phone" className="block text-xs font-semibold text-slate-700">
                  Telefon (optional)
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="Wenn du einen Rückruf wünschst, gib bitte eine Nummer an."
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="subject" className="block text-xs font-semibold text-slate-700">
                  Betreff (optional)
                </label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="Worum geht es in einem Satz?"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="message" className="block text-xs font-semibold text-slate-700">
                  Nachricht
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  placeholder="Wie können wir dir helfen?"
                />
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  id="newsletterOptIn"
                  name="newsletterOptIn"
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <label
                  htmlFor="newsletterOptIn"
                  className="text-[11px] leading-snug text-slate-600"
                >
                  Ich möchte gelegentlich Updates und Informationen zu VoiceOpenGov erhalten
                  (Newsletter). Du kannst dich jederzeit wieder abmelden.
                </label>
              </div>

              <p className="text-[11px] text-slate-500">
                Mit dem Absenden erklärst du dich einverstanden, dass wir deine Angaben zur
                Bearbeitung deiner Anfrage verarbeiten. Vollständige Datenschutz-Hinweise folgen
                nach Gesellschaftseintragung.
              </p>

              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <button
                  type="submit"
                  className="w-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 px-8 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(14,116,144,0.35)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-sky-200 md:w-auto md:px-10"
                  >
                  Anfrage absenden
                </button>

                <Link
                  href="mailto:kontakt@voiceopengov.org"
                  className="w-full rounded-full border border-sky-200 bg-sky-50/60 px-4 py-3 text-center text-sm font-semibold text-sky-700 shadow-[0_6px_18px_rgba(14,165,233,0.15)] transition hover:border-sky-400 hover:bg-white hover:text-sky-900 md:w-auto"
                >
                  Oder direkt per E-Mail schreiben
                </Link>
              </div>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}
