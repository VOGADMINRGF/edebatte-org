"use client";

import { useCallback, useEffect, useState } from "react";

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  roles: string[];
  accessTier: string | null;
  b2cPlanId: string | null;
  engagementXp: number | null;
  vogMembershipStatus: string | null;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
};

let cachedUser: AuthUser | null | undefined;
let pending: Promise<AuthUser | null> | null = null;

async function fetchCurrentUser(): Promise<AuthUser | null> {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => ({}))) as { user?: AuthUser | null };
  return data?.user ?? null;
}

function getOrLoadUser() {
  if (cachedUser !== undefined) return Promise.resolve(cachedUser ?? null);
  if (!pending) {
    pending = fetchCurrentUser().then((user) => {
      cachedUser = user ?? null;
      pending = null;
      return user ?? null;
    });
  }
  return pending;
}

export function useCurrentUser(): AuthState {
  const [user, setUser] = useState<AuthUser | null | undefined>(cachedUser);
  const [loading, setLoading] = useState(cachedUser === undefined);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (cachedUser !== undefined) {
      setLoading(false);
      setUser(cachedUser ?? null);
      return;
    }

    let active = true;
    getOrLoadUser()
      .then((u) => {
        if (!active) return;
        setUser(u ?? null);
        setLoading(false);
      })
      .catch((e) => {
        if (!active) return;
        setError(e?.message || "auth_load_failed");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    cachedUser = undefined;
    setLoading(true);
    const next = await getOrLoadUser();
    setUser(next ?? null);
    setLoading(false);
  }, []);

  return { user: user ?? null, loading, error, refresh };
}

export function useAccessTier() {
  const { user, loading, error, refresh } = useCurrentUser();
  return { accessTier: user?.accessTier ?? null, loading, error, refresh };
}

export function useEngagementLevel() {
  const { user, loading, error, refresh } = useCurrentUser();
  return { engagementXp: user?.engagementXp ?? null, loading, error, refresh };
}

export function useB2CPlan() {
  const { user, loading, error, refresh } = useCurrentUser();
  return { b2cPlanId: user?.b2cPlanId ?? null, loading, error, refresh };
}

export function useVogMembershipStatus() {
  const { user, loading, error, refresh } = useCurrentUser();
  return { vogMembershipStatus: user?.vogMembershipStatus ?? null, loading, error, refresh };
}
