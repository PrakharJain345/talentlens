import React from "react";
import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
  showBar?: boolean;
}

export function ScoreBadge({
  score,
  size = "md",
  className,
  showBar = true,
}: ScoreBadgeProps) {
  if (score === null || score === undefined) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
        Unscored
      </span>
    );
  }

  // Band classification: 80+ (High Fit), 50-79 (Moderate Fit), <50 (Low Fit)
  const isHigh = score >= 80;
  const isMid = score >= 50 && score < 80;

  const bandText = isHigh ? "High Fit" : isMid ? "Moderate Fit" : "Low Fit";

  const colorStyles = isHigh
    ? {
        text: "text-emerald-700 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-950/40",
        border: "border-emerald-200 dark:border-emerald-800",
        barBg: "bg-emerald-500",
      }
    : isMid
    ? {
        text: "text-indigo-700 dark:text-indigo-400",
        bg: "bg-indigo-50 dark:bg-indigo-950/40",
        border: "border-indigo-200 dark:border-indigo-800",
        barBg: "bg-indigo-500",
      }
    : {
        text: "text-slate-600 dark:text-slate-400",
        bg: "bg-slate-100 dark:bg-slate-800",
        border: "border-slate-200 dark:border-slate-700",
        barBg: "bg-slate-400",
      };

  return (
    <div className={cn("inline-flex flex-col gap-1 min-w-[72px]", className)}>
      <div
        className={cn(
          "inline-flex items-center justify-between gap-1.5 px-2 py-0.5 rounded border font-semibold",
          colorStyles.bg,
          colorStyles.border,
          colorStyles.text,
          size === "sm" && "text-xs px-1.5",
          size === "md" && "text-sm",
          size === "lg" && "text-base px-2.5 py-1"
        )}
      >
        <span className="font-mono tracking-tight">{score}</span>
        <span className="text-[10px] font-normal tracking-normal uppercase opacity-75">
          {bandText}
        </span>
      </div>
      {showBar && (
        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all duration-300 rounded-full", colorStyles.barBg)}
            style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
          />
        </div>
      )}
    </div>
  );
}
