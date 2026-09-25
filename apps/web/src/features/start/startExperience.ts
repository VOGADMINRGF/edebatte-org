import { buildOrganizationDashboardReadModel } from "@features/region";
import type { TaskFirstQuickActionCenterModel, StartQuickActionContext } from "@/features/quickActions/taskFirstQuickActions";
import { buildPublicTaskFirstQuickActionCenter } from "@/features/quickActions/taskFirstQuickActions";
import {
  isOrganizationAccessBlocked,
  isOrganizationAccessLimited,
  isOrganizationVerificationPending,
} from "@/features/access/productionEntryContract";

export type StartExperienceModel = {
  familiarity: StartQuickActionContext;
  eyebrow: string;
  title: string;
  description: string;
  helperText: string;
  trustText: string;
  showExtendedOrientation: boolean;
  workspaceHref: string | null;
  workspaceLabel: string | null;
  quickActionCenter: TaskFirstQuickActionCenterModel;
};

type StartExperienceUser = {
  _id?: { toHexString?: () => string } | null;
  roles?: string[] | null;
  sessionValid?: boolean | null;
};

function buildAnonymousExperience(): StartExperienceModel {
  const quickActionCenter = buildPublicTaskFirstQuickActionCenter({
    context: "unknown_visitor",
  });
  return {
    familiarity: "unknown_visitor",
    eyebrow: "Mitmachen oder etwas starten",
    title: "Was möchtest du tun?",
    description:
      "Kommst du über einen Link oder QR-Code, landest du direkt bei der passenden Frage. Ohne konkreten Kontext kannst du mitmachen oder selbst eine Frage für andere starten.",
    helperText: "Abstimmen, etwas ergänzen, eine Quelle beitragen oder eine eigene Frage öffnen.",
    trustText:
      "Nichts wird automatisch veröffentlicht. Du entscheidest selbst, ob du nur abstimmen, tiefer einsteigen oder etwas beitragen möchtest.",
    showExtendedOrientation: false,
    workspaceHref: null,
    workspaceLabel: null,
    quickActionCenter,
  };
}

