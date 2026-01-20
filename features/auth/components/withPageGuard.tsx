//features/auth/components/withPageGuard.tsx
"use client";

import { useEffect } from "react";
import { useUser } from "@features/user/context/UserContext";

export function withPageGuard<TProps extends {}>(
  Component: React.ComponentType<TProps>,
  allowedRoles: string[] = ["admin"]
) {
  return function Guarded(props: TProps) {
    const { role, loading } = useUser();

    useEffect(() => {
      if (!loading && !allowedRoles.includes(role)) {
        window.location.replace("/login?reason=forbidden");
      }
    }, [role, loading]);

    if (loading) return null; // oder Skeleton
    return <Component {...props} />;
  };
}
