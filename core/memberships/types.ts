import type { ObjectId } from "mongodb";

export type MembershipStatus =
  | "submitted" // Antrag eingereicht
  | "pending" // Antrag eingegangen, wartet auf Prüfung
  | "waiting_payment" // Auftrag liegt vor, Zahlung steht aus
  | "active" // laufende Mitgliedschaft
  | "paused" // temporär pausiert
  | "cancelled" // beendet durch Mitglied oder System
  | "rejected" // formal abgelehnt
  | "household_locked"; // Haushalt gesperrt

export type MembershipRhythm = "monthly" | "once" | "yearly";
export type MembershipPaymentMethod = "bank_transfer";
export type MembershipAccountMode = "private_preUG" | "org_postUG";
export type MembershipMandateStatus =
  | "planned"
  | "none"
  | "pending_microtransfer"
  | "active"
  | "revoked";

export interface MembershipPaymentInfo {
  method: MembershipPaymentMethod;
  reference: string;
  bankRecipient: string;
  bankIbanMasked: string;
  bankBic?: string | null;
  bankName?: string | null;
  accountMode: MembershipAccountMode;
  mandateStatus: MembershipMandateStatus;
  firstPaidAt?: Date | null;
}

export interface HouseholdMemberRef {
  // PII bleibt in der PII-DB; hier nur Referenzen und Minimalfelder
  piiProfileId?: ObjectId | null;
  email?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  birthDate?: string | null;
  role?: "primary" | "adult" | "youth";
  status?: "pending" | "invited" | "active" | "declined";
  inviteTokenId?: ObjectId | null;
}

export interface MembershipApplication {
  _id: ObjectId;
  coreUserId: ObjectId; // Hauptkonto (Gönner:in / Antragsteller:in)
  householdSize: number;
  members: HouseholdMemberRef[];
  peopleCount?: number;
  membershipAmountPerMonth?: number;
  address?: {
    street?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    geo?: {
      lat: number;
      lon: number;
      label?: string;
      region?: any;
    };
  };

  amountPerPeriod: number;
  rhythm: MembershipRhythm;

  paymentProfileId?: ObjectId | null; // Verweis auf PII user_payment_profiles
  paymentMethod?: MembershipPaymentMethod;
  paymentReference?: string | null;
  paymentInfo?: MembershipPaymentInfo;

  edebatte?: {
    enabled: boolean;
    planKey?: "basis" | "start" | "pro" | "edb-basis" | "edb-start" | "edb-pro";
    listPricePerMonth?: number;
    discountPercent?: number;
    finalPricePerMonth?: number;
    billingMode?: "monthly" | "yearly";
  };

  legalAcceptedAt: Date;
  transparencyVersion?: string;
  statuteVersion?: string;
  firstDueAt?: Date | null;
  dunningLevel?: number;
  lastReminderSentAt?: Date | null;
  cancelledAt?: Date | null;
  cancelledReason?: string | null;
  firstPaidAt?: Date | null;

  status: MembershipStatus;
  createdAt: Date;
  updatedAt: Date;
}
