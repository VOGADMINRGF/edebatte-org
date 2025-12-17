import type { ReactNode } from "react";
import { UserProvider } from "@features/user/context/UserContext";

type IUserProfile = {
  verification?: unknown;
  [key: string]: any;
};
import { getSessionUser } from "@/lib/server/auth/sessionUser";

function toInitialUser(sessionUser: any): IUserProfile | null {
  if (!sessionUser) return null;
  const verification = (() => {
    const v = sessionUser.verification;
    if (typeof v?.status === "string") return v.status as IUserProfile["verification"];
    if (v?.legitimized === true || v?.id === true) return "legitimized";
    if (v) return "pending";
    return "none";
  })();

  return {
    id: sessionUser._id?.toString?.(),
    name: sessionUser.name ?? undefined,
    email: sessionUser.email ?? undefined,
    role: (sessionUser.role ?? sessionUser.roles?.[0]) as any,
    image: sessionUser.image ?? undefined,
    locale: sessionUser.locale ?? undefined,
    verification,
  };
}

export default async function StreamLayout({ children }: { children: ReactNode }) {
  const sessionUser = await getSessionUser();
  const initialUser = toInitialUser(sessionUser);

  return <UserProvider initialUser={initialUser}>{children}</UserProvider>;
}
