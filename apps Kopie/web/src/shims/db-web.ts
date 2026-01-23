export enum PublishStatus { DRAFT="DRAFT", PUBLISHED="PUBLISHED", ARCHIVED="ARCHIVED" }
export enum ContentKind { STATEMENT="STATEMENT", ITEM="ITEM", REPORT="REPORT", TOPIC="TOPIC" }
export enum RegionMode { GLOBAL="GLOBAL", NATIONAL="NATIONAL", REGIONAL="REGIONAL", LOCAL="LOCAL" }

export const Locale = { de: "de", en: "en", fr: "fr" } as const;
export type Locale = typeof Locale[keyof typeof Locale];

export type AnswerOpt = { label: string; value: string; exclusive?: boolean };
export type Prisma = any;

export const prisma: any = {}; // Placeholder für Typecheck
export default { prisma, PublishStatus, ContentKind, RegionMode, Locale };
