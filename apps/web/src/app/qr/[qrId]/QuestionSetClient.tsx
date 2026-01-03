"use client";

import { useEffect, useState } from "react";

type Question = {
  id: string;
  title: string;
  description?: string | null;
  options: string[];
  publicAttribution: "public" | "hidden";
};

type SetResponse = {
  ok: boolean;
  set?: { code: string; title?: string | null; questions: Question[] };
  error?: string;
};

export function QuestionSetClient({ code }: { code: string }) {
  const [data, setData] = useState<SetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/qr/sets/${code}`, { cache: "no-store" });
        const body = (await res.json().catch(() => null)) as SetResponse | null;
        if (!ignore) {
          if (!res.ok) setError(body?.error ?? "load_failed");
          setData(body);
        }
      } catch (err: any) {
        if (!ignore) setError(err?.message ?? "load_failed");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [code]);

  async function vote(questionId: string, choice: string) {
    setNotice(null);
    try {
      const res = await fetch(`/api/qr/sets/${code}/vote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId, choice }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body?.error === "login_required") {
          setNotice("Bitte einloggen, um nicht-anonyme Abstimmungen abzugeben.");
          return;
        }
        if (body?.error === "verification_required") {
          setNotice("Bitte verifizieren, um nicht-anonyme Abstimmungen abzugeben.");
          return;
        }
        setNotice("Abstimmung fehlgeschlagen.");
        return;
      }
      setNotice("Stimme gespeichert.");
    } catch {
      setNotice("Netzwerkfehler – bitte erneut versuchen.");
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Fragen werden geladen …</div>;
  }
  if (error || !data?.set) {
    return <div className="p-6 text-sm text-rose-600">Fragen-Set nicht gefunden.</div>;
  }

  const questions = data.set.questions ?? [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">QR Fragen-Set</p>
        <h1 className="text-2xl font-bold text-slate-900">{data.set.title ?? "Abstimmung"}</h1>
        {notice && <p className="text-sm text-slate-700">{notice}</p>}
      </header>

      {questions.length === 0 ? (
        <p className="text-sm text-slate-600">Noch keine Fragen hinterlegt.</p>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <section key={q.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <div>
                <p className="text-base font-semibold text-slate-900">{q.title}</p>
                {q.description && <p className="text-sm text-slate-600">{q.description}</p>}
                {q.publicAttribution === "public" && (
                  <p className="text-xs text-amber-700">
                    Hinweis: Diese Abstimmung ist nicht anonym.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(q.options ?? []).map((opt) => (
                  <button
                    key={opt}
                    className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => vote(q.id, opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
