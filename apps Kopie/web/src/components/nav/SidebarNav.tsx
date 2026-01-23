import { cookies } from "next/headers";
import SidebarNavClient from "./SidebarNavClient";
export type NavItem = { href: string; label: string; roles?: string[] };
export default function SidebarNav({ items }: { items: NavItem[] }) {
  const role = cookies().get("u_role")?.value ?? "guest";
  return <SidebarNavClient items={items} role={role} />;
}
