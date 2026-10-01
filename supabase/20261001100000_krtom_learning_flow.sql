-- ============================================================================
-- krtom-classroom: เรียนตามลำดับขั้นตอน (ไม่ให้ข้าม) + เก็บคะแนน
--   1 จุดประสงค์ -> 2 ก่อนเรียน -> 3 ใบความรู้ -> 4 ใบงาน -> 5 หลังเรียน
-- รันใน Supabase SQL Editor 1 ครั้ง (รันต่อจากไฟล์ก่อนหน้าได้เลย)
-- ความปลอดภัย: ตารางทั้งหมดเปิด RLS และไม่มี policy = เว็บอ่าน/เขียนตรงไม่ได้
--              เขียนผ่านฟังก์ชันที่ตรวจ "โทเคนนักเรียน" (ได้จากการล็อกอิน) เท่านั้น
-- ดูคะแนน: เปิดตาราง krtom_scores (ทุกครั้งที่ทำ) หรือ view krtom_scores_report (สรุปต่อคนต่อหน่วย)
-- ============================================================================

-- ---------- 1) เซสชันนักเรียน ----------
create table if not exists public.krtom_student_sessions (
  token        uuid primary key default gen_random_uuid(),
  student_code text not null,
  full_name    text not null,
  grade_id     text not null,
  grade_label  text,
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now()
);
alter table public.krtom_student_sessions enable row level security;

-- ---------- 2) ความคืบหน้าแต่ละขั้น ----------
create table if not exists public.krtom_progress (
  student_code text not null,
  grade_id     text not null,
  subject_id   text not null,
  unit_idx     int  not null check (unit_idx >= 0),
  step         text not null check (step in ('objectives','pretest','knowledge','worksheet','posttest')),
  done_at      timestamptz not null default now(),
  primary key (student_code, grade_id, subject_id, unit_idx, step)
);
alter table public.krtom_progress enable row level security;

-- ---------- 3) คะแนน (เก็บทุกครั้งที่ส่ง แยกประเภท) ----------
create table if not exists public.krtom_scores (
  id           bigint generated always as identity primary key,
  student_code text not null,
  full_name    text not null,
  grade_id     text not null,
  grade_label  text,
  subject_id   text not null,
  unit_idx     int  not null check (unit_idx >= 0),
  unit_no      int  not null,
  score_type   text not null check (score_type in ('pretest','worksheet','posttest')),
  score        int  not null check (score >= 0),
  total        int  not null check (total > 0),
  attempt      int  not null default 1,
  created_at   timestamptz not null default now(),
  check (score <= total)
);
alter table public.krtom_scores enable row level security;
create index if not exists krtom_scores_lookup on public.krtom_scores (grade_id, subject_id, unit_idx, score_type);
create index if not exists krtom_scores_student on public.krtom_scores (student_code);

revoke all on public.krtom_student_sessions, public.krtom_progress, public.krtom_scores from anon, authenticated;

-- ---------- 4) ล็อกอินนักเรียน -> โทเคน (ใช้ตัวตรวจเดิม krtom_verify_student_login) ----------
create or replace function public.krtom_student_login(p_code text, p_password text)
returns table (token uuid, student_code text, full_name text, grade_id text, grade_label text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v record;
  v_token uuid;
begin
  select * into v from public.krtom_verify_student_login(p_code, p_password) limit 1;
  if v.student_code is null then
    return;
  end if;
  delete from public.krtom_student_sessions where expires_at < now();
  insert into public.krtom_student_sessions (student_code, full_name, grade_id, grade_label, expires_at)
  values (v.student_code::text, v.full_name::text, v.grade_id::text, v.grade_label::text, now() + interval '12 hours')
  returning krtom_student_sessions.token into v_token;
  return query select v_token, v.student_code::text, v.full_name::text, v.grade_id::text, v.grade_label::text;
end;
$$;
grant execute on function public.krtom_student_login(text, text) to anon, authenticated;

-- ---------- 5) ตรวจโทเคน (ภายในเท่านั้น) ----------
create or replace function public.krtom_check_student(p_token uuid)
returns public.krtom_student_sessions
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  s public.krtom_student_sessions;
begin
  select * into s from public.krtom_student_sessions t where t.token = p_token and t.expires_at > now();
  if s.token is null then
    raise exception 'หมดเวลาเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่' using errcode = '28000';
  end if;
  return s;
end;
$$;
revoke all on function public.krtom_check_student(uuid) from public, anon, authenticated;

