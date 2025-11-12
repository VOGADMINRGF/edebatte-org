import type { AskInput } from "./types";

export function buildUserText({ prompt, content, mode, locale }: AskInput) {
  return `${prompt}
---
locale: ${locale}
mode: ${mode}
content:
${content}`;
}
