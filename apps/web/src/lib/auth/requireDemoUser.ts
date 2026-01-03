import { getServerUser } from "@/lib/auth";

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireDemoUser() {
  const user = await getServerUser();
  const allow = parseList(process.env.VOG_DEMO_EMAILS);
  const email = String((user as any)?.email ?? "").toLowerCase();
  const ok = allow.length > 0 && allow.includes(email);
  if (!ok) {
    throw Object.assign(new Error("demo_only"), { code: "DEMO_ONLY" });
  }
  return user;
}
