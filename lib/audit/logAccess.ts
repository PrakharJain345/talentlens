import { createAdminClient } from "@/lib/supabase/admin";

export type AccessAction =
  | "viewed_cv"
  | "viewed_contact"
  | "submitted"
  | "decided"
  | "deleted";

export interface LogAccessOptions {
  actorId?: string | null;
  candidateId?: string | null;
  applicationId?: string | null;
  action: AccessAction;
}

/**
 * Inserts an immutable access log row (PRD FR-10, TECHSTACK section 6).
 * Uses the admin client to guarantee audit trail integrity.
 */
export async function logAccess({
  actorId,
  candidateId,
  applicationId,
  action,
}: LogAccessOptions): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("access_log").insert({
      actor_id: actorId || null,
      candidate_id: candidateId || null,
      application_id: applicationId || null,
      action,
    });
  } catch (error) {
    console.error("[AuditLog] Failed to record access log:", error);
    // Non-blocking: audit failure should not crash the user request, but is logged
  }
}
