/**
 * Cooking step analysis — detects parallel opportunities and computes
 * optimized total cooking time.
 *
 * Identifies "passive" steps (marinating, soaking, resting, preheating,
 * cooling, chilling, rising) that can overlap with subsequent "active" steps.
 */

export interface CookingStep {
  number: number;
  instruction: string;
  duration?: number;
  tip?: string;
}

export interface StepTiming {
  stepNumber: number;
  instruction: string;
  duration: number;
  isPassive: boolean;
  startMinute: number;    // when this step starts in the optimized timeline
  endMinute: number;      // when this step ends
  parallelWith: number[]; // step numbers that overlap with this one
}

export interface CookingTimeline {
  steps: StepTiming[];
  sequentialTotal: number;   // naive total: sum of all durations
  optimizedTotal: number;    // actual time accounting for parallel steps
  timeSaved: number;         // sequentialTotal - optimizedTotal
  parallelGroups: Array<{    // groups of steps that can run together
    steps: number[];
    reason: string;
  }>;
}

// ─── Passive Step Detection ────────────────────────

const PASSIVE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bmarinate?\b/i, reason: "Marinating is passive — prep other ingredients while waiting" },
  { pattern: /\bsoak(ing|ed)?\b/i, reason: "Soaking is passive — start other prep work" },
  { pattern: /\brest(ing|s)?\b(?!.*stir)/i, reason: "Resting doesn't need attention" },
  { pattern: /\blet\s+(it\s+)?sit\b/i, reason: "Sitting time can overlap with other tasks" },
  { pattern: /\brefrigerat/i, reason: "Refrigeration is passive waiting" },
  { pattern: /\bchill(ing|ed)?\b/i, reason: "Chilling is passive — use this time for other prep" },
  { pattern: /\bcool(ing|s)?\b(?!.*stir)/i, reason: "Cooling doesn't need attention" },
  { pattern: /\bpreheat/i, reason: "Preheating runs in the background" },
  { pattern: /\brise?\b.*\b(dough|bread)\b|\b(dough|bread)\b.*\brise?\b/i, reason: "Dough rising is passive — prep toppings or sides" },
  { pattern: /\bboil\b.*\bwater\b|\bwater\b.*\bboil\b/i, reason: "Waiting for water to boil can overlap with prep" },
  { pattern: /\bsimmer\b.*\b(low|covered|lid)\b/i, reason: "Low-heat simmering needs minimal attention" },
  { pattern: /\boven\b.*\bminutes\b|\bbake\b.*\bminutes\b/i, reason: "Oven time is passive — clean up or prep sides" },
];

function isPassiveStep(instruction: string): { passive: boolean; reason: string } {
  for (const { pattern, reason } of PASSIVE_PATTERNS) {
    if (pattern.test(instruction)) {
      return { passive: true, reason };
    }
  }
  return { passive: false, reason: "" };
}

// ─── Timeline Analysis ─────────────────────────────

/**
 * Analyze cooking steps and compute an optimized timeline.
 *
 * Algorithm:
 * 1. Walk through steps sequentially
 * 2. When a passive step is found, it starts a "background timer"
 * 3. Subsequent active steps can run during the passive step's remaining time
 * 4. If active steps finish before the passive step, we wait for it
 * 5. If active steps take longer than the passive step, the passive step
 *    finishes in the background (no extra time added)
 */
export function analyzeStepTiming(steps: CookingStep[]): CookingTimeline {
  if (steps.length === 0) {
    return { steps: [], sequentialTotal: 0, optimizedTotal: 0, timeSaved: 0, parallelGroups: [] };
  }

  const sequentialTotal = steps.reduce((sum, s) => sum + (s.duration ?? 0), 0);
  const timings: StepTiming[] = [];
  const parallelGroups: CookingTimeline["parallelGroups"] = [];

  let currentMinute = 0;
  let passiveEndMinute = 0;  // when the current passive step finishes
  let passiveStepNumber = -1;
  let currentParallelGroup: number[] = [];
  let currentParallelReason = "";

  for (const step of steps) {
    const duration = step.duration ?? 0;
    const { passive, reason } = isPassiveStep(step.instruction);

    if (passive && duration > 0) {
      // This is a passive step — it starts now and runs in the background
      const timing: StepTiming = {
        stepNumber: step.number,
        instruction: step.instruction,
        duration,
        isPassive: true,
        startMinute: currentMinute,
        endMinute: currentMinute + duration,
        parallelWith: [],
      };
      timings.push(timing);

      // Set up the background timer
      passiveEndMinute = currentMinute + duration;
      passiveStepNumber = step.number;
      currentParallelGroup = [step.number];
      currentParallelReason = reason;

      // Don't advance currentMinute — next steps can overlap
    } else {
      // Active step
      const startMinute = currentMinute;
      const endMinute = currentMinute + duration;

      const timing: StepTiming = {
        stepNumber: step.number,
        instruction: step.instruction,
        duration,
        isPassive: false,
        startMinute,
        endMinute,
        parallelWith: [],
      };

      // Check if this overlaps with a running passive step
      if (passiveEndMinute > currentMinute && passiveStepNumber > 0) {
        timing.parallelWith.push(passiveStepNumber);
        currentParallelGroup.push(step.number);

        // Find the passive step and mark it too
        const passiveTiming = timings.find((t) => t.stepNumber === passiveStepNumber);
        if (passiveTiming) passiveTiming.parallelWith.push(step.number);
      }

      timings.push(timing);
      currentMinute = endMinute;

      // If we've passed the passive step's end, close the parallel group
      if (currentMinute >= passiveEndMinute && currentParallelGroup.length > 1) {
        parallelGroups.push({
          steps: [...currentParallelGroup],
          reason: currentParallelReason,
        });
        currentParallelGroup = [];
        passiveStepNumber = -1;
      }
    }
  }

  // Close any remaining parallel group
  if (currentParallelGroup.length > 1) {
    parallelGroups.push({
      steps: [...currentParallelGroup],
      reason: currentParallelReason,
    });
  }

  // If passive step extends beyond all active steps, we need to wait for it
  const optimizedTotal = Math.max(currentMinute, passiveEndMinute);
  const timeSaved = sequentialTotal - optimizedTotal;

  return {
    steps: timings,
    sequentialTotal,
    optimizedTotal: Math.max(optimizedTotal, 0),
    timeSaved: Math.max(timeSaved, 0),
    parallelGroups,
  };
}
