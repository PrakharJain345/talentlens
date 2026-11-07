import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { extractTextFromFile } from "../lib/parsing/extract";
import {
  extractCandidateProfile,
  scoreCvAgainstScorecard,
  ScorecardCriterionForScoring,
} from "../lib/llm/prompts";
import {
  findDuplicateCandidate,
  normalizeEmail,
  normalizeName,
  normalizePhone,
} from "../lib/dedupe";
import { redactCvText } from "../lib/privacy/redact";
import { verifyQuote } from "../lib/scoring/verify";
import { computeScore, POINTS, CriterionScoreInput } from "../lib/scoring/compute";
import type { Verdict } from "../types/database";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log("=== Testing Sample CV Pipeline Processing ===");

  // 1. Ensure 'cvs' bucket exists
  const { data: buckets } = await adminSupabase.storage.listBuckets();
  const cvsBucket = buckets?.find((b) => b.name === "cvs");
  if (!cvsBucket) {
    console.log("Creating private 'cvs' storage bucket...");
    await adminSupabase.storage.createBucket("cvs", { public: false });
  } else {
    console.log("✓ 'cvs' storage bucket exists");
  }

  // 2. Get the sample requisition
  const { data: requisition } = await adminSupabase
    .from("requisitions")
    .select("id, title")
    .eq("title", "Senior Java Developer")
    .single();

  if (!requisition) {
    console.error("Requisition not found");
    return;
  }
  const reqId = requisition.id;
  console.log(`Using requisition: "${requisition.title}" (${reqId})`);

  // 3. Get recruiter profile
  const { data: recruiter } = await adminSupabase
    .from("profiles")
    .select("id")
    .eq("role", "recruiter")
    .limit(1)
    .single();

  const recruiterId = recruiter!.id;

  // 4. Scorecard criteria
  const { data: criteria } = await adminSupabase
    .from("scorecard_criteria")
    .select("*")
    .eq("requisition_id", reqId)
    .order("position", { ascending: true });

  const scoringCriteria: ScorecardCriterionForScoring[] = (criteria || []).map((c) => ({
    id: c.id,
    kind: c.kind,
    label: c.label,
    params: c.params,
    required: c.required,
    weight: c.weight,
  }));

  const sampleDir = path.resolve(process.cwd(), "sample-cvs");
  const testFiles = [
    "05_Scanned_CV_NoTextLayer.pdf",
    "06_Corrupt_Truncated_CV.pdf",
    "07_Kavita_Sharma_PII_Redaction_Test.pdf",
  ];

  for (const fileName of testFiles) {
    const filePath = path.join(sampleDir, fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      continue;
    }

    console.log(`\n--- Processing: ${fileName} ---`);
    const buffer = fs.readFileSync(filePath);
    const storagePath = `${reqId}/${Date.now()}_${fileName}`;

    // Upload to storage
    await adminSupabase.storage.from("cvs").upload(storagePath, buffer, { upsert: true });

    // Register upload record
    const { data: uploadRec } = await adminSupabase
      .from("cv_uploads")
      .insert({
        requisition_id: reqId,
        file_name: fileName,
        storage_path: storagePath,
        status: "queued",
        consent_attested: true,
        uploaded_by: recruiterId,
      })
      .select("id")
      .single();

    const uploadId = uploadRec!.id;

    // Check corrupt or extraction error
    let text = "";
    let isScan = false;
    try {
      const extracted = await extractTextFromFile(fileName, buffer);
      text = extracted.text;
      isScan = extracted.isScan;
    } catch (parseErr: any) {
      console.log(`  ✗ Extraction failed: ${parseErr.message} -> Marking as 'failed'`);
      await adminSupabase
        .from("cv_uploads")
        .update({ status: "failed", error: parseErr.message })
        .eq("id", uploadId);
      continue;
    }

    // Check needs_ocr
    if (isScan || text.trim().length < 200) {
      console.log(`  ⚠️ Text length ${text.trim().length} < 200 -> Marking as 'needs_ocr'`);
      await adminSupabase
        .from("cv_uploads")
        .update({
          status: "needs_ocr",
          error: "Extracted text is too short or file is an image-only scan. OCR required.",
        })
        .eq("id", uploadId);
      continue;
    }

    // LLM Profile extraction
    console.log(`  🤖 Calling LLM profile extraction...`);
    const profile = await extractCandidateProfile(text);
    console.log(`  ✓ Extracted profile: ${profile.full_name} (${profile.current_title})`);

    // Dedupe check
    const emailNorm = normalizeEmail(profile.email);
    const phoneNorm = normalizePhone(profile.phone);
    const nameNorm = normalizeName(profile.full_name);

    const dupCheck = await findDuplicateCandidate(adminSupabase, {
      emailNorm,
      phoneNorm,
      nameNorm,
    });

    if (dupCheck.isDuplicate && dupCheck.candidateId) {
      console.log(
        `  🔁 Duplicate detected! Matched candidate ${dupCheck.candidateId} on ${dupCheck.matchedOn}`
      );
      await adminSupabase
        .from("cv_uploads")
        .update({
          status: "duplicate",
          duplicate_of: dupCheck.candidateId,
          candidate_id: dupCheck.candidateId,
        })
        .eq("id", uploadId);

      // Create application if not exists
      const { data: existingApp } = await adminSupabase
        .from("applications")
        .select("id")
        .eq("requisition_id", reqId)
        .eq("candidate_id", dupCheck.candidateId)
        .maybeSingle();

      if (!existingApp) {
        await adminSupabase.from("applications").insert({
          requisition_id: reqId,
          candidate_id: dupCheck.candidateId,
          stage: "sourced",
        });
      }
      continue;
    }

    // Insert new candidate
    const { data: cand, error: candErr } = await adminSupabase
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
        storage_path: storagePath,
      })
      .select("id")
      .single();

    if (candErr || !cand) {
      console.error(`  ✗ Candidate insertion failed:`, candErr);
      continue;
    }

    // Insert consent record
    await adminSupabase.from("consent_records").insert({
      candidate_id: cand.id,
      purpose: "hiring use only",
      source: "recruiter_attested",
    });

    // Create application
    const { data: app } = await adminSupabase
      .from("applications")
      .insert({
        requisition_id: reqId,
        candidate_id: cand.id,
        stage: "sourced",
      })
      .select("id")
      .single();

    // Redaction
    const redactedText = redactCvText(text, {
      fullName: profile.full_name,
      email: profile.email,
      phone: profile.phone,
    });

    await adminSupabase
      .from("candidates")
      .update({ cv_text_redacted: redactedText })
      .eq("id", cand.id);

    // Scoring
    console.log(`  🎯 Scoring against scorecard criteria...`);
    const rawScores = await scoreCvAgainstScorecard(redactedText, scoringCriteria);

    // Quote verification
    const verifiedItems = rawScores.items.map((item) => {
      const verified = verifyQuote(redactedText, item.evidence_quote);
      let verdict: Verdict = item.verdict;
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

    // Score computation
    const criteriaForCompute: CriterionScoreInput[] = criteria!.map((c) => ({
      id: c.id,
      weight: c.weight,
      required: c.required,
      label: c.label,
    }));

    const { score, flags } = computeScore(verifiedItems, criteriaForCompute);
    console.log(`  🏆 Score: ${score}/100 | Flags: ${flags.join(", ") || "None"}`);

    // Insert score_items
    const scoreItemsToInsert = verifiedItems.map((item) => {
      const crit = criteria!.find((c) => c.id === item.criterion_id);
      const weight = crit?.weight ?? 3;
      const pointMultiplier = POINTS[item.verdict] ?? 0;
      return {
        application_id: app!.id,
        criterion_id: item.criterion_id,
        verdict: item.verdict,
        evidence_quote: item.evidence_quote,
        reason: item.reason,
        points: Number((weight * pointMultiplier).toFixed(2)),
      };
    });

    await adminSupabase.from("score_items").insert(scoreItemsToInsert);

    // Update application
    await adminSupabase
      .from("applications")
      .update({
        score,
        flags,
        scored_at: new Date().toISOString(),
        stage: "screened",
      })
      .eq("id", app!.id);

    // Update upload status
    await adminSupabase
      .from("cv_uploads")
      .update({
        status: "scored",
        candidate_id: cand.id,
      })
      .eq("id", uploadId);
  }

  console.log("\n=== Batch processing complete! ===");
}

main();
