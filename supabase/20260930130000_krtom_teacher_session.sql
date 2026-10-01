-- ============================================================================
-- krtom-classroom: ให้ "ล็อกอินครูหน้าแรก" กับ "เพิ่มเนื้อหา" ใช้บัญชีเดียวกัน
-- รันต่อจากไฟล์ 20260930120000_krtom_contents.sql (รันใน Supabase SQL Editor 1 ครั้ง)
--
-- วิธีทำงาน: ล็อกอินครู -> ได้ "โทเคนชั่วคราว" อายุ 12 ชั่วโมง เก็บในแท็บเบราว์เซอร์
--            เพิ่ม/ลบเนื้อหาใช้โทเคนนี้ตรวจสิทธิ์ที่ฝั่งเซิร์ฟเวอร์ (ไม่ต้องเก็บรหัสผ่านไว้ในเบราว์เซอร์)
-- ============================================================================

-- ---------- 1) ตารางเซสชันครู (ไม่มี policy = เข้าถึงผ่านฟังก์ชันเท่านั้น) ----------
create table if not exists public.krtom_teacher_sessions (
  token        uuid primary key default gen_random_uuid(),
  teacher_code text not null references public.krtom_teachers (teacher_code) on delete cascade,
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now()
);
alter table public.krtom_teacher_sessions enable row level security;

-- ---------- 2) ล็อกอินครู -> คืนโทเคน ----------
create or replace function public.krtom_teacher_login(p_code text, p_password text)
returns table (token uuid, full_name text, teacher_code text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_name  text;
  v_token uuid;
begin
  v_name := public.krtom_verify_teacher(p_code, p_password);   -- ผิด = error พร้อมหน่วงเวลา
  delete from public.krtom_teacher_sessions where expires_at < now();
  insert into public.krtom_teacher_sessions (teacher_code, expires_at)
  values (p_code, now() + interval '12 hours')
  returning krtom_teacher_sessions.token into v_token;
  return query select v_token, v_name, p_code;
end;
$$;
grant execute on function public.krtom_teacher_login(text, text) to anon, authenticated;

-- ---------- 3) ตรวจโทเคน (ใช้ภายในเท่านั้น) ----------
create or replace function public.krtom_check_session(p_token uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code text;
begin
  select s.teacher_code into v_code
  from public.krtom_teacher_sessions s
  where s.token = p_token and s.expires_at > now();
  if v_code is null then
    raise exception 'หมดเวลาเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่' using errcode = '28000';
  end if;
  return v_code;
end;
$$;
revoke all on function public.krtom_check_session(uuid) from public, anon, authenticated;

-- ---------- 4) ออกจากระบบ ----------
create or replace function public.krtom_teacher_logout(p_token uuid)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  delete from public.krtom_teacher_sessions where token = p_token;
$$;
grant execute on function public.krtom_teacher_logout(uuid) to anon, authenticated;

-- ---------- 5) เพิ่ม/ลบเนื้อหา: เปลี่ยนจากส่งรหัสผ่าน เป็นส่งโทเคน ----------
drop function if exists public.krtom_add_content(text,text,text,text,int,text,text,text,text,text,text,text,text);
drop function if exists public.krtom_delete_content(text, text, uuid);

create or replace function public.krtom_add_content(
  p_token uuid,
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
  v_code text;
  v_id uuid;
begin
  v_code := public.krtom_check_session(p_token);
  insert into public.krtom_contents
    (grade_id, subject_id, unit_idx, tab_key, section, kind, title, description, url, storage_path, mime, created_by)
  values
    (p_grade, p_subject, p_unit, p_tab, coalesce(p_section, 'main'), p_kind,
     btrim(p_title), nullif(btrim(coalesce(p_description, '')), ''),
     nullif(btrim(coalesce(p_url, '')), ''), p_storage_path, p_mime, v_code)
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.krtom_add_content(uuid,text,text,int,text,text,text,text,text,text,text,text) to anon, authenticated;

create or replace function public.krtom_delete_content(p_token uuid, p_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_path text;
begin
  perform public.krtom_check_session(p_token);
  delete from public.krtom_contents where id = p_id returning storage_path into v_path;
  return v_path;
end;
$$;
grant execute on function public.krtom_delete_content(uuid, uuid) to anon, authenticated;

-- ---------- 6) ปิดไม่ให้เว็บเรียกตรวจรหัสผ่านตรง ๆ (ให้ผ่านล็อกอินเท่านั้น) ----------
revoke execute on function public.krtom_verify_teacher(text, text) from public, anon, authenticated;
