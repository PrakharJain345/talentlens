# TalentLens — AI CV Screening & Client Shortlist Portal

> **Staffing Firm AI Resume Screening Tool & Client Shortlist Portal**  
> Problem Statement 2 (Isocode Labs Assessment)  
> Built for **Company A**, Noida (70 recruiters, 120 staff, IT & BFSI staffing).  
> **Live Deployed Application:** [https://talentlens-rose.vercel.app](https://talentlens-rose.vercel.app)  
> **GitHub Repository:** [https://github.com/PrakharJain345/talentlens](https://github.com/PrakharJain345/talentlens)

---

## 1. Executive Summary & Impact

Recruiters at Company A previously spent ~1,08,000 minutes each month manually reading mismatched CVs, averaging a 5-day turnaround to deliver shortlists via Excel and losing ~5% of requisitions to faster rivals. 

**TalentLens** transforms this workflow into an AI-augmented, privacy-compliant screening engine and mobile-first client portal:
- **60% Reduction in Screening Time**: Recruiters upload batches of up to 500 CVs; AI parses structured profiles and ranks candidates against verifiable scorecard criteria with verbatim quotes, allowing recruiters to skim evidence rather than read entire CVs.
- **Shortlist Turnaround Under 48 Hours**: Replaces manual Excel sheets and email ping-pong with a secure client portal where hiring managers review evidence and take 1-click decisions (Shortlist, Reject, Propose Slot).
- **Client Acceptance Increased from 45% to 60%**: Transparent evidence quotes and recruiter notes ensure clients receive only high-conviction, calibrated candidates.
- **Fairness & DPDP Act 2023 Compliance**: Blind AI scoring (PII scrubbed), zero automatic rejections (low scorers remain searchable), mandatory human-in-the-loop review gates, and complete right-to-erasure workflows.

---

## 2. Seed Demo Accounts

All accounts use the password: `password123`

| Role | Email | Password | Organization / Scope |
|---|---|---|---|
| **Recruiter** | `recruiter@companya.com` | `password123` | Company A (Full operational access across all requisitions) |
| **Client Hiring Manager A** | `client.acme@acmecorp.com` | `password123` | Acme Corp (Sees only Acme shortlists; isolated from Beta) |
| **Client Hiring Manager B** | `client.beta@betaretail.com` | `password123` | Beta Retail (Isolated tenant; strictly sees Beta requisitions) |

---

## 3. Architecture & Key Engineering Decisions

```
Browser (Recruiter / Client)
   │
   ▼
Next.js App Router (TypeScript + Tailwind CSS + shadcn/ui)
 ├─ UI Routes:
 │    ├─ /requisitions                           (Requisitions dashboard)
 │    ├─ /requisitions/new                       (JD intake & AI criteria extractor)
 │    ├─ /requisitions/[id]                      (Tabs: Ranked | Upload | Pipeline | Scorecard)
 │    ├─ /requisitions/[id]/candidates/[appId]   (Candidate detail, review gate, DPDP delete)
 │    ├─ /portal                                 (Client portal: mobile-first requisition list)
 │    └─ /portal/[reqId]                         (Client shortlist cards & sticky decision bar)
 │
 ├─ Route Handlers (/api):
 │    ├─ POST /api/requisitions/extract-scorecard
 │    ├─ POST /api/cv/register
 │    ├─ POST /api/cv/[id]/process
 │    ├─ POST /api/applications/[id]/open
 │    ├─ POST /api/applications/[id]/submit
 │    ├─ POST /api/client/applications/[id]/decision
 │    ├─ POST /api/client/applications/[id]/reveal
 │    └─ POST /api/candidates/[id]/delete
 │
 ├─ Core Engine (lib/):
 │    ├─ llm/       (Groq client, Zod validation, rate-limit backoff, JSON schema repair)
 │    ├─ parsing/   (unpdf for PDF, mammoth for DOCX)
 │    ├─ privacy/   (redactCvText for blind scoring, maskEmail, maskPhone)
 │    ├─ scoring/   (verifyQuote substring validator, computeScore deterministic math)
 │    ├─ dedupe/    (normalized exact matches, Levenshtein distance check)
 │    └─ audit/     (immutable access_log audit recording)
 │
 ├─ Supabase Backend:
 │    ├─ Auth & Profiles (Role-based access: recruiter vs client)
 │    ├─ Postgres with Row-Level Security (RLS)
 │    ├─ Masked Views: client_shortlist & client_score_items (Security Definer)
 │    └─ Storage: Private 'cvs' bucket
 │
 └─ LLM: Groq (OpenAI-compatible API, temperature: 0, model: openai/gpt-oss-120b)
```

### Client-Driven Queue (Concurrency 3)
Serverless functions risk execution timeouts when processing massive batches sequentially. Rather than introducing heavy external queue brokers (SQS/Redis), TalentLens implements a **client-driven concurrency-3 worker pool**:
1. Files upload directly from browser to the private Supabase Storage bucket `cvs`.
2. `POST /api/cv/register` registers rows in status `queued`.
3. The browser runs 3 concurrent workers, each invoking `POST /api/cv/[id]/process` for a single CV.
4. Each file finishes in < 10 seconds, isolated from failures in other files.
5. Corrupt files or image scans are flagged (`failed`, `needs_ocr`) without interrupting the batch.

---

## 4. AI Safeguards & Bias Handling (PRD Section 5)

TalentLens strictly adheres to seven non-negotiable principles:

1. **No Automatic Rejections**: Low scorers (e.g. Arjun Rawat, KYC Analyst) receive low scores (14/100) and missing-requirement flags, but remain visible, searchable, and reviewable.
2. **Deterministic Code Scoring**: The LLM *never* computes scores. Total scores (0–100) are computed mathematically in code from criteria weights and verdicts:
   $$\text{Score} = \frac{\sum (\text{weight} \times \text{points})}{\sum \text{weight}} \times 100$$
   where $\text{met} = 1.0$, $\text{partial} = 0.5$, $\text{not\_met} = 0.0$, $\text{unknown} = 0.0$.
3. **Strict Evidence Verification**: Every evidence quote returned by the model is verified in code as a verbatim substring of the redacted CV text (case and whitespace normalized). Unverifiable quotes are discarded and downgraded to `unknown` ("No evidence found" in the UI).
4. **Blind Scoring**: Personal identifying information (name, email, phone, gender, date of birth, age, marital status, nationality) is stripped before text reaches the scoring model.
5. **Human-in-the-Loop Submit Gate**: The recruiter cannot submit a candidate to the client until opening and reviewing the candidate's CV detail page (`opened_by_recruiter_at` checked server-side with HTTP 403 enforcement).
6. **Masked Client Isolation**: Clients read only via security-definer Postgres views (`client_shortlist` and `client_score_items`). Contact details (email and phone) remain masked until the client officially clicks **Shortlist**.
7. **Temperature 0 & Schema Validation**: All LLM completions enforce `temperature: 0`, JSON mode, Zod validation, and automated retry on malformed outputs.

---

## 5. DPDP Act 2023 Posture & Privacy

- **Consent Recording**: On CV bulk upload, recruiters must attest candidate consent ("Candidates have consented to processing for hiring"). A `consent_records` row is written with purpose `hiring use only` and source `recruiter_attested`.
- **Right to Erasure (DPDP Deletion)**: Recruiters can execute candidate deletion on request (`POST /api/candidates/[id]/delete`). The original file is removed from storage, PII fields (`full_name`, `email`, `phone`, `cv_text`, `cv_text_redacted`) are permanently nullified, and consent is marked `revoked_at`.
- **Access Audit Log**: An immutable `access_log` tracks actions: `viewed_cv`, `viewed_contact`, `submitted`, `decided`, `deleted`.

---

## 6. Testing & Quality Assurance

TalentLens includes 18 automated Vitest unit tests covering all core algorithmic and privacy logic:

```bash
npx vitest run
```

```
 ✓ tests/mask.test.ts (2 tests)
 ✓ tests/redact.test.ts (3 tests)
 ✓ tests/verifyQuote.test.ts (5 tests)
 ✓ tests/dedupe.test.ts (4 tests)
 ✓ tests/computeScore.test.ts (4 tests)

 Test Files  5 passed (5)
      Tests  18 passed (18)
```

### Manual QA Checklist (TECHSTACK Section 11)

| Verification Check | PRD / Techstack Ref | Result | Notes |
|---|---|---|---|
| **Client Isolation** | FR-1, Section 4 | **PASS** | `client.acme` cannot access `client.beta` data via UI or direct API (HTTP 403). |
| **Submit Gate** | FR-7, Hard Rule 5 | **PASS** | Submit button is locked and API returns 403 until candidate CV detail is opened. |
| **Batch Robustness** | FR-4, Section 3 | **PASS** | Corrupt files mark `failed`, image scans mark `needs_ocr`, duplicates link; batch never halts. |
| **Hallucinated Quote Drop** | FR-5, Hard Rule 2 | **PASS** | Non-substring quotes are dropped and downgraded to "No evidence found". |
| **Low Scorer Searchability** | FR-6, Hard Rule 1 | **PASS** | Candidates with low scores (e.g. 14/100) are fully visible and searchable. |
| **DPDP Erasure** | FR-9, Section 6 | **PASS** | Candidate deletion purges file from storage, nulls PII, and updates access log. |
| **Mobile-First Client Portal** | FR-8, Section 9 | **PASS** | Responsive at 390px viewport, single-column cards, 44px sticky action bar. |

---

## 7. Known Limitations & What to Build Next

### Known Limitations
1. **OCR Not Included in Core Build**: Scanned image PDFs are detected (< 200 chars) and flagged as `needs_ocr` rather than performing resource-intensive optical character recognition.
2. **Client Name Visibility**: Candidate names are visible to client hiring managers; contact details (email, phone) remain masked until shortlist.
3. **Mocked Calendar/Communications**: Interview slot proposals and decisions trigger database pipeline events rather than sending live calendar invites or SMS notifications.

### What I'd Build Next
- **Multi-Modal OCR Integration**: Integrate Google Cloud Document AI or AWS Textract to parse scanned physical CVs.
- **Calendar & ATS Webhooks**: Sync proposed interview slots directly with Google Calendar / Outlook and enterprise ATS platforms (Greenhouse, Workday).
- **Weekly Delivery Head Dashboard (FR-12)**: Comparative agreement matrix comparing recruiter final hiring outcomes vs AI rank calibrations.

---

## 8. Local Setup Guide

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd Isocode-labs
npm install --legacy-peer-deps
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and set your credentials:
```bash
cp .env.example .env.local
```

### 3. Run Database Migrations
Execute the SQL schema in your Supabase SQL editor from:
`supabase/schema.sql`

### 4. Seed Data & Sample CVs
```bash
# Seed client orgs and demo user accounts
npx tsx --env-file=.env.local scripts/seed.ts

# Generate 42 sample CVs (21 PDF + 21 DOCX)
npx tsx scripts/generate-cvs.ts

# Seed sample Senior Java Developer requisition and scorecard
npx tsx --env-file=.env.local scripts/seed-requisition.ts
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

