"use client";
import React from "react";
export type User = { id?: string; name?: string } | undefined;
export default function UserHydrator({ children }: { children?: any }) {
  return <>{children}</>;
}
