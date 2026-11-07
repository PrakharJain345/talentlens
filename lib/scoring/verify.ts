/**
 * Whitespace and case normalization for evidence quote verification.
 */
export const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Verifies that the LLM's evidence quote is a verbatim substring of the CV text.
 * If verified, returns the quote; otherwise returns null.
 */
export function verifyQuote(cvText: string, quote: string | null): string | null {
  if (!quote || !quote.trim()) return null;
  return norm(cvText).includes(norm(quote)) ? quote.trim() : null;
}

