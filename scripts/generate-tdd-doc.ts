import fs from "fs";
import path from "path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from "docx";

async function createTddDocument() {
  const primaryColor = "4F46E5"; // Indigo accent
  const darkTextColor = "0F172A"; // Slate 900
  const mutedTextColor = "475569"; // Slate 600

  const h1 = (text: string) =>
    new Paragraph({
      text,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 360, after: 120 },
    });

  const h2 = (text: string) =>
    new Paragraph({
      text,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 80 },
    });

  const h3 = (text: string) =>
    new Paragraph({
      text,
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 180, after: 60 },
    });

  const p = (text: string, bold = false) =>
    new Paragraph({
      children: [
        new TextRun({
          text,
          bold,
          color: darkTextColor,
          size: 22, // 11pt
          font: "Calibri",
        }),
      ],
      spacing: { after: 120 },
    });

  const bullet = (text: string, boldPrefix = "") =>
    new Paragraph({
      bullet: { level: 0 },
      children: [
        boldPrefix
          ? new TextRun({
              text: boldPrefix + " ",
              bold: true,
              color: darkTextColor,
              size: 22,
              font: "Calibri",
            })
          : new TextRun(""),
        new TextRun({
          text,
          color: darkTextColor,
          size: 22,
          font: "Calibri",
        }),
      ],
      spacing: { after: 80 },
    });

  const callout = (label: string, text: string) =>
    new Paragraph({
      children: [
        new TextRun({
          text: `[${label}] `,
          bold: true,
          color: primaryColor,
          size: 22,
          font: "Calibri",
        }),
        new TextRun({
          text,
          color: darkTextColor,
          size: 22,
          font: "Calibri",
        }),
      ],
      spacing: { before: 80, after: 120 },
    });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // TITLE BLOCK
          new Paragraph({
            children: [
              new TextRun({
                text: "TECHNICAL DESIGN DOCUMENT (TDD)",
                bold: true,
                color: primaryColor,
                size: 36, // 18pt
                font: "Calibri",
              }),
            ],
            spacing: { after: 80 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "TalentLens — AI Resume Screening Tool & Client Shortlist Portal",
                bold: true,
                color: darkTextColor,
                size: 28, // 14pt
                font: "Calibri",
              }),
            ],
            spacing: { after: 180 },
          }),

          // TOP METADATA TABLE
          p("Candidate: Prakhar Jain", true),
          p("Problem Statement: Problem Statement 2 (Staffing Firm's AI Resume Screening Tool & Client Shortlist Portal)"),
          p("Target Client: Company A, Noida (120 staff, 70 recruiters, ₹40-50 crore revenue)"),
          new Paragraph({
            children: [
              new TextRun({
                text: "Project GitHub Repository: ",
                bold: true,
                color: darkTextColor,
                size: 22,
                font: "Calibri",
              }),
              new TextRun({
                text: "https://github.com/PrakharJain345/talentlens",
                bold: true,
                color: primaryColor,
                size: 22,
                font: "Calibri",
              }),
            ],
            spacing: { after: 60 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Live Deployed Application URL: ",
                bold: true,
                color: darkTextColor,
                size: 22,
                font: "Calibri",
              }),
              new TextRun({
                text: "https://talentlens-rose.vercel.app",
                bold: true,
                color: primaryColor,
                size: 22,
                font: "Calibri",
              }),
            ],
            spacing: { after: 140 },
          }),

          // 1. EXECUTIVE SUMMARY & LABELED ASSUMPTIONS
          h1("1. Executive Summary & Labeled Assumptions"),
          p(
            "Company A operates as a premier staffing agency in Noida handling contract and permanent placements for IT services, banking back-office, and retail enterprises. Currently, 70 recruiters manually review ~300 open job descriptions a month with 120 CVs per requisition. Screening 1,08,000 minutes of resumes monthly leads to a 5-day shortlist turnaround, high recruiter fatigue, and ₹1.57 crore in lost annual revenue from lost deals."
          ),
          p(
            "TalentLens solves this bottleneck by introducing an AI-augmented screening system that extracts structured scorecards from JDs, processes bulk resumes via a client-driven queue, verifies evidence quotes directly against CV text, and empowers recruiters to deliver shortlists to clients via a mobile-first portal."
          ),

          h2("Explicit Problem Statement Assumptions (Labeled per Guidelines)"),
          callout(
            "ASSUMPTION 1 (Requisition Volume & Economics)",
            "300 open requisitions per month, 120 CVs received per requisition, 3 minutes spent manually reviewing each CV. Recruiter hourly cost is ₹350. 5% of open requisitions (180/year) are lost to faster competitor staffing firms at an average placement fee of ₹45,000, creating a measurable ₹1.57 crore annual loss."
          ),
          callout(
            "ASSUMPTION 2 (Scale & Infrastructure Bounds)",
            "Maximum batch upload per requisition is bounded at 500 CVs. Standard resume sizes average 2 MB in PDF or DOCX format. Processing is handled via client-driven concurrency (3 parallel requests) with Supabase Storage and serverless processing."
          ),
          callout(
            "ASSUMPTION 3 (Model Strategy & Groq Provider)",
            "The LLM provider uses an OpenAI-compatible endpoint powered by Groq (openai/gpt-oss-120b). Groq delivers ~500 tokens/sec at near-zero inference latency, eliminating long timeouts during scorecard extraction and profile parsing."
          ),
          callout(
            "ASSUMPTION 4 (Multi-Tenant Isolation & Role Boundaries)",
            "Users belong to either Company A (internal recruiters and delivery head) or external clients (Acme Corp, Beta Retail). Multi-tenancy is enforced at the database level via Row Level Security (RLS) and security-definer views, preventing client cross-talk."
          ),
          callout(
            "ASSUMPTION 5 (DPDP Compliance & Data Retention)",
            "In strict compliance with India's Digital Personal Data Protection Act (DPDP) 2023, resumes constitute personal data requiring affirmative consent, hiring-only use limitation, complete right-to-erasure workflows, and immutable access logging."
          ),

          // 2. ARCHITECTURE & TECHNOLOGY CHOICES
          h1("2. Architecture & Technology Choices"),
          p(
            "TalentLens is engineered as a modern full-stack web application optimized for ultra-low latency, robust compliance, and zero cold-start friction."
          ),
          bullet(
            "Next.js 14+ (App Router, React Server Components, TypeScript): Provides seamless hybrid rendering, fast server-rendered initial loads, robust API routes, and strict end-to-end type safety.",
            "Frontend & API Framework:"
          ),
          bullet(
            "Tailwind CSS & Lucide Icons: Hand-crafted minimal design system adhering strictly to the aesthetic brief—clean typography, ample white space, and a restrained Slate/Indigo color palette with zero bulky external UI libraries.",
            "Styling & Design:"
          ),
          bullet(
            "Supabase (PostgreSQL 15, Auth, Storage, RLS): Provides managed relational persistence, Row Level Security, JSONB operators, private file storage buckets, and session management.",
            "Database & Auth:"
          ),
          bullet(
            "Groq API (openai/gpt-oss-120b): Fast inference engine operating at temperature: 0 with JSON Mode and Zod validation, ensuring deterministic output structures without hallucinated schema formats.",
            "AI Inference Engine:"
          ),
          bullet(
            "In-Process Text Extraction: Uses 'unpdf' for zero-dependency PDF parsing and 'mammoth' for DOCX extraction, running efficiently inside Vercel serverless functions without native binaries.",
            "Document Parsing:"
          ),

          // 3. DATA MODEL & MAIN FLOWS
          h1("3. Data Model & Main Flows"),
          h2("Core Database Entities"),
          bullet("organizations: id, name, type ('staffing_agency' | 'client'), created_at", "organizations:"),
          bullet("users: id, email, role ('recruiter' | 'client' | 'delivery_head'), org_id, full_name", "users:"),
          bullet("requisitions: id, client_id, recruiter_id, title, status ('draft' | 'active' | 'closed'), target_close_date, created_at", "requisitions:"),
          bullet("scorecards: id, requisition_id, total_weight (100), criteria JSONB, created_at", "scorecards:"),
          bullet("candidates: id, name, email, phone, current_title, total_experience_years, key_skills (text[]), consent_given, consent_date, deleted_at", "candidates:"),
          bullet("applications: id, requisition_id, candidate_id, stage ('sourced'...'joined' | 'rejected'), total_score (numeric), fit_band, opened_by_recruiter_at, submitted_at, client_verdict", "applications:"),
          bullet("score_items: id, application_id, criterion_id, score, raw_quote, verified_quote, is_verified, missing_required", "score_items:"),
          bullet("access_log: id, user_id, action, candidate_id, application_id, ip_address, created_at", "access_log:"),

          h2("Main Application Workflows"),
          bullet(
            "JD Intake & Scorecard Extraction: Recruiter pastes raw JD text. Groq extracts title, location, experience range, notice limit, and 4-6 criteria with weights summing to 100. Recruiter edits criteria inline before activation.",
            "Flow 1:"
          ),
          bullet(
            "Bulk CV Ingestion: Recruiter uploads up to 500 CVs. Direct upload to Supabase storage followed by client-driven processing queue (concurrency 3). Profiles extracted into structured candidate entities.",
            "Flow 2:"
          ),
          bullet(
            "Evidence-Based AI Scoring: Candidate text is redacted (PII stripped). LLM evaluates criteria and extracts verbatim quotes. The server verifies quotes via substring match against raw text. Final score is computed purely via mathematical formula in code.",
            "Flow 3:"
          ),
          bullet(
            "Recruiter Review & Submit Gate: Recruiter inspects ranked candidate list. Opening a candidate sets 'opened_by_recruiter_at'. The submit button is strictly disabled until the recruiter has reviewed the profile.",
            "Flow 4:"
          ),
          bullet(
            "Client Shortlist Portal: Client logs into a dedicated mobile-friendly view. Contact details are masked. Client reviews verified quotes and recruiter notes, then clicks Shortlist, Reject (with reason), or Proposes Interview Slots.",
            "Flow 5:"
          ),
          bullet(
            "DPDP Erasure: Candidate or recruiter triggers deletion. All storage CV files are purged, PII columns nullified, status set to 'consent_revoked', and access log recorded.",
            "Flow 6:"
          ),

          // 4. AI SAFEGUARDS & 7 HARD RULES
          h1("4. AI Safeguards & 7 Hard Rules"),
          p(
            "TalentLens implements seven strict programmatic safeguards to prevent hallucination, bias, and unauthorized autonomous actions:"
          ),
          bullet(
            "No Autonomous Rejections (Hard Rule 1): The AI never assigns a 'rejected' status. Low scores simply reflect lower criteria fit. Candidates remain fully searchable and discoverable by recruiters.",
            "Rule 1:"
          ),
          bullet(
            "Verbatim Evidence Quotes (Hard Rule 2): For every scored criterion, the AI must provide an exact quote from the CV. The server performs a substring verification; hallucinated quotes are stripped (verified_quote = null) and marked as unverified.",
            "Rule 2:"
          ),
          bullet(
            "Mathematical Score Computation in Code (Hard Rule 3): The LLM never calculates the total score. The server computes: total_score = SUM(criterion.weight * item.score) / 100. If a must-have criterion is missing, the candidate is flagged with missing_required = true.",
            "Rule 3:"
          ),
          bullet(
            "Blind Scoring & Bias Prevention (Hard Rule 4): Candidate name, email, phone, gender, age, marital status, and photos are scrubbed from the CV text before passing to the scoring prompt.",
            "Rule 4:"
          ),
          bullet(
            "Mandatory Recruiter Submit Gate (Hard Rule 5): An application cannot be submitted to a client until a human recruiter has opened the candidate detail view (setting opened_by_recruiter_at). Attempting to submit via API without review returns HTTP 403 Forbidden.",
            "Rule 5:"
          ),
          bullet(
            "Client Isolation & Masking (Hard Rule 6): Clients read strictly through security-definer views with masked contacts (e.g. r•••@example.com, ••••••210). Contact details unmask only after the client shortlists the candidate.",
            "Rule 6:"
          ),
          bullet(
            "Deterministic LLM Controls (Hard Rule 7): All completions use temperature: 0, JSON mode, Zod validation, 429 rate limit backoff, and 1 automatic retry on schema discrepancy.",
            "Rule 7:"
          ),

          // 5. UI AND DESIGN DECISIONS
          h1("5. UI and Design Decisions"),
          p(
            "Design counts as much as code. TalentLens rejects generic templates in favor of a restrained, functional aesthetic engineered for recruiters scanning high-volume data."
          ),
          bullet(
            "Palette: Clean white backgrounds (#FFFFFF) with surface contrast (#FAFAFA), border dividers (#E5E7EB), and a single purposeful Indigo (#4F46E5) accent for primary actions, active tabs, and links.",
            "Color System:"
          ),
          bullet(
            "ScoreBadge Component: Combines score integers with a proportional thin progress bar and fitness bands (80+ High Fit, 50-79 Moderate Fit, <50 Low Fit) so status is never conveyed by color alone.",
            "ScoreBadge:"
          ),
          bullet(
            "EvidenceList Component: Renders verified quotes in a distinct blockquote with an Indigo border-left and monospace typography, paired with clear verdict chips.",
            "Evidence Display:"
          ),
          bullet(
            "Mobile-First Client Portal: Single-column layout (max width 672px) optimized for hiring managers reviewing shortlists on mobile phones. Features minimum 44px tap targets and a sticky bottom action bar (Shortlist, Reject, Propose Slot).",
            "Mobile UX:"
          ),
          bullet(
            "Comprehensive Screen Coverage: Delivered across 8 full screens: Login, Requisitions Dashboard, JD Intake & Scorecard Generator, Requisition Hub (Ranked List, Bulk Upload, Pipeline Board, Scorecard Editor), Candidate Detail View, Client Portal, Client Shortlist Cards, Weekly Calibration Review, and DPDP Access Log.",
            "Screen Suite:"
          ),

          // 6. WHAT WAS CUT & WHAT TO BUILD NEXT
          h1("6. What Was Cut & What to Build Next"),
          h2("Deliberately Cut Scope (per Assessment Boundaries)"),
          bullet(
            "Local OCR Engine: Real-time OCR in serverless environments is slow and compute-heavy. As specified in the brief, image scans are flagged as 'needs_ocr' rather than executing OCR.",
            "OCR Processing:"
          ),
          bullet(
            "Live External Communications: Mocked email and SMS dispatch in favor of real-time database state transitions.",
            "External Gateways:"
          ),

          h2("What Would Be Built Next (Roadmap)"),
          bullet(
            "Cloud Document AI: Integrate Google Cloud Document AI for high-accuracy OCR of scanned physical resumes.",
            "Next Feature 1:"
          ),
          bullet(
            "Calendar Webhooks: Bi-directional calendar synchronization (Google Calendar / Outlook) when client hiring managers propose interview slots.",
            "Next Feature 2:"
          ),
          bullet(
            "ATS Bi-directional Sync: Direct integration with enterprise ATS solutions (Greenhouse, Workday, Lever) to sync candidate stages automatically.",
            "Next Feature 3:"
          ),

          // 7. VERIFICATION MATRIX
          h1("7. Automated Testing & Verification"),
          p(
            "TalentLens includes 18 automated unit tests written in Vitest covering all core algorithmic and privacy logic:"
          ),
          bullet("tests/mask.test.ts: Email and phone masking for client privacy (2 tests passing)", "Masking:"),
          bullet("tests/redact.test.ts: Name, email, phone, DOB, and marital status scrubbing (3 tests passing)", "Redaction:"),
          bullet("tests/verifyQuote.test.ts: Exact, multiline whitespace, and hallucinated quote drops (5 tests passing)", "Quote Verification:"),
          bullet("tests/dedupe.test.ts: Normalization and Levenshtein distance checks (4 tests passing)", "Deduplication:"),
          bullet("tests/computeScore.test.ts: Mathematical weights, partial scoring, and must-have flags (4 tests passing)", "Score Computation:"),
          p("Next.js Production Build: Compiled cleanly with zero type errors (tsc --noEmit exit code 0)."),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.resolve(process.cwd(), "Technical_Design_Document.docx");
  fs.writeFileSync(outputPath, buffer);
  console.log(`✓ Generated: ${outputPath}`);
}

createTddDocument().catch(console.error);
