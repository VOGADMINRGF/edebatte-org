"use client";

import type { ReactNode } from "react";
import { UserProvider } from "@features/user/context/UserContext";

export default function StreamLayout({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      {children}
    </UserProvider>
  );
}
