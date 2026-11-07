"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { CriterionKind } from "@/types/database";

export interface CriterionInput {
  id?: string;
  kind: CriterionKind;
  label: string;
  params: Record<string, any>;
  weight: number;
  required: boolean;
  position: number;
}

export interface CreateRequisitionPayload {
  clientId: string;
  title: string;
  jdText: string;
  criteria: CriterionInput[];
}

export async function createRequisitionAction(payload: CreateRequisitionPayload) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Authentication required" };
    }

    if (!payload.clientId) {
      return { error: "Please select a client organization." };
    }

    if (!payload.title || !payload.title.trim()) {
      return { error: "Requisition title is required." };
    }

    if (!payload.jdText || !payload.jdText.trim()) {
      return { error: "Job description is required." };
    }

    if (!payload.criteria || payload.criteria.length === 0) {
      return { error: "At least one scorecard criterion is required." };
    }

    // 1. Insert requisition
    const { data: requisition, error: reqError } = await supabase
      .from("requisitions")
      .insert({
        client_id: payload.clientId,
        title: payload.title.trim(),
        jd_text: payload.jdText.trim(),
        status: "open",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (reqError || !requisition) {
      return { error: reqError?.message || "Failed to create requisition." };
    }

    // 2. Insert criteria rows
    const criteriaRows = payload.criteria.map((c, index) => ({
      requisition_id: requisition.id,
      kind: c.kind,
      label: c.label.trim(),
      params: c.params || {},
      weight: c.weight,
      required: c.required,
      position: index,
    }));

    const { error: critError } = await supabase
      .from("scorecard_criteria")
      .insert(criteriaRows);

    if (critError) {
      // Rollback requisition if criteria fail
      await supabase.from("requisitions").delete().eq("id", requisition.id);
      return { error: critError.message || "Failed to save scorecard criteria." };
    }

    revalidatePath("/requisitions");
    return { success: true, requisitionId: requisition.id };
  } catch (err: any) {
    return { error: err.message || "Unexpected error occurred." };
  }
}

