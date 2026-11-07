import dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log("Seeding sample requisition and scorecard...");

  // 1. Get Acme Corp client
  const { data: acme } = await supabase
    .from("clients")
    .select("id")
    .eq("name", "Acme Corp")
    .single();

  if (!acme) {
    console.error("Acme Corp client not found");
    return;
  }

  // 2. Get recruiter profile
  const { data: recruiter } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "recruiter")
    .limit(1)
    .single();

  if (!recruiter) {
    console.error("Recruiter profile not found");
    return;
  }

  // 3. Check if requisition already exists
  const title = "Senior Java Developer";
  const { data: existingReq } = await supabase
    .from("requisitions")
    .select("id")
    .eq("title", title)
    .eq("client_id", acme.id)
    .maybeSingle();

  let reqId = existingReq?.id;

  if (!reqId) {
    const jdText = `Job Title: Senior Java Developer
Location: Noida, India
Experience: 5-8 years
Notice Period: Up to 60 days

About the Role:
We are seeking an experienced Senior Java Developer to join our core backend engineering team at Acme Corp. You will design, develop, and maintain high-throughput distributed microservices.

Key Requirements:
- Core Java (Java 11/17) and strong object-oriented programming fundamentals.
- Extensive experience with Spring Boot, Spring Cloud, and RESTful APIs.
- 5 to 8 years of professional software development experience.
- Notice period of 60 days or fewer.
- Work location: Noida (Hybrid / Onsite).
- Nice to have: Apache Kafka, Docker, Kubernetes, AWS.`;

    const { data: newReq, error: reqErr } = await supabase
      .from("requisitions")
      .insert({
        client_id: acme.id,
        title,
        jd_text: jdText,
        status: "open",
        created_by: recruiter.id,
      })
      .select("id")
      .single();

    if (reqErr || !newReq) {
      console.error("Failed to create requisition:", reqErr);
      return;
    }
    reqId = newReq.id;
    console.log(`Created sample requisition "${title}" (${reqId})`);

    // Insert criteria
    const criteria = [
      {
        requisition_id: reqId,
        kind: "skill",
        label: "Java",
        weight: 5,
        required: true,
        position: 0,
        params: {},
      },
      {
        requisition_id: reqId,
        kind: "skill",
        label: "Spring Boot",
        weight: 5,
        required: true,
        position: 1,
        params: {},
      },
      {
        requisition_id: reqId,
        kind: "experience",
        label: "5-8 years experience",
        weight: 4,
        required: true,
        position: 2,
        params: { min: 5, max: 8 },
      },
      {
        requisition_id: reqId,
        kind: "location",
        label: "Noida",
        weight: 3,
        required: true,
        position: 3,
        params: { city: "Noida" },
      },
      {
        requisition_id: reqId,
        kind: "notice",
        label: "Notice period <= 60 days",
        weight: 3,
        required: true,
        position: 4,
        params: { max_days: 60 },
      },
      {
        requisition_id: reqId,
        kind: "nice_skill",
        label: "Microservices & Kafka",
        weight: 2,
        required: false,
        position: 5,
        params: {},
      },
    ];

    const { error: critErr } = await supabase
      .from("scorecard_criteria")
      .insert(criteria);

    if (critErr) {
      console.error("Failed to insert criteria:", critErr);
    } else {
      console.log(`Inserted ${criteria.length} scorecard criteria`);
    }
  } else {
    console.log(`Sample requisition already exists: ${reqId}`);
  }
}

main();
