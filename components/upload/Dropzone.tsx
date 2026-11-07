"use client";

import React, { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { StatusPill } from "./StatusPill";
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  X,
  ShieldCheck,
} from "lucide-react";

interface UploadFileItem {
  id?: string;
  file: File;
  name: string;
  size: number;
  storagePath?: string;
  status:
    | "pending"
    | "uploading"
    | "queued"
    | "parsing"
    | "parsed"
    | "scored"
    | "duplicate"
    | "needs_ocr"
    | "failed";
  error?: string | null;
  score?: number | null;
}

interface DropzoneProps {
  requisitionId: string;
  onProcessingComplete?: () => void;
}

export function Dropzone({ requisitionId, onProcessingComplete }: DropzoneProps) {
  const [items, setItems] = useState<UploadFileItem[]>([]);
  const [consentAttested, setConsentAttested] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const handleFilesAdded = (files: FileList | File[]) => {
    const validFiles: UploadFileItem[] = [];
    const validExtensions = [".pdf", ".docx", ".doc"];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const lowerName = file.name.toLowerCase();
      const hasValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));

      if (hasValidExt) {
        validFiles.push({
          file,
          name: file.name,
          size: file.size,
          status: "pending",
        });
      }
    }

    if (validFiles.length > 0) {
      setItems((prev) => [...prev, ...validFiles].slice(0, 500));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setItems([]);
  };

  // Process items with concurrency = 3
  const startUploadAndProcess = async () => {
    if (!consentAttested) {
      alert("Please confirm candidate consent before processing CVs.");
      return;
    }

    const pendingItems = items.filter(
      (item) => item.status === "pending" || item.status === "failed"
    );
    if (pendingItems.length === 0) return;

    setIsProcessing(true);

    try {
      // Step 1: Upload each pending file to Supabase Storage 'cvs' bucket
      const uploadedWithPaths: { item: UploadFileItem; storagePath: string }[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.status !== "pending" && item.status !== "failed") continue;

        // Update status to uploading
        setItems((prev) =>
          prev.map((it, idx) => (idx === i ? { ...it, status: "uploading" } : it))
        );

        const timestamp = Date.now();
        const cleanName = item.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${requisitionId}/${timestamp}_${cleanName}`;

        const { error: uploadErr } = await supabase.storage
          .from("cvs")
          .upload(storagePath, item.file, {
            upsert: true,
          });

        if (uploadErr) {
          setItems((prev) =>
            prev.map((it, idx) =>
              idx === i
                ? {
                    ...it,
                    status: "failed",
                    error: "Upload failed: " + uploadErr.message,
                  }
                : it
            )
          );
        } else {
          uploadedWithPaths.push({ item, storagePath });
        }
      }

      if (uploadedWithPaths.length === 0) {
        setIsProcessing(false);
        return;
      }

      // Step 2: Call /api/cv/register in batch
      const registerRes = await fetch("/api/cv/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requisition_id: requisitionId,
          consent_attested: true,
          files: uploadedWithPaths.map((u) => ({
            file_name: u.item.name,
            storage_path: u.storagePath,
          })),
        }),
      });

      if (!registerRes.ok) {
        const errJson = await registerRes.json();
        throw new Error(errJson.error || "Failed to register CV batch");
      }

      const { uploads } = await registerRes.json();

      // Map upload IDs back to items
      setItems((prev) =>
        prev.map((it) => {
          const match = uploads.find((u: any) => u.file_name === it.name);
          if (match) {
            return {
              ...it,
              id: match.id,
              storagePath: match.storage_path,
              status: "queued",
            };
          }
          return it;
        })
      );

      // Step 3: Run client pool with Concurrency 3
      const poolQueue = [...uploads];
      const concurrency = 3;

      const processNext = async (): Promise<void> => {
        if (poolQueue.length === 0) return;

        const uploadRecord = poolQueue.shift();
        if (!uploadRecord) return;

        // Mark item as parsing
        setItems((prev) =>
          prev.map((it) => (it.id === uploadRecord.id ? { ...it, status: "parsing" } : it))
        );

        try {
          const res = await fetch(`/api/cv/${uploadRecord.id}/process`, {
            method: "POST",
          });
          const data = await res.json();

          setItems((prev) =>
            prev.map((it) => {
              if (it.id === uploadRecord.id) {
                if (!res.ok) {
                  return {
                    ...it,
                    status: "failed",
                    error: data.error || "Processing failed",
                  };
                }
                return {
                  ...it,
                  status: data.status,
                  score: data.score,
                };
              }
              return it;
            })
          );
        } catch (err: any) {
          setItems((prev) =>
            prev.map((it) =>
              it.id === uploadRecord.id
                ? {
                    ...it,
                    status: "failed",
                    error: err.message || "Network error",
                  }
                : it
            )
          );
        }

        // Process next item in queue
        return processNext();
      };

      // Launch worker threads
      const workers = Array.from({ length: concurrency }, () => processNext());
      await Promise.all(workers);

      if (onProcessingComplete) {
        onProcessingComplete();
      }
    } catch (err: any) {
      console.error("[Dropzone] Batch processing error:", err);
      alert("Error processing batch: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const retryFailed = () => {
    setItems((prev) =>
      prev.map((it) => (it.status === "failed" ? { ...it, status: "pending", error: null } : it))
    );
  };

  const hasFailed = items.some((it) => it.status === "failed");
  const scoredCount = items.filter((it) => it.status === "scored").length;

  return (
    <div className="space-y-6">
      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragOver
            ? "border-indigo-600 bg-indigo-50/50"
            : "border-slate-300 hover:border-indigo-400 bg-slate-50/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFilesAdded(e.target.files);
          }}
        />
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="p-3 bg-white rounded-full shadow-xs border border-slate-200 text-indigo-600">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-800">
            Drag and drop CVs here, or <span className="text-indigo-600">browse</span>
          </p>
          <p className="text-xs text-slate-500">
            Supports PDF and DOCX (up to 500 files per batch)
          </p>
        </div>
      </div>

      {/* DPDP Consent Checkbox */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
        <input
          type="checkbox"
          id="consentCheckbox"
          checked={consentAttested}
          onChange={(e) => setConsentAttested(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor="consentCheckbox" className="text-xs text-slate-700 leading-relaxed cursor-pointer">
          <span className="font-semibold text-slate-900 flex items-center gap-1.5 mb-0.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            DPDP Act 2023 Consent Attestation (Required)
          </span>
          I attest that candidates have consented to their CVs being processed for hiring purposes
          under Company A's recruitment privacy policy.
        </label>
      </div>

      {/* Action Buttons */}
      {items.length > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-slate-600 font-medium">
            {items.length} file{items.length === 1 ? "" : "s"} selected
            {scoredCount > 0 && ` (${scoredCount} scored)`}
          </div>
          <div className="flex items-center gap-2">
            {hasFailed && (
              <Button
                variant="outline"
                size="sm"
                onClick={retryFailed}
                disabled={isProcessing}
                className="text-xs gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retry failed
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              disabled={isProcessing}
              className="text-xs text-slate-600"
            >
              Clear all
            </Button>
            <Button
              size="sm"
              onClick={startUploadAndProcess}
              disabled={isProcessing || !consentAttested}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
            >
              {isProcessing ? "Processing batch..." : "Process Batch"}
            </Button>
          </div>
        </div>
      )}

      {/* Files List */}
      {items.length > 0 && (
        <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {items.map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-3 bg-white flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-800 truncate">{item.name}</span>
                <span className="text-[11px] text-slate-400 shrink-0">
                  ({(item.size / 1024).toFixed(0)} KB)
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {item.score !== undefined && item.score !== null && (
                  <span className="font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Score: {item.score}
                  </span>
                )}
                <StatusPill status={item.status} error={item.error} />
                {!isProcessing && item.status === "pending" && (
                  <button
                    onClick={() => removeItem(idx)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
