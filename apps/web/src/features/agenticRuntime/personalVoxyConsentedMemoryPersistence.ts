import type { Collection } from "mongodb";
import { assertStoreConfigured, getCol, ObjectId } from "@core/db/triMongo";
import {
  applyPersonalVoxyMemoryClearDoNotRemember,
  applyPersonalVoxyMemoryDelete,
  applyPersonalVoxyMemoryFullReset,
  applyPersonalVoxyMemoryScopeRevoke,
  applyPersonalVoxyMemoryWrite,
  buildPersonalVoxyMemoryRuntimeView,
  createEmptyPersonalVoxyMemoryState,
  type PersonalVoxyMemoryAuthorization,
  type PersonalVoxyMemoryKey,
  type PersonalVoxyMemoryMutationResult,
  type PersonalVoxyMemoryRuntimeView,
  type PersonalVoxyMemoryScope,
  type PersonalVoxyMemoryState,
  type PersonalVoxyMemoryWriteRequest,
} from "@/features/agenticRuntime/personalVoxyConsentedMemoryContract";

type PersonalVoxyMemoryUserDoc = {
  _id: ObjectId;
  profile?: {
    personalVoxyMemory?: PersonalVoxyMemoryState | null;
  } | null;
};

type LoadedMemoryOwner = {
  oid: ObjectId;
  users: Collection<PersonalVoxyMemoryUserDoc>;
  state: PersonalVoxyMemoryState;
};

function parseUserId(userId: string | ObjectId) {
  if (typeof userId !== "string") return userId;
  if (!ObjectId.isValid(userId)) {
    throw new Error("PERSONAL_VOXY_MEMORY_INVALID_USER_ID");
  }
  return new ObjectId(userId);
}

async function loadMemoryOwner(userId: string | ObjectId): Promise<LoadedMemoryOwner> {
  assertStoreConfigured("core", "agenticRuntime.personalVoxyMemory");
  const oid = parseUserId(userId);
  const users = await getCol<PersonalVoxyMemoryUserDoc>("users");
  const user = await users.findOne(
    { _id: oid },
    {
      projection: {
        "profile.personalVoxyMemory": 1,
      },
    },
  );
  if (!user) {
    throw new Error("PERSONAL_VOXY_MEMORY_USER_NOT_FOUND");
  }
  return {
    oid,
    users,
    state: user.profile?.personalVoxyMemory ?? createEmptyPersonalVoxyMemoryState(),
  };
}

async function persistMemoryState(
  owner: LoadedMemoryOwner,
  nextState: PersonalVoxyMemoryState,
  now = new Date(),
) {
  const previousRevision = owner.state.revision;
  const filter: Record<string, unknown> = { _id: owner.oid };
  if (previousRevision === 0) {
    filter.$or = [
      { "profile.personalVoxyMemory": { $exists: false } },
      { "profile.personalVoxyMemory": null },
      { "profile.personalVoxyMemory.revision": 0 },
    ];
  } else {
    filter["profile.personalVoxyMemory.revision"] = previousRevision;
  }

  const result = await owner.users.updateOne(
    filter as never,
    {
      $set: {
        "profile.personalVoxyMemory": nextState,
        updatedAt: now,
      },
    } as never,
  );

  if (result.matchedCount !== 1) {
    throw new Error("PERSONAL_VOXY_MEMORY_CONFLICT");
  }
}

async function persistMutation(
  userId: string | ObjectId,
  mutate: (state: PersonalVoxyMemoryState) => PersonalVoxyMemoryMutationResult,
  now?: Date,
) {
  const owner = await loadMemoryOwner(userId);
  const result = mutate(owner.state);
  if (result.accepted && result.changed) {
    await persistMemoryState(owner, result.state, now);
  }
  return result;
}

export async function readPersonalVoxyMemoryState(
  userId: string | ObjectId,
): Promise<PersonalVoxyMemoryState> {
  return (await loadMemoryOwner(userId)).state;
}

export async function readPersonalVoxyMemoryRuntimeView(input: {
  userId: string | ObjectId;
  authorization?: PersonalVoxyMemoryAuthorization | null;
}): Promise<PersonalVoxyMemoryRuntimeView> {
  const state = await readPersonalVoxyMemoryState(input.userId);
  return buildPersonalVoxyMemoryRuntimeView({
    state,
    authorization: input.authorization,
  });
}

export async function writePersonalVoxyMemory(input: {
  userId: string | ObjectId;
  authorization: PersonalVoxyMemoryAuthorization;
  request: PersonalVoxyMemoryWriteRequest;
  now?: Date;
}) {
  return persistMutation(
    input.userId,
    (state) =>
      applyPersonalVoxyMemoryWrite({
        state,
        authorization: input.authorization,
        request: input.request,
        now: input.now,
      }),
    input.now,
  );
}

export async function deletePersonalVoxyMemory(input: {
  userId: string | ObjectId;
  key: PersonalVoxyMemoryKey;
  doNotRemember?: boolean;
  now?: Date;
}) {
  return persistMutation(
    input.userId,
    (state) =>
      applyPersonalVoxyMemoryDelete({
        state,
        key: input.key,
        doNotRemember: input.doNotRemember,
        now: input.now,
      }),
    input.now,
  );
}

export async function clearPersonalVoxyDoNotRemember(input: {
  userId: string | ObjectId;
  authorization: PersonalVoxyMemoryAuthorization;
  key: PersonalVoxyMemoryKey;
  now?: Date;
}) {
  return persistMutation(
    input.userId,
    (state) =>
      applyPersonalVoxyMemoryClearDoNotRemember({
        state,
        authorization: input.authorization,
        key: input.key,
        now: input.now,
      }),
    input.now,
  );
}

export async function revokePersonalVoxyMemoryScope(input: {
  userId: string | ObjectId;
  scope: PersonalVoxyMemoryScope;
  consentRevision: number;
  now?: Date;
}) {
  return persistMutation(
    input.userId,
    (state) =>
      applyPersonalVoxyMemoryScopeRevoke({
        state,
        scope: input.scope,
        consentRevision: input.consentRevision,
        now: input.now,
      }),
    input.now,
  );
}

export async function resetPersonalVoxyMemory(input: {
  userId: string | ObjectId;
  consentRevision: number;
  now?: Date;
}) {
  return persistMutation(
    input.userId,
    (state) =>
      applyPersonalVoxyMemoryFullReset({
        state,
        consentRevision: input.consentRevision,
        now: input.now,
      }),
    input.now,
  );
}
