#!/usr/bin/env tsx

import { ObjectId, piiCol } from "@core/db/triMongo";

type UserProfileDoc = {
  _id?: ObjectId;
  userId: ObjectId;
  username?: string | null;
};

async function run() {
  const col = await piiCol<UserProfileDoc>("user_profiles");
  const cursor = col.find(
    {
      $or: [
        { username: { $exists: false } },
        { username: null },
        { username: "" },
      ],
    },
    { projection: { _id: 1, userId: 1 } },
  );

  let patched = 0;
  for await (const doc of cursor) {
    if (!doc?.userId) continue;
    const fallback = `uid-${doc.userId.toHexString()}`;
    await col.updateOne(
      { _id: doc._id ?? new ObjectId(doc.userId) },
      {
        $set: {
          username: fallback,
          updatedAt: new Date(),
        },
      },
    );
    patched += 1;
  }

  console.log(`[patch_pii_usernames] updated ${patched} document(s).`);
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("[patch_pii_usernames] failed", err);
    process.exit(1);
  });
