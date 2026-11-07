import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callLlmJson } from "@/lib/llm/client";
import { createClient } from "@/lib/supabase/server";

const CriterionSchema = z.object({
  kind: z.enum(["skill", "nice_skill", "experience", "location", "ctc", "notice"]),
  label: z.string().min(2).max(100),
  params: z.record(z.any()).default({}),
  weight: z.number().int().min(1).max(5),
  required: z.boolean(),
});

const ScorecardOutSchema = z.object({
  title: z.string(),
  criteria: z.array(CriterionSchema).min(1).max(15),
});

const RequestBodySchema = z.object({
  jd_text: z.string().min(10, "Job description must be at least 10 characters long."),
});

const SYSTEM_PROMPT = `You extract a structured hiring scorecard from a job description.
Return ONLY valid JSON matching the schema:
{
  "title": string, // Requisition title extracted or inferred from JD, e.g. "Senior Java Developer"
  "criteria": [
    {
      "kind": "skill" | "nice_skill" | "experience" | "location" | "ctc" | "notice",
      "label": string, // e.g. "Java", "Spring Boot", "5-8 years total experience", "Noida", "Notice period <= 60 days"
      "params": object, // e.g. { "min": 5, "max": 8 } for experience, { "max_days": 60 } for notice, { "city": "Noida" } for location, { "min": .., "max": .. } for ctc
      "weight": number (1 to 5, where 5 is highest priority / mandatory, 3 is standard, 1-2 for nice-to-have),
      "required": boolean
    }
  ]
}

Rules:
1. Do NOT invent requirements that are not stated in the JD.
2. Mark required=true only if the JD explicitly indicates it is mandatory, a must-have, or a core qualification.
3. For skills explicitly mentioned as nice-to-have, preferred, or bonus, use kind="nice_skill", required=false, weight=1 or 2.
4. For mandatory skills, use kind="skill", required=true, weight=4 or 5.
5. If experience range is specified (e.g. 5-8 years), set kind="experience", params: { "min": 5, "max": 8 }, required=true.
6. If notice period is specified (e.g. notice up to 60 days), set kind="notice", params: { "max_days": 60 }, required=true.
7. If location is specified (e.g. Noida), set kind="location", params: { "city": "Noida" }, required=true.
8. Output between 3 and 12 high-signal criteria.`;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsedBody = RequestBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const userPrompt = `Job Description:
"""
${parsedBody.data.jd_text}
"""

Extract the requisition title and the scorecard criteria. Return valid JSON only.`;

    const scorecard = await callLlmJson({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      schema: ScorecardOutSchema,
    });

    return NextResponse.json(scorecard);
  } catch (error: any) {
    console.error("[extract-scorecard error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to extract scorecard" },
      { status: 500 }
    );
  }
}

