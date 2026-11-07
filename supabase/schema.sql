-- ==============================================================================
-- TalentLens: Initial Schema, RLS Policies & Views (TECHSTACK Section 4)
-- ==============================================================================

-- 1. ENUMS
create type user_role as enum ('recruiter', 'client');
create type upload_status as enum ('queued', 'parsing', 'parsed', 'scored', 'failed', 'duplicate', 'needs_ocr');
create type pipeline_stage as enum ('sourced', 'screened', 'submitted', 'shortlisted', 'interview', 'offered', 'joined', 'rejected');
create type criterion_kind as enum ('skill', 'nice_skill', 'experience', 'location', 'ctc', 'notice');
create type verdict as enum ('met', 'partial', 'not_met', 'unknown');
create type client_decision as enum ('pending', 'shortlisted', 'rejected', 'slot_proposed');

-- 2. ORGS AND USERS
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  role user_role not null,
  full_name text,
  client_id uuid references clients(id) on delete set null,
  created_at timestamptz default now()
);

-- 3. REQUISITIONS AND SCORECARD
create table if not exists requisitions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  title text not null,
  jd_text text not null,
  status text not null default 'open',
  created_by uuid not null references profiles(id),
  created_at timestamptz default now()
);

create table if not exists scorecard_criteria (
  id uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references requisitions(id) on delete cascade,
  kind criterion_kind not null,
  label text not null,
  params jsonb default '{}'::jsonb,
  weight int not null default 3 check (weight between 1 and 5),
  required boolean not null default false,
  position int not null default 0
);

-- 4. CANDIDATES (PII lives here only)
create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email text,
  phone text,
  email_norm text,
  phone_norm text,
  name_norm text,
  current_title text,
  experience_years numeric(4,1),
  skills text[] default '{}',
  notice_days int,
  current_ctc_lpa numeric(6,2),
  location text,
  summary text,
  cv_text text,
  cv_text_redacted text,
  storage_path text,
  is_scan boolean default false,
  deleted_at timestamptz,
  created_at timestamptz default now()
);

create unique index if not exists candidates_email_uq on candidates(email_norm) 
  where email_norm is not null and deleted_at is null;

create index if not exists candidates_phone_idx on candidates(phone_norm);

