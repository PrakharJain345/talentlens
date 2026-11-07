import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, CheckCircle2, Sliders, TrendingUp, Users } from "lucide-react";

export default async function CalibrationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Sample weekly calibration data comparing AI rank vs Recruiter final selection
  const calibrationSamples = [
    {
      requisitionTitle: "Senior Java Developer",
      client: "Acme Corp",
      sampleSize: 12,
      aiTopCandidate: "Ritika Bansal (Score 91)",
      recruiterChoice: "Ritika Bansal (Hired)",
      agreement: "100% Match",
      status: "High Alignment",
      varianceNote: "AI and recruiter both identified core Spring Boot & Kafka competency.",
    },
    {
      requisitionTitle: "Backend Software Engineer",
      client: "Beta Retail",
      sampleSize: 8,
      aiTopCandidate: "Kavita Sharma (Score 95)",
      recruiterChoice: "Kavita Sharma (Shortlisted)",
      agreement: "100% Match",
      status: "High Alignment",
      varianceNote: "Blind scoring accurately highlighted microservices architecture without demographic bias.",
    },
    {
      requisitionTitle: "Java Developer (Contract)",
      client: "FinTech Partners",
      sampleSize: 15,
      aiTopCandidate: "Pooja Nair (Score 23 - Missing Spring Boot)",
      recruiterChoice: "Manish Gupta (Score 78)",
      agreement: "Calibrated",
      status: "Recruiter Override",
      varianceNote: "Recruiter overrode lower scorers due to urgent 15-day joining requirement.",
    },
  ];

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
              Weekly AI vs Recruiter Calibration
            </h1>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
            Delivery Head View
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Weekly Calibration Review</h2>
          <p className="text-xs text-slate-500 mt-1">
            Weekly sample comparing AI scorecard rankings against recruiter final hiring decisions
            to monitor calibration, agreement rates, and model reliability.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <p className="text-xs text-slate-500 font-medium">Average Agreement Rate</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">87.5%</p>
            <p className="text-[11px] text-slate-400 mt-1">Within ±1 position of AI rank</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <p className="text-xs text-slate-500 font-medium">Requisitions Calibrated</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">3 Requisitions</p>
            <p className="text-[11px] text-slate-400 mt-1">35 total candidates sampled</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <p className="text-xs text-slate-500 font-medium">Zero Auto-Rejection Compliance</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">100%</p>
            <p className="text-[11px] text-slate-400 mt-1">All low scorers remained visible & searchable</p>
          </div>
        </div>

        {/* Calibration Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Requisition & Client</th>
                <th className="py-3 px-4 font-semibold">AI Top Rank</th>
                <th className="py-3 px-4 font-semibold">Recruiter Selection</th>
                <th className="py-3 px-3 font-semibold text-center">Agreement</th>
                <th className="py-3 px-4 font-semibold">Calibration Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {calibrationSamples.map((sample, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-900">{sample.requisitionTitle}</p>
                    <p className="text-slate-500 text-[11px]">{sample.client} • {sample.sampleSize} CVs sampled</p>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-indigo-700">
                    {sample.aiTopCandidate}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    {sample.recruiterChoice}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {sample.agreement}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 text-[11px] leading-relaxed">
                    {sample.varianceNote}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
