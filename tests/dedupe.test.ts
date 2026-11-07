import { describe, it, expect } from "vitest";
import {
  normalizeEmail,
  normalizePhone,
  normalizeName,
  levenshteinDistance,
} from "@/lib/dedupe";

describe("Deduplication and Normalization Utilities", () => {
  it("normalizes emails to lowercase and trims whitespace", () => {
    expect(normalizeEmail("  Ritika.Bansal@Gmail.COM  ")).toBe("ritika.bansal@gmail.com");
    expect(normalizeEmail("invalid-email")).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
  });

  it("normalizes phone numbers to last 10 digits", () => {
    expect(normalizePhone("+91 98765 43210")).toBe("9876543210");
    expect(normalizePhone("09876543210")).toBe("9876543210");
    expect(normalizePhone("+91-9876543210")).toBe("9876543210");
    expect(normalizePhone("9876543210")).toBe("9876543210");
  });

  it("normalizes names to trimmed lowercase with normalized spaces", () => {
    expect(normalizeName("  Ritika   Bansal  ")).toBe("ritika bansal");
    expect(normalizeName(null)).toBeNull();
  });

  it("calculates Levenshtein distance correctly for fuzzy matching", () => {
    expect(levenshteinDistance("ritika bansal", "ritika bansal")).toBe(0);
    expect(levenshteinDistance("ritika bansal", "ritika bansall")).toBe(1);
    expect(levenshteinDistance("ritika bansal", "ritika banzal")).toBe(1);
    expect(levenshteinDistance("ritika bansal", "arjun rawat")).toBeGreaterThan(5);
  });
});
