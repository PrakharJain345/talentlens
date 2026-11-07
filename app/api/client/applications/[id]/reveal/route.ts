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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, client_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client" || !profile.client_id) {
    return NextResponse.json(
      { error: "Forbidden: Only client users can access this endpoint" },
      { status: 403 }
    );
  }

  const adminSupabase = createAdminClient();

  const { data: app, error: appErr } = await adminSupabase
    .from("applications")
    .select(`
      id,
      candidate_id,
      submitted_at,
      requisition:requisitions(id, client_id)
    `)
    .eq("id", applicationId)
    .single();

  if (appErr || !app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const reqClient = (app.requisition as any)?.client_id;
  if (reqClient !== profile.client_id) {
    return NextResponse.json(
      { error: "Forbidden: You do not have access to this application" },
      { status: 403 }
    );
  }

  await adminSupabase
    .from("applications")
    .update({ contact_revealed: true })
    .eq("id", applicationId);

  await logAccess({
    actorId: user.id,
    candidateId: app.candidate_id,
    applicationId: app.id,
    action: "viewed_contact",
  });

  return NextResponse.json({ success: true, contact_revealed: true });
}
