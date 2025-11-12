// packages/config/admin.ts
export { adminConfig } from "./admin-config";
export type {
  AdminConfig,
  PricingConfig,
  PipelineLimits,
  RegionPilot,
} from "./admin-config";

// Legacy-Kompatibilität: alte Importe auf DEFAULTS laufen weiter
export { adminConfig as DEFAULTS } from "./admin-config";
