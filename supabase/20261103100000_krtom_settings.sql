-- เมนู "ตั้งค่า" ของครู: (1) เปลี่ยนรหัสผ่าน  (2) อัปโหลดไฟล์เฉลยต้นฉบับของแต่ละหน่วย (เก็บเป็นส่วน ๆ ในฐานข้อมูล อ่านได้เฉพาะครูที่ล็อกอิน)
--                      (3) แก้ข้อความเฉลย/แนวคำตอบรายข้อ
-- รันใน Supabase SQL Editor ครั้งเดียว (รันซ้ำได้) — ต้องรันหลัง 20261101110000_krtom_resubmit_keys.sql

-- ---------- 1) เปลี่ยนรหัสผ่านครู ----------
create or replace function public.krtom_teacher_change_password(p_token uuid, p_old text, p_new text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code text;
begin
  v_code := public.krtom_check_session(p_token);
  perform public.krtom_verify_teacher(v_code, p_old);          -- รหัสเดิมผิด = error พร้อมหน่วงเวลา
  if length(coalesce(p_new, '')) < 8 then
    raise exception 'รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร';
  end if;
  if p_new = p_old then
    raise exception 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม';
  end if;
  update public.krtom_teachers set password_hash = crypt(p_new, gen_salt('bf')) where teacher_code = v_code;
  delete from public.krtom_teacher_sessions where teacher_code = v_code and token <> p_token;   -- ออกจากระบบเครื่องอื่นทั้งหมด
end;
$$;

-- ---------- 2) ไฟล์เฉลยต้นฉบับ (ส่วนตัว) ----------
create table if not exists public.krtom_key_files (
  id          uuid primary key default gen_random_uuid(),
  grade_id    text not null,
  subject_id  text not null,
  unit_idx    int  not null check (unit_idx >= 0 and unit_idx < 50),
  file_name   text not null check (char_length(file_name) between 1 and 200),
  mime        text,
  size_bytes  bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  chunks      int  not null check (chunks between 1 and 80),
  complete    boolean not null default false,
  created_by  text,
  created_at  timestamptz not null default now()
);
create table if not exists public.krtom_key_file_chunks (
  file_id uuid not null references public.krtom_key_files (id) on delete cascade,
  idx     int  not null check (idx >= 0),
  data    text not null,                 -- base64
  primary key (file_id, idx)
);
alter table public.krtom_key_files enable row level security;          -- ไม่มี policy: เข้าถึงได้เฉพาะผ่านฟังก์ชันครูด้านล่าง
alter table public.krtom_key_file_chunks enable row level security;

create or replace function public.krtom_teacher_keyfile_begin(
  p_token uuid, p_grade text, p_subject text, p_unit int, p_name text, p_mime text, p_size bigint, p_chunks int
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code text; v_id uuid;
begin
  v_code := public.krtom_check_session(p_token);
  if p_size is null or p_size <= 0 or p_size > 26214400 or p_chunks is null or p_chunks not between 1 and 80 then
    raise exception 'ไฟล์ใหญ่เกินกำหนด (ไม่เกิน 25 MB)';
  end if;
  insert into public.krtom_key_files (grade_id, subject_id, unit_idx, file_name, mime, size_bytes, chunks, created_by)
  values (p_grade, p_subject, p_unit, left(btrim(p_name), 200), left(coalesce(p_mime, ''), 100), p_size, p_chunks, v_code)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.krtom_teacher_keyfile_put(p_token uuid, p_id uuid, p_idx int, p_data text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  f public.krtom_key_files;
begin
  perform public.krtom_check_session(p_token);
  select * into f from public.krtom_key_files where id = p_id and not complete;
  if not found then raise exception 'ไม่พบไฟล์ที่กำลังอัปโหลด'; end if;
  if p_idx < 0 or p_idx >= f.chunks or p_data is null or length(p_data) > 700000 then
    raise exception 'ข้อมูลส่วนของไฟล์ไม่ถูกต้อง';
  end if;
  insert into public.krtom_key_file_chunks (file_id, idx, data) values (p_id, p_idx, p_data)
  on conflict (file_id, idx) do update set data = excluded.data;
end;
$$;

create or replace function public.krtom_teacher_keyfile_commit(p_token uuid, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  f public.krtom_key_files; n int;
begin
  perform public.krtom_check_session(p_token);
  select * into f from public.krtom_key_files where id = p_id;
  if not found then raise exception 'ไม่พบไฟล์'; end if;
  select count(*) into n from public.krtom_key_file_chunks where file_id = p_id;
  if n <> f.chunks then raise exception 'อัปโหลดไม่ครบ (% จาก % ส่วน) กรุณาลองใหม่', n, f.chunks; end if;
  update public.krtom_key_files set complete = true where id = p_id;
end;
$$;

create or replace function public.krtom_teacher_keyfiles(p_token uuid)
returns table (id uuid, grade_id text, subject_id text, unit_idx int, file_name text, mime text, size_bytes bigint, chunks int, created_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.krtom_check_session(p_token);
  return query select k.id, k.grade_id, k.subject_id, k.unit_idx, k.file_name, k.mime, k.size_bytes, k.chunks, k.created_at
               from public.krtom_key_files k where k.complete order by k.created_at desc;
end;
$$;

create or replace function public.krtom_teacher_keyfile_chunk(p_token uuid, p_id uuid, p_idx int)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v text;
begin
  perform public.krtom_check_session(p_token);
  select c.data into v from public.krtom_key_file_chunks c
    join public.krtom_key_files f on f.id = c.file_id and f.complete
   where c.file_id = p_id and c.idx = p_idx;
  if v is null then raise exception 'ไม่พบข้อมูลไฟล์'; end if;
  return v;
end;
$$;

create or replace function public.krtom_teacher_keyfile_delete(p_token uuid, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.krtom_check_session(p_token);
  delete from public.krtom_key_files where id = p_id;     -- ส่วนของไฟล์ลบตามอัตโนมัติ (on delete cascade)
end;
$$;

-- ---------- 3) แก้ข้อความเฉลย/แนวคำตอบรายข้อ ----------
create or replace function public.krtom_teacher_set_key(p_token uuid, p_activity text, p_q_norm text, p_q text, p_answer text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.krtom_check_session(p_token);
  if p_activity is null or p_activity !~ '^worksheet-[0-9]{1,2}-[0-9]{1,2}$' or coalesce(p_q_norm, '') = '' then
    raise exception 'ข้อมูลไม่ถูกต้อง';
  end if;
  if coalesce(btrim(p_answer), '') = '' then
    delete from public.krtom_answer_keys where activity = p_activity and q_norm = left(p_q_norm, 60);
  else
    insert into public.krtom_answer_keys (activity, q_norm, q, answer)
    values (p_activity, left(p_q_norm, 60), left(coalesce(p_q, ''), 300), left(p_answer, 3000))
    on conflict (activity, q_norm) do update set answer = excluded.answer, q = excluded.q;
  end if;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'krtom_teacher_change_password(uuid, text, text)',
    'krtom_teacher_keyfile_begin(uuid, text, text, int, text, text, bigint, int)',
    'krtom_teacher_keyfile_put(uuid, uuid, int, text)',
    'krtom_teacher_keyfile_commit(uuid, uuid)',
    'krtom_teacher_keyfiles(uuid)',
    'krtom_teacher_keyfile_chunk(uuid, uuid, int)',
    'krtom_teacher_keyfile_delete(uuid, uuid)',
    'krtom_teacher_set_key(uuid, text, text, text, text)'
  ] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;
