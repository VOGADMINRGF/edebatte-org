type DemoUser = { id?: string | null; email?: string | null };

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isDemoEnabled() {
  return process.env.VOG_DEMO_ENABLED === "1";
}

export function isDemoUser(user: DemoUser | null | undefined) {
  if (!isDemoEnabled()) return false;
  if (!user) return false;
  const ids = new Set(parseList(process.env.VOG_DEMO_USER_IDS));
  const emails = new Set(parseList(process.env.VOG_DEMO_EMAILS).map((e) => e.toLowerCase()));
  if (user.id && ids.has(user.id)) return true;
  if (user.email && emails.has(user.email.toLowerCase())) return true;
  return false;
}
