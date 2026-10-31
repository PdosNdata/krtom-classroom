-- งานที่นักเรียนส่ง (ใบงาน): เก็บคำตอบทั้งชุด + ลิงก์งานที่ทำ + คะแนนที่ระบบตรวจ ไว้ให้ครูเปิดดู
-- นักเรียนส่งได้เฉพาะของตัวเอง (ตรวจโทเคน) ครูดูได้ทั้งห้องผ่านเมนู "ดูงานนักเรียน" แท็บ "งานที่ส่ง"
-- รันใน Supabase SQL Editor ครั้งเดียว (รันซ้ำได้) — ต้องรันหลัง 20261001100000_krtom_learning_flow.sql และ 20260930130000_krtom_teacher_session.sql

create table if not exists public.krtom_submissions (
  id           bigserial primary key,
  student_code text not null,
  full_name    text not null,
  grade_id     text not null,
  subject_id   text not null,
  unit_idx     int  not null check (unit_idx >= 0),
  activity     text not null,
  answers      jsonb not null,
  score        int  not null,
  max_score    int  not null,
  attempt      int  not null default 1,
  submitted_at timestamptz not null default now(),
  unique (student_code, activity, attempt)
);
create index if not exists krtom_submissions_unit_idx on public.krtom_submissions (grade_id, unit_idx, activity);
alter table public.krtom_submissions enable row level security;   -- ไม่มี policy: เข้าถึงได้เฉพาะผ่านฟังก์ชันด้านล่าง

-- นักเรียนส่งงาน (ส่งซ้ำ = เพิ่มครั้งใหม่ ไม่ทับของเดิม)
create or replace function public.krtom_submit_work(
  p_token uuid, p_grade text, p_subject text, p_unit int, p_activity text,
  p_answers jsonb, p_score int, p_max int
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
  if p_grade <> s.grade_id then
    raise exception 'ไม่มีสิทธิ์ส่งงานของชั้นอื่น';
  end if;
  if p_activity is null or p_activity !~ '^worksheet-[0-9]{1,2}-[0-9]{1,2}$' then
    raise exception 'ชื่อใบงานไม่ถูกต้อง';
  end if;
  if p_unit < 0 or p_max <= 0 or p_max > 100 or p_score < 0 or p_score > p_max then
    raise exception 'คะแนนไม่ถูกต้อง';
  end if;
  if jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) not between 1 and 40
     or length(p_answers::text) > 60000 then
    raise exception 'ข้อมูลคำตอบไม่ถูกต้อง';
  end if;
  select coalesce(max(attempt), 0) + 1 into v_attempt
  from public.krtom_submissions where student_code = s.student_code and activity = p_activity;
  insert into public.krtom_submissions
    (student_code, full_name, grade_id, subject_id, unit_idx, activity, answers, score, max_score, attempt)
  values
    (s.student_code, s.full_name, p_grade, p_subject, p_unit, p_activity, p_answers, p_score, p_max, v_attempt);
  return v_attempt;
end;
$$;

-- ครู: ดูงานที่ส่งทั้งหมด (ล่าสุดก่อน)
create or replace function public.krtom_teacher_work(p_token uuid)
returns table (
  id bigint, student_code text, full_name text, grade_id text, subject_id text, unit_idx int,
  activity text, answers jsonb, score int, max_score int, attempt int, submitted_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.krtom_check_session(p_token);
  return query
    select w.id, w.student_code, w.full_name, w.grade_id, w.subject_id, w.unit_idx,
           w.activity, w.answers, w.score, w.max_score, w.attempt, w.submitted_at
    from public.krtom_submissions w
    order by w.submitted_at desc
    limit 3000;
end;
$$;

revoke all on function public.krtom_submit_work(uuid, text, text, int, text, jsonb, int, int) from public;
revoke all on function public.krtom_teacher_work(uuid) from public;
grant execute on function public.krtom_submit_work(uuid, text, text, int, text, jsonb, int, int) to anon, authenticated;
grant execute on function public.krtom_teacher_work(uuid) to anon, authenticated;
