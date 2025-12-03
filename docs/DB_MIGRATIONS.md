## user_profiles.username partial unique index

- `user_profiles.username` bleibt eindeutig, erlaubt aber mehrere Dokumente ohne `username` oder mit `username: null`.
- Der Index `username_1` ist jetzt `unique: true` mit `partialFilterExpression: { username: { $exists: true, $ne: null } }`.
- Migration: `mongosh <connection-string> tools/migrations/pii_user_profiles_username_partial_index.js`
  - Das Script führt `ensurePartialUsernameIndex` für `pii_dev` und `pii_prod` aus, legt den Index neu an und erlaubt bestehende Datensätze ohne `username`.
- Verifiziere danach mit `db.user_profiles.getIndexes()` in beiden DBs, dass `username_1` den Partial-Filter trägt.

