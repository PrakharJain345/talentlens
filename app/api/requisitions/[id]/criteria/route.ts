import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UpdateCriteriaSchema = z.object({
  criteria: z.array(
    z.object({
      id: z.string().optional(),
      kind: z.enum(["skill", "nice_skill", "experience", "location", "ctc", "notice"]),
      label: z.string().min(2),
      params: z.record(z.any()).default({}),
      weight: z.number().int().min(1).max(5),
      required: z.boolean(),
    })
  ),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requisitionId = params.id;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = UpdateCriteriaSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid criteria payload", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const adminSupabase = createAdminClient();

  // Replace existing criteria for this requisition
  await adminSupabase
    .from("scorecard_criteria")
    .delete()
    .eq("requisition_id", requisitionId);

  const criteriaToInsert = parsed.data.criteria.map((c, idx) => ({
    requisition_id: requisitionId,
    kind: c.kind,
    label: c.label,
    params: c.params || {},
    weight: c.weight,
    required: c.required,
    position: idx,
  }));

  const { error: insertErr } = await adminSupabase
    .from("scorecard_criteria")
    .insert(criteriaToInsert);

  if (insertErr) {
    return NextResponse.json(
      { error: "Failed to update criteria: " + insertErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, count: criteriaToInsert.length });
}
