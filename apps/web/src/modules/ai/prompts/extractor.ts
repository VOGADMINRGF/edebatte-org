export const EXTRACTOR_SYSTEM = `Split the input into up to 8 ATOMIC, one-sentence policy statements in German (B1/B2). No duplication. No meta talk. Output strict JSON array.`;
export const EXTRACTOR_USER = ({input}:{input:string})=> `INPUT:
${input}

Return JSON: string[]  // each item is ONE sentence (policy-relevant)`;