export async function buildStartExperienceModel(input: {
  user: StartExperienceUser | null;
  isAdmin: boolean;
}): Promise<StartExperienceModel> {
  const userId = input.user?._id?.toHexString?.() ?? null;
  const roles = input.user?.roles ?? [];

  if (!input.user || !input.user.sessionValid || !userId) {
    return buildAnonymousExperience();
  }

  if (input.isAdmin) {
    const quickActionCenter = buildPublicTaskFirstQuickActionCenter({
      context: "operator",
      workspaceHref: "/account/organization/dashboard",
    });
    return {
      familiarity: "operator",
      eyebrow: "Betreiberübersicht",
      title: "Beteiligung steuern und Wirkung sichtbar machen.",
      description:
        "Prüfe neue Beiträge, Quellen und Freigaben. Öffentliche Schritte bleiben bewusst von interner Bearbeitung getrennt.",
      helperText:
        "Öffne die Betreiberübersicht, priorisiere neue Entwicklungen und führe freigegebene Themen nachvollziehbar weiter.",
      trustText:
        "Nichts wird automatisch veröffentlicht. Prüf- und Verwaltungsrechte bleiben nachvollziehbar.",
      showExtendedOrientation: false,
      workspaceHref: "/account/organization/dashboard",
      workspaceLabel: "Betreiberübersicht öffnen",
      quickActionCenter,
    };
  }

  const readModel = await buildOrganizationDashboardReadModel({
    userId,
    roles,
    isAdmin: false,
  });

  const verificationStatus = readModel.verificationStatus;
  const hasOrganizationSignal =
    Boolean(readModel.organization.primaryOrganizationId) ||
    readModel.pendingOrganizationClaims.length > 0 ||
    readModel.membershipStatus.totalMemberships > 0;
  const blocked = isOrganizationAccessBlocked({
    provisioningStatus: readModel.provisioningSummary.currentStatus,
    contractStatus: readModel.contractSummary.currentContractStatus,
    billingStatus: readModel.contractSummary.billingStatus,
    entitlementStatus: readModel.entitlementSummary.currentStatus,
  });
  const pending =
    isOrganizationVerificationPending({
      verificationStatus,
      hasOrganizationSignal,
    }) ||
    readModel.provisioningSummary.currentStatus === "draft" ||
    readModel.provisioningSummary.currentStatus === "submitted" ||
    readModel.provisioningSummary.currentStatus === "verification_required" ||
    readModel.provisioningSummary.currentStatus === "operator_review_required" ||
    isOrganizationAccessLimited({
      provisioningStatus: readModel.provisioningSummary.currentStatus,
      contractStatus: readModel.contractSummary.currentContractStatus,
      billingStatus: readModel.contractSummary.billingStatus,
      entitlementStatus: readModel.entitlementSummary.currentStatus,
    });

  const familiarity: StartQuickActionContext = blocked
    ? "organization_blocked"
    : hasOrganizationSignal
      ? pending
        ? "organization_pending"
        : "organization_verified"
      : "signed_in";
  const workspaceHref = familiarity === "organization_verified" ? "/account/organization/dashboard" : "/account/organization";
  const quickActionCenter = buildPublicTaskFirstQuickActionCenter({
    context: familiarity,
    workspaceHref,
  });

  if (familiarity === "organization_verified") {
    return {
      familiarity,
      eyebrow: "Organisation",
      title: "Themen, Beteiligung und Ergebnisse im Blick.",
      description:
        "Führe laufende Fragen weiter, ordne neue Beiträge und Quellen ein und öffne Beteiligung dort, wo sie gebraucht wird.",
      helperText:
        "Öffne deinen Arbeitsbereich oder wechsle direkt zu einer laufenden Beteiligung.",
      trustText:
        "Nichts wird automatisch veröffentlicht. Sichtbarkeit bleibt eine bewusste Entscheidung.",
      showExtendedOrientation: false,
      workspaceHref,
      workspaceLabel: "Organisationsbereich öffnen",
      quickActionCenter,
    };
  }

  if (familiarity === "organization_blocked") {
    return {
      familiarity,
      eyebrow: "Organisation",
      title: "Dein Organisationszugang ist gerade eingeschränkt.",
      description:
        "Persönlich kannst du weiter mitmachen, Fragen ansehen und eigene Beiträge vorbereiten. Für Organisationsfunktionen prüfst du zuerst den aktuellen Status.",
      helperText:
        "Status prüfen oder unabhängig davon öffentlich mitmachen.",
      trustText:
        "Eingeschränkte Organisationsrechte werden nicht als aktiv dargestellt.",
      showExtendedOrientation: false,
      workspaceHref,
      workspaceLabel: "Status prüfen",
      quickActionCenter,
    };
  }

  if (familiarity === "organization_pending") {
    return {
      familiarity,
      eyebrow: "Organisation",
      title: "Dein Organisationszugang wird noch geprüft.",
      description:
        "Währenddessen kannst du bereits Fragen, Quellen und Beiträge vorbereiten und als Person weiter mitmachen.",
      helperText:
        "Status ansehen oder direkt mit öffentlichen Themen weitermachen.",
      trustText:
        "Organisationsrechte werden erst genutzt, wenn sie tatsächlich freigegeben sind.",
      showExtendedOrientation: false,
      workspaceHref,
      workspaceLabel: "Antrag und Status",
      quickActionCenter,
    };
  }

  return {
    familiarity,
    eyebrow: "Willkommen zurück",
    title: "Wo möchtest du weitermachen?",
    description:
      "Entdecke neue Fragen, gib deine Meinung ab, ergänze etwas, das noch fehlt, oder starte selbst ein Thema für andere.",
    helperText:
      "Mitmachen, etwas ergänzen oder eine eigene Frage starten.",
    trustText:
      "Du entscheidest selbst, welchen nächsten Schritt du gehst. Nichts wird automatisch veröffentlicht.",
    showExtendedOrientation: false,
    workspaceHref,
    workspaceLabel: "Konto und Organisation",
    quickActionCenter,
  };
}
