import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { getMarketingContentOperations } from "@/features/marketing/contentOperations/data";
import { persistMarketingSocialDistribution } from "@/features/marketing/multibrand/socialDistributionPersistence";
import { getSocialDistributionRepo } from "@features/outputEngine/socialDistributionRuntime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The legacy social queue still requires a non-empty organizationId. Global operator
// marketing has no canonical organization membership, so this is a technical queue
// partition only. It is not a public brand owner or a legal organization identity.
const PLATFORM_MARKETING_QUEUE_SCOPE_ID = "platform-marketing-global";

export async function POST(
  req: NextRequest,
  context: {
    params: Promise<{
      contentId: string;
    }>;
  },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const actorUserId = gate?._id?.toHexString?.() ?? "";
  if (!actorUserId) {
    return NextResponse.json({ ok: false, error: "admin_user_id_missing" }, { status: 400 });
  }

  try {
    const params = await context.params;
    const contentId = decodeURIComponent(String(params.contentId ?? "").trim());
    const content = getMarketingContentOperations().find((item) => item.id === contentId);
    if (!content) {
      return NextResponse.json({ ok: false, error: "marketing_content_not_found" }, { status: 404 });
    }

    const organizationId =
      String(gate.requestScope.organizationId ?? "").trim() || PLATFORM_MARKETING_QUEUE_SCOPE_ID;
    const result = await persistMarketingSocialDistribution({
      content,
      organizationId,
      actorUserId,
      repo: getSocialDistributionRepo(),
    });

    if (result.ok === false) {
      return NextResponse.json(
        {
          ok: false,
          error: result.reason,
          blockers: result.blockers,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        contentId,
        post: {
          id: result.post.id,
          status: result.post.status,
          publicBrand: result.post.publicBrand,
          sourceContextType: result.post.sourceContextType,
          sourceContextId: result.post.sourceContextId,
          marketingCampaignId: result.post.marketingCampaignId,
          marketingContentId: result.post.marketingContentId,
          channels: result.post.channels,
          noAutoPublish: result.post.noAutoPublish,
          externalPosting: result.post.externalPosting,
        },
        unsupportedChannels: result.unsupportedChannels,
        queueScope: {
          kind: gate.requestScope.organizationId ? "organization" : "platform_operator",
          organizationId,
          operatorModeLabel: gate.requestScope.operatorModeLabel,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "marketing_distribution_prepare_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
