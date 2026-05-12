-- ============================================================
-- PORTFOLIO — SUPABASE SETUP
-- ============================================================
-- Mở Supabase Dashboard → SQL Editor → New Query → paste & RUN
--
-- ⚠️  TRƯỚC KHI CHẠY: thay 'ngocdat2006@gmail.com' (4 chỗ ở dưới)
--     bằng email bạn dùng để đăng nhập owner. Email này phải
--     trùng với email bạn nhập ở magic-link login.
-- ============================================================

-- 1) TABLES ---------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_url text,
  tags text[] default '{}',
  date text,
  display_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  file_url text not null,
  file_type text,
  file_size bigint,
  created_at timestamptz default now()
);

create index if not exists idx_project_files_project on public.project_files(project_id);
create index if not exists idx_projects_created on public.projects(created_at desc);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_projects_updated on public.projects;
create trigger trg_projects_updated before update on public.projects
  for each row execute function public.set_updated_at();


-- 2) ROW LEVEL SECURITY ---------------------------------------
alter table public.projects enable row level security;
alter table public.project_files enable row level security;

-- public READ
drop policy if exists "Public can read projects" on public.projects;
create policy "Public can read projects" on public.projects
  for select using (true);

drop policy if exists "Public can read project_files" on public.project_files;
create policy "Public can read project_files" on public.project_files
  for select using (true);

-- owner WRITE (replace email below)
drop policy if exists "Owner can manage projects" on public.projects;
create policy "Owner can manage projects" on public.projects
  for all
  using (auth.jwt() ->> 'email' = 'ngocdat2006@gmail.com')
  with check (auth.jwt() ->> 'email' = 'ngocdat2006@gmail.com');

drop policy if exists "Owner can manage project_files" on public.project_files;
create policy "Owner can manage project_files" on public.project_files
  for all
  using (auth.jwt() ->> 'email' = 'ngocdat2006@gmail.com')
  with check (auth.jwt() ->> 'email' = 'ngocdat2006@gmail.com');


-- 3) STORAGE BUCKET -------------------------------------------
-- Public bucket cho files (ai cũng đọc được, chỉ owner upload)
insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do update set public = true;

-- Storage policies
drop policy if exists "Public can read portfolio" on storage.objects;
create policy "Public can read portfolio" on storage.objects
  for select using (bucket_id = 'portfolio');

drop policy if exists "Owner can upload to portfolio" on storage.objects;
create policy "Owner can upload to portfolio" on storage.objects
  for insert with check (
    bucket_id = 'portfolio'
    and auth.jwt() ->> 'email' = 'ngocdat2006@gmail.com'
  );

drop policy if exists "Owner can update portfolio" on storage.objects;
create policy "Owner can update portfolio" on storage.objects
  for update using (
    bucket_id = 'portfolio'
    and auth.jwt() ->> 'email' = 'ngocdat2006@gmail.com'
  );

drop policy if exists "Owner can delete portfolio" on storage.objects;
create policy "Owner can delete portfolio" on storage.objects
  for delete using (
    bucket_id = 'portfolio'
    and auth.jwt() ->> 'email' = 'ngocdat2006@gmail.com'
  );


-- ============================================================
-- DONE. Bây giờ:
--   1. Authentication → Providers → bật Email (nếu chưa)
--   2. Authentication → Sign-in / Up → bật "Email signups" hoặc
--      thêm email của bạn vào danh sách user trước khi login
--   3. Project Settings → API → copy URL + anon key vào index.html
-- ============================================================
