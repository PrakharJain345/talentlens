import { describe, it, expect } from "vitest";
import { verifyQuote, norm } from "@/lib/scoring/verify";

describe("verifyQuote (Evidence Substring Verification)", () => {
  const cvText = `
    Senior Software Engineer with 6+ years of experience in Java, Spring Boot,
    and Microservices architecture. Designed high-throughput distributed systems
    at Acme Payments Pvt Ltd.
    Key skills: Java 17, Spring Boot 3, Kafka, PostgreSQL, Docker, Kubernetes.
    Notice period: 30 days. Location: Noida, India.
  `;

  it("returns the exact quote when verbatim match exists", () => {
    const quote = "Java, Spring Boot, and Microservices architecture";
    const result = verifyQuote(cvText, quote);
    expect(result).toBe(quote);
  });

  it("verifies quotes with different whitespace and line breaks", () => {
    const multilineQuote = "Java,   Spring   Boot,\nand Microservices architecture";
    const result = verifyQuote(cvText, multilineQuote);
    expect(result).not.toBeNull();
  });

  it("is case-insensitive when verifying evidence", () => {
    const lowerQuote = "designed high-throughput distributed systems";
    const result = verifyQuote(cvText, lowerQuote);
    expect(result).not.toBeNull();
  });

  it("drops hallucinated or fabricated quotes by returning null", () => {
    const hallucinatedQuote = "Expert in Rust and Golang with 10 years experience";
    const result = verifyQuote(cvText, hallucinatedQuote);
    expect(result).toBeNull();
  });

  it("handles null and empty quotes safely", () => {
    expect(verifyQuote(cvText, null)).toBeNull();
    expect(verifyQuote(cvText, "")).toBeNull();
    expect(verifyQuote(cvText, "   ")).toBeNull();
  });
});
