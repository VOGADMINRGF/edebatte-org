export type LandingScope = "world" | "eu" | "country" | "region";

export type LandingTile = {
  id: string;
  scope: LandingScope;
  text: string;
  tag?: string;
  kind?: "vote" | "topic" | "option" | "question";
  statementId?: string;
  dossierId?: string;
  freshUntil?: number;
};

export const SEEDS: Record<LandingScope, LandingTile[]> = {
  world: [
    { id: "w-1", scope: "world", text: "Soll es globale Regeln für KI-Transparenz geben?", tag: "Global", kind: "vote" },
    { id: "w-2", scope: "world", text: "Wie lassen sich Klimahilfen weltweit gerecht verteilen?", tag: "Klima", kind: "topic" },
    { id: "w-3", scope: "world", text: "Brauchen wir internationale Mindeststandards für Lieferketten?", tag: "Wirtschaft", kind: "vote" },
    { id: "w-4", scope: "world", text: "Soll ein globaler CO₂-Mindestpreis gelten?", tag: "Umwelt", kind: "vote" },
    { id: "w-5", scope: "world", text: "Wie schützen wir Meere vor Plastikmüll wirksam?", tag: "Umwelt", kind: "topic" },
    { id: "w-6", scope: "world", text: "Soll es weltweite Regeln gegen Desinformation in Wahlen geben?", tag: "Medien", kind: "vote" },
    { id: "w-7", scope: "world", text: "Wie wird humanitäre Hilfe neutral und überprüfbar?", tag: "Humanitär", kind: "topic" },
    { id: "w-8", scope: "world", text: "Soll eine globale Mindeststeuer für Konzerne gelten?", tag: "Steuern", kind: "vote" },
    { id: "w-9", scope: "world", text: "Wie sichern wir Datenschutz bei globalen Datenflüssen?", tag: "Digital", kind: "topic" },
    { id: "w-10", scope: "world", text: "Wie kann globale Gesundheitsvorsorge fair finanziert werden?", tag: "Gesundheit", kind: "topic" },
  ],
  eu: [
    { id: "e-1", scope: "eu", text: "Soll die EU einheitliche Regeln für Lobbytransparenz schaffen?", tag: "EU", kind: "vote" },
    { id: "e-2", scope: "eu", text: "Wie wird Migration EU-weit fair und praktikabel geregelt?", tag: "Migration", kind: "topic" },
    { id: "e-3", scope: "eu", text: "Soll es EU-weite Mindeststandards für Mieterschutz geben?", tag: "Wohnen", kind: "vote" },
    { id: "e-4", scope: "eu", text: "Wie kann EU-Fördergeld messbarer wirken?", tag: "Budget", kind: "topic" },
    { id: "e-5", scope: "eu", text: "Soll die EU eine gemeinsame Energie-Reserve aufbauen?", tag: "Energie", kind: "vote" },
    { id: "e-6", scope: "eu", text: "Wie stärken wir EU-weiten Schutz von Minderheitenrechten?", tag: "Rechte", kind: "topic" },
    { id: "e-7", scope: "eu", text: "Soll die EU strengere Regeln für Plattform-Algorithmen festlegen?", tag: "Plattformen", kind: "vote" },
    { id: "e-8", scope: "eu", text: "Wie kann die EU Vertrauen in digitale Identitäten schaffen?", tag: "Digital", kind: "topic" },
    { id: "e-9", scope: "eu", text: "Soll die EU stärker in Cybersicherheit investieren?", tag: "Security", kind: "vote" },
    { id: "e-10", scope: "eu", text: "Wie machen wir EU-Entscheidungen nachvollziehbarer?", tag: "Transparenz", kind: "topic" },
  ],
  country: [
    { id: "c-1", scope: "country", text: "Soll es ein generelles Tempolimit auf Autobahnen geben?", tag: "Verkehr", kind: "vote" },
    { id: "c-2", scope: "country", text: "Wie wird Wohnen bezahlbarer, ohne Neubau zu bremsen?", tag: "Wohnen", kind: "topic" },
    { id: "c-3", scope: "country", text: "Soll die Steuerlast stärker nach Leistungsfähigkeit verteilt werden?", tag: "Finanzen", kind: "vote" },
    { id: "c-4", scope: "country", text: "Wie wird Bildung gerechter, ohne neue Hürden zu schaffen?", tag: "Bildung", kind: "topic" },
    { id: "c-5", scope: "country", text: "Soll es strengere Regeln gegen Korruption geben?", tag: "Recht", kind: "vote" },
    { id: "c-6", scope: "country", text: "Wie sichern wir Pflege und Gesundheit langfristig?", tag: "Gesundheit", kind: "topic" },
    { id: "c-7", scope: "country", text: "Soll der Staat Algorithmen in der Verwaltung stärker prüfen?", tag: "Digital", kind: "vote" },
    { id: "c-8", scope: "country", text: "Wie werden Infrastrukturinvestitionen messbar wirksam?", tag: "Infrastruktur", kind: "topic" },
    { id: "c-9", scope: "country", text: "Wie schützen wir Minderheiten besser vor Diskriminierung?", tag: "Rechte", kind: "topic" },
    { id: "c-10", scope: "country", text: "Wie sichern wir Vertrauen in öffentliche Institutionen?", tag: "Vertrauen", kind: "topic" },
  ],
  region: [
    { id: "r-1", scope: "region", text: "Soll es Tempo 30 vor Schulen geben?", tag: "Verkehr", kind: "vote" },
    { id: "r-2", scope: "region", text: "Wie verbessern wir sichere Schulwege im Bezirk?", tag: "Sicherheit", kind: "topic" },
    { id: "r-3", scope: "region", text: "Soll die Stadt mehr Geld für Radwege bereitstellen?", tag: "Mobilität", kind: "vote" },
    { id: "r-4", scope: "region", text: "Wie lösen wir Parkplatzdruck fair zwischen Anwohnern und Besuchern?", tag: "Stadt", kind: "topic" },
    { id: "r-5", scope: "region", text: "Soll es mehr Schattenplätze und Bäume im Zentrum geben?", tag: "Umwelt", kind: "vote" },
    { id: "r-6", scope: "region", text: "Wie machen wir Bürgerämter schneller und zugänglicher?", tag: "Service", kind: "topic" },
    { id: "r-7", scope: "region", text: "Soll das Schwimmbad saniert werden – und wie zahlen wir das?", tag: "Finanzen", kind: "vote" },
    { id: "r-8", scope: "region", text: "Wie reduzieren wir Lärm in Wohngebieten?", tag: "Alltag", kind: "topic" },
    { id: "r-9", scope: "region", text: "Wie wird Mülltrennung praktischer und einfacher?", tag: "Alltag", kind: "topic" },
    { id: "r-10", scope: "region", text: "Soll es mehr transparente Bürgerbeteiligung im Stadtrat geben?", tag: "Beteiligung", kind: "vote" },
  ],
};
