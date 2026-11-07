# PRD: TalentLens — AI CV Screening and Client Shortlist Portal

> Working name: **TalentLens** (rename freely).
> Assessment: Isocode Labs, Problem Statement 2 (Staffing firm's AI resume screening tool and client shortlist portal).
> Timeline: 2–3 days. Scope is the brief's **Core Build** slice only; everything else is optional depth.

---

## 1. Overview

**Client:** Company A, Noida. Contract and permanent hiring for IT services, banking back-office and retail clients. 120 staff, 70 recruiters, ₹40–50 crore revenue.

**Today:** Clients email JDs. Recruiters search job boards and an old database, download CVs, read each one, send shortlists as Excel sheets with CVs attached, and track status in personal sheets. Feedback arrives by email or phone.

**Problem (from brief):** ~1,08,000 minutes a month spent reading CVs that were never going to fit, 5-day shortlist turnaround, and ~5% of requisitions lost to faster rivals. About ₹1.57 crore a year.

**Product:** A web app where a recruiter pastes a JD, gets an editable AI scorecard, bulk-uploads CVs, sees candidates ranked best-first with **quoted evidence from the CV** for each criterion, submits shortlists to a **client portal**, and tracks a pipeline. Fairness and privacy are first-class: no auto-rejection, scoring blind to personal attributes, consent tracking, and an access log.

## 2. Goals and success metrics

| Goal (from brief) | Target | How the product supports it |
|---|---|---|
| Cut screening time per requisition | Down 60% | Bulk upload, auto-parse, ranked list with evidence so recruiters skim instead of read |
| Faster shortlists | Within 48 hours for 80% of requisitions | Client portal replaces Excel and phone; submit in a click |
| Better client acceptance | 45% to 60% | Evidence-backed shortlists, clients accept or reject with reasons |
| Show clients candidates are treated fairly | Demonstrable | Blind scoring, evidence on every score, human-in-the-loop, audit log |

For the assessment, include a small **"Impact" note in the README** showing how the app maps to these metrics (no need to measure them live).

## 3. Users and roles

| Role | Who | Primary needs |
|---|---|---|
| **Recruiter** | Company A staff (70 of them) | Upload CVs against a job, see the best first with reasons, submit to client, track status |
| **Client hiring manager** | Employee of a client company | Review shortlists on a phone, shortlist / reject with reason / propose an interview slot |
| **Delivery head** (optional) | Company A manager | Weekly comparison of AI rank vs recruiter choices (optional screen) |
| CEO | Signs the deal | Not a user; README and demo should speak to him |

Only **Recruiter** and **Client hiring manager** roles are required in the build (per brief).

## 4. Scope

### 4.1 In scope (Core Build, ~7 screens)
1. JD intake with an editable scorecard
2. Bulk CV upload and parsing (PDF and DOCX) with duplicate detection
3. AI scoring with quoted evidence per criterion
4. Ranked candidate list
5. Candidate detail with evidence and the submit action
6. Client shortlist portal (mobile-first, masked contacts)
7. Pipeline per requisition (sourced to joined)
8. Consent record and deletion on request (compact version, see FR-9)

### 4.2 Optional depth (only if time remains)
- Fuzzy duplicate matching beyond exact email/phone
- "Who viewed what" audit log UI (the logging itself is in scope; the viewer UI is optional)
- Weekly AI-vs-recruiter sample screen for the delivery head
- Interview slot picker UI (a free-text proposed slot is enough)

### 4.3 Out of scope (explicit)
- Job board integrations or scraping
- Video interviews
- Background verification
- Real payments, real email/SMS (mock them), OCR for scanned CVs (flag only)

## 5. Principles that must hold (what evaluators will probe)

1. **Never reject automatically.** Low scorers remain visible and searchable.
2. **Every score shows its evidence.** Each criterion carries a quote taken from the CV. Quotes are verified in code against the CV text; unverifiable quotes are dropped and shown as "no evidence found".
3. **A recruiter must open a CV before submitting it.** The submit button stays disabled until the CV detail has been opened (tracked server-side).
4. **Blind scoring.** Name, gender, age/DOB, photo and marital status are removed before text reaches the scoring model.
5. **Clients see only what is submitted to them**, with masked contact details until they shortlist.
6. **DPDP Act 2023 posture:** consent recorded, hiring-use-only purpose, deletion on request, and a log of who viewed what.
7. **Design is part of the grade.** Minimal, white space, restrained palette, clear type, nothing without purpose.

## 6. Functional requirements

Priority: **P0** = must ship, **P1** = should ship, **P2** = optional.

### FR-1 Authentication and roles (P0)
- Email + password login (Supabase Auth). Two roles: `recruiter`, `client`.
- Client users belong to one `client` organisation.
- Seed accounts: 1 recruiter, 2 client users (different client orgs, to prove isolation).
- **Acceptance:** A client user can never see another client's requisitions, candidates, or scores, including by direct URL or API call.

### FR-2 Requisitions list (P0)
- Recruiter sees all their requisitions with: title, client, status, candidate count, submitted count, created date.
- "New requisition" button.
- **Acceptance:** Empty, loading and error states exist.

### FR-3 JD intake and editable scorecard (P0)
- Recruiter pastes JD text (and selects the client). Clicking **Extract** calls AI to produce a scorecard of criteria:
  - Must-have skills (each a criterion)
  - Nice-to-have skills
  - Experience range (min, max years)
  - Location
  - CTC range (if present)
  - Notice period (max days)
- Each criterion has: `label`, `kind`, `weight` (1–5), `required` (bool). All editable: add, remove, reorder, change weight, toggle required.
- Save creates the requisition and scorecard.
- **Acceptance:** For the sample JD (*Senior Java Developer, 5–8 years, Spring Boot, Noida, notice up to 60 days*), the scorecard contains Java, Spring Boot, 5–8 years experience, Noida, and notice ≤ 60 days. The recruiter can edit before saving.

### FR-4 Bulk CV upload and parsing (P0)
- Drag-and-drop or picker; PDF and DOCX; up to 500 files per batch (UI limit; test with ~20).
- Each file shows a live status: `queued → parsing → parsed → scored`, or `failed`, `duplicate`, `needs_ocr`.
- Pipeline per file: extract text, AI converts text to a structured profile (name, email, phone, current role, total experience years, skills, notice days, current CTC, location, summary), then duplicate check, then redaction, then scoring.
- **Scanned CVs** (extracted text too short): flagged `needs_ocr`, kept in the list, not scored, with a clear message. No OCR required.
- **Duplicates:** if email or phone matches an existing candidate (or a normalised name + phone-tail match, P1), the new file is marked `duplicate`, linked to the existing candidate, and not re-scored. The recruiter can see the link.
- **Acceptance:** Uploading a batch of ~20 mixed CVs (incl. one duplicate, one scan, one broken file) completes without crashing, and each file ends in a correct, visible status.

### FR-5 AI scoring with evidence (P0)
- Input to the model: the **redacted** CV text and the scorecard.
- For each criterion the model returns: `verdict` (`met` | `partial` | `not_met` | `unknown`), `evidence_quote` (verbatim from the CV, or null), and a one-line `reason`.
- The **total score (0–100) is computed in code** from verdicts and weights (never by the model).
  - `met` = 1.0, `partial` = 0.5, `not_met` = 0, `unknown` = 0 (shown distinctly as "no evidence").
  - A missing **required** criterion adds a visible flag ("Missing must-have: Spring Boot") but does **not** exclude the candidate.
- **Quote verification:** Each quote is normalised (whitespace, case) and checked as a substring of the redacted CV text. Failed quotes are discarded and the verdict is downgraded to `unknown`.
- **Acceptance:** Every score row in the UI shows a real, verifiable quote or the label "No evidence found". The ranked list shows the score, top 2 evidence lines, and flags.

### FR-6 Ranked candidate list (P0)
- Per requisition, candidates sorted by score descending, with: score, current role, experience, notice days, top evidence snippets, flags, stage.
- Filters: stage, min score, text search over skills. **Low scorers are searchable and visible** (no hidden threshold).
- Bulk-select is optional.
- **Acceptance:** A candidate with a low score can still be found via search and opened.

### FR-7 Candidate detail and submit gate (P0)
- Shows: profile summary, score, per-criterion verdict + quote + reason, original CV viewer (PDF or extracted text), consent status, notes.
- Opening this page records `opened_by_recruiter_at` (server-side, per application).
- **Submit to client** button is **disabled until the CV was opened**, with a tooltip explaining why. Recruiter can add a short note to the client.
- Name, gender, age, photo, marital status are shown to the recruiter in the profile (they are hidden only from *scoring*), but the UI should make clear scoring ignored them.
- **Acceptance:** Calling the submit API for an application that was never opened returns an error.

### FR-8 Client shortlist portal (P0)
- Mobile-first. Client sees requisitions with submitted candidates only.
- Candidate card: name, role, experience, notice period, score band or score, top evidence lines, recruiter note.
- **Contacts are masked** (e.g. `+91 98•••••321`, `r•••@gmail.com`) until the client shortlists; reveal is logged.
- Actions: **Shortlist**, **Reject** (reason required, from a short list plus optional text), **Propose interview slot** (date and time, plus optional note).
- Decisions update the pipeline stage and are visible to the recruiter.
- **Acceptance:** On a 390px-wide viewport the portal is fully usable; a client can never see an unsubmitted candidate.

### FR-9 Consent and deletion (P0, compact)
- Each candidate has a **consent record**: purpose (`hiring use only`), granted at, source (`recruiter attested`, `candidate email`, etc.), revoked at.
- On CV upload, the recruiter confirms a checkbox: "Candidates have consented to their CVs being processed for hiring." Stored per batch and written to each candidate's consent record.
- **Delete on request:** a recruiter action on the candidate page. It deletes the stored file, nulls PII fields (name, email, phone, CV text), sets `deleted_at`, and keeps a non-identifying tombstone so pipeline stats stay intact. Writes to the access log.
- **Acceptance:** After deletion, the candidate disappears from lists and the client portal, and the file is gone from storage.

### FR-10 Access log (P0 logging, P2 UI)
- Log: who (user), what (candidate / application), action (`viewed_cv`, `viewed_contact`, `submitted`, `decided`, `deleted`), timestamp.
- **Acceptance:** Opening a CV and revealing a contact each create a log row.

### FR-11 Pipeline per requisition (P0)
- Stages: `sourced → screened → submitted → shortlisted → interview → offered → joined`, plus `rejected` (with reason).
- Simple board or stepper view with counts per stage; recruiter can move a candidate manually (except client-owned transitions, which the client triggers).
- **Acceptance:** Stage counts match the list view.

### FR-12 Weekly AI-vs-recruiter sample (P2)
- A simple page: a sample of recent requisitions showing AI rank vs the recruiter's final order and the agreement rate. Seed with a few rows.

## 7. AI behaviour and safeguards

| Risk | Safeguard |
|---|---|
| Model rejects good candidates | No auto-reject; low scorers stay visible and searchable |
| Model hallucinates evidence | Every quote is verified as a substring of the CV text; otherwise dropped |
| Demographic bias | Name, gender, age, DOB, photo, marital status removed before scoring; scoring prompt forbids inferring them |
| Rubber-stamping | Recruiter must open CV before submit; weekly AI-vs-human sample (optional) |
| Inconsistent scoring | Temperature 0, structured JSON output, final score computed in code |
| Scans or broken files | Flagged `needs_ocr` / `failed`, never silently skipped |
| Prompt injection inside CVs | CV text is treated as data in a delimited block; output validated against a schema; quotes verified |

## 8. Non-functional requirements

- **Privacy:** CVs are personal data under DPDP Act 2023. Hiring use only, deletion on request, access log, row-level security so each client sees only their submitted candidates.
- **Mobile:** Client portal is designed mobile-first. Recruiter screens must work on a laptop; tablet is a bonus.
- **Performance:** Single CV processed in under ~15 s; ranked list loads under 2 s for ~100 candidates.
- **Reliability:** One bad file never blocks a batch.
- **Accessibility:** Sufficient contrast, keyboard-focusable controls, labels on inputs.

## 9. Design requirements

- **Feel:** minimal, clean, professional. White space, one accent colour, clear type, nothing on screen without a purpose.
- **Score first:** the score, its evidence and the next action are the most prominent elements on recruiter screens.
- **Client portal:** one column, large tap targets, sticky action bar on mobile.
- **States:** every screen has loading, empty, and error states.
- Tokens and components are specified in `TECHSTACK.md`.

## 10. Data and seed

Seed from the brief's sample data, then add ~15–20 synthetic CVs so ranking looks meaningful.

| Candidate ID | Name | Current role | Exp (yrs) | Key skills | Notice (days) |
|---|---|---|---|---|---|
| CND-91022 | Ritika Bansal | Senior Java Developer | 6.5 | Java, Spring Boot, microservices | 60 |
| CND-91047 | Arjun Rawat | KYC Analyst | 3.0 | KYC, AML checks, Excel | 30 |
| CND-91088 | Pooja Nair | Java Developer | 4.0 | Java, Hibernate, REST APIs | 90 |

**Example JD:** Senior Java Developer, 5–8 years, Spring Boot, Noida, notice up to 60 days.

Expected ranking for this JD: Ritika first, Pooja second (partial), Arjun last but still visible. Include in the seed set: one **duplicate** CV (same email as Ritika), one **scanned/image-only PDF**, one **corrupt file**, and one CV with **personal details** (photo/marital status line) to prove redaction. Generate PDFs and DOCX versions.

Mock everything external (email, SMS, calendar).

## 11. Build plan (3 days)

**Day 1: Foundations and ingestion**
- Project setup, Supabase schema, auth, two roles, RLS
- Requisitions list, JD intake, AI scorecard extraction, editable scorecard
- Upload UI, storage, text extraction (PDF, DOCX), AI profile extraction, duplicate check

**Day 2: Scoring and portals**
- Redaction, scoring prompt, evidence verification, score calculation
- Ranked list, candidate detail, open-tracking, submit gate
- Client portal with masking, shortlist / reject / propose slot, access log

**Day 3: Depth, polish, delivery**
- Pipeline view, consent record and deletion
- Mobile and design polish, empty and error states
- Seed data, deploy, README, demo video or screenshots

**If time runs short, cut in this order:** fuzzy dedupe, pipeline board (keep a stage column), interview slot picker (keep free text). **Never cut:** evidence quotes, submit gate, blind scoring, client masking and isolation.

## 12. Deliverables checklist

- [ ] Deployed app URL and seeded demo accounts (recruiter, client A, client B)
- [ ] Public repo with clear commit history
- [ ] README: setup, architecture, assumptions, AI safeguards, DPDP approach, known limitations, what I'd build next
- [ ] Short demo video (or screenshots) walking the full flow
- [ ] Sample CV pack used for the demo

## 13. Assumptions and open questions

- Candidate consent is captured **offline** by the recruiter and attested in the app. A candidate-facing consent flow is out of scope.
- The scorecard is the single source of truth for scoring; the model does not invent criteria.
- "Masked contacts" means phone and email only. Names are visible to clients; revisit if the brief's reviewers expect name masking too (state your choice in the README).
- Scans are flagged, not OCR'd, because OCR is not in the Core Build.
- Scores are recruiter decision support, not hiring decisions.
