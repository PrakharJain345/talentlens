import { SupabaseClient } from "@supabase/supabase-js";

export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.includes("@") ? trimmed : null;
}

export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits.length > 0 ? digits : null;
}

export function normalizeName(name: string | null | undefined): string | null {
  if (!name) return null;
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

export interface DuplicateCheckParams {
  emailNorm: string | null;
  phoneNorm: string | null;
  nameNorm: string | null;
}

export interface DuplicateResult {
  isDuplicate: boolean;
  candidateId: string | null;
  matchedOn?: "email" | "phone" | "fuzzy_name";
}

/**
 * Checks if a candidate already exists in the database.
 * Priority:
 * 1. Exact email_norm match
 * 2. Exact phone_norm (last 10 digits) match
 * 3. (P1) name_norm Levenshtein <= 2 AND (same phone tail or same email local part)
 */
export async function findDuplicateCandidate(
  supabase: SupabaseClient,
  { emailNorm, phoneNorm, nameNorm }: DuplicateCheckParams
): Promise<DuplicateResult> {
  // 1. Exact email_norm match
  if (emailNorm) {
    const { data } = await supabase
      .from("candidates")
      .select("id")
      .eq("email_norm", emailNorm)
      .is("deleted_at", null)
      .maybeSingle();

    if (data?.id) {
      return { isDuplicate: true, candidateId: data.id, matchedOn: "email" };
    }
  }

  // 2. Exact phone_norm match
  if (phoneNorm) {
    const { data } = await supabase
      .from("candidates")
      .select("id")
      .eq("phone_norm", phoneNorm)
      .is("deleted_at", null)
      .maybeSingle();

    if (data?.id) {
      return { isDuplicate: true, candidateId: data.id, matchedOn: "phone" };
    }
  }

  // 3. Fuzzy match: Levenshtein on name + phone tail or email local-part
  if (nameNorm && (phoneNorm || emailNorm)) {
    const { data: candidates } = await supabase
      .from("candidates")
      .select("id, name_norm, phone_norm, email_norm")
      .is("deleted_at", null)
      .not("name_norm", "is", null)
      .limit(100);

    if (candidates) {
      for (const cand of candidates) {
        if (!cand.name_norm) continue;
        const dist = levenshteinDistance(nameNorm, cand.name_norm);
        if (dist <= 2) {
          // Check phone tail or email local part
          const samePhoneTail =
            phoneNorm && cand.phone_norm && phoneNorm.slice(-4) === cand.phone_norm.slice(-4);
          const emailLocalA = emailNorm ? emailNorm.split("@")[0] : null;
          const emailLocalB = cand.email_norm ? cand.email_norm.split("@")[0] : null;
          const sameEmailLocal = emailLocalA && emailLocalB && emailLocalA === emailLocalB;

          if (samePhoneTail || sameEmailLocal) {
            return { isDuplicate: true, candidateId: cand.id, matchedOn: "fuzzy_name" };
          }
        }
      }
    }
  }

  return { isDuplicate: false, candidateId: null };
}
