import { describe, it, expect } from "vitest";
import { redactCvText } from "@/lib/privacy/redact";

describe("redactCvText (Blind Scoring Privacy & Fairness)", () => {
  const sampleCvWithDemographics = `
    Kavita Sharma
    Email: kavita.sharma@example.com
    Phone: +91-9876543210
    Address: Sector 62, Noida, UP
    DOB: 12/04/1999
    Marital Status: Married
    Gender: Female
    Nationality: Indian

    Professional Summary:
    Full Stack Developer with 4 years of hands-on experience in Java and Spring Boot.
    Contributed to core microservices architecture at Infosys.
    Notice period: 30 days.
  `;

  it("redacts candidate name, email, and phone number", () => {
    const redacted = redactCvText(sampleCvWithDemographics, {
      fullName: "Kavita Sharma",
      email: "kavita.sharma@example.com",
      phone: "+91-9876543210",
    });

    expect(redacted).not.toContain("Kavita Sharma");
    expect(redacted).not.toContain("kavita.sharma@example.com");
    expect(redacted).not.toContain("9876543210");
    expect(redacted).toContain("[REDACTED]");
  });

  it("removes demographic lines (DOB, Marital Status, Gender, Nationality)", () => {
    const redacted = redactCvText(sampleCvWithDemographics, {
      fullName: "Kavita Sharma",
    });

    expect(redacted).not.toContain("12/04/1999");
    expect(redacted).not.toContain("Marital Status: Married");
    expect(redacted).not.toContain("Gender: Female");
    expect(redacted).not.toContain("Nationality: Indian");
    expect(redacted).not.toMatch(/DOB:\s*12\/04\/1999/i);
    expect(redacted).not.toMatch(/Marital Status:\s*Married/i);
  });

  it("preserves professional skills, experience, and technical qualifications", () => {
    const redacted = redactCvText(sampleCvWithDemographics, {
      fullName: "Kavita Sharma",
    });

    expect(redacted).toContain("Full Stack Developer");
    expect(redacted).toContain("Java");
    expect(redacted).toContain("Spring Boot");
    expect(redacted).toContain("microservices architecture");
    expect(redacted).toContain("Notice period: 30 days");
  });
});
