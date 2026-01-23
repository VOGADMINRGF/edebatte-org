export function absUrl(path: string) {
  return path.startsWith("http")
    ? path
    : `https://example.org${path.startsWith("/") ? "" : "/"}${path}`;
}
