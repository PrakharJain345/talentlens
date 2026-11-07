import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  ShieldCheck,
  LogOut,
  Briefcase,
  Plus,
  Users,
  Send,
  Building2,
  Calendar,
  AlertCircle,
  FileText,
} from "lucide-react";

export default async function RequisitionsPage() {
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
    .select("*")
    .eq("id", user.id)
    .single();

  const role = profile?.role || user.user_metadata?.role || "recruiter";

  if (role === "client") {
    redirect("/portal");
  }

  // Query requisitions with client info and application counts
  const { data: requisitionsData, error: reqsError } = await supabase
    .from("requisitions")
    .select(`
      id,
      title,
      status,
      created_at,
      client_id,
      clients (
        name
      ),
      applications (
        id,
        stage,
        submitted_at
      )
    `)
    .order("created_at", { ascending: false });

  const requisitions = requisitionsData || [];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="border-b border-[#E5E7EB] bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center font-semibold text-sm">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-sm text-[#0F172A]">TalentLens</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                Recruiter
              </span>
            </div>
            <div className="hidden md:flex items-center gap-2 ml-4">
              <Link
                href="/calibration"
                className="text-xs text-slate-600 hover:text-indigo-600 font-medium px-2 py-1 rounded hover:bg-slate-100 transition-colors"
              >
                AI vs Human Calibration
              </Link>
              <Link
                href="/audit-log"
                className="text-xs text-slate-600 hover:text-indigo-600 font-medium px-2 py-1 rounded hover:bg-slate-100 transition-colors"
              >
                DPDP Access Log
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-[#64748B]">
              {profile?.full_name || user.email}
            </span>
            <form action={signOutAction}>
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="h-8 text-xs text-[#64748B] hover:text-[#0F172A] gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#0F172A]">Requisitions</h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Manage job requisitions, scorecards, and candidate shortlists.
            </p>
          </div>
          <Link href="/requisitions/new">
            <Button
              size="sm"
              className="bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              New Requisition
            </Button>
          </Link>
        </div>

        {/* ERROR STATE */}
        {reqsError && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Failed to load requisitions</p>
              <p className="mt-0.5 text-red-700">{reqsError.message}</p>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!reqsError && requisitions.length === 0 && (
          <Card className="border border-[#E5E7EB] shadow-sm bg-white text-center py-12 px-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#4F46E5] flex items-center justify-center mx-auto mb-3">
              <Briefcase className="w-6 h-6" />
            </div>
            <CardTitle className="text-base font-semibold text-[#0F172A]">
              No requisitions created yet
            </CardTitle>
            <CardDescription className="text-xs text-[#64748B] max-w-sm mx-auto mt-1 mb-5">
              Start by pasting a job description to extract an editable scorecard and manage candidates.
            </CardDescription>
            <Link href="/requisitions/new">
              <Button
                size="sm"
                className="bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Create First Requisition
              </Button>
            </Link>
          </Card>
        )}

        {/* REQUISITIONS LIST TABLE */}
        {!reqsError && requisitions.length > 0 && (
          <Card className="border border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[#64748B] uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 font-medium">Requisition Title</th>
                    <th className="py-3 px-4 font-medium">Client</th>
                    <th className="py-3 px-3 font-medium text-center">Status</th>
                    <th className="py-3 px-3 font-medium text-center">Candidates</th>
                    <th className="py-3 px-3 font-medium text-center">Submitted</th>
                    <th className="py-3 px-4 font-medium">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {requisitions.map((req: any) => {
                    const clientName = req.clients?.name || "Client Org";
                    const candidateCount = req.applications?.length || 0;
                    const submittedCount =
                      req.applications?.filter(
                        (a: any) =>
                          a.submitted_at != null ||
                          ["submitted", "shortlisted", "interview", "offered", "joined"].includes(
                            a.stage
                          )
                      ).length || 0;

                    const createdDate = req.created_at
                      ? new Date(req.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—";

                    return (
                      <tr
                        key={req.id}
                        className="hover:bg-indigo-50/40 transition-colors group cursor-pointer"
                      >
                        <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                          <Link
                            href={`/requisitions/${req.id}`}
                            className="flex items-center gap-2 group-hover:text-indigo-600 transition-colors"
                          >
                            <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span className="font-semibold text-sm">
                              {req.title}
                            </span>
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 text-[#334155]">
                          <Link href={`/requisitions/${req.id}`} className="block">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-[#64748B]" />
                              <span>{clientName}</span>
                            </div>
                          </Link>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <Link href={`/requisitions/${req.id}`} className="inline-block">
                            <Badge
                              variant={req.status === "open" ? "success" : "secondary"}
                              className="capitalize text-[10px] font-medium"
                            >
                              {req.status}
                            </Badge>
                          </Link>
                        </td>
                        <td className="py-3.5 px-3 text-center font-medium text-[#0F172A]">
                          <Link href={`/requisitions/${req.id}`} className="inline-flex items-center gap-1 text-xs">
                            <Users className="w-3.5 h-3.5 text-[#64748B]" />
                            <span>{candidateCount}</span>
                          </Link>
                        </td>
                        <td className="py-3.5 px-3 text-center font-medium text-[#0F172A]">
                          <Link href={`/requisitions/${req.id}`} className="inline-flex items-center gap-1 text-xs">
                            <Send className="w-3.5 h-3.5 text-[#16A34A]" />
                            <span>{submittedCount}</span>
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 text-[#64748B]">
                          <Link href={`/requisitions/${req.id}`} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                              <span>{createdDate}</span>
                            </div>
                            <span className="text-xs font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              Open →
                            </span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
