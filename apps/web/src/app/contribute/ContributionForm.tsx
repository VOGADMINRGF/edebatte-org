//Finale Version 04.August 2025apps/web/src/app/contribute&ContributionForm.tsx

"use client";

import { useState, useRef } from "react";

export default function ContributionForm() {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fileInput = useRef<HTMLInputElement | null>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    const selected = e.target.files[0];
    setFile(selected);

    // Upload zu /api/contributions/upload
    const formData = new FormData();
    formData.append("file", selected);
    const res = await fetch("/api/contributions/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (data.url) setUploadUrl(data.url);
  }

  async function handleAnalyze() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/contributions/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, url: uploadUrl }),
      });
      const data = await res.json();
      setAnalysis(data);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          media: uploadUrl ? [{ url: uploadUrl, type: file?.type }] : [],
          analysis,
        }),
      });
      if (!res.ok) throw new Error("Fehler beim Absenden");
      // Optional: Weiterleitung, Reset etc.
      setContent("");
      setTitle("");
      setFile(null);
      setUploadUrl(null);
      setAnalysis(null);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl mx-auto mt-10 space-y-4"
    >
      <h2 className="text-2xl font-bold">Neuen Beitrag verfassen</h2>
      <p className="text-sm text-slate-600">
        Wir prüfen Behauptung, sammeln Quellen und zeigen offene Fragen sowie fehlende Perspektiven.
      </p>
      <input
        className="w-full p-2 border rounded"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titel (optional, max. 100 Zeichen)"
        maxLength={100}
      />
      <textarea
        className="w-full p-2 border rounded"
        rows={5}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Dein Beitrag, Frage, Vorschlag oder Anliegen …"
        required
      />
      <div>
        <input
          type="file"
          ref={fileInput}
          accept=".jpg,.jpeg,.png,.pdf,.xlsx,.xls"
          className="mb-2"
          onChange={handleFileUpload}
        />
        {uploadUrl && (
          <div className="text-xs text-green-600">
            Datei erfolgreich hochgeladen!
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="bg-indigo-600 text-white px-4 py-2 rounded"
          onClick={handleAnalyze}
          disabled={!content || loading}
        >
          Analyse starten
        </button>
        <button
          type="submit"
          className="bg-turquoise text-white px-4 py-2 rounded"
          disabled={loading}
        >
          Beitrag absenden
        </button>
      </div>
      {error && <div className="text-red-600">{error}</div>}
      {analysis && (
        <div className="bg-gray-50 p-4 mt-2 rounded border text-sm">
          <b>Themen:</b> {analysis.topics?.map((t: any) => t.name).join(", ")}
          <br />
          <b>Empfohlene Statements:</b>{" "}
          {analysis.suggestedStatements?.map((s: any) => s.text).join(" | ")}
        </div>
      )}
    </form>
  );
}
