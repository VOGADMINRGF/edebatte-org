import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { mongo } from "@/db/mongoose";
import { getServerUser } from "@/lib/auth/getServerUser";

export async function POST() {
  const user = await getServerUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await mongo();
  const db = mongoose.connection.db;

  // harte Löschung – je nach Compliance ggf. Anonymisierung wählen
  const byUser = { userId: new mongoose.Types.ObjectId(user.id) };
  const byId = { _id: new mongoose.Types.ObjectId(user.id) };

  const ops = [
    (db as any).collection("votes").deleteMany(byUser),
    (db as any).collection("contributions").deleteMany(byUser),
    (db as any).collection("userprofiles").deleteOne(byUser),
    (db as any).collection("users").deleteOne(byId),
  ];
  const results = await Promise.allSettled(ops);

  return NextResponse.json({ ok: true, results });
}
