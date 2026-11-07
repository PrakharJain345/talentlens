import { describe, it, expect } from "vitest";
import { computeScore, CriterionScoreInput, ScoreItemInput } from "@/lib/scoring/compute";

describe("computeScore (Deterministic Score Calculation)", () => {
  const sampleCriteria: CriterionScoreInput[] = [
    { id: "c1", label: "Java", weight: 5, required: true },
    { id: "c2", label: "Spring Boot", weight: 5, required: true },
    { id: "c3", label: "5-8 years experience", weight: 4, required: true },
    { id: "c4", label: "Kafka", weight: 2, required: false },
    { id: "c5", label: "Notice <= 60 days", weight: 3, required: false },
  ];

  it("calculates 100% when all criteria are met", () => {
    const items: ScoreItemInput[] = [
      { criterion_id: "c1", verdict: "met" },
      { criterion_id: "c2", verdict: "met" },
      { criterion_id: "c3", verdict: "met" },
      { criterion_id: "c4", verdict: "met" },
      { criterion_id: "c5", verdict: "met" },
    ];

    const result = computeScore(items, sampleCriteria);
    expect(result.score).toBe(100);
    expect(result.flags).toHaveLength(0);
  });

  it("correctly weights partial matches (0.5x weight)", () => {
    // Total weight = 5 + 5 + 4 + 2 + 3 = 19
    // c1 met (5), c2 partial (2.5), c3 met (4), c4 not_met (0), c5 met (3) = 14.5 / 19 = 76%
    const items: ScoreItemInput[] = [
      { criterion_id: "c1", verdict: "met" },
      { criterion_id: "c2", verdict: "partial" },
      { criterion_id: "c3", verdict: "met" },
      { criterion_id: "c4", verdict: "not_met" },
      { criterion_id: "c5", verdict: "met" },
    ];

    const result = computeScore(items, sampleCriteria);
    expect(result.score).toBe(76);
    expect(result.flags).toHaveLength(0); // partial does not trigger missing required flag
  });

  it("flags missing required criteria without excluding the candidate", () => {
    // c1 (Java) not_met, c2 (Spring Boot) unknown
    const items: ScoreItemInput[] = [
      { criterion_id: "c1", verdict: "not_met" },
      { criterion_id: "c2", verdict: "unknown" },
      { criterion_id: "c3", verdict: "met" },
      { criterion_id: "c4", verdict: "met" },
      { criterion_id: "c5", verdict: "met" },
    ];

    const result = computeScore(items, sampleCriteria);
    expect(result.score).toBe(47); // (4 + 2 + 3) / 19 = 9/19 = 47%
    expect(result.flags).toContain("Missing must-have: Java");
    expect(result.flags).toContain("Missing must-have: Spring Boot");
    expect(result.flags).toHaveLength(2);
  });

  it("returns 0 score when no criteria are met or empty items", () => {
    const result = computeScore([], sampleCriteria);
    expect(result.score).toBe(0);
    expect(result.flags).toHaveLength(3); // 3 required criteria are missing
  });
});
