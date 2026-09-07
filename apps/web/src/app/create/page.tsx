import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { getDraft } from "@/server/draftStore";
import { getCreateContributionDraftForResume } from "@/server/createContributionDrafts";
import { ObjectId } from "@core/db/triMongo";
import { readManualAnlassraumServerDraftForCurrentUser } from "@/features/surfaces/runden/manualAnlassraumServerDraft";
import { buildManualAnlassraumPrefill } from "@/features/surfaces/runden/manualAnlassraumSetup";
import CreateClient from "./CreateClient";
import { getCreateEntitlementsForRequest } from "@/lib/server/entitlements/createEntitlements";
import { getAccountOverview } from "@features/account/service";
import { parseCreateMode, type CreateMode } from "@/features/create/intents";
import {
  parseCreateEntryIntent,
  parseCreateEntryMode,
  type CreateEntryIntent,
  type CreateEntryMode,
} from "@/features/create/orchestratorIntentContract";
import {
  buildRundenCreateDraftIntakeContext,
  resolveRundenCreateHandoffIntegrityState,
  type RundenCreateHandoffIntegrityState,
} from "@/features/create/rundenCreateHandoffIntegrity";
import {
  parseCreateIntakeContextFromQuery,
} from "@/features/create/intakeContext";
import { DEFAULT_LOCALE, isSupportedLocale, type SupportedLocale } from "@/config/locales";
import {
  getOperatorCreateTexts,
  resolveOperatorLocale,
} from "@/features/i18n/operatorSystemTexts";
import { LocaleProvider } from "@/context/LocaleContext";
import {
  resolveCurrentRequestScopeContext,
  summarizeRequestScopeContext,
} from "@/lib/server/auth/requestScope";
import { buildCreateDraftResumeLookupOrder } from "@features/account/draftSsotPolicy";
import { buildAgenticCivicE2ECreateHint } from "@/features/agenticRuntime/agenticCivicE2EPilotContract";
import { buildCreateSegmentHint } from "@/features/agenticRuntime/segmentedAgentExperienceContract";
import { buildVoxyExperienceShellHint } from "@/features/voxy/voxyExperienceShellContract";

export const metadata: Metadata = {
  title: "Etwas beitragen - eDebatte",
  description: "Ergänze eine Quelle, Perspektive, Frage oder einen Hinweis direkt im passenden Kontext.",
};

type SearchParamsShape =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>;

function readParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function decodeMaybe(value?: string) {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function mapMode(raw?: string | null): CreateMode | undefined {
  return parseCreateMode(raw);
}

function mapEntryIntent(raw?: string | null): CreateEntryIntent | undefined {
  return parseCreateEntryIntent(raw);
}

function mapEntryMode(raw?: string | null): CreateEntryMode | undefined {
  return parseCreateEntryMode(raw);
}

async function detectPageLocale(): Promise<SupportedLocale> {
  try {
    const cookieStore = await cookies();
    const cookieLang = cookieStore.get("lang")?.value;
    if (isSupportedLocale(cookieLang)) return cookieLang;
  } catch {
    // Falls outside request scope (e.g. isolated unit tests).
  }

  try {
    const headerStore = await headers();
    const acceptLanguage = headerStore.get("accept-language");
    if (acceptLanguage) {
      const primary = acceptLanguage.split(",")[0]?.split(";")[0]?.trim().slice(0, 2).toLowerCase();
      if (isSupportedLocale(primary)) return primary;
    }
  } catch {
    // Falls outside request scope (e.g. isolated unit tests).
  }

  return DEFAULT_LOCALE;
}

async function resolveCreateDraftResumeText(params: {
  draftId: string | null | undefined;
  userId: string;
}) {
  const draftId = String(params.draftId ?? "").trim();
  const lookupOrder = buildCreateDraftResumeLookupOrder({
    draftId,
    isObjectIdLike: ObjectId.isValid(draftId),
    preferManualAnlassraumServerDraft: false,
  });

  for (const source of lookupOrder) {
    if (source === "create_contribution_draft_resume") {
      const draft = await getCreateContributionDraftForResume(draftId, params.userId).catch(
        () => null,
      );
      if (draft?.text) return draft.text;
      continue;
    }
    if (source === "legacy_draft_store") {
      const draft = await getDraft(draftId).catch(() => null);
      if (draft?.text) return draft.text;
    }
  }

  return null;
}

export default async function CreatePage({
  searchParams,
}: {
  searchParams?: SearchParamsShape;
}) {
  const resolved = searchParams ? await searchParams : {};
  const pageLocale = resolveOperatorLocale(await detectPageLocale());
  const createText = getOperatorCreateTexts(pageLocale);

  const entitlements = await getCreateEntitlementsForRequest();
  const overview = entitlements.isAuthenticated && entitlements.userId
    ? await getAccountOverview(entitlements.userId).catch(() => null)
    : null;

  const mode = mapMode(readParam(resolved.mode));
  const rawModeParam = readParam(resolved.mode) ?? null;
  const rawIntentParam = readParam(resolved.intent) ?? null;
  const entryIntent =
    mapEntryIntent(readParam(resolved.entryIntent) ?? readParam(resolved.entry_intent)) ??
    mapEntryIntent(readParam(resolved.intent));
  const entryMode =
    mapEntryMode(readParam(resolved.entryMode) ?? readParam(resolved.entry_mode)) ??
    mapEntryMode(readParam(resolved.mode));
  const dossierId = readParam(resolved.dossierId) ?? null;
  const anlassraumId = readParam(resolved.anlassraumId) ?? null;
  const returnTo = readParam(resolved.returnTo) ?? null;
  const nextAction = readParam(resolved.nextAction) ?? null;
  const resumeGuestWorkspace = readParam(resolved.resume) === "guest";
  const intakeContext = parseCreateIntakeContextFromQuery(resolved);
  const prefillText = decodeMaybe(readParam(resolved.prefill) ?? readParam(resolved.text));
  const draftId = readParam(resolved.draftId);
  const requestScope = overview
    ? summarizeRequestScopeContext(
        await resolveCurrentRequestScopeContext({
          regionId: intakeContext?.region ?? null,
        }),
      )
    : null;

  const manualRoundServerDraft = draftId && overview
    ? await readManualAnlassraumServerDraftForCurrentUser(draftId).catch(() => null)
    : null;
  const initialRundenCreateHandoff: RundenCreateHandoffIntegrityState | null =
    draftId || intakeContext.reason === "manual_anlassraum_continue_create" || intakeContext.source === "runden"
      ? resolveRundenCreateHandoffIntegrityState({
          draftId,
          serverDraft: manualRoundServerDraft,
        })
      : null;
  const resolvedIntakeContext = manualRoundServerDraft
    ? buildRundenCreateDraftIntakeContext({
        context: intakeContext,
        draftId,
        serverDraft: manualRoundServerDraft,
      })
    : intakeContext;

  let initialText = prefillText ?? null;
  if (manualRoundServerDraft) {
    initialText = buildManualAnlassraumPrefill(manualRoundServerDraft.setup);
  } else if (!initialText && draftId && overview) {
    initialText = await resolveCreateDraftResumeText({
      draftId,
      userId: overview.userId,
    });
  }

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <h1 className="sr-only">{createText.srOnlyCreate}</h1>
      <div className="mx-auto w-full max-w-[1560px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-11">
        <div className="sr-only" data-create-guardrails="review-first">
          {buildCreateSegmentHint()} {buildVoxyExperienceShellHint("create")} {buildAgenticCivicE2ECreateHint()}
        </div>
        <LocaleProvider initialLocale={pageLocale}>
          <CreateClient
            initialEntitlements={entitlements}
            overview={overview}
            dossierId={dossierId}
            initialAnlassraumId={anlassraumId}
            initialMode={mode}
            initialIntentParam={rawIntentParam}
            initialModeParam={rawModeParam}
            initialEntryIntent={entryIntent}
            initialEntryMode={entryMode}
            initialText={initialText}
            initialIntakeContext={resolvedIntakeContext}
            initialReturnTo={returnTo}
            initialNextActionParam={nextAction}
            initialRequestScope={requestScope}
            initialRundenCreateHandoff={initialRundenCreateHandoff}
            initialResumeGuestWorkspace={resumeGuestWorkspace}
          />
        </LocaleProvider>
      </div>
    </main>
  );
}
