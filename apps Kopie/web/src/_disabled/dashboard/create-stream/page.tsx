// src/app/dashboard/create-stream/page.tsx
"use client";
import { useState } from "react";

export default function CreateStreamPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState("");
  const [question, setQuestion] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Stream erstellt: ${title}`);
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-20 space-y-8">
      <h1 className="text-3xl font-bold text-coral text-center">
        Stream vorbereiten
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-semibold mb-1">Titel</label>
          <input
            type="text"
            className="w-full border px-4 py-2 rounded"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z. B. Europawahl Spezial"
            required
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Kurzbeschreibung</label>
          <textarea
            className="w-full border px-4 py-2 rounded"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Was ist das Ziel des Streams?"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Region / Ebene</label>
          <select
            className="w-full border px-4 py-2 rounded"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="">Bitte wählen</option>
            <option value="lokal">Lokal (Kommune, Stadtteil)</option>
            <option value="landkreis">Landkreis / Wahlkreis</option>
            <option value="land">Bundesland</option>
            <option value="bund">Bundesweit</option>
            <option value="eu">Europa</option>
            <option value="global">International</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold mb-1">
            Frage für das Publikum
          </label>
          <input
            type="text"
            className="w-full border px-4 py-2 rounded"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="z. B. Sollte das Wahlalter auf 16 Jahre gesenkt werden?"
          />
        </div>

        <button
          type="submit"
          className="bg-coral text-white font-semibold py-3 px-6 rounded hover:opacity-90 transition w-full"
        >
          Stream anlegen
        </button>
      </form>
    </main>
  );
}
