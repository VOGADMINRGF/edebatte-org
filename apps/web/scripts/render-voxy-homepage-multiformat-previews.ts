const legacyReviewSet = process.argv.find((entry) => entry.startsWith("--review-set="));
if (legacyReviewSet) {
  throw new Error(
    "voxy_legacy_preview_review_set_retired_use_final_canon_review_surfaces",
  );
}

// This operator-facing command used to maintain its own preview composition path.
// That path could omit the V3.10.5 clean-studio binding and silently fall back to
// the superseded additive compositor. Keep the command name stable, but delegate
// all current review renders to the fail-closed final-canon surface renderer.
await import("./render-voxy-final-canon-review-surfaces");
