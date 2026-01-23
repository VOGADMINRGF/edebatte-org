// utils/normalizeStatus.ts
export function normalizeStatus(
  status?: string,
): "Live" | "Replay" | "Geplant" {
  if (!status) return "Geplant";
  const s = status.trim().toLowerCase();
  if (s.startsWith("live")) return "Live";
  if (s.startsWith("replay")) return "Replay";
  if (s.startsWith("geplant")) return "Geplant";
  return "Geplant"; // fallback
}
