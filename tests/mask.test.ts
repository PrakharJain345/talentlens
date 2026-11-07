import { describe, it, expect } from "vitest";
import { maskEmail, maskPhone } from "@/lib/privacy/mask";

describe("mask (Client Portal Privacy Masking)", () => {
  it("masks email addresses until shortlist reveal", () => {
    expect(maskEmail("ritika.bansal@gmail.com")).toBe("r•••@gmail.com");
    expect(maskEmail("arjun@companya.com")).toBe("a•••@companya.com");
    expect(maskEmail(null)).toBe("••••••");
  });

  it("masks phone numbers showing only last 3 digits", () => {
    expect(maskPhone("+91-9876543210")).toBe("••••••210");
    expect(maskPhone("9876543210")).toBe("••••••210");
    expect(maskPhone(null)).toBe("••••••••••");
  });
});
