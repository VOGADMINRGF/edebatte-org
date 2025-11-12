"use client";

import { colors } from "@../theme";
import { useState } from "react";

// Zielgruppen-Tabs
const tabItems = [
  {
    label: "Bürger:innen",
    icon: "👤",
    color: colors.coral,
    content: (
      <p>
        Schluss mit passivem Zuschauen! VoiceOpenGov gibt dir echte
        Mitbestimmung: Such direkt nach deinem Thema, eröffne neue Anliegen und
        erlebe, wie aus einzelnen Meinungen echte Bewegungen und Lösungen
        entstehen – sichtbar, nachvollziehbar, wirksam. Keine Filterblasen,
        keine Politik-Sprache, sondern direkte Wirkung.
      </p>
    ),
  },
  {
    label: "Medien & Journalist:innen",
    icon: "📰",
    color: colors.indigo,
    content: (
      <p>
        Jeder Mensch kann heute Reporter:in sein – aber Qualität zählt!
        VoiceOpenGov schafft Raum für faktenbasierte, regionale
        Berichterstattung: Was das Volk vor Ort bewegt, ist hier sofort sichtbar
        und recherchierbar. Schluss mit PR-Texten, her mit ehrlichen
        Geschichten, die wirklich zählen.
      </p>
    ),
  },
  {
    label: "Politik & Verwaltung",
    icon: "🏛️",
    color: colors.coral,
    content: (
      <p>
        Mit VoiceOpenGov erfahren Sie, was Bürger:innen wirklich bewegt – nach
        Regionen, Themen und konkretem Bedarf. Nutzen Sie die Plattform, um
        gezielt Politik für die Menschen vor Ort zu machen – faktenbasiert,
        aktuell und dialogorientiert.
      </p>
    ),
  },
  {
    label: "NGOs & Verbände",
    icon: "🌱",
    color: colors.turquoise,
    content: (
      <p>
        Eure Themen und euer Protest werden sichtbar – und ihr könnt
        Mitstreiter:innen, Aktionen und neue Bündnisse direkt über VoiceOpenGov
        organisieren. Für eine Gesellschaft, in der Beteiligung zählt.
      </p>
    ),
  },
];

// Info-Kacheln

