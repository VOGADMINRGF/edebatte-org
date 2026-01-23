// apps/web/src/app/dashboard/users/page.tsx
"use client";

import { useEffect, useState } from "react";

type Role = "guest" | "member" | "admin";

interface User {
  id: string;
  name: string;
  email: string;
  joined: string;
  role: Role;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    // Platzhalterdaten
    setUsers([
      {
        id: "u1",
        name: "Max Mustermann",
        email: "max@vog.org",
        joined: "2025-04-12",
        role: "member",
      },
      {
        id: "u2",
        name: "Anna Admin",
        email: "admin@vog.org",
        joined: "2025-01-02",
        role: "admin",
      },
    ]);
  }, []);

  const handleRoleChange = (userId: string, newRole: Role) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
    );
    // TODO: Persist via API
  };

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-bold text-coral">Benutzerverwaltung</h2>

      <table className="w-full bg-white rounded shadow">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-3">Name</th>
            <th className="p-3">E-Mail</th>
            <th className="p-3">Beitritt</th>
            <th className="p-3">Rolle</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t hover:bg-gray-50">
              <td className="p-3 font-medium">{u.name}</td>
              <td className="p-3">{u.email}</td>
              <td className="p-3">{u.joined}</td>
              <td className="p-3">
                <select
                  value={u.role}
                  onChange={(e) =>
                    handleRoleChange(u.id, e.target.value as Role)
                  }
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="guest">Gast</option>
                  <option value="member">Mitglied</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
