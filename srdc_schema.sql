-- =====================================================================
-- SRDC Website: database schema, Row Level Security, storage, seed data
-- Run once in: Supabase dashboard > SQL Editor > New query > Run
-- Safe to re-run (idempotent). No secret keys are used or stored here.
-- =====================================================================

-- ---------- 1. Profiles and roles ------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text not null default '',
  role       text not null default 'viewer' check (role in ('super_admin','editor','viewer')),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- New users get the least-privilege role; a super admin promotes them.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helpers (security definer so policies do not recurse into profiles)
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and active) $$;
create or replace function public.can_edit() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
    where id = (select auth.uid()) and active and role in ('super_admin','editor')) $$;
create or replace function public.is_super() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
    where id = (select auth.uid()) and active and role = 'super_admin') $$;
revoke execute on function public.is_staff(), public.can_edit(), public.is_super() from public, anon;
grant  execute on function public.is_staff(), public.can_edit(), public.is_super() to authenticated;

-- ---------- 2. Content tables ----------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null check (char_length(title) between 2 and 200),
  summary text not null default '',
  description text not null default '',
  scope text[] not null default '{}',
  deliverables text[] not null default '{}',
  inquiry_category text not null default 'Consultancy Services',
  sort_order int not null default 0,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null check (char_length(title) between 2 and 250),
  client text not null default '',
  sector text not null default '',
  location text not null default '',
  assignment_type text not null default '',
  experience_type text not null default 'company' check (experience_type in ('company','founder')),
  start_date date,
  end_date date,
  duration_text text not null default '',
  description text not null default '',
  scope_of_services text not null default '',
  deliverables text not null default '',
  cover_image_path text,
  documents jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

create table if not exists public.publications (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null check (char_length(title) between 2 and 250),
  category text not null check (category in ('Research Reports','Assessment Reports','Policy Briefs',
    'Technical Publications','Development Articles','Training Materials','Case Studies','News and Updates')),
  summary text not null default '',
  author text not null default '',
  file_path text,
  cover_image_path text,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null check (char_length(title) between 2 and 250),
  opportunity_type text not null check (opportunity_type in ('Consultancy','Expression of Interest',
    'Request for Proposals','Research Assignment','Enumerator Recruitment','Training','Partnership','Career')),
  summary text not null default '',
  description text not null default '',
  location text not null default '',
  how_to_apply text not null default '',
  apply_email text,
  closing_date date,
  document_path text,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null check (char_length(title) between 2 and 250),
  excerpt text not null default '',
  body text not null default '',
  cover_image_path text,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

-- ---------- 3. Visitor submissions (private) -------------------------
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'contact' check (kind in ('contact','consultancy','partnership')),
  full_name text not null check (char_length(full_name) between 2 and 150),
  organization text check (char_length(organization) <= 200),
  email text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (char_length(phone) <= 40),
  country text check (char_length(country) <= 100),
  category text not null default 'General Inquiry' check (category in ('General Inquiry','Consultancy Services',
    'Research and Assessments','Partnership Opportunities','Procurement and Tenders','Training','Recruitment')),
  subject text not null check (char_length(subject) between 2 and 200),
  message text not null check (char_length(message) between 5 and 5000),
  consent boolean not null check (consent),
  status text not null default 'new' check (status in ('new','read','replied','archived')),
  internal_notes text,
  handled_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  consent boolean not null check (consent),
  created_at timestamptz not null default now()
);

-- ---------- 4. Triggers: timestamps and publish date -----------------
create or replace function public.touch_content() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if new.status = 'published' and new.published_at is null then new.published_at := now(); end if;
  return new;
end $$;

