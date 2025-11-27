import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RegisterPageClient } from "./RegisterPageClient";

export default function RegisterPage() {
  const cookieStore = cookies();
  const hasSession =
    !!cookieStore.get("u_id")?.value ||
    !!cookieStore.get("session_token")?.value ||
    !!cookieStore.get("session")?.value;

  if (hasSession) {
    redirect("/account");
  }

  return <RegisterPageClient />;
}
