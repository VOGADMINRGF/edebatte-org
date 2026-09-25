import { QRCodeEntry } from "../../contribution/types/QRCodeEntry";
import { OrganizationEvent } from "../../contribution/types/OrganizationEvent";
import type { OrganizationStorageType } from "../registryContract";

export interface Organization {
  _id?: string;
  name: string;
  type: OrganizationStorageType;
  projects?: OrganizationProject[];
  users?: string[];
  events?: OrganizationEvent[];
  qrCodes?: QRCodeEntry[];
  branding?: BrandingConfig;
  apiKey?: string;
  billingPlan: 'basic' | 'pro' | 'enterprise';
  usageStats?: OrganizationUsageStats;
  settings?: OrganizationSettings;
  createdAt?: string;
  updatedAt?: string;
  archived?: boolean;
  deleted?: boolean;
  version?: number;
}

export interface OrganizationProject {
  _id?: string;
  title: string;
  description?: string;
  contributions?: string[];
  startDate: string;
  endDate?: string;
  private: boolean;
}
export interface BrandingConfig {
  logoUrl?: string;
  colorScheme?: string;
  customDomain?: string;
}
export interface OrganizationUsageStats {
  activeUsers: number;
  eventsHeld: number;
  votesCast: number;
  lastActivity: string;
}
export interface OrganizationSettings {
  allowAnonymousVoting?: boolean;
  allowComments?: boolean;
  require2FA?: boolean;
  autoArchiveInactive?: boolean;
}
