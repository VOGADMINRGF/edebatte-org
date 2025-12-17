import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SwipesClient } from "../SwipesClient";
import { getAccountOverview } from "@features/account/service";
import { readSession } from "@/utils/session";
import type { EDebattePackage } from "@/modules/swipes/types";

export const metadata = {
  title: "Swipe-Karte · VoiceOpenGov",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SwipeDetailPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const session = await readSession();
  const userId = cookieStore.get("u_id")?.value || session?.uid;
  const nextUrl = `/swipes/${id}`;

  if (!userId) {
    redirect(`/login?next=${encodeURIComponent(nextUrl)}`);
  }

  const overview = await getAccountOverview(userId);

  if (!overview) {
    redirect(`/login?next=${encodeURIComponent(nextUrl)}`);
  }

  const edebattePkg: EDebattePackage = (overview as any)?.edebatte?.package ?? "none";

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white pb-12">
      <SwipesClient edebattePackage={edebattePkg} focusStatementId={id} variant="solo" />
    </main>
  );
}
