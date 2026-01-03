import { getServerUser } from "@/lib/auth";

export async function requireServerUser() {
  const user = await getServerUser();
  if (!user) {
    throw Object.assign(new Error("unauthorized"), { code: "UNAUTHORIZED" });
  }
  return user;
}