-- 5. CONSENT RECORDS
create table if not exists consent_records (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  purpose text not null default 'hiring use only',
  source text not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- 6. CV UPLOADS
create table if not exists cv_uploads (
  id uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references requisitions(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  status upload_status not null default 'queued',
  error text,
  candidate_id uuid references candidates(id) on delete set null,
  duplicate_of uuid references candidates(id) on delete set null,
  consent_attested boolean not null default false,
  uploaded_by uuid not null references profiles(id),
  created_at timestamptz default now()
);

-- 7. APPLICATIONS (candidate x requisition)
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references requisitions(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  stage pipeline_stage not null default 'sourced',
  score numeric(5,2),
  flags text[] default '{}',
  scored_at timestamptz,
  opened_by_recruiter_at timestamptz,
  recruiter_note text,
  submitted_at timestamptz,
  client_decision client_decision not null default 'pending',
  reject_reason text,
  proposed_slot timestamptz,
  slot_note text,
  contact_revealed boolean not null default false,
  unique (requisition_id, candidate_id)
);

-- 8. SCORE ITEMS
create table if not exists score_items (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  criterion_id uuid not null references scorecard_criteria(id) on delete cascade,
  verdict verdict not null,
  evidence_quote text,
  reason text,
  points numeric(4,2) not null
);

-- 9. AUDIT ACCESS LOG
create table if not exists access_log (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles(id) on delete set null,
  candidate_id uuid,
  application_id uuid,
  action text not null,
  at timestamptz not null default now()
);

-- 10. ROW LEVEL SECURITY ENABLING
alter table clients enable row level security;
alter table profiles enable row level security;
alter table requisitions enable row level security;
alter table scorecard_criteria enable row level security;
alter table candidates enable row level security;
alter table applications enable row level security;
alter table score_items enable row level security;
alter table cv_uploads enable row level security;
alter table consent_records enable row level security;
alter table access_log enable row level security;

-- 11. HELPER FUNCTIONS
create or replace function auth_role() returns user_role language sql stable security definer set search_path = public as
$$ 
  select role from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function auth_client() returns uuid language sql stable security definer set search_path = public as
$$ 
  select client_id from public.profiles where id = auth.uid() limit 1;
$$;

-- 12. RLS POLICIES

-- PROFILES
create policy own_profile on profiles
  for select using (id = auth.uid());

create policy recruiter_profiles on profiles
  for select using (auth_role() = 'recruiter');

-- CLIENTS
create policy recruiter_clients on clients
  for all using (auth_role() = 'recruiter')
  with check (auth_role() = 'recruiter');

create policy client_own_org on clients
  for select using (auth_role() = 'client' and id = auth_client());

-- REQUISITIONS
create policy recruiter_all_requisitions on requisitions
  for all using (auth_role() = 'recruiter')
  with check (auth_role() = 'recruiter');

create policy client_reqs on requisitions
  for select using (auth_role() = 'client' and client_id = auth_client());

-- SCORECARD CRITERIA
create policy recruiter_all_scorecard on scorecard_criteria
  for all using (auth_role() = 'recruiter')
  with check (auth_role() = 'recruiter');

-- CANDIDATES (Recruiters only - clients NEVER query directly)
create policy recruiter_all_candidates on candidates
  for all using (auth_role() = 'recruiter')
  with check (auth_role() = 'recruiter');

-- APPLICATIONS (Recruiters only - clients access via view or server-action)
create policy recruiter_all_applications on applications
  for all using (auth_role() = 'recruiter')
  with check (auth_role() = 'recruiter');

-- SCORE ITEMS
create policy recruiter_all_score_items on score_items
  for all using (auth_role() = 'recruiter')
  with check (auth_role() = 'recruiter');

-- CV UPLOADS
create policy recruiter_all_cv_uploads on cv_uploads
  for all using (auth_role() = 'recruiter')
  with check (auth_role() = 'recruiter');

-- CONSENT RECORDS
create policy recruiter_all_consent_records on consent_records
  for all using (auth_role() = 'recruiter')
  with check (auth_role() = 'recruiter');

-- ACCESS LOG
create policy recruiter_read_log on access_log
  for select using (auth_role() = 'recruiter');

create policy insert_log on access_log
  for insert with check (actor_id = auth.uid());

-- 13. MASKED VIEW FOR CLIENT PORTAL (TECHSTACK Section 4)
create or replace view client_shortlist as
select
  a.id as application_id,
  r.id as requisition_id,
  r.title,
  a.stage,
  a.score,
  a.recruiter_note,
  a.client_decision,
  a.reject_reason,
  a.proposed_slot,
  a.contact_revealed,
  c.full_name,
  c.current_title,
  c.experience_years,
  c.notice_days,
  c.location,
  c.skills,
  case 
    when a.contact_revealed then c.email 
    else regexp_replace(c.email, '(^.).*(@.*$)', '\1•••\2') 
  end as email_masked,
  case 
    when a.contact_revealed then c.phone 
    else '••••••' || right(coalesce(c.phone_norm, '000'), 3) 
  end as phone_masked
from applications a
join requisitions r on r.id = a.requisition_id
join candidates c on c.id = a.candidate_id
where a.submitted_at is not null
  and c.deleted_at is null
  and auth_role() = 'client'
  and r.client_id = auth_client();

-- 14. CLIENT EVIDENCE VIEW (TECHSTACK Section 4, Line 286)
create or replace view client_score_items as
select
  si.id as score_item_id,
  si.application_id,
  sc.label as criterion_label,
  sc.kind as criterion_kind,
  sc.weight as criterion_weight,
  sc.required as criterion_required,
  si.verdict,
  si.evidence_quote,
  si.reason,
  si.points
from score_items si
join scorecard_criteria sc on sc.id = si.criterion_id
join applications a on a.id = si.application_id
join requisitions r on r.id = a.requisition_id
join candidates c on c.id = a.candidate_id
where a.submitted_at is not null
  and c.deleted_at is null
  and auth_role() = 'client'
  and r.client_id = auth_client();

-- 15. USER PROFILE SYNC TRIGGER (On Auth Signup)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _role public.user_role := 'recruiter';
  _client_id uuid := null;
begin
  if new.raw_user_meta_data is not null and (new.raw_user_meta_data->>'role') in ('recruiter', 'client') then
    _role := (new.raw_user_meta_data->>'role')::public.user_role;
  end if;

  if new.raw_user_meta_data is not null and (new.raw_user_meta_data->>'client_id') is not null and (new.raw_user_meta_data->>'client_id') != '' then
    begin
      _client_id := (new.raw_user_meta_data->>'client_id')::uuid;
    exception when others then
      _client_id := null;
    end;
  end if;

  insert into public.profiles (id, role, full_name, client_id)
  values (
    new.id,
    _role,
    new.raw_user_meta_data->>'full_name',
    _client_id
  )
  on conflict (id) do update set
    role = excluded.role,
    full_name = excluded.full_name,
    client_id = excluded.client_id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 16. STORAGE: Private Bucket 'cvs'
insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false)
on conflict (id) do nothing;

create policy "Recruiter upload CV" on storage.objects
  for insert with check (bucket_id = 'cvs' and auth_role() = 'recruiter');

create policy "Recruiter read CV" on storage.objects
  for select using (bucket_id = 'cvs' and auth_role() = 'recruiter');

create policy "Recruiter delete CV" on storage.objects
  for delete using (bucket_id = 'cvs' and auth_role() = 'recruiter');
