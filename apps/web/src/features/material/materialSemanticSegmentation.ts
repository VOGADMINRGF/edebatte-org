export type MaterialSemanticSegment = {
  index: number;
  text: string;
  heading: string | null;
  boundary: "heading" | "paragraph" | "hard_limit";
  characterCount: number;
};

function normalize(value: string) {
  return String(value ?? "").replace(/\r\n?/g, "\n").trim();
}

function looksLikeHeading(line: string) {
  const value = line.trim();
  if (!value || value.length > 180) return false;
  if (/^#{1,6}\s+\S/.test(value)) return true;
  if (/^(kapitel|chapter|teil|abschnitt)\s+[\divxlcdm]+\b/i.test(value)) return true;
  if (/^\d{1,2}(?:\.\d{1,2}){0,3}\s*[|:.-]?\s+\p{L}/u.test(value)) return true;
  if (/^[A-ZÄÖÜ0-9][A-ZÄÖÜ0-9\s/&,+()\-–—]{4,}$/.test(value) && /[A-ZÄÖÜ]/.test(value)) return true;
  return false;
}

function splitOversized(value: string, maxChars: number) {
  const pieces: string[] = [];
  let remaining = value.trim();
  while (remaining.length > maxChars) {
    let cut = remaining.lastIndexOf("\n\n", maxChars);
    if (cut < Math.floor(maxChars * 0.55)) cut = remaining.lastIndexOf("\n", maxChars);
    if (cut < Math.floor(maxChars * 0.55)) cut = remaining.lastIndexOf(". ", maxChars);
    if (cut < Math.floor(maxChars * 0.55)) cut = maxChars;
    const piece = remaining.slice(0, cut + (remaining.slice(cut, cut + 2) === ". " ? 1 : 0)).trim();
    if (piece) pieces.push(piece);
    remaining = remaining.slice(Math.max(1, cut)).trim();
  }
  if (remaining) pieces.push(remaining);
  return pieces;
}

export function segmentMaterialTextSemantically(text: string, maxChars: number): MaterialSemanticSegment[] {
  const normalized = normalize(text);
  if (!normalized || maxChars <= 0) return [];

  const lines = normalized.split("\n");
  const sections: Array<{ heading: string | null; text: string }> = [];
  let heading: string | null = null;
  let buffer: string[] = [];

  const flushSection = () => {
    const body = buffer.join("\n").trim();
    if (!body && !heading) return;
    const sectionText = [heading, body].filter(Boolean).join("\n\n").trim();
    if (sectionText) sections.push({ heading, text: sectionText });
    buffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (looksLikeHeading(line)) {
      flushSection();
      heading = line.trim();
      continue;
    }
    buffer.push(line);
  }
  flushSection();

  if (sections.length === 0) sections.push({ heading: null, text: normalized });

  const output: MaterialSemanticSegment[] = [];
  let currentText = "";
  let currentHeading: string | null = null;
  let currentBoundary: MaterialSemanticSegment["boundary"] = "paragraph";

  const emit = () => {
    const value = currentText.trim();
    if (!value) return;
    output.push({
      index: output.length,
      text: value,
      heading: currentHeading,
      boundary: currentBoundary,
      characterCount: value.length,
    });
    currentText = "";
    currentHeading = null;
    currentBoundary = "paragraph";
  };

  for (const section of sections) {
    if (section.text.length > maxChars) {
      emit();
      const pieces = splitOversized(section.text, maxChars);
      for (const piece of pieces) {
        output.push({
          index: output.length,
          text: piece,
          heading: section.heading,
          boundary: "hard_limit",
          characterCount: piece.length,
        });
      }
      continue;
    }

    const candidate = currentText ? `${currentText}\n\n${section.text}` : section.text;
    if (candidate.length > maxChars) emit();
    if (!currentText) {
      currentText = section.text;
      currentHeading = section.heading;
      currentBoundary = section.heading ? "heading" : "paragraph";
    } else {
      currentText = candidate;
    }
  }
  emit();

  return output.map((segment, index) => ({ ...segment, index }));
}
