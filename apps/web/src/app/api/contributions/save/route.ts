export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dbConnect } from "@/lib/db";
import Contribution from "@/models/Contribution";
import { getCol, ObjectId } from "@core/db/triMongo";
import type { AccessTier } from "@features/pricing/types";

type ContributionPayload = {
  title?: string;
  summary?: string;
  content?: string;
  language?: string;
  userContext?: any;
  topics?: any;
  level?: any;
  context?: any;
  suggestions?: any;
  statements?: any;
  alternatives?: any;
  facts?: any;
  media?: any;
  links?: any;
  analysis?: any;
  authorId?: string | null;
};

export async function POST(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json({ error: "POST required" }, { status: 405 });
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get("u_id")?.value;
  if (!userId) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let body: ContributionPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  await dbConnect();

  const {
    title,
    summary,
    content,
    language,
    userContext,
    topics,
    level,
    context,
    suggestions,
    statements,
    alternatives,
    facts,
    media,
    links,
    analysis,
  } = body;

  if (!content) {
    return NextResponse.json({ error: "Kein Inhalt." }, { status: 400 });
  }

  let oid: ObjectId;
  try {
    oid = new ObjectId(userId);
  } catch {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  type UserUsageDoc = {
    _id: ObjectId;
    accessTier?: AccessTier;
    tier?: AccessTier;
    usage?: { contributionCredits?: number };
  };

  const Users = await getCol<UserUsageDoc>("users");
  const userDoc = await Users.findOne({ _id: oid }, { projection: { accessTier: 1, tier: 1, usage: 1 } });
  if (!userDoc) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const tier = (userDoc.accessTier ?? userDoc.tier ?? "citizenBasic") as AccessTier;
  const unlimited =
    tier === "citizenPremium" ||
    tier === "citizenPro" ||
    tier === "citizenUltra" ||
    tier === "staff";

  let creditDebited = false;
  if (!unlimited) {
    const debit = await Users.updateOne(
      { _id: oid, "usage.contributionCredits": { $gte: 1 } },
      { $inc: { "usage.contributionCredits": -1 } },
    );
    if (debit.modifiedCount === 0) {
      return NextResponse.json(
        { error: "NO_CREDIT_AVAILABLE" },
        { status: 403 },
      );
    }
    creditDebited = true;
  }

  const provenance = [
    {
      action: "created",
      by: String(oid),
      date: new Date(),
      details: "Initial contribution",
    },
  ];

  const doc = new Contribution({
    title,
    summary,
    content,
    language,
    userContext,
    topics,
    level,
    context,
    suggestions,
    statements,
    alternatives,
    facts,
    media,
    links,
    analysis,
    provenance,
    authorId: String(oid),
    createdAt: new Date(),
  });

  try {
    await doc.save();
  } catch (err) {
    if (creditDebited) {
      await Users.updateOne({ _id: oid }, { $inc: { "usage.contributionCredits": 1 } });
    }
    throw err;
  }

  const creditsLeft = unlimited
    ? null
    : (userDoc.usage?.contributionCredits ?? 0) - (creditDebited ? 1 : 0);

  return NextResponse.json(
    { ok: true, contribution: doc, creditsLeft },
    { status: 201 },
  );
}
