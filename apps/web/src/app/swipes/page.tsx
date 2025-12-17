import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SwipesClient } from "./SwipesClient";
import { getAccountOverview } from "@features/account/service";
import { readSession } from "@/utils/session";
import type { EDebattePackage } from "@/modules/swipes/types";

export const metadata = {
  title: "Swipes · VoiceOpenGov",
};

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function SwipesPage({ searchParams }: Props) {
  const cookieStore = await cookies();
  const session = await readSession();
  const userId = cookieStore.get("u_id")?.value || session?.uid;

  if (!userId) {
    redirect(`/login?next=${encodeURIComponent("/swipes")}`);
  }

  const overview = await getAccountOverview(userId);

  if (!overview) {
    redirect(`/login?next=${encodeURIComponent("/swipes")}`);
  }

  const edebattePkg: EDebattePackage = (overview as any)?.edebatte?.package ?? "none";

  const initialTopic = typeof searchParams?.topic === "string" ? searchParams.topic : "";

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white pb-14">
      <SwipesClient edebattePackage={edebattePkg} initialTopic={initialTopic} />
    </main>
  );
}
