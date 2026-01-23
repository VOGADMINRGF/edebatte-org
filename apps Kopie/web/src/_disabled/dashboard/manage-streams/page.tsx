"use client";
import { useEffect, useState, useMemo } from "react";
import { FiEdit, FiPlay, FiSearch } from "react-icons/fi";

export default function ManageStreamsPage() {
  const [streams, setStreams] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/streams")
      .then((res) => res.json())
      .then((data) => setStreams(data))
      .catch(() => setStreams([]));
  }, []);

  const filteredStreams = useMemo(() => {
    if (!Array.isArray(streams)) return [];
    return streams.filter((stream) =>
      stream.title?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [streams, search]);

  return (
    <main className="max-w-5xl mx-auto px-4 py-20 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-coral">
          Deine Streams verwalten
        </h1>

        <div className="relative w-full md:w-72">
          <FiSearch className="absolute top-3 left-3 text-gray-400" />
          <input
            type="text"
            placeholder="Streams oder Themen suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-coral"
          />
        </div>
      </div>

      {filteredStreams.length === 0 ? (
        <p className="text-gray-500 text-center">
          Keine passenden Streams gefunden.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {filteredStreams.map((stream) => (
            <div
              key={stream.id}
              className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
            >
              <h2 className="text-xl font-semibold text-foreground mb-1">
                {stream.title}
              </h2>
              <p className="text-sm text-gray-500 mb-2">
                {new Date(stream.date).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <span
                className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                  stream.status === "Live"
                    ? "bg-red-100 text-red-600"
                    : stream.status === "Geplant"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-600"
                }`}
              >
                {stream.status}
              </span>

              <div className="mt-4 flex justify-between items-center">
                <button
                  disabled={stream.status !== "Geplant"}
                  className={`${
                    stream.status !== "Geplant"
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-green-600 hover:underline"
                  } text-sm font-medium`}
                >
                  <FiPlay className="inline-block mr-1" /> Starten
                </button>

                <button className="text-coral hover:underline text-sm font-medium">
                  <FiEdit className="inline-block mr-1" /> Bearbeiten
                </button>
              </div>

              {/* Vormerken */}
              <div className="mt-3">
                <button
                  className="text-sm text-indigo-600 hover:underline"
                  onClick={() =>
                    alert("Vorgemerkt – Benachrichtigung wird vorbereitet.")
                  }
                >
                  🔔 Vormerken
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
