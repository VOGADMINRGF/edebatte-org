export type CreateIntakeIssueMode = "single_issue" | "multi_issue";

const CREATE_FAST_INTAKE_MAX_CHARS = 800;
const STRUCTURED_TOPIC_LIMIT = 20;

function normalizeStructuredTopicLabel(value: string): string {
  const withoutMarkdown = value.replace(/^#{1,6}\s+/, "").trim();
  const heading = withoutMarkdown.split(/\s*[:–—-]\s+/, 1)[0]?.trim() ?? "";
  return (heading || withoutMarkdown).replace(/[.:;,]+$/, "").trim();
}

function dedupeLabels(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLocaleLowerCase("de-DE");
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function extractCreateStructuredTopicLabels(text: string): string[] {
  const labels: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const numbered = line.match(/^\s*\d{1,2}\s*[.)]\s+(.+)$/u);
    const markdownHeading = line.match(/^\s*#{1,6}\s+(.+)$/u);
    const candidate = numbered?.[1] ?? markdownHeading?.[1] ?? null;
    if (!candidate) continue;
    const label = normalizeStructuredTopicLabel(candidate);
    if (label.length >= 2 && label.length <= 80) labels.push(label);
  }
  return dedupeLabels(labels).slice(0, STRUCTURED_TOPIC_LIMIT);
}

export function hasCreateMultiIssueStructure(text: string): boolean {
  const structuredTopics = extractCreateStructuredTopicLabels(text);
  if (structuredTopics.length >= 3) return true;

  const repeatedSubtopicHeadings = text.match(/^\s*Unterthemen\s*:/gimu)?.length ?? 0;
  if (repeatedSubtopicHeadings >= 2) return true;

  const sectionHeadings = text.match(/^\s*[\p{L}][\p{L}\d /&-]{2,60}:\s*$/gmu)?.length ?? 0;
  return sectionHeadings >= 3;
}

export function resolveCreateIntakeIssueMode(params: {
  text: string;
  canonicalTopicCount?: number;
}): CreateIntakeIssueMode {
  if (hasCreateMultiIssueStructure(params.text)) return "multi_issue";
  return (params.canonicalTopicCount ?? 0) >= 3 ? "multi_issue" : "single_issue";
}

export function isCreateFastIntakeText(text: string): boolean {
  const normalized = text.trim();
  return (
    normalized.length > 0 &&
    normalized.length <= CREATE_FAST_INTAKE_MAX_CHARS &&
    !/https?:\/\/|www\./i.test(normalized) &&
    !hasCreateMultiIssueStructure(normalized)
  );
}
