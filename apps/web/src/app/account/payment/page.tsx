import { redirect } from "next/navigation";
import { ObjectId, getCol } from "@core/db/triMongo";
import { readSession } from "@/utils/session";
import { getAccountOverview } from "@features/account/service";
import { getMembershipActivationTruth, PRICING_TRUST_LOOP_DE } from "@features/pricing";
import { PaymentProfileForm } from "./PaymentProfileForm";
import { MicroTransferVerificationForm } from "./MicroTransferVerificationForm";
import { StripeBillingPortalButton } from "./StripeBillingPortalButton";

export const metadata = {
  title: "Zahlungsprofil · eDebatte",
};

const ACTIVATION_TRUTH = getMembershipActivationTruth("de");

export default async function PaymentPage() {
  const session = await readSession();
  const userId = session?.uid ?? null;

  if (!userId || !ObjectId.isValid(userId)) {
    redirect(`/login?next=${encodeURIComponent("/account/payment")}`);
  }

  const overview = await getAccountOverview(userId);
  if (!overview) {
    redirect(`/login?next=${encodeURIComponent("/account/payment")}`);
  }

  const Users = await getCol<any>("users");
  const billingDoc = await Users.findOne(
    { _id: new ObjectId(userId) },
    { projection: { billing: 1 } },
  );

  const paymentProfile = (overview as any).paymentProfile ?? null;
  const payment = (overview as any).payment ?? {};
  const billing = billingDoc?.billing ?? {};
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
  const hasStripeBilling = typeof billing?.stripeCustomerId === "string" && billing.stripeCustomerId.startsWith("cus_");

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))] py-10">
      <div className="mx-auto max-w-3xl space-y-6 px-4">
        <header className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-600">Zahlungsprofil</p>
          <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">Standardkonto &amp; Zahlungsart</h1>
          <p className="text-sm text-[rgb(var(--muted))]">
            Hinterlegte Bankverbindung für manuelle Beiträge und Abrechnungen. Kostenpflichtige eDebatte-Self-Service-Pakete werden getrennt über Stripe verwaltet.
          </p>
          <p className="text-xs text-[rgb(var(--muted))]">{ACTIVATION_TRUTH.paymentProfileHint}</p>
          <p className="text-xs text-[rgb(var(--muted))]">{PRICING_TRUST_LOOP_DE.context.registryVerificationHint}</p>
        </header>

        <section className="space-y-4 rounded-3xl bg-[rgb(var(--card))] p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] ring-1 ring-[rgb(var(--border))]">
          <div className="space-y-1 rounded-2xl bg-[rgb(var(--bg))] px-3 py-2">
            <p className="text-[11px] font-medium text-[rgb(var(--muted))]">Standardkonto</p>
            <p className="text-sm text-[rgb(var(--fg))]">
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
              <p className="text-[11px] text-[rgb(var(--muted))]">
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

          <div className="space-y-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-800">eDebatte Self-Service über Stripe</p>
            <p className="text-sm text-sky-950">
              Plus- und Pro-Abos können über Stripe gekündigt, geändert und mit einer neuen Zahlungsart versehen werden.
            </p>
            {hasStripeBilling ? (
              <StripeBillingPortalButton />
            ) : (
              <p className="text-xs text-sky-800">Noch kein aktives Stripe-Zahlungsprofil für dieses Konto.</p>
            )}
          </div>

          <div className="space-y-1 rounded-2xl bg-[rgb(var(--bg))] px-3 py-2">
            <p className="text-[11px] font-medium text-[rgb(var(--muted))]">Bevorzugte Zahlungsart</p>
            <p className="text-sm text-[rgb(var(--fg))]">Bankdaten gelten für manuelle Beitrags- und Abrechnungswege; eDebatte Plus/Pro nutzt Stripe Checkout.</p>
            <p className="mt-1 text-xs text-[rgb(var(--muted))]">{PRICING_TRUST_LOOP_DE.context.orderActivationHint}</p>
            <p className="mt-1 text-xs text-[rgb(var(--muted))]">{ACTIVATION_TRUTH.membershipScopeHint}</p>
          </div>

          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-4 py-3 text-[11px] text-[rgb(var(--muted))]">
            Wenn etwas unklar ist, schreib uns kurz an{" "}
            <a href="mailto:members@edebatte.org" className="font-semibold underline">
              members@edebatte.org
            </a>
            . Wir helfen dir gern weiter.
          </div>
        </section>
      </div>
    </main>
  );
}
