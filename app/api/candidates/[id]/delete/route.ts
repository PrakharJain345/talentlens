import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAccess } from "@/lib/audit/logAccess";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const candidateId = params.id;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check recruiter role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "recruiter") {
    return NextResponse.json(
      { error: "Forbidden: Only recruiters can perform DPDP candidate deletion" },
      { status: 403 }
    );
  }

  const adminSupabase = createAdminClient();

  // 1. Fetch candidate to retrieve storage_path
  const { data: candidate, error: candErr } = await adminSupabase
    .from("candidates")
    .select("id, storage_path")
    .eq("id", candidateId)
    .single();

  if (candErr || !candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  // 2. Delete file from Storage if path exists
  if (candidate.storage_path) {
    try {
      await adminSupabase.storage.from("cvs").remove([candidate.storage_path]);
    } catch (storageErr) {
      console.warn("[DPDP Delete] Storage deletion error:", storageErr);
    }
  }

  const now = new Date().toISOString();

  // 3. Nullify PII and mark deleted_at (PRD FR-9, TECHSTACK section 6)
  const { error: updateErr } = await adminSupabase
    .from("candidates")
    .update({
      full_name: "[DELETED]",
      email: null,
      phone: null,
      email_norm: null,
      phone_norm: null,
      name_norm: null,
      cv_text: null,
      cv_text_redacted: null,
      summary: null,
      skills: [],
      storage_path: null,
      deleted_at: now,
    })
    .eq("id", candidateId);

  if (updateErr) {
    return NextResponse.json(
      { error: "Failed to redact candidate record: " + updateErr.message },
      { status: 500 }
    );
  }

  // 4. Revoke consent records
  await adminSupabase
    .from("consent_records")
    .update({ revoked_at: now })
    .eq("candidate_id", candidateId);

  // 5. Log audit trail
  await logAccess({
    actorId: user.id,
    candidateId,
    action: "deleted",
  });

  return NextResponse.json({ success: true, deleted_at: now });
}
