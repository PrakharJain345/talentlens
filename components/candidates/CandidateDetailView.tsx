"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ScoreBadge } from "@/components/candidates/ScoreBadge";
import { EvidenceList } from "@/components/candidates/EvidenceList";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Send,
  Trash2,
  FileText,
  Eye,
  AlertTriangle,
  Lock,
  Building2,
  Calendar,
  Clock,
  MapPin,
  Briefcase,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface CandidateDetailViewProps {
  application: any;
  candidate: any;
  criteria: any[];
  scoreItems: any[];
  consent: any;
  requisitionId: string;
  originalFileSignedUrl: string | null;
}

export function CandidateDetailView({
  application,
  candidate,
  criteria,
  scoreItems,
  consent,
  requisitionId,
  originalFileSignedUrl,
}: CandidateDetailViewProps) {
  const router = useRouter();

  const [hasOpened, setHasOpened] = useState(Boolean(application.opened_by_recruiter_at));
  const [recruiterNote, setRecruiterNote] = useState(application.recruiter_note || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(Boolean(application.submitted_at));
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRawText, setShowRawText] = useState(false);

  // Hard Rule 5 & FR-7: Record opened_by_recruiter_at upon opening the candidate detail
  useEffect(() => {
    const markOpened = async () => {
      try {
        const res = await fetch(`/api/applications/${application.id}/open`, {
          method: "POST",
        });
        if (res.ok) {
          setHasOpened(true);
        }
      } catch (err) {
        console.warn("[CandidateDetail] Failed to record open status:", err);
      }
    };

    markOpened();
  }, [application.id]);

  // Handle submit to client
  const handleSubmitToClient = async () => {
    if (!hasOpened) {
      alert("You must open and review the candidate's CV before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/applications/${application.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recruiter_note: recruiterNote }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit candidate to client");
      }

      setIsSubmitted(true);
      router.refresh();
    } catch (err: any) {
      alert("Submission error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle DPDP Candidate Deletion
  const handleDeleteCandidate = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/delete`, {
        method: "POST",
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to delete candidate");
      }

      alert("Candidate and personal data deleted successfully in accordance with DPDP Act 2023.");
      router.push(`/requisitions/${requisitionId}`);
    } catch (err: any) {
      alert("Deletion error: " + err.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Format evidence items for EvidenceList
  const evidenceListItems = criteria.map((crit) => {
    const scored = scoreItems.find((s) => s.criterion_id === crit.id);
    return {
      criterionLabel: crit.label,
      criterionKind: crit.kind,
      required: crit.required,
      verdict: scored?.verdict ?? "unknown",
      evidenceQuote: scored?.evidence_quote ?? null,
      reason: scored?.reason ?? null,
      points: scored?.points ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Profile Summary Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-xl font-bold text-slate-900">
                {candidate.full_name || "Candidate Profile"}
              </h2>
              <Badge variant="outline" className="text-xs font-normal capitalize">
                Stage: {application.stage}
              </Badge>
              {isSubmitted && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  Submitted to Client
                </span>
              )}
            </div>

            <p className="text-sm font-medium text-slate-700">
              {candidate.current_title || "Role Unspecified"}
            </p>

            <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 flex-wrap">
              {candidate.experience_years !== null && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  {candidate.experience_years} years experience
                </span>
              )}
              {candidate.notice_days !== null && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {candidate.notice_days} days notice
                </span>
              )}
              {candidate.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {candidate.location}
                </span>
              )}
              {candidate.current_ctc_lpa && (
                <span>CTC: ₹{candidate.current_ctc_lpa} LPA</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ScoreBadge score={application.score} size="lg" />
          </div>
        </div>

        {/* Skills Tags */}
        {candidate.skills && candidate.skills.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100">
            <span className="text-xs font-medium text-slate-500 mr-1">Skills:</span>
            {candidate.skills.map((skill: string, idx: number) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-mono"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {/* Summary text */}
        {candidate.summary && (
          <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg leading-relaxed">
            {candidate.summary}
          </p>
        )}
      </div>

      {/* Blind Scoring Fairness Banner (PRD FR-5 / FR-7) */}
      <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-start gap-3">
        <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 leading-relaxed">
          <span className="font-semibold">AI Safeguard (Blind Scoring): </span>
          The AI model scored this candidate using only their anonymized and redacted CV text.
          Personal identifiers (name, age, date of birth, gender, marital status, nationality)
          were automatically scrubbed prior to scoring to prevent demographic bias.
        </div>
      </div>

      {/* Main Grid: Evidence on Left, Submission & Consent on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Scorecard Evidence */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Scorecard Evidence Verification
              </h3>
              <span className="text-xs text-slate-500">
                Quotes verified against redacted text
              </span>
            </div>

            <EvidenceList items={evidenceListItems} />
          </div>

          {/* Extracted CV Viewer */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-900">Extracted CV Text</h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRawText(!showRawText)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {showRawText ? "Show Redacted Text" : "Show Full Text (PII)"}
                </button>
                {originalFileSignedUrl && (
                  <a
                    href={originalFileSignedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 border border-slate-200 px-2 py-0.5 rounded"
                  >
                    Original File <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg max-h-80 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap">
              {showRawText
                ? candidate.cv_text || "No raw CV text stored."
                : candidate.cv_text_redacted || candidate.cv_text || "No CV text available."}
            </div>
          </div>
        </div>

        {/* Right Column: Actions & Privacy Gate */}
        <div className="space-y-6">
          {/* Submit to Client Card (PRD FR-7) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Submit to Client</h3>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700">
                Recruiter Note for Client:
              </label>
              <Textarea
                placeholder="Highlight candidate strengths, interview availability, or context..."
                value={recruiterNote}
                onChange={(e) => setRecruiterNote(e.target.value)}
                rows={4}
                className="text-xs"
              />
            </div>

            {/* Submit Button with Gate Validation */}
            <div className="space-y-2">
              <Button
                onClick={handleSubmitToClient}
                disabled={!hasOpened || isSubmitting || isSubmitted}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmitted
                  ? "Already Submitted to Client"
                  : isSubmitting
                  ? "Submitting..."
                  : "Submit Candidate to Client"}
              </Button>

              {!hasOpened && (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 leading-tight">
                  <AlertCircle className="w-3.5 h-3.5 inline mr-1 text-amber-600" />
                  Submit is locked until this candidate's CV has been opened and reviewed.
                </p>
              )}

              {isSubmitted && (
                <p className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200 leading-tight">
                  <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                  Submitted at {new Date(application.submitted_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* DPDP Consent & Data Protection Record (PRD FR-9) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              DPDP Act 2023 Consent Record
            </div>

            <div className="text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Purpose:</span>
                <span className="font-medium text-slate-800">
                  {consent?.purpose || "Hiring use only"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Source:</span>
                <span className="font-medium text-slate-800">
                  {consent?.source || "recruiter_attested"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Granted at:</span>
                <span className="font-medium text-slate-800">
                  {consent?.granted_at
                    ? new Date(consent.granted_at).toLocaleDateString()
                    : "On CV Upload"}
                </span>
              </div>
            </div>

            {/* Right to Erasure / Deletion */}
            <div className="pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                className="w-full text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Erase Candidate (DPDP Deletion)
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-rose-600 font-semibold text-base">
              <AlertTriangle className="w-5 h-5" />
              Confirm DPDP Deletion
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This action exercises the candidate's Right to Erasure under the Digital Personal
              Data Protection Act 2023. It will permanently delete the candidate's original file
              from storage, nullify all personal identifying information (name, email, phone, CV text),
              and record the deletion in the access audit log.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteCandidate}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5"
              >
                {isDeleting ? "Erasing..." : "Permanently Erase"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
