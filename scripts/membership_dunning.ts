#!/usr/bin/env tsx
import { coreCol } from "@core/db/triMongo";
import type { MembershipApplication } from "@core/memberships/types";
import { buildMembershipReminderMail } from "@/utils/emailTemplates";
import { sendMail } from "@/utils/mailer";

async function run() {
  if (process.env.VOG_DUNNING_ENABLED === "0") {
    console.log("[dunning] disabled via env");
    return;
  }

  const daysFirst = Number(process.env.VOG_DUNNING_DAYS_FIRST ?? "3");
  const daysSecond = Number(process.env.VOG_DUNNING_DAYS_SECOND ?? "7");
  const daysCancel = Number(process.env.VOG_DUNNING_DAYS_CANCEL ?? "21");
  const now = new Date();

  const Applications = await coreCol<MembershipApplication>("membership_applications");
  const Users = await coreCol("users");

  const pending = await Applications
    .find({ status: "waiting_payment" })
    .toArray();

  for (const app of pending) {
    const firstDueAt = app.firstDueAt ?? app.createdAt ?? now;
    const level = app.dunningLevel ?? 0;
    const daysSinceDue = Math.floor((now.getTime() - firstDueAt.getTime()) / (1000 * 60 * 60 * 24));

    let nextLevel = level;
    let newStatus: MembershipApplication["status"] | null = null;
    let sendLevel: 1 | 2 | 3 | null = null;

    if (level === 0 && daysSinceDue >= daysFirst) {
      nextLevel = 1;
      sendLevel = 1;
    } else if (level === 1 && daysSinceDue >= daysSecond) {
      nextLevel = 2;
      sendLevel = 2;
    } else if (level === 2 && daysSinceDue >= daysCancel) {
      nextLevel = 3;
      sendLevel = 3;
      newStatus = "cancelled";
    }

    if (!sendLevel && !newStatus) continue;

    const user = await Users.findOne(
      { _id: app.coreUserId },
      { projection: { email: 1, name: 1 } },
    );

    const update: any = {
      dunningLevel: nextLevel,
      lastReminderSentAt: now,
      updatedAt: now,
    };
    if (newStatus) {
      update.status = newStatus;
      update.cancelledAt = now;
      update.cancelledReason = "dunning_auto_cancel";
    }

    await Applications.updateOne({ _id: app._id }, { $set: update });

    if (user?.email && sendLevel) {
      try {
        const mail = buildMembershipReminderMail(sendLevel, {
          displayName: user.name ?? "Mitglied",
          amountPerPeriod: app.amountPerPeriod,
          rhythm: app.rhythm,
          householdSize: app.householdSize,
          paymentInfo: app.paymentInfo,
          reference: app.paymentReference ?? "",
        });
        await sendMail({
          to: user.email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        });
      } catch (err) {
        console.error("[dunning] mail failed", err);
      }
    }

    if (newStatus) {
      await Users.updateOne(
        { _id: app.coreUserId },
        {
          $set: {
            "membership.status": "household_locked",
            "membership.cancelledAt": now,
            "membership.cancelledReason": "dunning_auto_cancel",
            updatedAt: now,
          },
        },
      );
    }
  }
  console.log(`[dunning] processed ${pending.length} applications`);
}

run().catch((err) => {
  console.error("[dunning] fatal", err);
  process.exit(1);
});
