// sehr leichte Zuordnung nach Thema × Ebene – kann später durch KI/DB ersetzt werden
export function defaultOrganFor(level: "EU"|"Bund"|"Land"|"Kommune"|"-", topic: string) {
    const t = topic.toLowerCase();
    const byBund = (x: string) => `Bundesministerium für ${x}`;
    const byLand = (x: string) => `Landesministerium für ${x}`;
    const byKomm = (x: string) => `${x} (Rathaus/Stadtrat)`;
  
    if (level === "EU") {
      if (/gesund|pflege/.test(t)) return "EU-Kommission – GD SANTE";
      if (/sicher|polizei/.test(t)) return "EU-Rat / Innen (JHA)";
      if (/landwirt|tier/.test(t)) return "EU-Kommission – GD AGRI";
      if (/verkehr|öpnv|bahn/.test(t)) return "EU-Kommission – GD MOVE";
      return "EU-Kommission";
    }
    if (level === "Bund") {
      if (/gesund|pflege/.test(t)) return byBund("Gesundheit (BMG)");
      if (/sicher|polizei/.test(t)) return byBund("Inneres (BMI)");
      if (/landwirt|tier/.test(t)) return byBund("Ernährung & Landwirtschaft (BMEL)");
      if (/bildung|schule|uni/.test(t)) return byBund("Bildung & Forschung (BMBF)");
      if (/verkehr|öpnv|bahn/.test(t)) return byBund("Digitales & Verkehr (BMDV)");
      return "Bundeskanzleramt / Ressortabstimmung";
    }
    if (level === "Land") {
      if (/gesund|pflege/.test(t)) return byLand("Gesundheit");
      if (/sicher|polizei/.test(t)) return byLand("Inneres");
      if (/bildung|schule/.test(t)) return byLand("Bildung");
      if (/verkehr/.test(t)) return byLand("Verkehr");
      return "Senats-/Staatskanzlei";
    }
    if (level === "Kommune") {
      if (/gesund|pflege/.test(t)) return byKomm("Gesundheit/Soziales");
      if (/sicher|polizei/.test(t)) return byKomm("Ordnung/Öffentliche Sicherheit");
      if (/verkehr/.test(t)) return byKomm("Mobilität/ÖPNV");
      return byKomm("Allgemeine Verwaltung");
    }
    return "-";
  }
  