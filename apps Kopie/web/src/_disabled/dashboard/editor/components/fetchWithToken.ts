// apps/web/src/app/dashboard/editor/components/fetchWithToken.ts
"use client";

export async function fetchWithToken(url: string, init?: RequestInit) {
  const token = localStorage.getItem("EDITOR_TOKEN") || "";
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
  });
}