export default function PressePage() {
  // Kontaktformular-Logik
  const [form, setForm] = useState({
    name: "",
    email: "",
    medium: "",
    message: "",
  });
  const [sent, setSent] = useState(false);

  const handleChange = (e: any) =>
    setForm((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e: any) => {
    e.preventDefault();
    // Hier ggf. an /api/contact senden
    setSent(true);
  };

  // Tabs State
  const [tab, setTab] = useState(0);

  return (
    <main className="max-w-3xl mx-auto px-4 py-16 space-y-12">
      {/* Headline */}
      <h2
        className="text-2xl md:text-3xl font-bold text-center mb-8 mt-16"
        style={{ color: colors.indigo }}
      >
        Aktuelle Informationen & Materialien zu VoiceOpenGov
      </h2>

      {/* Info-Kacheln */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 justify-center mb-12">
        {infoTiles.map(({ icon, title, subtitle, href, color, shadow }: any) => (
          <a
            href={href}
            key={title}
            className="focus:outline-none"
            tabIndex={0}
            aria-label={title}
            style={{ textDecoration: "none" }}
          >
            <div
              className="flex flex-col items-center justify-center p-6 rounded-2xl transition-transform hover:-translate-y-1 focus:ring-2 focus:ring-offset-2 cursor-pointer select-none"
              style={{
                border: `2px solid ${color}`,
                background: color + "09",
                color,
                boxShadow: shadow,
              }}
              tabIndex={-1}
            >
              <span className="text-3xl mb-2">{icon}</span>
              <span className="font-bold text-lg text-center">{title}</span>
              <span className="font-normal text-sm text-center mt-1 opacity-80">
                {subtitle}
              </span>
            </div>
          </a>
        ))}
      </section>

      {/* Zielgruppen Tabs */}
      <section className="mb-12">
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {tabItems.map((item, idx) => (
            <button
              key={item.label}
              onClick={() => setTab(idx)}
              className={`px-4 py-2 rounded-full font-semibold flex items-center gap-2
                transition border
                ${
                  tab === idx
                    ? ""
                    : "bg-gray-50 border-gray-200 text-gray-500 hover:border-" +
                      item.color
                }
              `}
              style={{
                borderColor: tab === idx ? item.color : "#eee",
                color: tab === idx ? item.color : undefined,
                background: tab === idx ? "#fff" : undefined,
                boxShadow:
                  tab === idx ? `0 2px 8px 0 ${item.color}15` : undefined,
                fontWeight: tab === idx ? 700 : 500,
              }}
              aria-selected={tab === idx}
              aria-controls={`tabpanel-${idx}`}
            >
              <span className="text-lg">{item.icon}</span> {item.label}
            </button>
          ))}
        </div>
        <div
          className="bg-white/90 p-6 rounded-2xl shadow-lg border border-gray-100 text-gray-800 min-h-[120px]"
          id={`tabpanel-${tab}`}
          role="tabpanel"
        >
          {tabItems[tab].content}
        </div>
      </section>

      {/* Pressemitteilung */}
      <article className="relative bg-white/90 p-8 rounded-2xl shadow-xl border border-gray-100 max-w-prose mx-auto leading-relaxed">
        <div className="absolute left-2 top-6 flex items-center">
          <span
            className="h-4 w-4 rounded-full"
            style={{
              backgroundColor: colors.coral,
              border: "2px solid #fff",
              boxShadow: "0 2px 8px 0 rgba(255,111,97,0.18)",
              display: "inline-block",
            }}
          />
          <span className="ml-2 text-xs text-gray-400">09. Juli 2025</span>
        </div>
        <div className="mb-4"></div>
        <h2
          className="text-xl font-semibold"
          style={{ color: colors.coral, marginBottom: "1rem" }}
        >
          Pressemitteilung: Demokratie NeuStart Jetzt – VoiceOpenGov
        </h2>
        <p>
          In einer idealen Welt… ist gesellschaftliche Mitbestimmung kein
          Privileg, sondern selbstverständlich – unabhängig von Herkunft,
          Partei, Alter, sozialem Status oder beruflichem Hintergrund.
        </p>
        <p>
          VoiceOpenGov ist als neue Beteiligungsplattform für wirklich alle
          offen – Menschen aus allen Regionen, mit jeder Meinung, jeder
          Hautfarbe, allen politischen, kulturellen oder religiösen Prägungen.
          Wir wollen Vielfalt und faire Beteiligung ermöglichen, ohne
          Ausgrenzung, Fraktionszwang oder Filterblasen.
        </p>
        <p>
          <strong>Berlin, 09. Juli 2025</strong> – Die neue Plattform{" "}
          <strong>VoiceOpenGov</strong> bringt Bürgerinnen und Bürger, Kommunen,
          Organisationen und Politik direkt ins Gespräch – transparent,
          respektvoll und faktenbasiert. Ziel ist es, echte
          Mehrheitsentscheidungen zu ermöglichen, frei von Parteiinteressen,
          Lobbyismus und wirtschaftlichem Einfluss.
        </p>
        <p>
          Das Prinzip: Jeder Mensch kann Anliegen einbringen, Kernbotschaften
          zustimmen oder ablehnen und die Auswertung nachvollziehen – unabhängig
          von Sprache, Bildung oder Zugang zu klassischen Medien.
        </p>
        <p>
          Im Mittelpunkt steht immer das gesellschaftliche Wohl, nicht
          Einzelinteressen. Das Mehrheitsmeinungsprinzip wird digital,
          datenschutzfreundlich und anonym abgebildet. Jede Stimme zählt –
          niemand wird ausgegrenzt.
        </p>
        <p>
          VoiceOpenGov finanziert sich gemeinschaftlich, verzichtet auf Werbung
          und bleibt unabhängig von Parteien, Unternehmen oder anderen
          Interessen – für eine Demokratie, die niemanden ausschließt.
        </p>
        <p className="font-semibold mt-6">
          Ab sofort ist das Einführungsvideo „Wert der Stimme – VoiceOpenGov“
          öffentlich abrufbar:
        </p>
      </article>

      {/* Video-Player */}
      <div className="flex justify-center mt-8 relative">
        <video
          controls
          aria-label="Video: Wert der Stimme – VoiceOpenGov"
          className="w-full max-w-2xl rounded-2xl border-2 shadow-lg aspect-video bg-black"
          style={{
            borderColor: colors.coral,
            boxShadow: "0 4px 24px 0 rgba(36,50,93,0.07)",
          }}
          poster="/images/default.jpg"
        >
          <source src="/videos/WertderStimme_DE.mp4" type="video/mp4" />
          Ihr Browser unterstützt das Video-Tag leider nicht.
        </video>
      </div>

      {/* Download-Bereich */}
      <section className="bg-white rounded-xl p-8 my-8 text-center shadow border border-gray-100 space-y-3 max-w-2xl mx-auto">
        <h3
          className="text-lg font-semibold mb-3"
          style={{ color: colors.indigo }}
        >
          Presse-Downloads & Medienkit
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href="/downloads/VoiceOpenGov-Pressemappe.pdf"
            className="flex flex-col items-center p-4 rounded-lg border shadow hover:bg-indigo-50 transition"
            style={{ borderColor: colors.indigo }}
            download
          >
            <span className="text-3xl mb-1">📄</span>
            <span className="font-semibold text-base">Pressemappe</span>
            <span className="text-xs text-gray-500">PDF</span>
          </a>
          <a
            href="/downloads/vog_logo.zip"
            className="flex flex-col items-center p-4 rounded-lg border shadow hover:bg-coral-50 transition"
            style={{ borderColor: colors.coral }}
            download
          >
            <span className="text-3xl mb-1">🖼️</span>
            <span className="font-semibold text-base">Logo & Assets</span>
            <span className="text-xs text-gray-500">PNG, SVG, EPS</span>
          </a>
          <a
            href="/downloads/bildmaterial.zip"
            className="flex flex-col items-center p-4 rounded-lg border shadow hover:bg-turquoise-50 transition"
            style={{ borderColor: colors.turquoise }}
            download
          >
            <span className="text-3xl mb-1">📷</span>
            <span className="font-semibold text-base">Bilder & Team</span>
            <span className="text-xs text-gray-500">ZIP</span>
          </a>
        </div>
      </section>

      {/* Schnellkontakt */}
      <section className="bg-indigo-50 rounded-xl p-8 mt-8 text-center shadow border border-indigo-100 space-y-3 max-w-lg mx-auto">
        <div className="flex justify-center mb-2">
          <span className="text-2xl text-indigo-700">🚨</span>
        </div>
        <div className="text-base font-semibold text-indigo-900">
          Schnellkontakt (Eilmeldung/Breaking News)
        </div>
        <div className="text-gray-700 text-sm mb-2">
          Bei besonders dringenden Presseanliegen melden Sie sich bitte direkt
          bei:
          <br />
          <a
            href="mailto:ricky.fleischer@voiceopengov.org"
            className="underline text-coral hover:text-indigo-800 transition"
          >
            ricky.fleischer@voiceopengov.org
          </a>
          <br />
          oder per Signal/WhatsApp:{" "}
          <span className="font-mono">0151&nbsp;12345678</span>
        </div>
      </section>

      {/* Direkter Pressekontakt (inkl. Kontaktformular) */}
      <section className="bg-white rounded-xl p-8 mt-12 text-center shadow border border-gray-100 space-y-4 max-w-lg mx-auto">
        <div className="flex justify-center mb-1">
          <span className="text-2xl text-coral">📰</span>
        </div>
        <div className="text-lg font-semibold text-coral mb-2">
          Direkter Pressekontakt
        </div>
        <div className="text-gray-600 text-sm mb-4">
          Sie sind Journalist:in oder haben eine Presseanfrage? Schreiben Sie
          uns direkt oder nutzen Sie das Kontaktfeld unten.
        </div>
        <div className="text-gray-700 text-base font-medium mb-1">
          <a
            href="mailto:press@voiceopengov.org"
            className="text-coral underline hover:text-coral-dark"
          >
            press@voiceopengov.org
          </a>
        </div>
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="text-base text-gray-700 font-semibold mb-1">
            Pressekontakt (Gründer):
          </div>
          <div className="text-gray-700 text-sm">
            Ricky Fleischer, Founder & Initiator
          </div>
          <a
            href="mailto:ricky.fleischer@voiceopengov.org"
            className="text-coral underline hover:text-coral-dark text-sm"
          >
            ricky.fleischer@voiceopengov.org
          </a>
        </div>
        {/* Kontaktfeld */}
        <form className="space-y-3 mt-4" onSubmit={handleSubmit}>
          <div className="flex gap-3">
            <input
              type="text"
              name="name"
              placeholder="Ihr Name"
              required
              value={form.name}
              onChange={handleChange}
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:border-coral outline-none"
            />
            <input
              type="text"
              name="medium"
              placeholder="Medium (z.B. ZEIT, ARD)"
              required
              value={form.medium}
              onChange={handleChange}
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:border-coral outline-none"
            />
          </div>
          <input
            type="email"
            name="email"
            placeholder="Ihre E-Mail"
            required
            value={form.email}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-coral outline-none"
          />
          <textarea
            name="message"
            placeholder="Ihre Nachricht an das Presseteam"
            required
            value={form.message}
            onChange={handleChange}
            rows={3}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-coral outline-none resize-none"
          />
          <button
            type="submit"
            className="w-full mt-2 bg-coral text-white font-semibold rounded-lg py-2 shadow hover:bg-[#e35c50] transition"
            disabled={sent}
          >
            {sent ? "Nachricht gesendet" : "Anfrage absenden"}
          </button>
          {sent && (
            <div className="text-green-600 text-sm mt-1">
              Danke für Ihre Nachricht – wir melden uns zeitnah zurück!
            </div>
          )}
        </form>
      </section>
    </main>
  );
}
