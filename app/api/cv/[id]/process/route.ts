import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractTextFromFile } from "@/lib/parsing/extract";
import {
  extractCandidateProfile,
  scoreCvAgainstScorecard,
  ScorecardCriterionForScoring,
} from "@/lib/llm/prompts";
import {
  findDuplicateCandidate,
  normalizeEmail,
  normalizeName,
  normalizePhone,
} from "@/lib/dedupe";
import { redactCvText } from "@/lib/privacy/redact";
import { verifyQuote } from "@/lib/scoring/verify";
import { computeScore, POINTS, CriterionScoreInput } from "@/lib/scoring/compute";
import type { Verdict } from "@/types/database";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const uploadId = params.id;
  const adminSupabase = createAdminClient();

  // Fetch upload record
  const { data: upload, error: fetchErr } = await adminSupabase
    .from("cv_uploads")
    .select("*")
    .eq("id", uploadId)
    .single();

  if (fetchErr || !upload) {
    return NextResponse.json({ error: "Upload record not found" }, { status: 404 });
  }

  try {
    // 1. Update status to parsing
    await adminSupabase
      .from("cv_uploads")
      .update({ status: "parsing", error: null })
      .eq("id", uploadId);

    // 2. Download file from Storage
    const { data: fileBlob, error: downloadErr } = await adminSupabase.storage
      .from("cvs")
      .download(upload.storage_path);

    if (downloadErr || !fileBlob) {
      throw new Error(`Failed to download CV file: ${downloadErr?.message || "File empty"}`);
    }

    const buffer = Buffer.from(await fileBlob.arrayBuffer());

    // 3. Extract text
    const { text, isScan } = await extractTextFromFile(upload.file_name, buffer);

    if (isScan || !text || text.trim().length < 200) {
      // Flag as needs_ocr per PRD FR-4 / TECHSTACK section 3
      await adminSupabase
        .from("cv_uploads")
        .update({
          status: "needs_ocr",
          error: "Extracted text is too short or file is an image-only scan. OCR required.",
        })
        .eq("id", uploadId);

      return NextResponse.json({
        status: "needs_ocr",
        message: "File marked as needs_ocr (text length < 200)",
      });
    }

    // 4. LLM Profile extraction (Zod-validated)
    const profile = await extractCandidateProfile(text);

    // 5. Dedupe check
    const emailNorm = normalizeEmail(profile.email);
    const phoneNorm = normalizePhone(profile.phone);
    const nameNorm = normalizeName(profile.full_name);

    const dupCheck = await findDuplicateCandidate(adminSupabase, {
      emailNorm,
      phoneNorm,
      nameNorm,
    });

    if (dupCheck.isDuplicate && dupCheck.candidateId) {
      // Link as duplicate and create application for this requisition if none exists
      await adminSupabase
        .from("cv_uploads")
        .update({
          status: "duplicate",
          duplicate_of: dupCheck.candidateId,
          candidate_id: dupCheck.candidateId,
        })
        .eq("id", uploadId);

      // Check if application already exists for this candidate on this requisition
      const { data: existingApp } = await adminSupabase
        .from("applications")
        .select("id")
        .eq("requisition_id", upload.requisition_id)
        .eq("candidate_id", dupCheck.candidateId)
        .maybeSingle();

      if (!existingApp) {
        await adminSupabase.from("applications").insert({
          requisition_id: upload.requisition_id,
          candidate_id: dupCheck.candidateId,
          stage: "sourced",
        });
      }

      return NextResponse.json({
        status: "duplicate",
        duplicate_of: dupCheck.candidateId,
        matched_on: dupCheck.matchedOn,
      });
    }

    // 6. Insert new candidate
    const { data: candidate, error: candErr } = await adminSupabase
      .from("candidates")
      .insert({
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        email_norm: emailNorm,
        phone_norm: phoneNorm,
        name_norm: nameNorm,
        current_title: profile.current_title,
        experience_years: profile.experience_years,
        skills: profile.skills,
        notice_days: profile.notice_days,
        current_ctc_lpa: profile.current_ctc_lpa,
        location: profile.location,
        summary: profile.summary,
        cv_text: text,
        storage_path: upload.storage_path,
        is_scan: false,
      })
      .select("id")
      .single();

    if (candErr || !candidate) {
      throw new Error(`Failed to create candidate record: ${candErr?.message}`);
    }

    // 7. Insert consent record
    await adminSupabase.from("consent_records").insert({
      candidate_id: candidate.id,
      purpose: "hiring use only",
      source: "recruiter_attested",
    });

    // 8. Create application in 'sourced' stage
    const { data: application, error: appErr } = await adminSupabase
      .from("applications")
      .insert({
        requisition_id: upload.requisition_id,
        candidate_id: candidate.id,
        stage: "sourced",
      })
      .select("id")
      .single();

    if (appErr || !application) {
      throw new Error(`Failed to create application record: ${appErr?.message}`);
    }

    // Update upload with candidate_id
    await adminSupabase
      .from("cv_uploads")
      .update({
        candidate_id: candidate.id,
        status: "parsed",
      })
      .eq("id", uploadId);

    // 9. Blind redaction of PII before scoring
    const redactedText = redactCvText(text, {
      fullName: profile.full_name,
      email: profile.email,
      phone: profile.phone,
    });

    await adminSupabase
      .from("candidates")
      .update({ cv_text_redacted: redactedText })
      .eq("id", candidate.id);

    // 10. Fetch Scorecard criteria
    const { data: criteria } = await adminSupabase
      .from("scorecard_criteria")
      .select("*")
      .eq("requisition_id", upload.requisition_id)
      .order("position", { ascending: true });

    if (!criteria || criteria.length === 0) {
      // No criteria defined yet, mark parsed
      await adminSupabase
        .from("cv_uploads")
        .update({ status: "parsed" })
        .eq("id", uploadId);

      return NextResponse.json({
        status: "parsed",
        candidate_id: candidate.id,
        application_id: application.id,
      });
    }

    // 11. LLM Scoring against redacted text only
    const scoringInputCriteria: ScorecardCriterionForScoring[] = criteria.map((c) => ({
      id: c.id,
      kind: c.kind,
      label: c.label,
      params: c.params,
      required: c.required,
      weight: c.weight,
    }));

    const rawScores = await scoreCvAgainstScorecard(redactedText, scoringInputCriteria);

    // 12. Strict evidence quote verification in code
    const verifiedItems = rawScores.items.map((item) => {
      const verified = verifyQuote(redactedText, item.evidence_quote);
      let verdict: Verdict = item.verdict;

      // If quote fails verification, drop quote and downgrade met/partial to unknown
      if (!verified && (verdict === "met" || verdict === "partial")) {
        verdict = "unknown";
      }

      return {
        criterion_id: item.criterion_id,
        verdict,
        evidence_quote: verified,
        reason: verified ? item.reason : "No verifiable evidence found in CV text",
      };
    });

    // 13. Deterministic score computation in code
    const criteriaForCompute: CriterionScoreInput[] = criteria.map((c) => ({
      id: c.id,
      weight: c.weight,
      required: c.required,
      label: c.label,
    }));

    const { score, flags } = computeScore(verifiedItems, criteriaForCompute);

    // 14. Save score items
    const scoreItemsToInsert = verifiedItems.map((item) => {
      const crit = criteria.find((c) => c.id === item.criterion_id);
      const weight = crit?.weight ?? 3;
      const pointMultiplier = POINTS[item.verdict] ?? 0;
      return {
        application_id: application.id,
        criterion_id: item.criterion_id,
        verdict: item.verdict,
        evidence_quote: item.evidence_quote,
        reason: item.reason,
        points: Number((weight * pointMultiplier).toFixed(2)),
      };
    });

    await adminSupabase.from("score_items").insert(scoreItemsToInsert);

    // 15. Update application with score, flags, and stage = screened
    await adminSupabase
      .from("applications")
      .update({
        score,
        flags,
        scored_at: new Date().toISOString(),
        stage: "screened",
      })
      .eq("id", application.id);

    // 16. Update upload status = scored
    await adminSupabase
      .from("cv_uploads")
      .update({ status: "scored" })
      .eq("id", uploadId);

    return NextResponse.json({
      status: "scored",
      score,
      flags,
      candidate_id: candidate.id,
      application_id: application.id,
    });
  } catch (err: any) {
    console.error(`[ProcessCV] Error processing upload ${uploadId}:`, err);

    await adminSupabase
      .from("cv_uploads")
      .update({
        status: "failed",
        error: err.message || "Unknown error during CV processing",
      })
      .eq("id", uploadId);

    return NextResponse.json(
      { error: err.message || "Processing failed" },
      { status: 500 }
    );
  }
}
