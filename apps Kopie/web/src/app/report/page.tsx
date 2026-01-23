// apps/web/src/app/report/page.tsx
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/getServerUser";
import ReportPage from "@features/report/components/ReportPage";
import UserHydrator, {
  type User as HydratorUser,
} from "@features/user/components/UserHydrator";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Server→Client User-Shape sicher mappen (id oder _id) */
function toHydratorUser(u: any): HydratorUser | null {
  if (!u) return null;
  return {
    id: String(u.id ?? u._id ?? ""),
    email: u.email ?? "",
    name: u.name ?? null,
    roles: Array.isArray(u.roles) ? u.roles : ["user"],
  };
}

export default async function Page() {
  const user = await getServerUser();
  if (!user || !user.verified) {
    redirect("/login?next=/report&reason=verified-only");
  }

  // TODO: Falls du echte Reports laden willst, hier via triMongo befüllen:
  // const initial = await coreCol("reports").then(col => col.find({ ownerId: user.id }).limit(20).toArray());
  const initial: any[] = [];

  return (
    <UserHydrator initialUser={toHydratorUser(user)}>
      <ReportPage initial={initial} />
    </UserHydrator>
  );
}
