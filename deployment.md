# Deployment Guide — TalentLens

**Problem Statement 2:** Staffing Firm's AI Resume Screening Tool & Client Shortlist Portal  
**Project GitHub Repository:** [https://github.com/PrakharJain345/talentlens](https://github.com/PrakharJain345/talentlens)  
**Live Deployed Application:** Available on Vercel *(see repository README for latest live deployment URL)*

---

## 1. Demo Login Credentials for the Reviewer

All demo accounts share the password: **`password123`**

| Role | Email | Password | Scope & Review Focus |
|---|---|---|---|
| **Recruiter** | `recruiter@companya.com` | `password123` | **Company A** — Full recruiter dashboard, job intake with AI scorecard extraction, bulk CV upload, candidate ranking, candidate detail view with verified evidence quotes, submit review gate, and DPDP candidate erasure. |
| **Client Hiring Manager (Org A)** | `client.acme@acmecorp.com` | `password123` | **Acme Corp** — Mobile-first shortlist view for Acme requisitions with masked contacts (`r•••@example.com`, `••••••210`), verified evidence quotes, and sticky decision bar (**Shortlist**, **Reject** with reason, **Propose Slot**). |
| **Client Hiring Manager (Org B)** | `client.beta@betaretail.com` | `password123` | **Beta Retail** — Evaluates **multi-tenant isolation** (cannot view, query, or mutate Acme Corp’s shortlists or candidates). |

---

## 2. Environment Variables Required (Names Only)

> **Security Compliance Note:** In strict compliance with submission guidelines, only environment variable names are listed below. Secrets and keys are never committed to the public repository.

### Supabase Configuration
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` *(Server-only, never exposed to browser)*

### LLM Configuration (OpenAI-Compatible API / Groq)
- `LLM_API_KEY`
- `LLM_BASE_URL`
- `LLM_MODEL`

*(Reference template available in `.env.example` in the repository root.)*

---

## 3. How to Run Locally (Step-by-Step)

### Prerequisites
- Node.js version 18.18+ or 20+
- npm version 9+ or 10+
- Git

### Step 1: Clone the Repository
```bash
git clone https://github.com/PrakharJain345/talentlens.git
cd talentlens
```

### Step 2: Install Dependencies
```bash
npm install --legacy-peer-deps
```

### Step 3: Configure Environment Variables
Create a `.env.local` file in the root directory by copying the template:
```bash
cp .env.example .env.local
```
Fill in your Supabase project credentials and your Groq/OpenAI-compatible LLM API credentials.

### Step 4: Run Database Schema & Migrations
In your Supabase project's SQL Editor, execute the complete SQL schema found at:
```
supabase/schema.sql
```
This sets up all tables, enums, Row-Level Security (RLS) policies, and the masked security-definer views (`client_shortlist` and `client_score_items`).

### Step 5: Seed Demo Accounts & Sample Requisition
Run the idempotent seed scripts via `tsx`:
```bash
# 1. Seed demo users (recruiter, client.acme, client.beta)
npx tsx --env-file=.env.local scripts/seed.ts

# 2. Seed the sample "Senior Java Developer" requisition & scorecard
npx tsx --env-file=.env.local scripts/seed-requisition.ts

# 3. (Optional) Ingest and score the sample CV pack from /sample-cvs
npx tsx --env-file=.env.local scripts/test-process-sample-cvs.ts
```

### Step 6: Run Unit Tests
Verify that all 18 automated unit tests pass:
```bash
npx vitest run
```

### Step 7: Start the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 4. How the Application is Deployed

### Frontend & API Layer (Vercel)
- The Next.js 14 App Router application is deployed serverlessly on **Vercel**.
- Continuous Deployment (CD) is enabled via the GitHub repository's `master` branch.
- Each push to `master` automatically triggers an optimized production build (`next build`).
- Build output consists of static landing/login pages, dynamic server-rendered RSC routes, and edge-ready API route handlers (`/api/*`).

### Backend & Database Layer (Supabase)
- **Database:** Hosted PostgreSQL instance on Supabase.
- **Row-Level Security (RLS):** Enforced natively on all operational tables (`requisitions`, `candidates`, `applications`, `score_items`, `cv_uploads`, `access_log`).
- **Data Isolation:** Clients query only the masked security-definer views (`client_shortlist`, `client_score_items`), which filter strictly by `auth_role() = 'client'` and `r.client_id = auth_client()`.
- **Storage:** Private bucket `cvs` with RLS access policies restricting file uploads and downloads.

### AI Inference Layer (Groq Cloud)
- LLM inference runs via Groq's high-speed inference engine using `openai/gpt-oss-120b`.
- Configured with `temperature: 0`, JSON mode enforcement, Zod schema validation, exponential backoff on 429 rate limits, and automatic retry on malformed outputs.
- Redacted CV text is isolated in untrusted data delimiters to prevent prompt injection.
