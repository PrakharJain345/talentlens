import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAccess } from "@/lib/audit/logAccess";

const SubmitBodySchema = z.object({
  recruiter_note: z.string().optional(),
});

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

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // Optional body
  }

  const parsed = SubmitBodySchema.safeParse(body);
  const recruiterNote = parsed.success ? parsed.data.recruiter_note : undefined;

  const adminSupabase = createAdminClient();

  // Retrieve application
  const { data: app, error: appErr } = await adminSupabase
    .from("applications")
    .select("id, candidate_id, requisition_id, opened_by_recruiter_at, stage")
    .eq("id", applicationId)
    .single();

  if (appErr || !app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  // Hard Rule 5: Submit-to-client is blocked server-side until recruiter has opened candidate's detail page
  if (!app.opened_by_recruiter_at) {
    return NextResponse.json(
      {
        error:
          "Submit gate violation: Candidate CV must be opened and reviewed before submitting to client.",
      },
      { status: 403 }
    );
  }

  const submittedAt = new Date().toISOString();

  // Update application
  const { error: updateErr } = await adminSupabase
    .from("applications")
    .update({
      submitted_at: submittedAt,
      stage: "submitted",
      recruiter_note: recruiterNote ?? null,
    })
    .eq("id", applicationId);

  if (updateErr) {
    return NextResponse.json(
      { error: "Failed to submit candidate: " + updateErr.message },
      { status: 500 }
    );
  }

  // Log audit access
  await logAccess({
    actorId: user.id,
    candidateId: app.candidate_id,
    applicationId: app.id,
    action: "submitted",
  });

  return NextResponse.json({
    success: true,
    submitted_at: submittedAt,
    stage: "submitted",
  });
}
