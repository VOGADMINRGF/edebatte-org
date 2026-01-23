export type RuleEval = {
  swipeCount: number;
  freePostsAllowed: number;
};

export function evaluateSwipeToPost(swipeCount: number, thresholds: number[]): RuleEval {
  // e.g., thresholds [100, 500, 1000] → map to allowed [1, 3, 7]
  const allowances = [1, 3, 7, 15];
  let idx = -1;
  for (let i=0; i<thresholds.length; i++) {
    if (swipeCount >= thresholds[i]) idx = i;
  }
  return { swipeCount, freePostsAllowed: idx >= 0 ? allowances[idx] : 0 };
}

export function canPostFree(currentFreePostsUsed: number, swipeCount: number, thresholds: number[]): boolean {
  const allowed = evaluateSwipeToPost(swipeCount, thresholds).freePostsAllowed;
  return currentFreePostsUsed < allowed;
}
