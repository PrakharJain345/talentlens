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
            spacing: { after: 120 },
          }),
          p("Live Deployment: Deployed on Vercel with cloud Supabase Postgres backend."),

          // 1. EXECUTIVE SUMMARY & LABELED ASSUMPTIONS
          h1("1. Executive Summary & Labeled Assumptions"),
          p(
            "Company A operates as a premier staffing agency in Noida handling contract and permanent placements for IT services, banking back-office, and retail enterprises. Currently, 70 recruiters manually review ~300 open job descriptions a month with 120 CVs per requisition. Screening 1,08,000 minutes of resumes monthly leads to a 5-day shortlist turnaround, high recruiter fatigue, and ₹1.57 crore in lost annual revenue from lost deals."
          ),
          p(
            "TalentLens solves this bottleneck by introducing an AI-augmented screening system that extracts structured scorecards from JDs, processes bulk resumes via a client-driven queue, verifies evidence quotes directly against CV text, and empowers recruiters to deliver shortlists to clients via a mobile-first portal."
          ),

          h2("Explicit Labeled Assumptions (per Guidelines)"),
          callout(
            "ASSUMPTION 1 (Requisition Volume & Economics)",
            "The firm handles 300 requisitions/month with 120 CVs per requisition. At 3 minutes per CV and recruiter rate of ₹350/hr, manual screening costs ₹75.6 lakh/year. Shortlists take 5 days, causing a 5% loss of requisitions (180 deals/year at ₹45,000 fee = ₹81 lakh). Total annual problem cost is ₹1.57 crore."
          ),
          callout(
            "ASSUMPTION 2 (Consent Architecture)",
            "Candidate consent is captured offline by recruiters during sourcing interactions. Recruiters digitally attest this consent ('Candidates have consented to processing for hiring') upon bulk upload, satisfying Section 6 of the DPDP Act 2023."
          ),
          callout(
            "ASSUMPTION 3 (Contact Masking vs. Names)",
            "Client hiring managers require candidate names to contextualize feedback during interviews. However, contact information (email, phone number) remains strictly masked until a candidate is shortlisted to protect staffing agency disintermediation."
          ),
          callout(
            "ASSUMPTION 4 (Scanned Document Handling)",
            "Optical Character Recognition (OCR) for scanned, image-only CVs is out of the Core Build scope. Documents with fewer than 200 extracted characters are flagged with a visible 'needs_ocr' status rather than failing silently."
          ),
          callout(
            "ASSUMPTION 5 (Communications & Integrations)",
            "Third-party integrations (job boards, background verification, live SMS/WhatsApp gateways, and video interviews) are mocked via database state transitions as specified in the brief's OUT OF SCOPE section."
          ),

          // 2. ARCHITECTURE & TECHNOLOGY CHOICES
          h1("2. Architecture & Technology Choices"),
          p(
            "TalentLens is engineered as a unified full-stack TypeScript application prioritizing high developer velocity, strict database-level security, and serverless reliability."
          ),
          bullet(
            "Next.js 14 (App Router) & React: Single codebase for React Server Components (RSC) and secure server route handlers (/api/*). RSC allows instantaneous data fetching while keeping database credentials strictly on the server.",
            "Framework:"
          ),
          bullet(
            "Supabase (PostgreSQL 15): Relational database with Row-Level Security (RLS) policies, foreign key cascades, and automated auth lifecycle triggers. Handles user sessions, candidate records, and immutable audit logs.",
            "Database & Auth:"
          ),
          bullet(
            "Groq Cloud API (OpenAI-compatible): Powered by open-weights models (openai/gpt-oss-120b). High-throughput token generation ensures single-CV extraction and scoring completes within 2-4 seconds.",
            "LLM Engine:"
          ),
          bullet(
            "Client-Driven Concurrency-3 Queue: Solves the serverless execution timeout problem without introducing expensive external message queues (Kafka, AWS SQS, or Redis). The browser uploads directly to private storage and orchestrates 3 parallel worker requests, each processing one CV safely.",
            "Queue Architecture:"
          ),
          bullet(
            "Parsing Engines (unpdf & mammoth): unpdf extracts clean text streams from serverless PDF buffers; mammoth parses DOCX structures into clean text.",
            "Document Parsing:"
          ),
          bullet(
            "Tailwind CSS & shadcn/ui: Minimalist, professional design system adhering to 4px spacing grids, Inter typography, 8px card radius, and a single Indigo (#4F46E5) accent.",
            "Styling & UI:"
          ),

          // 3. DATA MODEL & SCHEMA DESIGN
          h1("3. Data Model & Schema Design"),
          p(
            "The data model is partitioned to guarantee multi-tenant security between client organizations and maintain recruiter auditability."
          ),
          bullet(
            "clients: Stores client organizations (e.g. Acme Corp, Beta Retail).",
            "clients:"
          ),
          bullet(
            "profiles: Maps Supabase auth.users to user roles ('recruiter' or 'client') and associates clients to their organization ID.",
            "profiles:"
          ),
          bullet(
            "requisitions: Contains job title, JD text, status, client foreign key, and creator.",
            "requisitions:"
          ),
          bullet(
            "scorecard_criteria: Stores hiring criteria extracted from JDs (kind, label, params, weight 1-5, required boolean, order position).",
            "scorecard_criteria:"
          ),
          bullet(
            "candidates: Central repository for candidate data. Contains both raw cv_text (PII) and cv_text_redacted (blind scoring text). Renamed 'current_role' to 'current_title' to avoid Postgres reserved keyword collisions.",
            "candidates:"
          ),
          bullet(
            "cv_uploads: Tracks batch ingestion records with statuses ('queued', 'parsing', 'parsed', 'scored', 'failed', 'duplicate', 'needs_ocr').",
            "cv_uploads:"
          ),
          bullet(
            "applications: Junction entity (requisition_id × candidate_id). Stores computed score, missing-must-have flags, stage ('sourced' through 'joined'), opened_by_recruiter_at timestamp (submit gate), and client decisions.",
            "applications:"
          ),
          bullet(
            "score_items: Stores individual criterion evaluations, verdict ('met', 'partial', 'not_met', 'unknown'), verified verbatim quotes, and computed points.",
            "score_items:"
          ),
          bullet(
            "access_log: Immutable audit table recording actor, candidate, application, and action ('viewed_cv', 'viewed_contact', 'submitted', 'decided', 'deleted').",
            "access_log:"
          ),
          bullet(
            "Security-Definer Views: 'client_shortlist' and 'client_score_items' enforce that client accounts can only query submitted candidates belonging to their own organization with masked contact numbers.",
            "Client Views:"
          ),

          // 4. MAIN FLOWS & AI SAFEGUARDS
          h1("4. Main Flows & AI Safeguards Engine"),
          p(
            "The AI implementation enforces seven strict principles to eliminate demographic bias, prevent hallucinated evaluations, and ensure human recruiters remain in full control."
          ),

          h2("The 7 Hard Rules Implemented in Code"),
          bullet(
            "Never Auto-Reject Anyone (Hard Rule 1): Low scorers remain visible, searchable, and reviewable. For example, Arjun Rawat (KYC Analyst, score 14) is never dropped or filtered out.",
            "Rule 1:"
          ),
          bullet(
            "Verified Substring Quotes (Hard Rule 2): Every evidence quote generated by the LLM is verified in code using normalized substring matching (verifyQuote). If a quote cannot be verified verbatim against the CV, it is discarded and the verdict is downgraded to 'unknown' ('No evidence found').",
            "Rule 2:"
          ),
          bullet(
            "Deterministic In-Code Score Calculation (Hard Rule 3): The LLM never computes candidate scores. The total 0-100 score is calculated mathematically in code from criteria weights and verdicts: met=1.0, partial=0.5, not_met=0.0, unknown=0.0. Missing required criteria trigger visible warning flags without disqualifying candidates.",
            "Rule 3:"
          ),
          bullet(
            "Blind Scoring (Hard Rule 4): Before text reaches the scoring model, redactCvText scrubs candidate name, email, phone numbers, and demographic lines (DOB, Age, Gender, Marital Status, Nationality). Tested with Kavita Sharma's CV (DOB and marital status scrubbed prior to scoring).",
            "Rule 4:"
          ),
          bullet(
            "Server-Side Submit Gate (Hard Rule 5): Recruiter must open and review a candidate's CV detail page before submitting them to a client. POST /api/applications/[id]/submit checks opened_by_recruiter_at server-side and returns HTTP 403 Forbidden if not reviewed.",
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
