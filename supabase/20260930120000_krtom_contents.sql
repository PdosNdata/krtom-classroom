-- ============================================================================
-- krtom-classroom: ระบบ "เพิ่มเนื้อหา" สำหรับครู (ทุกชั้น ทุกหน่วย ทุกแท็บ)
-- รันไฟล์นี้ 1 ครั้งใน Supabase Dashboard > SQL Editor (โปรเจกต์เดียวกับ bkkschoolWeb)
--
-- ความปลอดภัย:
--   * ตาราง krtom_teachers / krtom_contents เปิด RLS
--       - krtom_teachers : ไม่มี policy เลย (อ่าน/เขียนตรงไม่ได้ ผ่านฟังก์ชันเท่านั้น)
--       - krtom_contents : ใครก็อ่านได้ (นักเรียนดูเนื้อหา) แต่เขียน/ลบได้ผ่านฟังก์ชันที่ตรวจรหัสครูเท่านั้น
--   * รหัสผ่านครูเก็บเป็น bcrypt hash ตรวจที่ฝั่งเซิร์ฟเวอร์
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- 1) บัญชีครู ----------
create table if not exists public.krtom_teachers (
  teacher_code  text primary key,
  full_name     text not null,
  password_hash text not null,
  created_at    timestamptz not null default now()
);
alter table public.krtom_teachers enable row level security;

-- ---------- 2) เนื้อหาที่ครูเพิ่ม ----------
create table if not exists public.krtom_contents (
  id           uuid primary key default gen_random_uuid(),
  grade_id     text not null,
  subject_id   text not null,
  unit_idx     int  not null check (unit_idx >= 0 and unit_idx < 50),
  tab_key      text not null check (tab_key in ('knowledge','worksheet','quiz','game','ar')),
  section      text not null default 'main' check (section in ('main','article','cartoon')),
  kind         text not null check (kind in ('file','link','youtube')),
  title        text not null check (char_length(title) between 1 and 200),
  description  text check (description is null or char_length(description) <= 2000),
  url          text,
  storage_path text,
  mime         text,
  created_by   text,
  created_at   timestamptz not null default now(),
  constraint krtom_contents_source_ck check (
    (kind = 'file' and storage_path is not null and storage_path like 'uploads/%')
    or (kind in ('link','youtube') and url ~* '^https?://')
  )
);
create index if not exists krtom_contents_unit_idx
  on public.krtom_contents (grade_id, subject_id, unit_idx, tab_key, created_at);
alter table public.krtom_contents enable row level security;

drop policy if exists krtom_contents_read on public.krtom_contents;
create policy krtom_contents_read on public.krtom_contents
  for select to anon, authenticated using (true);

-- ---------- 3) ฟังก์ชัน ----------
-- 3.1 ตั้งรหัสครู (ให้ "เจ้าของโปรเจกต์" รันเองใน SQL Editor เท่านั้น — ปิดไม่ให้เว็บเรียกได้)
create or replace function public.krtom_set_teacher(p_code text, p_name text, p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร';
  end if;
  insert into public.krtom_teachers (teacher_code, full_name, password_hash)
  values (p_code, p_name, crypt(p_password, gen_salt('bf')))
  on conflict (teacher_code) do update
    set full_name = excluded.full_name, password_hash = excluded.password_hash;
end;
$$;
revoke all on function public.krtom_set_teacher(text, text, text) from public, anon, authenticated;

-- 3.2 ตรวจรหัสครู -> คืนชื่อครู (ผิด = error)
create or replace function public.krtom_verify_teacher(p_code text, p_password text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_name text;
begin
  select full_name into v_name
  from public.krtom_teachers
  where teacher_code = p_code
    and password_hash = crypt(p_password, password_hash);
  if v_name is null then
    perform pg_sleep(0.6);  -- หน่วงเล็กน้อย กันเดารหัสรัว ๆ
    raise exception 'รหัสครูหรือรหัสผ่านไม่ถูกต้อง' using errcode = '28000';
  end if;
  return v_name;
end;
$$;
grant execute on function public.krtom_verify_teacher(text, text) to anon, authenticated;

-- 3.3 เพิ่มเนื้อหา
create or replace function public.krtom_add_content(
  p_code text, p_password text,
  p_grade text, p_subject text, p_unit int, p_tab text, p_section text,
  p_kind text, p_title text, p_description text,
  p_url text, p_storage_path text, p_mime text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_name text;
  v_id uuid;
begin
  v_name := public.krtom_verify_teacher(p_code, p_password);
  insert into public.krtom_contents
    (grade_id, subject_id, unit_idx, tab_key, section, kind, title, description, url, storage_path, mime, created_by)
  values
    (p_grade, p_subject, p_unit, p_tab, coalesce(p_section, 'main'), p_kind,
     btrim(p_title), nullif(btrim(coalesce(p_description, '')), ''),
     nullif(btrim(coalesce(p_url, '')), ''), p_storage_path, p_mime, p_code)
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.krtom_add_content(text,text,text,text,int,text,text,text,text,text,text,text,text) to anon, authenticated;

-- 3.4 ลบเนื้อหา (คืนพาธไฟล์ เผื่อลบไฟล์ทีหลัง)
create or replace function public.krtom_delete_content(p_code text, p_password text, p_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_path text;
begin
  perform public.krtom_verify_teacher(p_code, p_password);
  delete from public.krtom_contents where id = p_id returning storage_path into v_path;
  return v_path;
end;
$$;
grant execute on function public.krtom_delete_content(text, text, uuid) to anon, authenticated;

-- ---------- 4) ที่เก็บไฟล์ (Storage) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'krtom-content', 'krtom-content', true, 26214400,   -- 25 MB ต่อไฟล์
  array[
    'application/pdf',
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm',
    'audio/mpeg', 'audio/mp4',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- อัปโหลดได้เฉพาะในโฟลเดอร์ uploads/ (ไฟล์จะปรากฏบนเว็บก็ต่อเมื่อครูลงทะเบียนผ่าน krtom_add_content แล้วเท่านั้น)
drop policy if exists krtom_content_upload on storage.objects;
create policy krtom_content_upload on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'krtom-content' and (storage.foldername(name))[1] = 'uploads');

-- ============================================================================
-- 5) ตั้งบัญชีครู  ** แก้ 3 ค่าด้านล่างเป็นของครู แล้วเอาเครื่องหมาย -- หน้าบรรทัดออก แล้วรันบรรทัดเดียวนี้ **
--    (รหัสผ่านอย่าใช้ 1234 และอย่าส่งให้ใคร)
-- ============================================================================
-- select public.krtom_set_teacher('รหัสครู เช่น chaiyapat', 'นายไชยภัทร ฉลูทอง', 'รหัสผ่านของครู อย่างน้อย 6 ตัว');
