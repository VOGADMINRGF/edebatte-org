// features/event/components/ProjectForm.tsx
"use client";

import * as React from "react";
import type { Project, ProjectStatus } from "../types/ProjectType";
import { safeRandomId } from "@core/utils/random";

export default function ProjectForm() {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [region, setRegion] = React.useState("");
  // TODO: später aus Auth / Account ziehen
  const [organizerIds] = React.useState<string[]>(["user-xyz"]);
  const [status, setStatus] = React.useState<ProjectStatus>("planned");

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const nameId = React.useId();
  const descriptionId = React.useId();
  const startId = React.useId();
  const endId = React.useId();
  const regionId = React.useId();
  const statusId = React.useId();

  const resetForm = () => {
    setName("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setRegion("");
    setStatus("planned");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setSaving(false);
      setError("Bitte gib einen Projektnamen an.");
      return;
    }

    const newProject: Project = {
      id: safeRandomId(), // Server kann die ID ignorieren und selbst setzen, wenn gewünscht
      name: trimmedName,
      description: description.trim(),
      startDate,
      endDate: endDate || undefined,
      region: region || undefined,
      organizerIds,
      status,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newProject),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "Projekt konnte nicht gespeichert werden.");
      }

      setSuccess("Projekt wurde gespeichert.");
      resetForm();
    } catch (err: any) {
      setError(err?.message || "Unbekannter Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-2xl space-y-6 px-4 py-8"
      aria-label="Projekt oder Event anlegen"
    >
      <h2 className="text-2xl font-bold text-coral">Projekt/Event erstellen</h2>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      )}

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700" htmlFor={nameId}>
          Projektname
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          id={nameId}
          className="w-full rounded border px-3 py-2 text-sm text-slate-900 outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700" htmlFor={descriptionId}>
          Beschreibung
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          id={descriptionId}
          className="w-full rounded border px-3 py-2 text-sm text-slate-900 outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
          rows={4}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700" htmlFor={startId}>
            Startdatum
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            id={startId}
            className="w-full rounded border px-3 py-2 text-sm text-slate-900 outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700" htmlFor={endId}>
            Enddatum (optional)
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            id={endId}
            className="w-full rounded border px-3 py-2 text-sm text-slate-900 outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700" htmlFor={regionId}>
          Region (optional)
        </label>
        <input
          type="text"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          id={regionId}
          className="w-full rounded border px-3 py-2 text-sm text-slate-900 outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700" htmlFor={statusId}>
          Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ProjectStatus)}
          id={statusId}
          className="w-full rounded border px-3 py-2 text-sm text-slate-900 outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
        >
          <option value="planned">Geplant</option>
          <option value="active">Aktiv</option>
          <option value="completed">Abgeschlossen</option>
          <option value="archived">Archiviert</option>
        </select>
      </div>

      <p className="text-xs text-slate-500">
        Organisator:innen werden später automatisch aus dem Account-Kontext
        übernommen.
      </p>

      <button
        type="submit"
        disabled={saving}
        className="rounded bg-coral px-6 py-3 font-semibold text-white shadow hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-coral/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Speichere…" : "Projekt speichern"}
      </button>
    </form>
  );
}
