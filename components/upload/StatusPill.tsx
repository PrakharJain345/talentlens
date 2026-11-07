import React from "react";
import { cn } from "@/lib/utils";
import {
  Clock,
  Loader2,
  CheckCircle,
  FileCheck,
  AlertCircle,
  Copy,
  Scan,
} from "lucide-react";
import type { UploadStatus } from "@/types/database";

interface StatusPillProps {
  status: UploadStatus | string;
  error?: string | null;
  className?: string;
}

export function StatusPill({ status, error, className }: StatusPillProps) {
  const getBadgeConfig = () => {
    switch (status) {
      case "queued":
        return {
          label: "Queued",
          icon: <Clock className="w-3 h-3" />,
          styles: "bg-slate-100 text-slate-700 border-slate-200",
        };
      case "parsing":
        return {
          label: "Parsing",
          icon: <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />,
          styles: "bg-indigo-50 text-indigo-700 border-indigo-200",
        };
      case "parsed":
        return {
          label: "Parsed",
          icon: <FileCheck className="w-3 h-3 text-sky-600" />,
          styles: "bg-sky-50 text-sky-700 border-sky-200",
        };
      case "scored":
        return {
          label: "Scored",
          icon: <CheckCircle className="w-3 h-3 text-emerald-600" />,
          styles: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
      case "duplicate":
        return {
          label: "Duplicate",
          icon: <Copy className="w-3 h-3 text-amber-600" />,
          styles: "bg-amber-50 text-amber-700 border-amber-200",
        };
      case "needs_ocr":
        return {
          label: "Needs OCR",
          icon: <Scan className="w-3 h-3 text-purple-600" />,
          styles: "bg-purple-50 text-purple-700 border-purple-200",
        };
      case "failed":
      default:
        return {
          label: "Failed",
          icon: <AlertCircle className="w-3 h-3 text-rose-600" />,
          styles: "bg-rose-50 text-rose-700 border-rose-200",
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span
      title={error || undefined}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-xs transition-colors",
        config.styles,
        className
      )}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
}
