// features/swipe/service.ts
import { ObjectId, getCol } from "@core/db/triMongo";
import { applySwipeForCredits } from "@features/user/credits";
import { getEngagementLevel } from "@features/user/engagement";
import type { EngagementLevel } from "@features/user/engagement";

export type SwipeDirection = "pro" | "neutral" | "contra";

type SwipeDoc = {
  _id?: ObjectId;
  statementId: string;
  userId: ObjectId;
  direction: SwipeDirection;
  createdAt: Date;
};

type UserUsageDoc = {
  _id: ObjectId;
  usage?: {
    swipeCountTotal?: number;
    swipesThisMonth?: number;
    xp?: number;
    contributionCredits?: number;
  };
};

export type SwipeUsageSnapshot = {
  xp: number;
  swipeCountTotal: number;
  contributionCredits: number;
  engagementLevel: EngagementLevel;
  nextCreditIn: number;
};

export type RegisterSwipeErrorCode =
  | "INVALID_DIRECTION"
  | "STATEMENT_REQUIRED"
  | "USER_NOT_FOUND"
  | "GUEST_LIMIT_REACHED"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "UNKNOWN";

export type RegisterSwipeResult =
  | { ok: true; stats?: SwipeUsageSnapshot; guest?: { nextCount: number; limit: number } }
  | {
      ok: false;
      error: RegisterSwipeErrorCode;
      limit?: number;
      nextAllowedAt?: string;
      count?: number;
    };

type RegisterSwipeInput = {
  statementId: string;
  direction: SwipeDirection;
  guestSwipesUsed?: number;
  guestLimit?: number;
};

const DIRECTIONS: SwipeDirection[] = ["pro", "neutral", "contra"];

export async function registerSwipeForUser(
  userId: string | null,
  input: RegisterSwipeInput,
): Promise<RegisterSwipeResult> {
  const direction = input.direction;
  if (!DIRECTIONS.includes(direction)) {
    return { ok: false, error: "INVALID_DIRECTION" };
  }
  if (!input.statementId?.trim()) {
    return { ok: false, error: "STATEMENT_REQUIRED" };
  }

  if (!userId) {
    const used = input.guestSwipesUsed ?? 0;
    const limit = input.guestLimit ?? 3;
    if (used >= limit) {
      return {
        ok: false,
        error: "GUEST_LIMIT_REACHED",
        limit,
        count: used,
        nextAllowedAt: undefined,
      };
    }
    return { ok: true, guest: { nextCount: used + 1, limit } };
  }

  let oid: ObjectId;
  try {
    oid = new ObjectId(userId);
  } catch {
    return { ok: false, error: "USER_NOT_FOUND" };
  }

  const Users = await getCol<UserUsageDoc>("users");
  const userDoc = await Users.findOne({ _id: oid }, { projection: { usage: 1 } });
  if (!userDoc) {
    return { ok: false, error: "USER_NOT_FOUND" };
  }

  const now = new Date();
  const Swipes = await getCol<SwipeDoc>("statement_swipes");
  await Swipes.insertOne({
    statementId: input.statementId,
    userId: oid,
    direction,
    createdAt: now,
  });

  const prevUsage = userDoc.usage ?? {};
  const creditResult = applySwipeForCredits({
    swipeCountTotal: prevUsage.swipeCountTotal,
    xp: prevUsage.xp,
    contributionCredits: prevUsage.contributionCredits,
  });

  const incOps: Record<string, number> = {
    "usage.swipeCountTotal": 1,
    "usage.swipesThisMonth": 1,
    "usage.xp": creditResult.xp - (prevUsage.xp ?? 0),
  };
  if (creditResult.earnedCredits > 0) {
    incOps["usage.contributionCredits"] = creditResult.earnedCredits;
  }

  await Users.updateOne(
    { _id: oid },
    {
      $inc: incOps,
      $set: { "usage.lastSwipeAt": now },
    },
  );

  return {
    ok: true,
    stats: {
      xp: creditResult.xp,
      swipeCountTotal: creditResult.swipeCountTotal,
      contributionCredits: creditResult.contributionCredits,
      engagementLevel: getEngagementLevel(creditResult.xp),
      nextCreditIn: creditResult.nextCreditIn,
    },
  };
}
