// src/constants/roles.ts
export const ROLES = {
  GUEST: "guest",
  USER: "user",
  MEMBER: "member",
  ADMIN: "admin",
  REP: "representative",
  EDITOR: "editor",
} as const;

export type RoleType = (typeof ROLES)[keyof typeof ROLES];
