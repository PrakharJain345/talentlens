/**
 * Redaction utility for blind scoring (PRD FR-5, TECHSTACK section 6).
 * Removes personal identifying information and demographic attributes
 * before text reaches the scoring model.
 */

export interface RedactOptions {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
}

export function redactCvText(text: string, options: RedactOptions = {}): string {
  if (!text) return "";

  let result = text;

  // 1. Remove demographic / personal attribute lines:
  // e.g. Gender, Sex, Age, DOB, Date of Birth, Marital Status, Father's Name, Nationality, Religion
  const demographicRegex =
    /^[ \t]*(?:gender|sex|age|d\.?o\.?b\.?|date\s+of\s+birth|marital\s+status|father'?s?\s+name|nationality|religion)\s*[:\-].*$/gim;
  result = result.replace(demographicRegex, "[REDACTED]");

  // Inline demographic patterns if not on their own line
  const inlineDemographicRegex =
    /\b(?:marital\s+status|date\s+of\s+birth|d\.?o\.?b\.?|nationality|religion|gender|sex)\s*[:\-]\s*[A-Za-z0-9\/\.\-]+/gi;
  result = result.replace(inlineDemographicRegex, "[REDACTED]");

  // 2. Remove specific full_name if provided
  if (options.fullName && options.fullName.trim().length > 1) {
    const nameTrimmed = options.fullName.trim();
    // Escape special regex characters in the name
    const escaped = nameTrimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nameRegex = new RegExp(`\\b${escaped}\\b`, "gi");
    result = result.replace(nameRegex, "[REDACTED]");
  }

  // 3. Remove email addresses
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  result = result.replace(emailRegex, "[REDACTED]");

  // 4. Remove phone numbers (Indian & international formats)
  // Matches +91-9876543210, 98765 43210, +91 9876543210, 09876543210, (123) 456-7890, etc.
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,5}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{4,5}\b/g;
  result = result.replace(phoneRegex, (match) => {
    // Only replace if it contains at least 7 digits to avoid matching short years/numbers
    const digitCount = (match.match(/\d/g) || []).length;
    if (digitCount >= 7) {
      return "[REDACTED]";
    }
    return match;
  });

  return result;
}
