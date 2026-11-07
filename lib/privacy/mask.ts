/**
 * Masking utilities for candidate contact info shown to clients (PRD FR-8, TECHSTACK section 6).
 * Contact information is masked until a client formally shortlists a candidate.
 */

export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes("@")) return "••••••";
  const [local, domain] = email.split("@");
  if (!local) return `•••@${domain}`;
  const firstChar = local.charAt(0);
  return `${firstChar}•••@${domain}`;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "••••••••••";
  // Extract digits
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 3) return "••••••";
  const last3 = digits.slice(-3);
  return `••••••${last3}`;
}
