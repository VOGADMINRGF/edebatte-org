import mongoose from "mongoose";
import Contribution from "@/data/models/Contribution";
import { mongo } from "../db/mongoose";

export async function storeContribution({
  originalText,
  language,
  statements,
  topics,
  level,
  context,
  suggestions,
  translations,
  region,
  userId
}: {
  originalText: string;
  language: string;
  statements: string[];
  topics: { name: string }[];
  level: string;
  context: string;
  suggestions: string[];
  translations: {
    original: string;
    de: string;
    en: string;
  };
  region?: string;
  userId?: string;
}) {
  if (mongoose.connection.readyState === 0) {
    await mongo();
  }

  const entry = new Contribution({
    originalText,
    language,
    statements,
    topics,
    level,
    context,
    suggestions,
    translations,
    region,
    userId: userId ?? "anonymous",
    status: "confirmed",
    createdAt: new Date()
  });

  await entry.save();
  return entry;
}
