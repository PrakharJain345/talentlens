import dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log("=== Submitting Demo Candidates to Acme Corp ===");

  // 1. Get Acme requisition
  const { data: req } = await adminSupabase
    .from("requisitions")
    .select("id, title")
    .eq("title", "Senior Java Developer")
    .single();

  if (!req) {
    console.error("Requisition not found");
    return;
  }

  // 2. Get applications for this requisition
  const { data: applications } = await adminSupabase
    .from("applications")
    .select("id, candidate_id, score, stage, candidate:candidates(full_name, current_title)")
    .eq("requisition_id", req.id);

  if (!applications || applications.length === 0) {
    console.log("No applications found to submit.");
    return;
  }

  const now = new Date().toISOString();

  for (const app of applications) {
    const candName = (app.candidate as any)?.full_name;

    if (candName?.includes("Ritika") || candName?.includes("Kavita")) {
      await adminSupabase
        .from("applications")
        .update({
          opened_by_recruiter_at: now,
          submitted_at: now,
          stage: "submitted",
          client_decision: "pending",
          contact_revealed: false,
          recruiter_note:
            "Top tier candidate with 6+ years of enterprise Java & Spring Boot microservices expertise in Noida. Recommended for immediate interview.",
        })
        .eq("id", app.id);

      console.log(`✓ Submitted ${candName} to Acme Corp (Score: ${app.score})`);
    } else if (candName?.includes("Pooja")) {
      await adminSupabase
        .from("applications")
        .update({
          opened_by_recruiter_at: now,
          submitted_at: now,
          stage: "submitted",
          client_decision: "pending",
          contact_revealed: false,
          recruiter_note:
            "Good foundational Java & Hibernate experience. Please evaluate if the 90-day notice period fits team timeline.",
        })
        .eq("id", app.id);

      console.log(`✓ Submitted ${candName} to Acme Corp (Score: ${app.score})`);
    } else {
      console.log(`- Kept ${candName} in '${app.stage}' (recruiter can review and submit)`);
    }
  }

  console.log("\nDone! Submitted candidates are now visible in the Acme Client Portal.");
}

main();
