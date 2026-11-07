import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Building2,
  Calendar,
  Users,
  Send,
  ArrowLeft,
  SlidersHorizontal,
} from "lucide-react";
import { RequisitionTabs } from "./RequisitionTabs";

export default async function RequisitionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch requisition with client
  const { data: requisition, error: reqErr } = await supabase
    .from("requisitions")
    .select(`
      id,
      title,
      jd_text,
      status,
      created_at,
      client:clients(id, name)
    `)
    .eq("id", params.id)
    .single();

  if (reqErr || !requisition) {
    notFound();
  }

  // Fetch criteria
  const { data: criteria } = await supabase
    .from("scorecard_criteria")
    .select("*")
    .eq("requisition_id", params.id)
    .order("position", { ascending: true });

  // Fetch applications with candidate details and score items
  const { data: applications } = await supabase
    .from("applications")
    .select(`
      id,
      stage,
      score,
      flags,
      scored_at,
      opened_by_recruiter_at,
      submitted_at,
      client_decision,
      candidate:candidates(
        id,
        full_name,
        current_title,
        experience_years,
        notice_days,
        location,
        skills,
        deleted_at
      ),
      score_items:score_items(
        id,
        criterion_id,
        verdict,
        evidence_quote,
        reason,
        points
      )
    `)
    .eq("requisition_id", params.id)
    .order("score", { ascending: false, nullsFirst: false });

  // Filter out DPDP deleted candidates
  const activeApplications = (applications || []).filter(
    (app) => app.candidate && !(app.candidate as any).deleted_at
  );

  const clientName = (requisition.client as any)?.name || "Unassigned Client";
  const candidateCount = activeApplications.length;
  const submittedCount = activeApplications.filter((a) => a.submitted_at).length;
  const scoredCount = activeApplications.filter((a) => a.score !== null).length;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/requisitions"
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <h1 className="text-base font-semibold text-slate-900 truncate">
              {requisition.title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-slate-50 text-slate-700">
              {requisition.status}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header Summary Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  {clientName}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Created {new Date(requisition.created_at).toLocaleDateString()}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">{requisition.title}</h2>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-4 sm:gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
              <div className="text-left sm:text-right">
                <p className="text-xs text-slate-500">Candidates</p>
                <p className="text-lg font-bold text-slate-900">{candidateCount}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-slate-500">Scored</p>
                <p className="text-lg font-bold text-indigo-600">{scoredCount}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-slate-500">Submitted</p>
                <p className="text-lg font-bold text-emerald-600">{submittedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Client Component with the 4 Tabs: Ranked | Upload | Pipeline | Scorecard */}
        <RequisitionTabs
          requisitionId={requisition.id}
          initialApplications={activeApplications as any}
          initialCriteria={criteria || []}
          jdText={requisition.jd_text}
        />
      </main>
    </div>
  );
}
