export type UserRole = "recruiter" | "client";
export type UploadStatus =
  | "queued"
  | "parsing"
  | "parsed"
  | "scored"
  | "failed"
  | "duplicate"
  | "needs_ocr";
export type PipelineStage =
  | "sourced"
  | "screened"
  | "submitted"
  | "shortlisted"
  | "interview"
  | "offered"
  | "joined"
  | "rejected";
export type CriterionKind =
  | "skill"
  | "nice_skill"
  | "experience"
  | "location"
  | "ctc"
  | "notice";
export type Verdict = "met" | "partial" | "not_met" | "unknown";
export type ClientDecision =
  | "pending"
  | "shortlisted"
  | "rejected"
  | "slot_proposed";

export interface Client {
  id: string;
  name: string;
}

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  client_id: string | null;
}

export interface Requisition {
  id: string;
  client_id: string;
  title: string;
  jd_text: string;
  status: string;
  created_by: string;
  created_at: string;
}

export interface ScorecardCriterion {
  id: string;
  requisition_id: string;
  kind: CriterionKind;
  label: string;
  params: Record<string, any>;
  weight: number;
  required: boolean;
  position: number;
}

export interface Candidate {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  email_norm: string | null;
  phone_norm: string | null;
  name_norm: string | null;
  current_title: string | null;
  experience_years: number | null;
  skills: string[];
  notice_days: number | null;
  current_ctc_lpa: number | null;
  location: string | null;
  summary: string | null;
  cv_text: string | null;
  cv_text_redacted: string | null;
  storage_path: string | null;
  is_scan: boolean;
  deleted_at: string | null;
  created_at: string;
}

export interface ConsentRecord {
  id: string;
  candidate_id: string;
  purpose: string;
  source: string;
  granted_at: string;
  revoked_at: string | null;
}

export interface CvUpload {
  id: string;
  requisition_id: string;
  file_name: string;
  storage_path: string;
  status: UploadStatus;
  error: string | null;
  candidate_id: string | null;
  duplicate_of: string | null;
  consent_attested: boolean;
  uploaded_by: string;
  created_at: string;
}

export interface Application {
  id: string;
  requisition_id: string;
  candidate_id: string;
  stage: PipelineStage;
  score: number | null;
  flags: string[];
  scored_at: string | null;
  opened_by_recruiter_at: string | null;
  recruiter_note: string | null;
  submitted_at: string | null;
  client_decision: ClientDecision;
  reject_reason: string | null;
  proposed_slot: string | null;
  slot_note: string | null;
  contact_revealed: boolean;
}

export interface ScoreItem {
  id: string;
  application_id: string;
  criterion_id: string;
  verdict: Verdict;
  evidence_quote: string | null;
  reason: string | null;
  points: number;
}

export interface AccessLog {
  id: number;
  actor_id: string | null;
  candidate_id: string | null;
  application_id: string | null;
  action: string;
  at: string;
}

export interface ClientShortlistView {
  application_id: string;
  requisition_id: string;
  title: string;
  stage: PipelineStage;
  score: number | null;
  recruiter_note: string | null;
  client_decision: ClientDecision;
  reject_reason: string | null;
  proposed_slot: string | null;
  contact_revealed: boolean;
  full_name: string | null;
  current_title: string | null;
  experience_years: number | null;
  notice_days: number | null;
  location: string | null;
  skills: string[];
  email_masked: string | null;
  phone_masked: string | null;
}

