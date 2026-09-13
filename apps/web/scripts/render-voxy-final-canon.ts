import {
  assertVoxyFinalCanonBinding,
  finalVoxyCanonBinding,
} from "../src/features/voxyVideo/finalCanon";

// Fail closed before the canonical renderer is evaluated or any render work starts.
assertVoxyFinalCanonBinding(finalVoxyCanonBinding());

await import("./render-voxy-homepage-reference-films");
