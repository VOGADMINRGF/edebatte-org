type DemoUser = {
  id?: string | null;
  _id?: string | { toString(): string } | null;
  email?: string | null;
};

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isDemoEnabled() {
  const flag = process.env.VOG_DEMO_ENABLED ?? process.env.VOG_DEMO_MODE;
  return flag === "1";
}

export function isDemoUser(user: DemoUser | null | undefined) {
  if (!isDemoEnabled()) return false;
  if (!user) return false;
  const ids = new Set(parseList(process.env.VOG_DEMO_USER_IDS));
  const emails = new Set(
    [
      ...parseList(process.env.VOG_DEMO_EMAILS),
      ...parseList(process.env.VOG_DEMO_JOURNALIST_EMAIL),
    ].map((e) => e.toLowerCase()),
  );
  const id = user.id ?? (typeof user._id === "string" ? user._id : user._id?.toString?.());
  if (id && ids.has(id)) return true;
  if (user.email && emails.has(user.email.toLowerCase())) return true;
  return false;
}
