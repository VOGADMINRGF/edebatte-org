import type { PreviewItem } from "./types";
export function buildPyramid({ claims, statements }:{claims?:any[];statements?:any[]}):{previews:PreviewItem[]}{
  const list = (claims ?? statements ?? []).slice(0, 12);
  return { previews: list.map((c:any)=>({
    title: (c?.title ?? c?.text ?? "").slice(0, 100) || "Statement",
    summary: c?.summary ?? c?.text ?? "",
    text: c?.text ?? ""
  })) };
}