-- ---------- 5. Row Level Security ------------------------------------
-- Content tables: visitors read published rows only; editors write; super admins delete.
do $$
declare t text;
begin
  foreach t in array array['services','projects','publications','opportunities','news'] loop
    execute format('drop trigger if exists touch on public.%I', t);
    execute format('create trigger touch before insert or update on public.%I for each row execute function public.touch_content()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists "public reads published" on public.%I', t);
    execute format('drop policy if exists "staff read all" on public.%I', t);
    execute format('drop policy if exists "editors insert" on public.%I', t);
    execute format('drop policy if exists "editors update" on public.%I', t);
    execute format('drop policy if exists "super admins delete" on public.%I', t);
    execute format($p$create policy "public reads published" on public.%I for select to anon, authenticated
      using (status = 'published' and published_at <= now())$p$, t);
    execute format('create policy "staff read all" on public.%I for select to authenticated using (public.is_staff())', t);
    execute format('create policy "editors insert" on public.%I for insert to authenticated with check (public.can_edit())', t);
    execute format('create policy "editors update" on public.%I for update to authenticated using (public.can_edit()) with check (public.can_edit())', t);
    execute format('create policy "super admins delete" on public.%I for delete to authenticated using (public.is_super())', t);
  end loop;
end $$;

-- Profiles
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select, update, delete on public.profiles to authenticated;
drop policy if exists "read own or all if super" on public.profiles;
drop policy if exists "super updates" on public.profiles;
drop policy if exists "super deletes" on public.profiles;
create policy "read own or all if super" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_super());
create policy "super updates" on public.profiles for update to authenticated
  using (public.is_super()) with check (public.is_super());
create policy "super deletes" on public.profiles for delete to authenticated using (public.is_super());

-- Inquiries: anyone may submit; only editors can read or handle; never publicly readable.
alter table public.inquiries enable row level security;
revoke all on public.inquiries from anon, authenticated;
grant insert (kind, full_name, organization, email, phone, country, category, subject, message, consent)
  on public.inquiries to anon, authenticated;
grant select, update, delete on public.inquiries to authenticated;
drop policy if exists "anyone submits" on public.inquiries;
drop policy if exists "editors read" on public.inquiries;
drop policy if exists "editors handle" on public.inquiries;
drop policy if exists "super deletes" on public.inquiries;
create policy "anyone submits" on public.inquiries for insert to anon, authenticated
  with check (consent is true and status = 'new' and internal_notes is null and handled_by is null);
create policy "editors read" on public.inquiries for select to authenticated using (public.can_edit());
create policy "editors handle" on public.inquiries for update to authenticated
  using (public.can_edit()) with check (public.can_edit());
create policy "super deletes" on public.inquiries for delete to authenticated using (public.is_super());

-- Subscribers
alter table public.subscribers enable row level security;
revoke all on public.subscribers from anon, authenticated;
grant insert (email, consent) on public.subscribers to anon, authenticated;
grant select, delete on public.subscribers to authenticated;
drop policy if exists "anyone subscribes" on public.subscribers;
drop policy if exists "editors read" on public.subscribers;
drop policy if exists "super deletes" on public.subscribers;
create policy "anyone subscribes" on public.subscribers for insert to anon, authenticated with check (consent is true);
create policy "editors read" on public.subscribers for select to authenticated using (public.can_edit());
create policy "super deletes" on public.subscribers for delete to authenticated using (public.is_super());

