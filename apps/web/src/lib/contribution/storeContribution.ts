import Contribution from "@/models/Contribution";
import mongoose from "mongoose";
import { mongo } from "@/db/mongoose";

export async function storeContribution(data: {
  originalText: string;
  statements: string[];
  translations: Record<string, Record<string, string>>;
  region: string;
  userId: string;
}) {
  if (mongoose.connection.readyState === 0) {
    await mongo();
  }

  const entry = new Contribution({
    ...data,
    confirmed: true,
    createdAt: new Date(),
  });

  await entry.save();
  return entry;
}
