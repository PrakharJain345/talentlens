import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CandidateDetailView } from "@/components/candidates/CandidateDetailView";

export default async function CandidateDetailPage({
  params,
}: {
  params: { id: string; appId: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const adminSupabase = createAdminClient();

  // Fetch application
  const { data: application, error: appErr } = await adminSupabase
    .from("applications")
    .select(`
      id,
      requisition_id,
      candidate_id,
      stage,
      score,
      flags,
      scored_at,
      opened_by_recruiter_at,
      recruiter_note,
      submitted_at,
      client_decision,
      candidate:candidates(
        id,
        full_name,
        email,
        phone,
        current_title,
        experience_years,
        skills,
        notice_days,
        current_ctc_lpa,
        location,
        summary,
        cv_text,
        cv_text_redacted,
        storage_path,
        deleted_at
      )
    `)
    .eq("id", params.appId)
    .single();

  if (appErr || !application || (application.candidate as any)?.deleted_at) {
    notFound();
  }

  // Fetch criteria
  const { data: criteria } = await adminSupabase
    .from("scorecard_criteria")
    .select("*")
    .eq("requisition_id", params.id)
    .order("position", { ascending: true });

  // Fetch score items
  const { data: scoreItems } = await adminSupabase
    .from("score_items")
    .select("*")
    .eq("application_id", params.appId);

  // Fetch consent record
  const { data: consent } = await adminSupabase
    .from("consent_records")
    .select("*")
    .eq("candidate_id", application.candidate_id)
    .maybeSingle();

  // Generate signed URL for original file if storage path exists
  let originalFileSignedUrl: string | null = null;
  const storagePath = (application.candidate as any)?.storage_path;
  if (storagePath) {
    const { data: signedData } = await adminSupabase.storage
      .from("cvs")
      .createSignedUrl(storagePath, 3600); // 1 hour validity
    originalFileSignedUrl = signedData?.signedUrl ?? null;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/requisitions/${params.id}`}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <h1 className="text-base font-semibold text-slate-900 truncate">
              {(application.candidate as any)?.full_name || "Candidate Evaluation"}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <CandidateDetailView
          application={application}
          candidate={application.candidate}
          criteria={criteria || []}
          scoreItems={scoreItems || []}
          consent={consent}
          requisitionId={params.id}
          originalFileSignedUrl={originalFileSignedUrl}
        />
      </main>
    </div>
  );
}
