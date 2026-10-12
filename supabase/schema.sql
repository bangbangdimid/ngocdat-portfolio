-- ============================================================
-- COURSE PLATFORM — Supabase schema (Postgres + Row Level Security)
--
-- Roles:
--   admin   : you — full control (set manually, see SETUP.md step 5)
--   student : signs up with email+password, enrolls via an access code
--   public  : not logged in — can only see 'sample' content
--
-- How to run: Supabase Dashboard -> SQL Editor -> New query ->
--             SELECT ALL + paste this whole file -> Run.
-- Ordering: TABLES first, then FUNCTIONS, then TRIGGERS/POLICIES.
-- check_function_bodies is turned off so function creation never fails
-- on forward references. Safe to re-run (idempotent).
-- ============================================================

set check_function_bodies = off;

-- ============================================================
-- A. TABLES
-- ============================================================

-- A1. Profiles (one row per auth user, holds role)
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  phone      text,
  role       text not null default 'student' check (role in ('admin','student')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- A2. Courses
create table if not exists public.courses (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique,
  title        text not null,
  description  text,
  cover_url    text,
  is_published boolean not null default false,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
alter table public.courses enable row level security;

-- A3. Access codes (admin-only table)
create table if not exists public.access_codes (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  course_id  uuid not null references public.courses(id) on delete cascade,
  max_uses   int not null default 1,
  used_count int not null default 0,
  expires_at timestamptz,
  active     boolean not null default true,
  note       text,
  created_at timestamptz not null default now()
);
alter table public.access_codes enable row level security;

-- A4. Enrollments
create table if not exists public.enrollments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  course_id  uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);
alter table public.enrollments enable row level security;

-- A5. Materials (videos + documents)
create table if not exists public.materials (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references public.courses(id) on delete cascade,
  kind         text not null check (kind in ('video','doc')),
  title        text not null,
  description  text,
  youtube_id   text,        -- for kind='video' (YouTube unlisted id)
  storage_path text,        -- for kind='doc'   (path inside the 'materials' bucket)
  visibility   text not null default 'enrolled' check (visibility in ('sample','enrolled')),
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
alter table public.materials enable row level security;

-- A6. Redeem attempt log
create table if not exists public.code_redeem_log (
  id             bigint generated always as identity primary key,
  user_id        uuid references auth.users(id) on delete set null,
  attempted_code text,
  success        boolean,
  created_at     timestamptz not null default now()
);
alter table public.code_redeem_log enable row level security;

-- ============================================================
-- B. FUNCTIONS (all referenced tables now exist)
-- ============================================================

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_enrolled(p_course uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.enrollments where user_id = auth.uid() and course_id = p_course);
$$;

-- auto-create a profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

-- a student can never escalate their own role (only admin/SQL can)
create or replace function public.prevent_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

-- secure, rate-limited access-code redemption (the only way a student enrolls)
create or replace function public.redeem_access_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_code   public.access_codes%rowtype;
  v_recent int;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  -- rate limit: max 10 attempts / 10 minutes per user
  select count(*) into v_recent from public.code_redeem_log
    where user_id = auth.uid() and created_at > now() - interval '10 minutes';
  if v_recent >= 10 then
    insert into public.code_redeem_log(user_id, attempted_code, success)
      values (auth.uid(), left(coalesce(p_code,''),64), false);
    return jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  end if;

  select * into v_code from public.access_codes
    where code = p_code and active = true
      and (expires_at is null or expires_at > now())
      and used_count < max_uses
    for update;

  if not found then
    insert into public.code_redeem_log(user_id, attempted_code, success)
      values (auth.uid(), left(coalesce(p_code,''),64), false);
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  insert into public.enrollments(user_id, course_id)
    values (auth.uid(), v_code.course_id)
    on conflict (user_id, course_id) do nothing;

  update public.access_codes set used_count = used_count + 1 where id = v_code.id;

  insert into public.code_redeem_log(user_id, attempted_code, success)
    values (auth.uid(), left(coalesce(p_code,''),64), true);

  return jsonb_build_object('ok', true, 'course_id', v_code.course_id);
end;
$$;
revoke all on function public.redeem_access_code(text) from public, anon;
grant execute on function public.redeem_access_code(text) to authenticated;

-- ============================================================
-- C. TRIGGERS
-- ============================================================

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists trg_prevent_role_change on public.profiles;
create trigger trg_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_role_change();

-- ============================================================
-- D. POLICIES
-- ============================================================

-- profiles
drop policy if exists "profiles self read"  on public.profiles;
drop policy if exists "profiles self write" on public.profiles;
drop policy if exists "profiles admin all"  on public.profiles;
create policy "profiles self read"  on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles self write" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles admin all"  on public.profiles for all    using (public.is_admin()) with check (public.is_admin());

-- courses (published = public; enrolled students read their own; admin sees all)
drop policy if exists "courses read"          on public.courses;
drop policy if exists "courses enrolled read" on public.courses;
drop policy if exists "courses admin"         on public.courses;
create policy "courses read"          on public.courses for select using (is_published or public.is_admin());
create policy "courses enrolled read" on public.courses for select using (public.is_enrolled(id));
create policy "courses admin"         on public.courses for all    using (public.is_admin()) with check (public.is_admin());

-- access codes (students never read this table; only admin + definer function)
drop policy if exists "codes admin" on public.access_codes;
create policy "codes admin" on public.access_codes for all using (public.is_admin()) with check (public.is_admin());

-- enrollments (students read own; no direct insert — only via redeem_access_code)
drop policy if exists "enroll self read" on public.enrollments;
drop policy if exists "enroll admin"     on public.enrollments;
create policy "enroll self read" on public.enrollments for select using (user_id = auth.uid() or public.is_admin());
create policy "enroll admin"     on public.enrollments for all    using (public.is_admin()) with check (public.is_admin());

-- materials (sample rows world-readable; enrolled rows only to enrolled/admin)
drop policy if exists "materials sample"   on public.materials;
drop policy if exists "materials enrolled" on public.materials;
drop policy if exists "materials admin"    on public.materials;
create policy "materials sample"   on public.materials for select using (visibility = 'sample');
create policy "materials enrolled" on public.materials for select using (public.is_enrolled(course_id) or public.is_admin());
create policy "materials admin"    on public.materials for all    using (public.is_admin()) with check (public.is_admin());

-- redeem log (admin reads; only the definer function writes)
drop policy if exists "log admin read" on public.code_redeem_log;
create policy "log admin read" on public.code_redeem_log for select using (public.is_admin());

-- storage bucket 'materials' (create the PRIVATE bucket in Dashboard -> Storage).
-- Path convention (admin UI enforces it):
--   samples/<file>              -> readable by everyone (parent previews)
--   course/<course_id>/<file>   -> readable only by enrolled users / admin
drop policy if exists "storage sample read"   on storage.objects;
drop policy if exists "storage enrolled read" on storage.objects;
drop policy if exists "storage admin insert"  on storage.objects;
drop policy if exists "storage admin update"  on storage.objects;
drop policy if exists "storage admin delete"  on storage.objects;
create policy "storage sample read" on storage.objects for select
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = 'samples');
create policy "storage enrolled read" on storage.objects for select
  using (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = 'course'
    and (public.is_admin() or public.is_enrolled( nullif((storage.foldername(name))[2], '')::uuid ))
  );
create policy "storage admin insert" on storage.objects for insert with check (bucket_id = 'materials' and public.is_admin());
create policy "storage admin update" on storage.objects for update using       (bucket_id = 'materials' and public.is_admin());
create policy "storage admin delete" on storage.objects for delete using       (bucket_id = 'materials' and public.is_admin());

-- Done. Next: SETUP.md step 5 to make yourself admin.
