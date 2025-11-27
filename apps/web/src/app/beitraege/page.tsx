"use client";
import { useEffect, useState } from "react";
import { HumanCheck } from "@/components/security/HumanCheck";

type Item = {
  id: string;
  title: string;
  text: string;
  category?: string;
  createdAt?: string;
  author?: string;
};

export default function BeitraegePage() {
  const [list, setList] = useState<Item[]>([]);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [humanToken, setHumanToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    setList(await fetch("/api/statements").then((r) => r.json()));
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    setErr("");
    if (!humanToken) {
      setErr("Bitte kurz die Mensch-Bestätigung ausfüllen.");
      return;
    }
    setIsSubmitting(true);
    const r = await fetch("/api/statements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, text, humanToken }),
    });
    try {
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        if (r.status === 403 || data?.error === "invalid_token") {
          setHumanToken(null);
          setErr("Bestätigung abgelaufen. Bitte kurz erneut bestätigen.");
          return;
        }
        if (r.status === 429 || data?.error === "ratelimit") {
          setErr("Zu viele Versuche. Bitte in ein paar Minuten erneut probieren.");
          return;
        }
        setErr(data?.error || "Fehlgeschlagen");
        return;
      }
      setErr("");
      setTitle("");
      setText("");
      setHumanToken(null);
      await load();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Beiträge</h1>

      <div className="space-y-2">
        <input
          className="border w-full p-2"
          placeholder="Titel"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="border w-full p-2"
          rows={4}
          placeholder="Was möchtest du vorschlagen?"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="pt-2">
          <HumanCheck
            formId="public-contribution"
            onSolved={({ token }) => {
              setHumanToken(token);
              setErr("");
            }}
            onError={() => setHumanToken(null)}
          />
        </div>
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <button
          className="bg-black text-white px-3 py-2 rounded"
          onClick={create}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Sende..." : "Beitrag erstellen"}
        </button>
      </div>

      <ul className="divide-y">
        {list.map((it) => (
          <li key={it.id} className="py-3">
            <div className="font-medium">{it.title}</div>
            <div className="text-sm text-gray-600">{it.text}</div>
            <div className="text-xs text-gray-400">
              {new Date(it.createdAt ?? Date.now()).toLocaleString()} ·{" "}
              {it.author ?? "?"}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
