import type { Verdict } from "@/types/database";

export const POINTS: Record<Verdict, number> = {
  met: 1.0,
  partial: 0.5,
  not_met: 0.0,
  unknown: 0.0,
};

export interface CriterionScoreInput {
  id: string;
  weight: number;
  required: boolean;
  label: string;
}

export interface ScoreItemInput {
  criterion_id: string;
  verdict: Verdict;
  evidence_quote?: string | null;
  reason?: string | null;
}

export interface ComputedScoreResult {
  score: number;
  flags: string[];
}

/**
 * Computes the total candidate score (0-100) deterministically from criteria weights and verdicts.
 * Also generates flags for any missing required criteria.
 */
export function computeScore(
  items: ScoreItemInput[],
  criteria: CriterionScoreInput[]
): ComputedScoreResult {
  let got = 0;
  let max = 0;
  const flags: string[] = [];

  for (const c of criteria) {
    const it = items.find((i) => i.criterion_id === c.id);
    const v: Verdict = it?.verdict ?? "unknown";

    max += c.weight;
    got += c.weight * (POINTS[v] ?? 0);

    if (c.required && (v === "not_met" || v === "unknown")) {
      flags.push(`Missing must-have: ${c.label}`);
    }
  }

  return {
    score: max > 0 ? Math.round((got / max) * 100) : 0,
    flags,
  };
}

