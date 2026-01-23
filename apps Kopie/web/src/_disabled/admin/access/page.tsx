"use client";
import { actions, roleList } from "@/utils/AccessControl";

export default function AccessPage() {
  const roles = roleList();
  const acts = actions();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Rollenmatrix</h1>
      <table className="text-sm">
        <thead>
          <tr>
            <th className="text-left py-2">Aktion</th>
            {roles.map((r) => (
              <th key={r} className="px-2">
                {r}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {acts.map((a) => (
            <tr key={a} className="border-b dark:border-neutral-800">
              <td className="py-2 pr-4">{a}</td>
              {roles.map((r) => (
                <td key={r} className="px-2 text-center">
                  {/* statisch: admin hat alles etc. */}
                  {r === "admin" ||
                  (r === "moderator" &&
                    ["manage_users", "view_logs"].includes(a)) ||
                  (r === "editor" &&
                    ["create_report", "view_reports"].includes(a)) ||
                  (r === "user" && a === "view_reports")
                    ? "✓"
                    : "–"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
