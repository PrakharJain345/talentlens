import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Eye, Send, Trash2, CheckCircle2 } from "lucide-react";

export default async function AuditLogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch access log entries
  const { data: logs } = await supabase
    .from("access_log")
    .select(`
      id,
      action,
      at,
      actor_id,
      candidate_id,
      application_id,
      profiles:actor_id (
        full_name,
        role
      )
    `)
    .order("at", { ascending: false })
    .limit(50);

  const formatAction = (action: string) => {
    switch (action) {
      case "viewed_cv":
        return {
          label: "Viewed Candidate CV",
          badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
        };
      case "viewed_contact":
        return {
          label: "Revealed Contact Info",
          badge: "bg-purple-50 text-purple-700 border-purple-200",
        };
      case "submitted":
        return {
          label: "Submitted to Client",
          badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
      case "decided":
        return {
          label: "Client Decision Recorded",
          badge: "bg-sky-50 text-sky-700 border-sky-200",
        };
      case "deleted":
        return {
          label: "DPDP Right to Erasure (Deleted)",
          badge: "bg-rose-50 text-rose-700 border-rose-200",
        };
      default:
        return {
          label: action,
          badge: "bg-slate-50 text-slate-700 border-slate-200",
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/requisitions"
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <h1 className="text-base font-semibold text-slate-900">
              DPDP Act 2023 Access Log
            </h1>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Immutable Audit Trail
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Data Access & Audit Trail</h2>
          <p className="text-xs text-slate-500 mt-1">
            Immutable log recording who accessed candidate personal data, viewed CVs, unmasked contact
            details, or executed DPDP deletions.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Actor / User</th>
                <th className="py-3 px-4 font-semibold">Action Performed</th>
                <th className="py-3 px-4 font-semibold">Candidate ID / App ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(!logs || logs.length === 0) ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                    No access log events recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actionConfig = formatAction(log.action);
                  const actorName = (log.profiles as any)?.full_name || "System User";
                  const actorRole = (log.profiles as any)?.role || "User";

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(log.at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900">{actorName}</span>
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium capitalize">
                          {actorRole}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${actionConfig.badge}`}
                        >
                          {actionConfig.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {log.candidate_id ? log.candidate_id.slice(0, 8) + "..." : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

