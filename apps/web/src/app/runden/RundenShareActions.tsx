"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import type { RundenEntryShareActions } from "@features/topicRound/entrySource";

type RundenShareActionsProps = {
  share: RundenEntryShareActions;
};

function toAbsoluteInternalUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  if (typeof window === "undefined") return pathOrUrl;
  try {
    return new URL(pathOrUrl, window.location.origin).toString();
  } catch {
    return pathOrUrl;
  }
}

function contextLabel(contextKind: RundenEntryShareActions["contextKind"]) {
  if (contextKind === "event") return "Event";
  if (contextKind === "runde") return "Runde";
  if (contextKind === "ergebnis") return "Ergebnis";
  if (contextKind === "dossier") return "Dossier";
  if (contextKind === "companion") return "Companion";
  return "Anlass";
}

async function copyToClipboard(value: string) {
  if (typeof navigator === "undefined") throw new Error("clipboard_unavailable");
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}

export default function RundenShareActions({ share }: RundenShareActionsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const canonicalUrl = useMemo(
    () => toAbsoluteInternalUrl(share.canonicalTarget),
    [share.canonicalTarget],
  );
  const qrTargetUrl = useMemo(
    () => toAbsoluteInternalUrl(share.qrTarget),
    [share.qrTarget],
  );
  const shareText = useMemo(
    () => `${share.shareTitle}\n${share.sharePrompt}\n${canonicalUrl}`,
    [canonicalUrl, share.sharePrompt, share.shareTitle],
  );
  const targetLabel = contextLabel(share.contextKind);

  useEffect(() => {
    let cancelled = false;
    if (!showQr) return;
    if (qrDataUrl) return;
    void QRCode.toDataURL(qrTargetUrl, {
      width: 224,
      margin: 1,
      errorCorrectionLevel: "M",
    })
      .then((dataUrl) => {
        if (cancelled) return;
        setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (cancelled) return;
        setMessage("QR-Code konnte nicht erzeugt werden.");
      });
    return () => {
      cancelled = true;
    };
  }, [qrDataUrl, qrTargetUrl, showQr]);

  async function handleCopy(value: string, label: string) {
    try {
      await copyToClipboard(value);
      setMessage(`${label} kopiert.`);
    } catch {
      setMessage(`${label} konnte nicht kopiert werden.`);
    }
  }

  async function handleShare() {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      try {
        await navigator.share({
          title: share.shareTitle,
          text: share.sharePrompt,
          url: canonicalUrl,
        });
        setMessage("Teilen geöffnet.");
        return;
      } catch {
        // ignore and use copy fallback
      }
    }
    await handleCopy(shareText, "Teilnahmehinweis");
  }

  return (
    <section className="mt-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[rgb(var(--muted))]">
        <span className="rounded-full border border-[rgb(var(--border))] px-2 py-0.5 font-semibold text-[rgb(var(--fg))]">
          Teilnahmekontext: {targetLabel}
        </span>
        {share.socialCandidate ? (
          <span className="rounded-full border border-sky-300/70 bg-sky-100 px-2 py-0.5 font-semibold text-sky-800 dark:border-sky-400/45 dark:bg-sky-500/16 dark:text-sky-100">
            Öffentlich in Prüfung
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleCopy(canonicalUrl, "Link")}
          className="rounded-md border border-[rgb(var(--border))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))]"
        >
          Teilnahmelink kopieren
        </button>
        <button
          type="button"
          onClick={() => setShowQr((prev) => !prev)}
          className="rounded-md border border-[rgb(var(--border))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))]"
        >
          {showQr ? "QR-Ansicht schließen" : "Teilnahme per QR öffnen"}
        </button>
        <button
          type="button"
          onClick={() => void handleShare()}
          className="rounded-md border border-[rgb(var(--border))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))]"
        >
          Teilnahme teilen
        </button>
      </div>

      <div className="mt-3 space-y-1 text-[11px] text-[rgb(var(--muted))]">
        <p>Teile diesen Anlassraum mit Nachbarn, Freunden oder deiner Initiative.</p>
        <p>Nutze den QR-Code für Bürgerdialoge, Veranstaltungen oder Workshops.</p>
        <p>Link, Share und QR erscheinen erst nach einer bewussten sichtbaren Freigabe.</p>
        <p>Wird der Anlass pausiert, geschlossen oder archiviert, endet auch dieser öffentliche Teilnahmepfad wieder sichtbar.</p>
      </div>

      {showQr ? (
        <div className="mt-3 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR-Code für den Zielkontext"
                className="h-28 w-28 rounded-md border border-[rgb(var(--border))]"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-md border border-[rgb(var(--border))] text-xs text-[rgb(var(--muted))]">
                QR wird geladen...
              </div>
            )}
            <div className="space-y-1 text-xs text-[rgb(var(--muted))]">
              <p className="font-semibold text-[rgb(var(--fg))]">
                Teilnahmeziel (QR): {targetLabel}
              </p>
              <p className="break-all">{qrTargetUrl}</p>
              {qrDataUrl ? (
                <a
                  href={qrDataUrl}
                  download={`anlass-${share.contextKind}-qr.png`}
                  className="inline-block font-semibold text-[rgb(var(--grad-from))] hover:text-[rgb(var(--grad-to))]"
                >
                  QR speichern
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <p className="mt-2 text-[11px] text-[rgb(var(--muted))]">
        {share.shareSummary}
      </p>
      <p className="mt-1 text-[11px] text-[rgb(var(--muted))]">
        Sichtbar heißt nicht automatisch geprüft oder amtlich.
      </p>
      <p className="mt-1 text-[11px] text-[rgb(var(--muted))]">
        Wird Sichtbarkeit zurückgenommen, pausiert, geschlossen oder archiviert, verschwindet auch dieser öffentliche Link- und QR-Pfad wieder.
      </p>
      <p className="mt-1 text-[11px] text-[rgb(var(--muted))]">
        Amtliche Antworten und Freigaben bleiben verifizierten Rollen vorbehalten.
      </p>
      {message ? (
        <p className="mt-1 text-[11px] text-[rgb(var(--muted))]">{message}</p>
      ) : null}
    </section>
  );
}
