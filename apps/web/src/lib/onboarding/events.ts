import { coreCol } from "@core/db/triMongo";
import { scheduleMemberRegistrationNotification } from "@/features/operator/operatorNotifications";

export type OnboardingEventName =
  | "register_completed"
  | "founder_friend_request_created"
  | "founder_welcome_message_created"
  | "interests_completed"
  | "location_completed"
  | "personalized_start_ready";

type OnboardingEventDoc = {
  event: OnboardingEventName;
  userId?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt: Date;
};

const COLLECTION = "product_onboarding_events";

export async function logOnboardingEvent(
  event: OnboardingEventName,
  payload?: { userId?: string | null; meta?: Record<string, unknown> },
) {
  try {
    const col = await coreCol<OnboardingEventDoc>(COLLECTION);
    await col.insertOne({
      event,
      userId: payload?.userId ?? null,
      meta: payload?.meta ?? null,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("[onboarding-events] failed to log event", { event, error });
  }

  if (event === "register_completed" && payload?.userId) {
    scheduleMemberRegistrationNotification(payload.userId);
  }
}
