import { getSessionUser } from "@/lib/server/auth/sessionUser";
import { isDemoUser } from "@/lib/demo/demoAccess";

export async function requireDemoUser() {
  const user = await getSessionUser();
  if (!isDemoUser(user)) {
    throw Object.assign(new Error("demo_only"), { code: "DEMO_ONLY" });
  }
  return user;
}
