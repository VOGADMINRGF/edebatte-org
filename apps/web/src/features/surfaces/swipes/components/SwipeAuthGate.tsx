import Link from "next/link";

type SwipeAuthGateProps = {
  open: boolean;
  count: number;
  limit: number;
  /** Compatibility only: the locked gate is intentionally not dismissible. */
  onClose?: () => void;
};

export function SwipeAuthGate({ open, count, limit }: SwipeAuthGateProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85]" role="presentation">
      <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px]" aria-hidden="true" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="swipe-auth-gate-title"
        aria-describedby="swipe-auth-gate-description"
        className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-[0_-24px_60px_rgba(2,6,23,0.45)] md:bottom-8 md:left-1/2 md:w-[560px] md:-translate-x-1/2 md:rounded-3xl"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--muted))]">
          Freie Swipes aufgebraucht
        </p>
        <h3 id="swipe-auth-gate-title" className="mt-2 text-xl font-semibold text-[rgb(var(--fg))]">
          Du hast {Math.max(count, limit)} Themen eingeordnet.
        </h3>
        <p id="swipe-auth-gate-description" className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">
          Für weitere Swipes ist jetzt die Anmeldung der nächste Schritt. Danach kannst du weiter abstimmen,
          Varianten vergleichen und deine Einordnungen deinem Konto zuordnen.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Link href="/login?next=%2Fswipes" className="btn-primary h-11 justify-center text-sm">
            Einloggen &amp; weitermachen
          </Link>
          <Link href="/register?next=%2Fswipes" className="btn-secondary h-11 justify-center text-sm">
            Kostenlos Konto anlegen
          </Link>
        </div>

        <p className="mt-4 text-xs leading-5 text-[rgb(var(--muted))]">
          Die erreichte Swipe-Grenze bleibt auf diesem Gerät erhalten. Ein Schließen ohne Anmeldung würde die
          Abstimmung deshalb nicht fortsetzen.
        </p>
      </section>
    </div>
  );
}
