// tools/migrations/pii_user_profiles_username_partial_index.js

// Hilfsfunktion, um in einer gegebenen DB den Index zu reparieren.
function ensurePartialUsernameIndex(db) {
  const coll = db.getCollection("user_profiles");
  const existing = coll.getIndexes().find((idx) => idx.name === "username_1");

  if (existing) {
    print(`Dropping existing username_1 index in ${db.getName()}.user_profiles ...`);
    coll.dropIndex("username_1");
  } else {
    print(`No existing username_1 index in ${db.getName()}.user_profiles, creating fresh.`);
  }

  print(`Creating partial unique index username_1 in ${db.getName()}.user_profiles ...`);
  coll.createIndex(
    { username: 1 },
    {
      name: "username_1",
      unique: true,
      partialFilterExpression: { username: { $exists: true, $ne: null } },
    },
  );

  print(`Done for ${db.getName()}.user_profiles`);
}

// Skript gegen pii_dev und pii_prod ausführen
(function run() {
  // dev
  try {
    const dev = db.getSiblingDB("pii_dev");
    ensurePartialUsernameIndex(dev);
  } catch (e) {
    print("Skipping pii_dev (not present?): " + e.message);
  }

  // prod
  try {
    const prod = db.getSiblingDB("pii_prod");
    ensurePartialUsernameIndex(prod);
  } catch (e) {
    print("Skipping pii_prod (not present?): " + e.message);
  }
})();