-- ---------- 6. Storage ------------------------------------------------
-- site-media: public bucket for images and documents shown on the website.
-- internal-docs: private bucket, staff only. Upload with random file names.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
 ('site-media','site-media',true, 10485760, array['image/jpeg','image/png','image/webp','application/pdf',
   'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
   'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
   'application/vnd.openxmlformats-officedocument.presentationml.presentation']),
 ('internal-docs','internal-docs',false, 10485760, array['application/pdf','image/jpeg','image/png',
   'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
   'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "staff list media" on storage.objects;
drop policy if exists "editors upload media" on storage.objects;
drop policy if exists "editors replace media" on storage.objects;
drop policy if exists "editors delete media" on storage.objects;
create policy "staff list media" on storage.objects for select to authenticated
  using (bucket_id in ('site-media','internal-docs') and public.is_staff());
create policy "editors upload media" on storage.objects for insert to authenticated
  with check (bucket_id in ('site-media','internal-docs') and public.can_edit());
create policy "editors replace media" on storage.objects for update to authenticated
  using (bucket_id in ('site-media','internal-docs') and public.can_edit())
  with check (bucket_id in ('site-media','internal-docs') and public.can_edit());
create policy "editors delete media" on storage.objects for delete to authenticated
  using (bucket_id in ('site-media','internal-docs') and public.can_edit());

-- ---------- 7. Seed: the eight services already on the website -------
insert into public.services (slug, title, summary, scope, inquiry_category, sort_order, status) values
('humanitarian-development','Humanitarian and Development Consultancy','Assessments, response planning and programme design for humanitarian actors.',
 array['Humanitarian needs assessments','Emergency response planning','Community engagement','Humanitarian programme design','Protection mainstreaming','Accountability to affected populations','Coordination and response analysis'],'Consultancy Services',1,'published'),
('agriculture-food-security','Agriculture, Food Security and Livelihoods','Technical analysis and support for resilient agriculture and livelihoods.',
 array['Agricultural assessments','Food security analysis','Livelihoods assessments','Agricultural extension support','Climate resilience and adaptation','Market assessments','Value chain analysis','Natural resource management'],'Consultancy Services',2,'published'),
('meal','Monitoring, Evaluation, Accountability and Learning (MEAL)','Evidence on performance, accountability and learning.',
 array['Baseline and endline studies','Midterm evaluations','Third-party monitoring','Project performance monitoring','Results frameworks','Indicator tracking','Data quality assessments','Accountability assessments','Learning and documentation'],'Research and Assessments',3,'published'),
('research-assessments','Research, Surveys and Assessments','Rigorous quantitative and qualitative research.',
 array['Quantitative and qualitative research','Household surveys','Focus group discussions','Key informant interviews','Feasibility studies','Needs assessments','Market research','Community mapping'],'Research and Assessments',4,'published'),
('project-design-management','Project Design and Management','From concept note to donor reporting.',
 array['Concept note development','Project proposals','Logical frameworks','Theory of Change','Activity-based budgets','Workplans','Project implementation support','Donor reporting'],'Consultancy Services',5,'published'),
('digital-data-gis','Digital Data, GIS and Information Management','Digital collection, mapping and dashboards.',
 array['KoboToolbox and ODK','XLSForm development','GPS data collection','GIS mapping','Data cleaning and analysis','Excel reporting systems','Power BI dashboards','Database development'],'Consultancy Services',6,'published'),
('training-capacity-building','Training and Capacity Building','Practical training for organizations and teams.',
 array['Project Cycle Management','Monitoring and Evaluation','Data collection methodologies','KoboToolbox and ODK','Research ethics','PSEA and safeguarding','Organizational capacity building'],'Training',7,'published'),
('business-institutional','Business and Institutional Consultancy','Planning and institutional strengthening.',
 array['Business plan development','Strategic planning','Organizational capacity assessments','Institutional development','Feasibility studies','Operational assessments'],'Consultancy Services',8,'published')
on conflict (slug) do nothing;

-- ---------- 8. FIRST SUPER ADMIN (run after you create your user) ----
-- Create your user first: Authentication > Users > Add user (email + password, tick Auto Confirm).
-- Then run this with YOUR email:
--   update public.profiles set role = 'super_admin', full_name = 'Your Name' where email = 'you@example.com';

-- ---------- 9. TESTS (run separately; each ends in rollback) ---------
-- Visitor can read published services, cannot read inquiries:
--   begin; set local role anon;
--   select count(*) from public.services;          -- expect 8
--   select count(*) from public.inquiries;         -- expect permission denied
--   rollback;
-- Visitor can submit an inquiry:
--   begin; set local role anon;
--   insert into public.inquiries (kind, full_name, email, category, subject, message, consent)
--   values ('contact','Test User','test@example.com','General Inquiry','Test','Hello there',true); -- expect success
--   insert into public.inquiries (full_name, email, subject, message, consent, status)
--   values ('Bad','bad@example.com','x1','hello there',true,'replied');   -- expect permission denied
--   rollback;
