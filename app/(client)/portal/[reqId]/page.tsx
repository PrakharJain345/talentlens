import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { ClientShortlistView } from "@/components/client/ClientShortlistView";

export default async function ClientRequisitionShortlistPage({
  params,
}: {
  params: { reqId: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Profile lookup
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, client_id, clients(name)")
    .eq("id", user.id)
    .single();

  if (profile?.role === "recruiter") {
    redirect(`/requisitions/${params.reqId}`);
  }

  // Query candidates from client_shortlist view for this requisition
  const { data: candidates, error: candErr } = await supabase
    .from("client_shortlist")
    .select("*")
    .eq("requisition_id", params.reqId)
    .order("score", { ascending: false, nullsFirst: false });

  // Query evidence from client_score_items view
  const appIds = (candidates || []).map((c) => c.application_id);
  let evidenceMap: Record<string, any[]> = {};

  if (appIds.length > 0) {
    const { data: scoreItems } = await supabase
      .from("client_score_items")
      .select("*")
      .in("application_id", appIds);

    if (scoreItems) {
      for (const item of scoreItems) {
        if (!evidenceMap[item.application_id]) {
          evidenceMap[item.application_id] = [];
        }
        evidenceMap[item.application_id].push({
          id: item.score_item_id,
          label: item.criterion_label,
          kind: item.criterion_kind,
          verdict: item.verdict,
          evidence_quote: item.evidence_quote,
          reason: item.reason,
        });
      }
    }
  }

  const reqTitle = candidates?.[0]?.title || "Position Shortlist";
  const clientOrgName = (profile?.clients as any)?.name || "Client Portal";

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Mobile-first Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/portal"
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <h1 className="text-sm font-semibold text-slate-900 truncate">
              {reqTitle}
            </h1>
          </div>

          <div className="text-xs text-slate-500 font-medium shrink-0">
            {candidates?.length || 0} candidate{(candidates?.length || 0) === 1 ? "" : "s"}
          </div>
        </div>
      </header>

      {/* Main Single Column Container (max-w-2xl) */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <ClientShortlistView
          candidates={candidates || []}
          evidenceMap={evidenceMap}
          requisitionTitle={reqTitle}
        />
      </main>
    </div>
  );
}
