import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession } from "@/utils/session";
import { getAccountOverview } from "@features/account/service";
import { PaymentProfileForm } from "./PaymentProfileForm";
import { MicroTransferVerificationForm } from "./MicroTransferVerificationForm";

export const metadata = {
  title: "Zahlungsprofil · VoiceOpenGov",
};

export default async function PaymentPage() {
  const cookieStore = await cookies();
  const session = await readSession();
  const userId = cookieStore.get("u_id")?.value || session?.uid;

  if (!userId) {
    redirect(`/login?next=${encodeURIComponent("/account/payment")}`);
  }

  const overview = await getAccountOverview(userId);
  if (!overview) {
    redirect(`/login?next=${encodeURIComponent("/account/payment")}`);
  }

  const paymentProfile = (overview as any).paymentProfile ?? null;
  const payment = (overview as any).payment ?? {};
  const membership = (overview as any).membership ?? (overview as any).membershipSnapshot ?? {};
  const membershipPayment = membership?.paymentInfo ?? {};
  const membershipStatus = membership?.status ?? null;
  const mandateStatus = membership?.paymentInfo?.mandateStatus ?? null;
  const iban = paymentProfile?.ibanMasked ?? payment.ibanMasked ?? membershipPayment.bankIbanMasked ?? null;
  const bic = paymentProfile?.bic ?? payment.bic ?? membershipPayment.bankBic ?? null;
  const holder = paymentProfile?.holderName ?? payment.accountHolder ?? membershipPayment.bankRecipient ?? null;
  const contribution = membership?.contributionLabel ?? membership?.statusLabel ?? null;
  const note = payment.note ?? membershipPayment.reference ?? null;
  const paymentReference = membership?.paymentReference ?? null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white py-10">
      <div className="mx-auto max-w-3xl space-y-6 px-4">
        <header className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-600">Zahlungsprofil</p>
          <h1 className="text-2xl font-semibold text-slate-900">Standardkonto &amp; Zahlungsart</h1>
          <p className="text-sm text-slate-600">
            Hinterlegte Bankverbindung für Beiträge und Abrechnungen. Du kannst dein Standardkonto hier aktualisieren; bei Fragen helfen wir dir im Support.
          </p>
        </header>

        <section className="space-y-4 rounded-3xl bg-white/95 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
          <div className="space-y-1 rounded-2xl bg-slate-50/80 px-3 py-2">
            <p className="text-[11px] font-medium text-slate-700">Standardkonto</p>
            <p className="text-sm text-slate-800">
              {iban ? (
                <>
                  {holder ? `${holder} · ` : ""}
                  {iban}
                  {bic ? ` · ${bic}` : ""}
                </>
              ) : (
                "Noch kein Konto hinterlegt."
              )}
            </p>
            {(contribution || note) && (
              <p className="text-[11px] text-slate-500">
                {contribution ? `Aktuelle Rate: ${contribution}` : null}
                {note ? ` · ${note}` : null}
              </p>
            )}
          </div>

          <PaymentProfileForm initial={{ ibanMasked: iban, holderName: holder, bic }} />

          <MicroTransferVerificationForm
            membershipStatus={membershipStatus}
            mandateStatus={mandateStatus}
            paymentReference={paymentReference}
          />

          <div className="space-y-1 rounded-2xl bg-slate-50/80 px-3 py-2">
            <p className="text-[11px] font-medium text-slate-700">Bevorzugte Zahlungsart</p>
            <p className="text-sm text-slate-800">Aktuell Bankeinzug / Überweisung. Weitere Optionen (z.B. Karte) folgen.</p>
          </div>

          <div className="rounded-2xl bg-slate-900/90 px-4 py-3 text-[11px] text-slate-100">
            Wenn etwas unklar ist, schreib uns kurz an{" "}
            <a href="mailto:members@voiceopengov.org" className="font-semibold underline">
              members@voiceopengov.org
            </a>
            . Wir helfen dir gern weiter.
          </div>
        </section>
      </div>
    </main>
  );
}
