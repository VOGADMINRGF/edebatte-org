// apps/web/src/app/dashboard/editor/login/page.tsx
"use client";
import { useEffect, useState } from "react";

export default function EditorLoginPage() {
  const [token, setToken] = useState("");

  useEffect(() => {
    try {
      const t = localStorage.getItem("editorToken");
      if (t) setToken(t);
    } catch {
      /* fallback: ignore */
    }
  }, []);

  const save = () => {
    try {
      localStorage.setItem("editorToken", token.trim());
      window.location.href = "/dashboard/editor/items";
    } catch {
      alert("Konnte Token nicht speichern.");
    }
  };

  return (
    <div className="mx-auto max-w-md p-6 space-y-4">
      <h1 className="text-2xl font-bold">Editor Login</h1>
      <p>
        Bitte deinen <b>EDITOR_TOKEN</b> eingeben (aus der Server-Umgebung).
      </p>
      <input
        className="border rounded px-3 py-2 w-full"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Bearer Token…"
      />
      <button onClick={save} className="border rounded px-3 py-2">
        Speichern
      </button>
    </div>
  );
}
