export function formatObjectId(id: any): string {
  return typeof id === "string" ? id : id?.toHexString?.() ?? "";
}
