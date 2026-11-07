import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { ShieldCheck, LogOut, ArrowLeft } from "lucide-react";
import { NewRequisitionForm } from "@/components/scorecard/NewRequisitionForm";
import type { Client } from "@/types/database";

export default async function NewRequisitionPage() {
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

  // Fetch client organizations
  const { data: clientsData, error: clientsError } = await supabase
    .from("clients")
    .select("id, name")
    .order("name", { ascending: true });

  const clients: Client[] = (clientsData as Client[]) || [];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="border-b border-[#E5E7EB] bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/requisitions"
              className="w-8 h-8 rounded-lg bg-[#FAFAFA] border border-[#E5E7EB] text-[#64748B] hover:text-[#0F172A] flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-[#0F172A]">TalentLens</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                Recruiter
              </span>
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
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1">
            <Link href="/requisitions" className="hover:underline">
              Requisitions
            </Link>
            <span>/</span>
            <span className="text-[#0F172A] font-medium">New Requisition</span>
          </div>
          <h1 className="text-xl font-semibold text-[#0F172A]">Create Requisition</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Extract and configure an AI scorecard from a job description before uploading CVs.
          </p>
        </div>

        {clientsError && (
          <div className="mb-6 p-3 text-xs rounded-md bg-red-50 text-red-700 border border-red-200">
            Failed to load client organizations: {clientsError.message}
          </div>
        )}

        <NewRequisitionForm clients={clients} />
      </main>
    </div>
  );
}

