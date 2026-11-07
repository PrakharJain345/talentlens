import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAccess } from "@/lib/audit/logAccess";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const applicationId = params.id;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminSupabase = createAdminClient();

  // Find application and candidate
  const { data: app, error: appErr } = await adminSupabase
    .from("applications")
    .select("id, candidate_id, opened_by_recruiter_at")
    .eq("id", applicationId)
    .single();

  if (appErr || !app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  // Update opened_by_recruiter_at if not already set
  const openedAt = app.opened_by_recruiter_at || new Date().toISOString();
  if (!app.opened_by_recruiter_at) {
    await adminSupabase
      .from("applications")
      .update({ opened_by_recruiter_at: openedAt })
      .eq("id", applicationId);
  }

  // Log access: viewed_cv
  await logAccess({
    actorId: user.id,
    candidateId: app.candidate_id,
    applicationId: app.id,
    action: "viewed_cv",
  });

  return NextResponse.json({ success: true, opened_at: openedAt });
}
