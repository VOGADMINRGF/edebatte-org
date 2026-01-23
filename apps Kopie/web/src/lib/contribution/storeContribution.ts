import Contribution from "@/models/Contribution";
import mongoose from "mongoose";

export async function storeContribution(data: {
  originalText: string;
  statements: string[];
  translations: Record<string, Record<string, string>>;
  region: string;
  userId: string;
}) {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI!);
  }

  const entry = new Contribution({
    ...data,
    confirmed: true,
    createdAt: new Date(),
  });

  await entry.save();
  return entry;
}
