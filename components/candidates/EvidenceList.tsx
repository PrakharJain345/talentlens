import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, Quote } from "lucide-react";
import type { Verdict } from "@/types/database";

export interface EvidenceItem {
  id?: string;
  criterionLabel: string;
  criterionKind?: string;
  required?: boolean;
  verdict: Verdict;
  evidenceQuote: string | null;
  reason?: string | null;
  points?: number;
}

interface EvidenceListProps {
  items: EvidenceItem[];
  compact?: boolean;
}

export function EvidenceList({ items, compact = false }: EvidenceListProps) {
  if (!items || items.length === 0) {
    return (
      <div className="text-xs text-slate-500 italic py-2">
        No evaluation criteria recorded.
      </div>
    );
  }

  const renderVerdictChip = (verdict: Verdict) => {
    switch (verdict) {
      case "met":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Met
          </span>
        );
      case "partial":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3" /> Partial
          </span>
        );
      case "not_met":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" /> Not Met
          </span>
        );
      case "unknown":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <HelpCircle className="w-3 h-3" /> No evidence found
          </span>
        );
    }
  };

  if (compact) {
    // Show top 2 items with evidence for summary views
    const topItems = items.slice(0, 2);
    return (
      <div className="space-y-1.5 text-xs">
        {topItems.map((item, idx) => (
          <div key={item.id || idx} className="flex items-start gap-1.5 text-slate-600">
            <span className="font-medium text-slate-900 shrink-0">{item.criterionLabel}:</span>
            {item.evidenceQuote ? (
              <span className="italic truncate text-slate-700 font-mono text-[11px] bg-slate-50 px-1 py-0.5 rounded border border-slate-100">
                "{item.evidenceQuote}"
              </span>
            ) : (
              <span className="text-slate-400">{item.reason || "No evidence found"}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div
          key={item.id || idx}
          className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm space-y-2 hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-slate-900">
                {item.criterionLabel}
              </span>
              {item.required && (
                <span className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded">
                  Required
                </span>
              )}
            </div>
            <div>{renderVerdictChip(item.verdict)}</div>
          </div>

          {/* Quoted line in muted block */}
          {item.evidenceQuote ? (
            <div className="p-2.5 bg-slate-50 border-l-2 border-indigo-500 rounded-r text-xs text-slate-800 font-mono flex items-start gap-2">
              <Quote className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">"{item.evidenceQuote}"</span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic px-1">
              No direct quote found in candidate CV.
            </div>
          )}

          {/* One-line explanation reason */}
          {item.reason && (
            <p className="text-xs text-slate-500 pl-1">{item.reason}</p>
          )}
        </div>
      ))}
    </div>
  );
}
