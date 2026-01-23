"use client";

import { useState } from "react";
import Link from "next/link";

export default function StreamDashboard() {
  const [title, setTitle] = useState("");
  const [region, setRegion] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [trailerUrl, setTrailerUrl] = useState("");
  const [questions, setQuestions] = useState([""]);

  const handleAddQuestion = () => {
    setQuestions([...questions, ""]);
  };

  const handleQuestionChange = (index: number, value: string) => {
    const updated = [...questions];
    updated[index] = value;
    setQuestions(updated);
  };

  const handleSubmit = () => {
    const streamData = {
      title,
      region,
      date,
      description,
      trailerUrl,
      questions: questions.filter((q) => q.trim() !== ""),
    };
    console.log("Stream angelegt:", streamData);
    // Hier würde später ein API-Call erfolgen
  };

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-coral text-center">
        Stream vorbereiten
      </h1>

      <div className="space-y-4">
        <input
          type="text"
          placeholder="Titel des Streams"
          className="w-full border px-4 py-2 rounded"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="text"
          placeholder="Region (z. B. Berlin, NRW, EU)"
          className="w-full border px-4 py-2 rounded"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        />
        <input
          type="datetime-local"
          className="w-full border px-4 py-2 rounded"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <textarea
          placeholder="Kurzbeschreibung"
          className="w-full border px-4 py-2 rounded"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          type="url"
          placeholder="Trailer-URL (optional)"
          className="w-full border px-4 py-2 rounded"
          value={trailerUrl}
          onChange={(e) => setTrailerUrl(e.target.value)}
        />

        <div>
          <h2 className="font-semibold mb-2">Fragen vorbereiten</h2>
          {questions.map((q, i) => (
            <input
              key={i}
              type="text"
              placeholder={`Frage ${i + 1}`}
              className="w-full border px-4 py-2 rounded mb-2"
              value={q}
              onChange={(e) => handleQuestionChange(i, e.target.value)}
            />
          ))}
          <button
            onClick={handleAddQuestion}
            className="mt-2 text-coral hover:underline"
          >
            + Weitere Frage
          </button>
        </div>

        <button
          onClick={handleSubmit}
          className="bg-coral text-white px-6 py-2 rounded hover:opacity-90"
        >
          Stream speichern
        </button>
      </div>
    </main>
  );
}
