"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ScoreBadge } from "@/components/candidates/ScoreBadge";
import { EvidenceList } from "@/components/candidates/EvidenceList";
import { Dropzone } from "@/components/upload/Dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ListFilter,
  Search,
  UploadCloud,
  Kanban,
  CheckSquare,
  ChevronRight,
  AlertTriangle,
  SlidersHorizontal,
  ExternalLink,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
} from "lucide-react";
import type { ScorecardCriterion, PipelineStage } from "@/types/database";

interface RequisitionTabsProps {
  requisitionId: string;
  initialApplications: any[];
  initialCriteria: ScorecardCriterion[];
  jdText: string;
}

const STAGES: { key: PipelineStage; label: string }[] = [
  { key: "sourced", label: "Sourced" },
  { key: "screened", label: "Screened" },
  { key: "submitted", label: "Submitted" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interview", label: "Interview" },
  { key: "offered", label: "Offered" },
  { key: "joined", label: "Joined" },
  { key: "rejected", label: "Rejected" },
];

export function RequisitionTabs({
  requisitionId,
  initialApplications,
  initialCriteria,
  jdText,
}: RequisitionTabsProps) {
  const [activeTab, setActiveTab] = useState<"ranked" | "upload" | "pipeline" | "scorecard">(
    "ranked"
  );

  // Filters for Ranked tab
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [minScore, setMinScore] = useState<number>(0);

  // Scorecard state
  const [criteria, setCriteria] = useState<ScorecardCriterion[]>(initialCriteria);
  const [isSavingCriteria, setIsSavingCriteria] = useState(false);
  const [criteriaSavedMessage, setCriteriaSavedMessage] = useState(false);

  // Filtered applications
  const filteredApplications = useMemo(() => {
    return initialApplications.filter((app) => {
      const cand = app.candidate;
      if (!cand) return false;

      // Stage filter
      if (selectedStage !== "all" && app.stage !== selectedStage) {
        return false;
      }

      // Min score filter
      if (minScore > 0) {
        const scoreVal = app.score ?? 0;
        if (scoreVal < minScore) return false;
      }

      // Search query filter (matches name, current_title, skills)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (cand.full_name || "").toLowerCase().includes(q);
        const titleMatch = (cand.current_title || "").toLowerCase().includes(q);
        const skillsMatch = (cand.skills || []).some((s: string) =>
          s.toLowerCase().includes(q)
        );
        if (!nameMatch && !titleMatch && !skillsMatch) return false;
      }

      return true;
    });
  }, [initialApplications, selectedStage, minScore, searchQuery]);

  // Stage counts for Pipeline tab
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of STAGES) {
      counts[s.key] = 0;
    }
    for (const app of initialApplications) {
      if (counts[app.stage] !== undefined) {
        counts[app.stage]++;
      }
    }
    return counts;
  }, [initialApplications]);

  // Scorecard criteria handlers
  const handleCriterionChange = (
    index: number,
    field: keyof ScorecardCriterion,
    value: any
  ) => {
    setCriteria((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const handleAddCriterion = () => {
    const newCrit: any = {
      id: "temp-" + Date.now(),
      requisition_id: requisitionId,
      kind: "skill",
      label: "New Skill",
      weight: 3,
      required: false,
      position: criteria.length,
      params: {},
    };
    setCriteria((prev) => [...prev, newCrit]);
  };

  const handleRemoveCriterion = (index: number) => {
    setCriteria((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveCriteria = async () => {
    setIsSavingCriteria(true);
    try {
      const res = await fetch(`/api/requisitions/${requisitionId}/criteria`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria }),
      });

      if (res.ok) {
        setCriteriaSavedMessage(true);
        setTimeout(() => setCriteriaSavedMessage(false), 3000);
      } else {
        alert("Failed to save criteria");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSavingCriteria(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("ranked")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "ranked"
              ? "border-indigo-600 text-indigo-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ListFilter className="w-4 h-4" />
          Ranked Candidates
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {initialApplications.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("upload")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "upload"
              ? "border-indigo-600 text-indigo-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          Upload CVs
        </button>

        <button
          onClick={() => setActiveTab("pipeline")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "pipeline"
              ? "border-indigo-600 text-indigo-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Kanban className="w-4 h-4" />
          Pipeline
        </button>

        <button
          onClick={() => setActiveTab("scorecard")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "scorecard"
              ? "border-indigo-600 text-indigo-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          Scorecard
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {criteria.length}
          </span>
        </button>
      </div>

      {/* TAB 1: RANKED CANDIDATES */}
      {activeTab === "ranked" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-3.5 border border-slate-200 rounded-xl shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search candidates by name, current title, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9 bg-slate-50/50"
              />
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Stage filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="shrink-0 font-medium">Stage:</span>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="h-9 px-2 text-xs rounded-md border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">All Stages</option>
                  {STAGES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Min Score slider */}
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="shrink-0 font-medium">Min Score:</span>
                <span className="font-mono font-semibold text-slate-900 w-6">
                  {minScore}
                </span>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="10"
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {(searchQuery || selectedStage !== "all" || minScore > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedStage("all");
                    setMinScore(0);
                  }}
                  className="text-xs h-8 text-slate-500 hover:text-slate-800"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Candidates List */}
          {filteredApplications.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <SlidersHorizontal className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-900">No candidates match your criteria</p>
              <p className="text-xs text-slate-500 mt-1">
                {initialApplications.length === 0
                  ? "Upload CVs to this requisition to begin screening."
                  : "Try loosening your search or score filters. Low scorers are always preserved."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredApplications.map((app) => {
                const cand = app.candidate;
                const evidenceItems = (app.score_items || []).map((si: any) => {
                  const crit = criteria.find((c) => c.id === si.criterion_id);
                  return {
                    criterionLabel: crit?.label || "Requirement",
                    verdict: si.verdict,
                    evidenceQuote: si.evidence_quote,
                    reason: si.reason,
                  };
                });

                return (
                  <Link
                    key={app.id}
                    href={`/requisitions/${requisitionId}/candidates/${app.id}`}
                    className="block bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      {/* Left: Score + Info */}
                      <div className="flex items-start gap-4">
                        <ScoreBadge score={app.score} size="md" />

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-base text-slate-900 hover:text-indigo-600 transition-colors">
                              {cand.full_name || "Anonymous Candidate"}
                            </h3>
                            <Badge variant="outline" className="text-xs font-normal capitalize">
                              {app.stage}
                            </Badge>
                            {app.submitted_at && (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                Submitted
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                            <span className="font-medium text-slate-800">
                              {cand.current_title || "Software Engineer"}
                            </span>
                            <span>•</span>
                            <span>
                              {cand.experience_years !== null
                                ? `${cand.experience_years} yrs exp`
                                : "Exp unspecified"}
                            </span>
                            <span>•</span>
                            <span>
                              {cand.notice_days !== null
                                ? `${cand.notice_days}d notice`
                                : "Immediate"}
                            </span>
                            {cand.location && (
                              <>
                                <span>•</span>
                                <span>{cand.location}</span>
                              </>
                            )}
                          </div>

                          {/* Flags (missing must-haves) */}
                          {app.flags && app.flags.length > 0 && (
                            <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                              {app.flags.map((flag: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200"
                                >
                                  <AlertTriangle className="w-3 h-3 text-rose-500" />
                                  {flag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Top 2 Evidence Snippets */}
                          <div className="pt-2">
                            <EvidenceList items={evidenceItems} compact />
                          </div>
                        </div>
                      </div>

                      {/* Right: Open link arrow */}
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center text-xs font-medium text-indigo-600">
                        <span>Review</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: UPLOAD CVS */}
      {activeTab === "upload" && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900">Bulk CV Upload</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Drop PDFs and DOCX files to parse profiles, perform deduplication, and score against the
              scorecard.
            </p>
          </div>
          <Dropzone
            requisitionId={requisitionId}
            onProcessingComplete={() => {
              window.location.reload();
            }}
          />
        </div>
      )}

      {/* TAB 3: PIPELINE */}
      {activeTab === "pipeline" && (
        <div className="space-y-6">
          {/* Stepper overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {STAGES.map((s) => (
              <div
                key={s.key}
                className="bg-white border border-slate-200 rounded-lg p-3 text-center shadow-xs"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {s.label}
                </p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {stageCounts[s.key] || 0}
                </p>
              </div>
            ))}
          </div>

          {/* Grouped by stage */}
          <div className="space-y-4">
            {STAGES.filter((s) => stageCounts[s.key] > 0).map((s) => {
              const stageApps = initialApplications.filter((a) => a.stage === s.key);
              return (
                <div
                  key={s.key}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs"
                >
                  <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                      {s.label} ({stageApps.length})
                    </h4>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {stageApps.map((app) => (
                      <div
                        key={app.id}
                        className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/50 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <ScoreBadge score={app.score} size="sm" showBar={false} />
                          <div>
                            <p className="font-semibold text-slate-900">
                              {app.candidate?.full_name || "Anonymous Candidate"}
                            </p>
                            <p className="text-slate-500">
                              {app.candidate?.current_title} • {app.candidate?.experience_years} yrs exp
                            </p>
                          </div>
                        </div>

                        <Link
                          href={`/requisitions/${requisitionId}/candidates/${app.id}`}
                          className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                        >
                          View <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: SCORECARD */}
      {activeTab === "scorecard" && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Scorecard Criteria</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Criteria used for blind AI scoring and evidence extraction.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddCriterion}
                className="text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Criterion
              </Button>
              <Button
                size="sm"
                onClick={handleSaveCriteria}
                disabled={isSavingCriteria}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {isSavingCriteria ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>

          {criteriaSavedMessage && (
            <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Scorecard criteria saved successfully!
            </div>
          )}

          {/* Criteria Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 text-left font-semibold">Kind</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Label</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Weight (1-5)</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Required</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {criteria.map((crit, idx) => (
                  <tr key={crit.id || idx} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3">
                      <select
                        value={crit.kind}
                        onChange={(e) =>
                          handleCriterionChange(idx, "kind", e.target.value)
                        }
                        className="h-8 px-2 rounded border border-slate-200 text-xs bg-white font-medium"
                      >
                        <option value="skill">Skill</option>
                        <option value="nice_skill">Nice to Have</option>
                        <option value="experience">Experience</option>
                        <option value="location">Location</option>
                        <option value="notice">Notice</option>
                        <option value="ctc">CTC</option>
                      </select>
                    </td>

                    <td className="py-2 px-3">
                      <Input
                        type="text"
                        value={crit.label}
                        onChange={(e) =>
                          handleCriterionChange(idx, "label", e.target.value)
                        }
                        className="h-8 text-xs font-medium"
                      />
                    </td>

                    <td className="py-2 px-3 text-center">
                      <select
                        value={crit.weight}
                        onChange={(e) =>
                          handleCriterionChange(idx, "weight", Number(e.target.value))
                        }
                        className="h-8 px-2 rounded border border-slate-200 text-xs bg-white font-medium text-center"
                      >
                        <option value={1}>1 (Low)</option>
                        <option value={2}>2</option>
                        <option value={3}>3 (Normal)</option>
                        <option value={4}>4</option>
                        <option value={5}>5 (High)</option>
                      </select>
                    </td>

                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={crit.required}
                        onChange={(e) =>
                          handleCriterionChange(idx, "required", e.target.checked)
                        }
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>

                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleRemoveCriterion(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
