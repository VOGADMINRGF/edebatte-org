export type PolicyResult = Record<string, unknown> | null;

export async function getPolicyRules(_gptData: any, _ariData: any): Promise<PolicyResult> {
  // Placeholder implementation until the real policy engine is wired.
  return null;
}

export async function getImpactScoring(_gptData: any, _ariData?: any): Promise<PolicyResult> {
  // Placeholder scoring (can be replaced with the actual impact service).
  return null;
}
