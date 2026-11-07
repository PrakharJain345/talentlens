import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAccess } from "@/lib/audit/logAccess";

const DecisionSchema = z.object({
  action: z.enum(["shortlist", "reject", "slot_proposed"]),
  reject_reason: z.string().optional(),
  proposed_slot: z.string().optional(),
  slot_note: z.string().optional(),
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

  // Look up caller profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, client_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client" || !profile.client_id) {
    return NextResponse.json(
      { error: "Forbidden: Only client users can submit client decisions" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = DecisionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid decision body", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { action, reject_reason, proposed_slot, slot_note } = parsed.data;
  const adminSupabase = createAdminClient();

  // Verify caller owns this application through requisitions.client_id
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

  if (!app.submitted_at) {
    return NextResponse.json(
      { error: "Application has not been submitted by the recruiter yet" },
      { status: 400 }
    );
  }

  // Apply decision
  if (action === "shortlist") {
    await adminSupabase
      .from("applications")
      .update({
        client_decision: "shortlisted",
        stage: "shortlisted",
        contact_revealed: true,
      })
      .eq("id", applicationId);

    await logAccess({
      actorId: user.id,
      candidateId: app.candidate_id,
      applicationId: app.id,
      action: "decided",
    });

    await logAccess({
      actorId: user.id,
      candidateId: app.candidate_id,
      applicationId: app.id,
      action: "viewed_contact",
    });
  } else if (action === "reject") {
    if (!reject_reason || reject_reason.trim().length === 0) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    await adminSupabase
      .from("applications")
      .update({
        client_decision: "rejected",
        stage: "rejected",
        reject_reason,
      })
      .eq("id", applicationId);

    await logAccess({
      actorId: user.id,
      candidateId: app.candidate_id,
      applicationId: app.id,
      action: "decided",
    });
  } else if (action === "slot_proposed") {
    await adminSupabase
      .from("applications")
      .update({
        client_decision: "slot_proposed",
        stage: "interview",
        proposed_slot: proposed_slot || new Date().toISOString(),
        slot_note: slot_note || null,
      })
      .eq("id", applicationId);

    await logAccess({
      actorId: user.id,
      candidateId: app.candidate_id,
      applicationId: app.id,
      action: "decided",
    });
  }

  return NextResponse.json({ success: true, action });
}