-- ---------- 6) กฎลำดับขั้น: ต้องผ่านขั้นก่อนหน้าก่อน ----------
create or replace function public.krtom_assert_prereq(p_code text, p_grade text, p_subject text, p_unit int, p_step text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_prev text;
begin
  v_prev := case p_step
    when 'pretest'   then 'objectives'
    when 'knowledge' then 'pretest'
    when 'worksheet' then 'knowledge'
    when 'posttest'  then 'worksheet'
    else null end;
  if v_prev is not null and not exists (
    select 1 from public.krtom_progress p
    where p.student_code = p_code and p.grade_id = p_grade and p.subject_id = p_subject
      and p.unit_idx = p_unit and p.step = v_prev
  ) then
    raise exception 'ยังไม่ได้ทำขั้นตอนก่อนหน้า ไม่สามารถข้ามขั้นได้' using errcode = 'P0001';
  end if;
end;
$$;
revoke all on function public.krtom_assert_prereq(text,text,text,int,text) from public, anon, authenticated;

-- ---------- 7) บันทึกขั้นที่ไม่มีคะแนน (จุดประสงค์ / ใบความรู้) ----------
create or replace function public.krtom_mark_step(p_token uuid, p_grade text, p_subject text, p_unit int, p_step text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  s public.krtom_student_sessions;
begin
  s := public.krtom_check_student(p_token);
  if p_step not in ('objectives','knowledge') then
    raise exception 'ขั้นตอนไม่ถูกต้อง';
  end if;
  if p_grade <> s.grade_id then
    raise exception 'ไม่มีสิทธิ์บันทึกข้อมูลชั้นอื่น';
  end if;
  perform public.krtom_assert_prereq(s.student_code, p_grade, p_subject, p_unit, p_step);
  insert into public.krtom_progress (student_code, grade_id, subject_id, unit_idx, step)
  values (s.student_code, p_grade, p_subject, p_unit, p_step)
  on conflict do nothing;
end;
$$;
grant execute on function public.krtom_mark_step(uuid, text, text, int, text) to anon, authenticated;

-- ---------- 8) ส่งคะแนน (ก่อนเรียน / ใบงาน / หลังเรียน) ----------
create or replace function public.krtom_submit_score(
  p_token uuid, p_grade text, p_subject text, p_unit int,
  p_type text, p_score int, p_total int
)
returns int
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  s public.krtom_student_sessions;
  v_attempt int;
begin
  s := public.krtom_check_student(p_token);
  if p_type not in ('pretest','worksheet','posttest') then
    raise exception 'ประเภทคะแนนไม่ถูกต้อง';
  end if;
  if p_grade <> s.grade_id then
    raise exception 'ไม่มีสิทธิ์บันทึกข้อมูลชั้นอื่น';
  end if;
  if p_unit < 0 or p_total < 1 or p_total > 100 or p_score < 0 or p_score > p_total then
    raise exception 'คะแนนไม่ถูกต้อง';
  end if;
  perform public.krtom_assert_prereq(s.student_code, p_grade, p_subject, p_unit, p_type);

  select coalesce(max(attempt), 0) + 1 into v_attempt
  from public.krtom_scores
  where student_code = s.student_code and grade_id = p_grade and subject_id = p_subject
    and unit_idx = p_unit and score_type = p_type;

  insert into public.krtom_scores
    (student_code, full_name, grade_id, grade_label, subject_id, unit_idx, unit_no, score_type, score, total, attempt)
  values
    (s.student_code, s.full_name, p_grade, s.grade_label, p_subject, p_unit, p_unit + 1, p_type, p_score, p_total, v_attempt);

  insert into public.krtom_progress (student_code, grade_id, subject_id, unit_idx, step)
  values (s.student_code, p_grade, p_subject, p_unit, p_type)
  on conflict do nothing;
  return v_attempt;
end;
$$;
grant execute on function public.krtom_submit_score(uuid, text, text, int, text, int, int) to anon, authenticated;

-- ---------- 9) ความคืบหน้าของฉัน ----------
create or replace function public.krtom_my_progress(p_token uuid)
returns table (grade_id text, subject_id text, unit_idx int, step text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  s public.krtom_student_sessions;
begin
  s := public.krtom_check_student(p_token);
  return query
    select p.grade_id, p.subject_id, p.unit_idx, p.step
    from public.krtom_progress p where p.student_code = s.student_code;
end;
$$;
grant execute on function public.krtom_my_progress(uuid) to anon, authenticated;

-- ---------- 10) รายงานสรุปสำหรับครู (เปิดดูใน Supabase Table Editor / SQL Editor) ----------
create or replace view public.krtom_scores_report with (security_invoker = on) as
select
  grade_label                                        as "ชั้น",
  full_name                                          as "ชื่อ",
  student_code                                       as "เลขประจำตัว",
  subject_id                                         as "วิชา",
  unit_no                                            as "หน่วยที่",
  max(score) filter (where score_type = 'pretest')   as "ก่อนเรียน_ดีที่สุด",
  max(total) filter (where score_type = 'pretest')   as "ก่อนเรียน_เต็ม",
  max(score) filter (where score_type = 'worksheet') as "ใบงาน_ดีที่สุด",
  max(total) filter (where score_type = 'worksheet') as "ใบงาน_เต็ม",
  max(score) filter (where score_type = 'posttest')  as "หลังเรียน_ดีที่สุด",
  max(total) filter (where score_type = 'posttest')  as "หลังเรียน_เต็ม",
  max(created_at)                                    as "ส่งล่าสุด"
from public.krtom_scores
group by grade_id, grade_label, full_name, student_code, subject_id, unit_no
order by grade_id, unit_no, student_code;
