export const RATER_SYSTEM = `Rate the draft on 5 criteria (0–1) and give one short reason each. Output strict JSON.`;
export const RATER_USER = ({claim}:{claim:string})=> `Text: ${claim}
Return: {
  "präzision":number, "prüfbarkeit":number, "relevanz":number, "lesbarkeit":number, "ausgewogenheit":number,
  "begründung": {"präzision":string, "prüfbarkeit":string, "relevanz":string, "lesbarkeit":string, "ausgewogenheit":string}
}`;
