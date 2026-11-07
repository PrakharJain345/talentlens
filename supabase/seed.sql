-- ==============================================================================
-- TalentLens: Seed Data (Demo Clients & Users for Local/Staging Environment)
-- ==============================================================================

-- 1. Insert Sample Client Organizations
insert into public.clients (id, name)
values 
  ('11111111-1111-1111-1111-111111111111', 'Acme Corp'),
  ('22222222-2222-2222-2222-222222222222', 'FinTech Global')
on conflict (id) do nothing;

-- Instructions for Auth Users:
-- When creating users in Supabase Auth (via Dashboard or Seed):
-- 1. Recruiter:
--    Email: recruiter@companya.com
--    User Metadata: {"role": "recruiter", "full_name": "Rohan Sharma (Company A)"}
-- 2. Client Org 1 (Acme Corp):
--    Email: client.acme@acmecorp.com
--    User Metadata: {"role": "client", "full_name": "Sarah Jenkins (Acme Corp)", "client_id": "11111111-1111-1111-1111-111111111111"}
-- 3. Client Org 2 (FinTech Global):
--    Email: client.fintech@fintechglobal.com
--    User Metadata: {"role": "client", "full_name": "Vikram Malhotra (FinTech Global)", "client_id": "22222222-2222-2222-2222-222222222222"}

