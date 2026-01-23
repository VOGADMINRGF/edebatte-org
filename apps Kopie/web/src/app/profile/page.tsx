// apps/web/src/app/profile/page.tsx
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  // Harmonisiert: /profile leitet auf den zentralen Account-Bereich
  redirect("/account");
}
