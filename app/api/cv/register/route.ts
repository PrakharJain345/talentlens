import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const RegisterUploadsSchema = z.object({
  requisition_id: z.string().uuid(),
  consent_attested: z.boolean().refine((val) => val === true, {
    message: "Candidate consent must be attested before processing.",
  }),
  files: z
    .array(
      z.object({
        file_name: z.string().min(1),
        storage_path: z.string().min(1),
      })
    )
    .min(1, "At least one file must be provided."),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = RegisterUploadsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { requisition_id, consent_attested, files } = parsed.data;

    // Verify requisition exists
    const { data: req, error: reqErr } = await supabase
      .from("requisitions")
      .select("id")
      .eq("id", requisition_id)
      .single();

    if (reqErr || !req) {
      return NextResponse.json({ error: "Requisition not found" }, { status: 404 });
    }

    // Insert cv_uploads rows with status = 'queued'
    const rowsToInsert = files.map((f) => ({
      requisition_id,
      file_name: f.file_name,
      storage_path: f.storage_path,
      status: "queued" as const,
      consent_attested,
      uploaded_by: user.id,
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from("cv_uploads")
      .insert(rowsToInsert)
      .select("id, file_name, storage_path, status, created_at");

    if (insertErr) {
      console.error("[RegisterCV] Insert error:", insertErr);
      return NextResponse.json(
        { error: "Failed to register CV uploads: " + insertErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ uploads: inserted });
  } catch (err: any) {
    console.error("[RegisterCV] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error: " + (err.message || String(err)) },
      { status: 500 }
    );
  }
}
