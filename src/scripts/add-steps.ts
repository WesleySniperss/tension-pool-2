export interface AddStep {
  type: "add" | "overflow";
  added: number;
  newCount: number;
  max: number;
}

/**
 * Compute the sequence of steps for an add operation.
 * When adding dice would overflow the pool, the pool fills, rolls (overflow),
 * resets to 0, and continues adding the remainder.
 *
 * Returns a list of steps: each is either an "add" (dice added, pool not full)
 * or an "overflow" (pool filled up and should auto-roll).
 */
export function computeAddSteps(
  count: number,
  currentCount: number,
  max: number,
): AddStep[] {
  if (count <= 0 || max <= 0) return [];

  const steps: AddStep[] = [];
  let remaining = count;
  // Clamp the stored count into [0, max]. Lowering Pool Size in the settings can
  // leave more dice in the pool than the new maximum allows, and an out-of-range
  // value used to make the loop below emit zero-progress overflow steps forever.
  let current = Math.min(Math.max(Number.isFinite(currentCount) ? Math.floor(currentCount) : 0, 0), max);

  while (remaining > 0) {
    const space = max - current;

    if (space <= 0) {
      // Pool already full — overflow
      steps.push({ type: "overflow", added: 0, newCount: max, max });
      current = 0;
      continue;
    }

    const toAdd = Math.min(remaining, space);
    const newCount = current + toAdd;
    remaining -= toAdd;

    if (newCount >= max) {
      steps.push({ type: "overflow", added: toAdd, newCount: max, max });
      current = 0;
    } else {
      steps.push({ type: "add", added: toAdd, newCount, max });
      current = newCount;
    }
  }

  return steps;
}
