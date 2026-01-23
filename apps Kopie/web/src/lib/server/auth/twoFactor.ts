import type { SessionUser } from "./sessionUser";
import { ensureVerificationDefaults } from "@core/auth/verificationTypes";

export function userRequiresTwoFactor(user: SessionUser | null): boolean {
  if (!user) return false;
  const verification = ensureVerificationDefaults((user as any).verification);
  const twoFA = (user as any)?.verification?.twoFA || (verification as any)?.twoFA;
  const enabled = Boolean(twoFA?.enabled || twoFA?.secret);
  const method = twoFA?.method || (enabled && (twoFA?.secret ? "totp" : null));
  return Boolean(enabled && method);
}

export function sessionHasPassedTwoFactor(user: SessionUser | null): boolean {
  if (!user) return false;
  if ((user as any).sessionValid === false) return false;
  const requires = userRequiresTwoFactor(user);
  const passed = user.sessionTwoFactorAuthenticated;
  if (requires) return Boolean(passed);
  return passed !== false;
}
