import {
  resolveOrganizationType,
  type OrganizationTypeResolution,
} from "../organization/registryContract";
import {
  ORGANIZATION_TYPES,
  type OrganizationType,
} from "./organizationOnboarding";

/**
 * The regional onboarding vocabulary predates the canonical organization
 * registry. Keep it accepted for existing claims/memberships, but route every
 * value through the explicit compatibility resolver instead of inventing a
 * second canonical type truth in onboarding.
 */
export function resolveOnboardingOrganizationType(
  type: OrganizationType,
): OrganizationTypeResolution {
  return resolveOrganizationType(type);
}

export function auditOnboardingOrganizationTypeCoverage() {
  return ORGANIZATION_TYPES.map((type) => ({
    type,
    resolution: resolveOnboardingOrganizationType(type),
  }));
}
