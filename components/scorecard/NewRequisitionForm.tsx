"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sparkles,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  AlertCircle,
  Loader2,
  Building2,
  Briefcase,
  SlidersHorizontal,
} from "lucide-react";
import { createRequisitionAction, type CriterionInput } from "@/app/(recruiter)/requisitions/actions";
import type { Client, CriterionKind } from "@/types/database";

interface NewRequisitionFormProps {
  clients: Client[];
}

const CRITERION_KINDS: { value: CriterionKind; label: string }[] = [
  { value: "skill", label: "Must-have Skill" },
  { value: "nice_skill", label: "Nice-to-have Skill" },
  { value: "experience", label: "Experience" },
  { value: "location", label: "Location" },
  { value: "notice", label: "Notice Period" },
  { value: "ctc", label: "CTC / Comp" },
];

export function NewRequisitionForm({ clients }: NewRequisitionFormProps) {
  const router = useRouter();

  // Form State
  const [selectedClientId, setSelectedClientId] = useState<string>(
    clients[0]?.id || ""
  );
  const [jdText, setJdText] = useState("");
  const [title, setTitle] = useState("");
  const [criteria, setCriteria] = useState<CriterionInput[]>([]);

  // UI State
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Quick Sample JD filler
  const handleFillSampleJd = () => {
    setJdText(
      "Senior Java Developer, 5-8 years, Spring Boot, Noida, notice up to 60 days."
    );
  };

  // 1. Extract Scorecard via API
  const handleExtract = async () => {
    if (!jdText.trim()) {
      setExtractError("Please paste or type a job description first.");
      return;
    }

    setIsExtracting(true);
    setExtractError(null);
    setSaveError(null);

    try {
      const response = await fetch("/api/requisitions/extract-scorecard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd_text: jdText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Extraction failed");
      }

      setTitle(data.title || "Senior Java Developer");
      setCriteria(
        (data.criteria || []).map((c: any, index: number) => ({
          kind: c.kind as CriterionKind,
          label: c.label,
          params: c.params || {},
          weight: c.weight || 3,
          required: Boolean(c.required),
          position: index,
        }))
      );
    } catch (err: any) {
      setExtractError(err.message || "Failed to extract scorecard.");
    } finally {
      setIsExtracting(false);
    }
  };

  // 2. Criteria Manipulations
  const handleUpdateCriterion = (
    index: number,
    field: keyof CriterionInput,
    value: any
  ) => {
    setCriteria((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddCriterion = () => {
    setCriteria((prev) => [
      ...prev,
      {
        kind: "skill",
        label: "",
        params: {},
        weight: 3,
        required: false,
        position: prev.length,
      },
    ]);
  };

  const handleRemoveCriterion = (index: number) => {
    setCriteria((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveCriterion = (index: number, direction: "up" | "down") => {
    setCriteria((prev) => {
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[newIndex];
      copy[newIndex] = temp;
      return copy;
    });
  };

  // 3. Save Requisition
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      setSaveError("Please select a client organization.");
      return;
    }
    if (!title.trim()) {
      setSaveError("Please provide a title for the requisition.");
      return;
    }
    if (criteria.length === 0) {
      setSaveError("At least one scorecard criterion is required.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const result = await createRequisitionAction({
      clientId: selectedClientId,
      title: title.trim(),
      jdText: jdText.trim(),
      criteria,
    });

    if (result.error) {
      setSaveError(result.error);
      setIsSaving(false);
    } else {
      router.push("/requisitions");
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {saveError && (
        <div className="flex items-center gap-2 p-3 text-xs rounded-md bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* STEP 1: Intake & Client Selection */}
      <Card className="border border-[#E5E7EB] shadow-sm bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#4F46E5]" />
                Job Intake & Client
              </CardTitle>
              <CardDescription className="text-xs text-[#64748B] mt-0.5">
                Select the client organization and input the raw job description.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFillSampleJd}
              className="text-xs text-[#4F46E5] hover:bg-indigo-50 border-indigo-200"
            >
              Load Sample Brief JD
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="client-select" className="text-xs font-medium text-[#0F172A]">
                Client Organization *
              </Label>
              <select
                id="client-select"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {clients.length === 0 ? (
                  <option value="">No clients found (run seed)</option>
                ) : (
                  clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-medium text-[#0F172A]">
                Requisition Title *
              </Label>
              <Input
                id="title"
                placeholder="e.g. Senior Java Developer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="jdText" className="text-xs font-medium text-[#0F172A]">
                Job Description Text *
              </Label>
              <span className="text-[11px] text-[#64748B]">
                Paste full text or summary
              </span>
            </div>
            <Textarea
              id="jdText"
              rows={5}
              placeholder="Paste requirements, experience, skills, location, notice period..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              className="font-mono text-xs leading-relaxed"
            />
          </div>

          {extractError && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-md bg-red-50 text-red-700 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{extractError}</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button
              type="button"
              onClick={handleExtract}
              disabled={isExtracting || !jdText.trim()}
              className="bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs gap-1.5"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Extracting Criteria with AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Extract Scorecard
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* STEP 2: Editable Scorecard Criteria */}
      <Card className="border border-[#E5E7EB] shadow-sm bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#4F46E5]" />
                Editable Scorecard Criteria ({criteria.length})
              </CardTitle>
              <CardDescription className="text-xs text-[#64748B] mt-0.5">
                Every score will be backed by evidence against these exact criteria. Adjust weights and mandatory flags.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCriterion}
              className="text-xs text-[#0F172A] gap-1 hover:bg-[#FAFAFA]"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Criterion
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {criteria.length === 0 ? (
            <div className="text-center py-10 px-4 border border-dashed border-[#E5E7EB] rounded-lg">
              <div className="w-10 h-10 rounded-full bg-indigo-50 text-[#4F46E5] flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-medium text-[#0F172A]">No criteria defined yet</h4>
              <p className="text-xs text-[#64748B] max-w-sm mx-auto mt-1 mb-3">
                Paste your JD above and click <strong>Extract Scorecard</strong> to generate criteria automatically, or add them manually.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCriterion}
                className="text-xs text-[#4F46E5] border-indigo-200"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Criterion Manually
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-[#64748B] text-left">
                    <th className="py-2.5 px-2 font-medium w-10 text-center">#</th>
                    <th className="py-2.5 px-3 font-medium">Criterion Label *</th>
                    <th className="py-2.5 px-3 font-medium w-40">Kind</th>
                    <th className="py-2.5 px-3 font-medium w-28 text-center">Weight (1–5)</th>
                    <th className="py-2.5 px-3 font-medium w-24 text-center">Required</th>
                    <th className="py-2.5 px-2 font-medium w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {criteria.map((c, index) => (
                    <tr key={index} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="py-2 px-2 text-center text-[#64748B] font-mono">
                        {index + 1}
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          value={c.label}
                          onChange={(e) =>
                            handleUpdateCriterion(index, "label", e.target.value)
                          }
                          placeholder="e.g. Spring Boot"
                          className="h-8 text-xs font-medium text-[#0F172A]"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={c.kind}
                          onChange={(e) =>
                            handleUpdateCriterion(
                              index,
                              "kind",
                              e.target.value as CriterionKind
                            )
                          }
                          className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          {CRITERION_KINDS.map((k) => (
                            <option key={k.value} value={k.value}>
                              {k.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <select
                          value={c.weight}
                          onChange={(e) =>
                            handleUpdateCriterion(
                              index,
                              "weight",
                              parseInt(e.target.value, 10)
                            )
                          }
                          className="flex h-8 w-20 mx-auto rounded-md border border-input bg-transparent px-2 text-xs text-center shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
                        >
                          {[1, 2, 3, 4, 5].map((w) => (
                            <option key={w} value={w}>
                              {w} {w === 5 ? "(High)" : w === 1 ? "(Low)" : ""}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <label className="inline-flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={c.required}
                            onChange={(e) =>
                              handleUpdateCriterion(
                                index,
                                "required",
                                e.target.checked
                              )
                            }
                            className="w-4 h-4 text-[#4F46E5] rounded border-gray-300 focus:ring-[#4F46E5]"
                          />
                        </label>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={index === 0}
                            onClick={() => handleMoveCriterion(index, "up")}
                            className="h-7 w-7 text-[#64748B] hover:text-[#0F172A]"
                            title="Move up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={index === criteria.length - 1}
                            onClick={() => handleMoveCriterion(index, "down")}
                            className="h-7 w-7 text-[#64748B] hover:text-[#0F172A]"
                            title="Move down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveCriterion(index)}
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Remove criterion"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t border-[#E5E7EB] pt-4">
          <p className="text-xs text-[#64748B]">
            Weights are used to compute candidate match scores out of 100.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/requisitions")}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving || criteria.length === 0}
              className="bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving Requisition...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Save Requisition & Scorecard
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}

