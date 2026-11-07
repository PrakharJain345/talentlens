"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ScoreBadge } from "@/components/candidates/ScoreBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  Briefcase,
  MapPin,
  Mail,
  Phone,
  Quote,
  AlertCircle,
  Eye,
  Send,
  MessageSquare,
} from "lucide-react";

interface ClientShortlistViewProps {
  candidates: any[];
  evidenceMap: Record<string, any[]>;
  requisitionTitle: string;
}

export function ClientShortlistView({
  candidates,
  evidenceMap,
  requisitionTitle,
}: ClientShortlistViewProps) {
  const router = useRouter();

  // Selected candidate state
  const [selectedAppId, setSelectedAppId] = useState<string>(
    candidates[0]?.application_id || ""
  );

  // Modals state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [proposedSlotDate, setProposedSlotDate] = useState("");
  const [slotNote, setSlotNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCandidate = candidates.find(
    (c) => c.application_id === selectedAppId
  );

  const selectedEvidence = selectedAppId ? evidenceMap[selectedAppId] || [] : [];

  const handleDecision = async (
    action: "shortlist" | "reject" | "slot_proposed",
    extraData: Record<string, any> = {}
  ) => {
    if (!selectedAppId) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/client/applications/${selectedAppId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...extraData,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Decision could not be saved");
      }

      router.refresh();
      setShowRejectModal(false);
      setShowSlotModal(false);
      setRejectReason("");
      setProposedSlotDate("");
      setSlotNote("");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!candidates || candidates.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
        <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
        <h3 className="text-sm font-semibold text-slate-900">
          No candidates submitted for this position yet
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Company A's recruitment team will submit candidates here once they complete screening.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      {/* Candidate Carousel / List */}
      <div className="space-y-4">
        {candidates.map((cand) => {
          const isSelected = cand.application_id === selectedAppId;
          const items = evidenceMap[cand.application_id] || [];
          const isShortlisted = cand.client_decision === "shortlisted";
          const isRejected = cand.client_decision === "rejected";
          const isSlot = cand.client_decision === "slot_proposed";

          return (
            <div
              key={cand.application_id}
              onClick={() => setSelectedAppId(cand.application_id)}
              className={`bg-white border rounded-xl p-5 shadow-xs transition-all cursor-pointer ${
                isSelected
                  ? "border-indigo-600 ring-2 ring-indigo-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900">
                      {cand.full_name || "Candidate"}
                    </h3>
                    {isShortlisted && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        Shortlisted
                      </span>
                    )}
                    {isRejected && (
                      <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                        Rejected
                      </span>
                    )}
                    {isSlot && (
                      <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                        Interview Proposed
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-semibold text-indigo-700">
                    {cand.current_title || "Role Unspecified"}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-500 pt-1 flex-wrap">
                    {cand.experience_years !== null && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5" />
                        {cand.experience_years}y exp
                      </span>
                    )}
                    {cand.notice_days !== null && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {cand.notice_days}d notice
                      </span>
                    )}
                    {cand.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {cand.location}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  <ScoreBadge score={cand.score} size="md" />
                </div>
              </div>

              {/* Recruiter Note if present */}
              {cand.recruiter_note && (
                <div className="mt-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg text-xs text-indigo-950 flex items-start gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Recruiter Note: </span>
                    {cand.recruiter_note}
                  </div>
                </div>
              )}

              {/* Masked Contact Info (PRD FR-8) */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-600 flex-wrap">
                <span className="flex items-center gap-1.5 font-mono">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {cand.email_masked || "••••••"}
                </span>
                <span className="flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {cand.phone_masked || "••••••"}
                </span>
                {!cand.contact_revealed && (
                  <span className="text-[10px] text-slate-400 italic">
                    (Masked until shortlisting)
                  </span>
                )}
              </div>

              {/* Top Evidence Snippets */}
              {items.length > 0 && (
                <div className="mt-3 space-y-2 pt-3 border-t border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                    Scorecard Evidence:
                  </p>
                  <div className="space-y-1.5">
                    {items.slice(0, 3).map((it, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-slate-50 border border-slate-100 rounded text-xs flex items-start gap-2"
                      >
                        <Quote className="w-3 h-3 text-indigo-500 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-800">
                            {it.label}:{" "}
                          </span>
                          <span className="text-slate-600 italic">
                            {it.evidence_quote ? `"${it.evidence_quote}"` : it.reason || "No quote"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom Action Bar for Mobile & Desktop (PRD FR-8, 44px min tap targets) */}
      {selectedCandidate && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3 px-4 shadow-lg">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <div className="hidden sm:block truncate text-xs text-slate-700">
              <span className="font-semibold text-slate-900 block truncate">
                {selectedCandidate.full_name}
              </span>
              <span className="text-slate-500">
                Decision for {requisitionTitle}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* Reject */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRejectModal(true)}
                disabled={isSubmitting}
                className="h-11 px-4 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 gap-1.5 flex-1 sm:flex-none"
              >
                <XCircle className="w-4 h-4" /> Reject
              </Button>

              {/* Propose Slot */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSlotModal(true)}
                disabled={isSubmitting}
                className="h-11 px-4 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 gap-1.5 flex-1 sm:flex-none"
              >
                <Calendar className="w-4 h-4" /> Propose Slot
              </Button>

              {/* Shortlist */}
              <Button
                size="sm"
                onClick={() => handleDecision("shortlist")}
                disabled={isSubmitting}
                className="h-11 px-5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-semibold flex-1 sm:flex-none"
              >
                <CheckCircle2 className="w-4 h-4" /> Shortlist
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal with Mandatory Reason */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-rose-600 font-semibold text-base">
              <XCircle className="w-5 h-5" />
              Reject Candidate
            </div>

            <p className="text-xs text-slate-600">
              Please specify the reason for rejection to help your recruiter calibrate future submissions.
            </p>

            <div className="space-y-2">
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="">Select a reason...</option>
                <option value="Notice period too long">Notice period too long</option>
                <option value="Missing core framework experience">Missing core framework experience</option>
                <option value="CTC expectation exceeds budget">CTC expectation exceeds budget</option>
                <option value="Seniority level misaligned">Seniority level misaligned</option>
                <option value="Location mismatch">Location mismatch</option>
                <option value="Other">Other</option>
              </select>

              {rejectReason === "Other" && (
                <Textarea
                  placeholder="Enter specific feedback..."
                  rows={3}
                  className="text-xs mt-2"
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRejectModal(false)}
                disabled={isSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handleDecision("reject", { reject_reason: rejectReason })}
                disabled={!rejectReason || isSubmitting}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs"
              >
                {isSubmitting ? "Submitting..." : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Propose Interview Slot Modal */}
      {showSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-indigo-600 font-semibold text-base">
              <Calendar className="w-5 h-5" />
              Propose Interview Slot
            </div>

            <p className="text-xs text-slate-600">
              Select your preferred interview date and time. The recruiter will coordinate with the candidate.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Proposed Date & Time:
                </label>
                <Input
                  type="datetime-local"
                  value={proposedSlotDate}
                  onChange={(e) => setProposedSlotDate(e.target.value)}
                  className="text-xs h-10"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Optional Note:
                </label>
                <Textarea
                  placeholder="e.g. Technical Round 1 with Lead Architect (Google Meet)"
                  value={slotNote}
                  onChange={(e) => setSlotNote(e.target.value)}
                  rows={3}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSlotModal(false)}
                disabled={isSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  handleDecision("slot_proposed", {
                    proposed_slot: proposedSlotDate,
                    slot_note: slotNote,
                  })
                }
                disabled={!proposedSlotDate || isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              >
                {isSubmitting ? "Submitting..." : "Submit Slot"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
