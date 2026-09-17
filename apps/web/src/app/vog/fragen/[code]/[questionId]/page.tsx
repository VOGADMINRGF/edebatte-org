export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  buildVogPublicBallotHref,
  getVogPublicBallotLocaleDirection,
  normalizeVogOriginMetadata,
  normalizeVogPublicBallotUiLocale,
  type VogPublicBallotUiLocale,
} from "@features/vog/publicBallotContract";
import { getVogPublicBallotReadModel } from "@/features/vog/publicBallotReadModel";
import {
  hashVogGuestToken,
  isValidVogGuestToken,
  VOG_GUEST_PARTICIPATION_COOKIE,
} from "@/features/vog/publicBallotSecurity";
import { VogPublicBallotClient } from "./VogPublicBallotClient";

type PageProps = {
  params: Promise<{ code: string; questionId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Öffentliche VOG-Frage · eDebatte",
  description:
    "Öffentliche, nicht verifizierte Beteiligung an einer freigegebenen VoiceOpenGov-Frage.",
  robots: { index: false, follow: false },
};

function readSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const MISSING_COPY: Record<
  VogPublicBallotUiLocale,
  { heading: string; body: string }
> = {
  de: {
    heading: "Öffentliche Frage nicht verfügbar",
    body: "Diese Frage fehlt, ist nicht ausdrücklich öffentlich freigegeben oder ihr Freigabevertrag ist ungültig. Herkunftsparameter können keine Freigabe erzeugen.",
  },
  en: {
    heading: "Public question unavailable",
    body: "This question is missing, has not been explicitly released to the public, or has an invalid release contract. Origin parameters cannot grant access.",
  },
  fr: {
    heading: "Question publique indisponible",
    body: "Cette question est absente, n’a pas été explicitement publiée ou son contrat de publication est invalide. Les paramètres d’origine ne peuvent accorder aucun accès.",
  },
  es: {
    heading: "Pregunta pública no disponible",
    body: "Esta pregunta no existe, no se ha publicado expresamente o su contrato de publicación no es válido. Los parámetros de origen no pueden conceder acceso.",
  },
  tr: {
    heading: "Herkese açık soru kullanılamıyor",
    body: "Bu soru mevcut değil, açıkça yayımlanmamış veya yayın sözleşmesi geçersiz. Kaynak parametreleri erişim yetkisi veremez.",
  },
  ar: {
    heading: "السؤال العام غير متاح",
    body: "هذا السؤال غير موجود أو لم يُنشر للعامة صراحةً أو أن عقد نشره غير صالح. لا يمكن لمعاملات المصدر منح صلاحية الوصول.",
  },
};

function MissingBallot({ uiLocale }: { uiLocale: VogPublicBallotUiLocale }) {
  const copy = MISSING_COPY[uiLocale];
  return (
    <main
      className="mx-auto flex min-h-[100svh] max-w-2xl flex-col gap-4 px-4 py-10"
      data-testid="vog-public-ballot-missing"
      lang={uiLocale}
      dir={getVogPublicBallotLocaleDirection(uiLocale)}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
        VoiceOpenGov · eDebatte
      </p>
      <h1 className="text-2xl font-bold text-[rgb(var(--fg))]">
        {copy.heading}
      </h1>
      <p className="text-sm text-[rgb(var(--muted))]">
        {copy.body}
      </p>
    </main>
  );
}

export default async function VogPublicBallotPage({
  params,
  searchParams,
}: PageProps) {
  const [{ code, questionId }, cookieStore] = await Promise.all([
    params,
    cookies(),
  ]);
  const rawSearchParams: Record<string, string | string[] | undefined> =
    searchParams ? await searchParams : {};
  const legacyLocale = rawSearchParams.locale;
  const readingLocale = rawSearchParams.reading_locale ?? legacyLocale;
  const uiLocale = rawSearchParams.ui_locale ?? readingLocale;
  const outputLocale = rawSearchParams.output_locale ?? readingLocale;
  const missingUiLocale = normalizeVogPublicBallotUiLocale(uiLocale);
  const guestToken = cookieStore.get(VOG_GUEST_PARTICIPATION_COOKIE)?.value;
  const guestTokenHash = isValidVogGuestToken(guestToken)
    ? hashVogGuestToken(guestToken)
    : null;
  const ballot = await getVogPublicBallotReadModel({
    code,
    questionId,
    locale: legacyLocale,
    readingLocale,
    uiLocale,
    outputLocale,
    guestTokenHash,
  }).catch(() => null);

  if (!ballot) return <MissingBallot uiLocale={missingUiLocale} />;

  const originMetadata = normalizeVogOriginMetadata(
    {
      source: readSingle(rawSearchParams.source),
      origin: readSingle(rawSearchParams.origin),
      origin_id: readSingle(rawSearchParams.origin_id),
    },
    ballot.originId,
    ballot,
  );
  const commonLink = {
    code: ballot.code,
    questionId: ballot.questionId,
    source: originMetadata.source,
    origin: originMetadata.origin,
    originId: ballot.originId,
  } as const;

  return (
    <VogPublicBallotClient
      initialBallot={ballot}
      originMetadata={originMetadata}
      localeLinks={ballot.availableLocales.map((locale) => ({
        locale,
        href: buildVogPublicBallotHref({
          ...commonLink,
          readingLocale: locale,
          uiLocale: locale,
          outputLocale: locale,
        }),
      }))}
    />
  );
}
