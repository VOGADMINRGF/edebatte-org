import { z } from "zod";
import {
  Alpha2RoleIdSchema,
  type Alpha2RoleId,
} from "@/features/agenticRuntime/alpha2AgentFleetContract";

export const ALPHA2_LESSON_STATUSES = [
  "candidate",
  "independent_check",
  "accepted",
  "rejected",
  "superseded",
] as const;

export const ALPHA2_LESSON_KINDS = [
  "engineering",
  "product",
  "support",
  "research",
  "evidence",
  "content",
  "membership",
  "growth",
  "funding",
  "operations",
  "governance",
] as const;

export type Alpha2LessonStatus = (typeof ALPHA2_LESSON_STATUSES)[number];
export type Alpha2LessonKind = (typeof ALPHA2_LESSON_KINDS)[number];

const Alpha2LessonStatusSchema = z.enum(ALPHA2_LESSON_STATUSES);
const Alpha2LessonKindSchema = z.enum(ALPHA2_LESSON_KINDS);

export const Alpha2LessonReviewSchema = z
  .object({
    reviewerRole: Alpha2RoleIdSchema,
    reviewerRunId: z.string().min(1),
    decision: z.enum(["accept", "reject"]),
    evidenceRefs: z.array(z.string().min(1)).min(1),
    rationale: z.string().min(1),
    reviewedAt: z.string().datetime(),
  })
  .strict();

export const Alpha2LessonSchema = z
  .object({
    schemaVersion: z.literal("alpha2.lesson.v1"),
    lessonId: z.string().min(1),
    kind: Alpha2LessonKindSchema,
    title: z.string().min(1),
    statement: z.string().min(1),
    scopeKeys: z.array(z.string().min(1)).min(1),
    status: Alpha2LessonStatusSchema,
    proposedByRole: Alpha2RoleIdSchema,
    sourceRunIds: z.array(z.string().min(1)).min(1),
    evidenceRefs: z.array(z.string().min(1)).min(1),
    confidence: z.number().min(0).max(1),
    review: Alpha2LessonReviewSchema.optional(),
    supersedesLessonId: z.string().min(1).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((lesson, ctx) => {
    if (["accepted", "rejected"].includes(lesson.status) && !lesson.review) {
      ctx.addIssue({ code: "custom", message: "alpha2_decided_lesson_requires_review" });
    }
    if (lesson.status === "accepted" && lesson.review?.decision !== "accept") {
      ctx.addIssue({ code: "custom", message: "alpha2_accepted_lesson_requires_accept_review" });
    }
    if (lesson.status === "rejected" && lesson.review?.decision !== "reject") {
      ctx.addIssue({ code: "custom", message: "alpha2_rejected_lesson_requires_reject_review" });
    }
    if (lesson.review && lesson.review.reviewerRole === lesson.proposedByRole) {
      ctx.addIssue({ code: "custom", message: "alpha2_lesson_requires_independent_reviewer_role" });
    }
  });

export type Alpha2LessonReview = z.infer<typeof Alpha2LessonReviewSchema>;
export type Alpha2Lesson = z.infer<typeof Alpha2LessonSchema>;

export function proposeAlpha2Lesson(input: {
  lessonId: string;
  kind: Alpha2LessonKind;
  title: string;
  statement: string;
  scopeKeys: string[];
  proposedByRole: Alpha2RoleId;
  sourceRunIds: string[];
  evidenceRefs: string[];
  confidence: number;
  supersedesLessonId?: string;
  now?: string;
}): Alpha2Lesson {
  const { now: inputNow, ...lessonInput } = input;
  const now = inputNow ?? new Date().toISOString();
  return Alpha2LessonSchema.parse({
    schemaVersion: "alpha2.lesson.v1",
    ...lessonInput,
    status: "candidate",
    createdAt: now,
    updatedAt: now,
  });
}

export function moveAlpha2LessonToIndependentCheck(lesson: Alpha2Lesson, now?: string) {
  const parsed = Alpha2LessonSchema.parse(lesson);
  if (parsed.status !== "candidate") {
    throw new Error(`alpha2_lesson_invalid_check_transition:${parsed.status}`);
  }
  return Alpha2LessonSchema.parse({
    ...parsed,
    status: "independent_check",
    updatedAt: now ?? new Date().toISOString(),
  });
}

export function decideAlpha2Lesson(
  lesson: Alpha2Lesson,
  review: Alpha2LessonReview,
): Alpha2Lesson {
  const parsed = Alpha2LessonSchema.parse(lesson);
  const checkedReview = Alpha2LessonReviewSchema.parse(review);
  if (parsed.status !== "independent_check") {
    throw new Error(`alpha2_lesson_invalid_decision_transition:${parsed.status}`);
  }
  if (checkedReview.reviewerRole === parsed.proposedByRole) {
    throw new Error("alpha2_lesson_requires_independent_reviewer_role");
  }
  return Alpha2LessonSchema.parse({
    ...parsed,
    status: checkedReview.decision === "accept" ? "accepted" : "rejected",
    review: checkedReview,
    updatedAt: checkedReview.reviewedAt,
  });
}

export function isAlpha2LessonOperationallyReusable(lesson: Alpha2Lesson) {
  const parsed = Alpha2LessonSchema.parse(lesson);
  return parsed.status === "accepted" && parsed.review?.decision === "accept";
}

export function selectReusableAlpha2Lessons(input: {
  lessons: readonly Alpha2Lesson[];
  scopeKeys: readonly string[];
  minConfidence?: number;
}) {
  const wanted = new Set(input.scopeKeys);
  const minConfidence = input.minConfidence ?? 0.7;
  return input.lessons
    .map((lesson) => Alpha2LessonSchema.parse(lesson))
    .filter(isAlpha2LessonOperationallyReusable)
    .filter((lesson) => lesson.confidence >= minConfidence)
    .filter((lesson) => lesson.scopeKeys.some((key) => wanted.has(key)))
    .sort((a, b) => b.confidence - a.confidence || b.updatedAt.localeCompare(a.updatedAt));
}
