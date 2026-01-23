import type { EDebattePackage } from "@/features/swipes/types";

export const EDEBATTE_PACKAGES: EDebattePackage[] = ["basis", "start", "pro"];
export const EDEBATTE_PACKAGES_WITH_NONE: Array<EDebattePackage | "none"> = ["none", ...EDEBATTE_PACKAGES];
