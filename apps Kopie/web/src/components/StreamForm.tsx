// features/stream/components/StreamForm.tsx
"use client";
import { useState } from "react";

export default function StreamForm({ stream = {}, onSave, onCancel }: any) {
  const [title, setTitle] = useState(stream.title || "");
  const [topic, setTopic] = useState(stream.topic || "");
  const [status, setStatus] = useState(stream.status || "Geplant");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // API-Call: Neu anlegen (POST) oder Update (PUT)
    fetch("/api/streams", {
      method: stream._id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...stream, title, topic, status }),
    }).then(() => onSave());
  }

  return (
    <form
      className="bg-white p-6 rounded-xl shadow-xl mb-6"
      onSubmit={handleSubmit}
    >
      <h2 className="font-semibold text-lg mb-4">
        {stream._id ? "Stream bearbeiten" : "Stream anlegen"}
      </h2>
      <div className="mb-3">
        <label className="block text-sm mb-1">Titel</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full border rounded p-2"
        />
      </div>
      <div className="mb-3">
        <label className="block text-sm mb-1">Thema</label>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          required
          className="w-full border rounded p-2"
        />
      </div>
      <div className="mb-3">
        <label className="block text-sm mb-1">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full border rounded p-2"
        >
          <option>Geplant</option>
          <option>Live</option>
          <option>Replay</option>
          <option>Vergangen</option>
        </select>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-2 rounded"
        >
          Speichern
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-200 px-4 py-2 rounded"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
