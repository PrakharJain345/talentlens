import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  LogOut,
  Briefcase,
  ChevronRight,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";

export default async function ClientPortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Profile and organization lookup
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, clients(name)")
    .eq("id", user.id)
    .single();

  const role = profile?.role || user.user_metadata?.role;

  if (role === "recruiter") {
    redirect("/requisitions");
  }

  const clientOrgName =
    (profile?.clients as any)?.name ||
    user.user_metadata?.client_name ||
    "Client Partner";

  // Query submitted candidates visible to this client via the secure view
  const { data: shortlists, error: shortlistErr } = await supabase
    .from("client_shortlist")
    .select("*");

  // Group shortlists by requisition
  const reqMap = new Map<
    string,
    {
      requisitionId: string;
      title: string;
      total: number;
      pending: number;
      shortlisted: number;
    }
  >();

  if (shortlists) {
    for (const item of shortlists) {
      const existing = reqMap.get(item.requisition_id);
      const isPending = item.client_decision === "pending";
      const isShortlisted = item.client_decision === "shortlisted";

      if (existing) {
        existing.total++;
        if (isPending) existing.pending++;
        if (isShortlisted) existing.shortlisted++;
      } else {
        reqMap.set(item.requisition_id, {
          requisitionId: item.requisition_id,
          title: item.title,
          total: 1,
          pending: isPending ? 1 : 0,
          shortlisted: isShortlisted ? 1 : 0,
        });
      }
    }
  }

  const requisitionsList = Array.from(reqMap.values());

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Mobile-first Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-semibold text-sm">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-sm text-slate-900 block leading-tight">
                {clientOrgName}
              </span>
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                Client Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <form action={signOutAction}>
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="h-8 text-xs text-slate-500 hover:text-slate-900 gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Container - Single column, Mobile-first (max-w-2xl) */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Submitted Shortlists</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review top candidates submitted by Company A with evidence-backed ratings.
          </p>
        </div>

        {requisitionsList.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3 shadow-xs">
            <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-900">
              No Candidates Submitted Yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your recruitment partner has not yet submitted candidates for review. Once candidates
              are screened and submitted, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requisitionsList.map((req) => (
              <Link
                key={req.requisitionId}
                href={`/portal/${req.requisitionId}`}
                className="block bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <h2 className="text-base font-semibold text-slate-900 hover:text-indigo-600 transition-colors">
                      {req.title}
                    </h2>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        {req.total} Submitted
                      </span>
                      {req.pending > 0 && (
                        <span className="flex items-center gap-1 text-amber-600 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {req.pending} Awaiting Decision
                        </span>
                      )}
                      {req.shortlisted > 0 && (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {req.shortlisted} Shortlisted
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
