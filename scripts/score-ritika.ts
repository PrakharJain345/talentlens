import dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { scoreCvAgainstScorecard } from "../lib/llm/prompts";
import { verifyQuote } from "../lib/scoring/verify";
import { computeScore, POINTS } from "../lib/scoring/compute";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data: cand } = await adminSupabase
    .from("candidates")
    .select("id, full_name, cv_text_redacted")
    .ilike("full_name", "%Ritika%")
    .single();

  const { data: req } = await adminSupabase
    .from("requisitions")
    .select("id")
    .eq("title", "Senior Java Developer")
    .single();

  const { data: criteria } = await adminSupabase
    .from("scorecard_criteria")
    .select("*")
    .eq("requisition_id", req!.id);

  const { data: app } = await adminSupabase
    .from("applications")
    .select("id")
    .eq("candidate_id", cand!.id)
    .eq("requisition_id", req!.id)
    .single();

  console.log("Scoring Ritika Bansal...");
  const rawScores = await scoreCvAgainstScorecard(cand!.cv_text_redacted!, criteria! as any);

  const verifiedItems = rawScores.items.map((item) => {
    const verified = verifyQuote(cand!.cv_text_redacted!, item.evidence_quote);
    let verdict = item.verdict;
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

  const { score, flags } = computeScore(verifiedItems as any, criteria! as any);
  console.log(`Ritika Score: ${score}/100`);

  // Delete previous score items if any
  await adminSupabase.from("score_items").delete().eq("application_id", app!.id);

  const scoreItemsToInsert = verifiedItems.map((item) => {
    const crit = criteria!.find((c) => c.id === item.criterion_id);
    const weight = crit?.weight ?? 3;
    const pointMultiplier = POINTS[item.verdict as keyof typeof POINTS] ?? 0;
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

  await adminSupabase
    .from("applications")
    .update({
      score,
      flags,
      scored_at: new Date().toISOString(),
      stage: "submitted",
    })
    .eq("id", app!.id);

  console.log("Ritika Bansal scored and updated!");
}

main();

