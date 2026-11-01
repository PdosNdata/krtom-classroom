-- ครูตรวจงานที่ส่ง: เห็นชอบคะแนนที่ระบบตรวจ หรือแก้คะแนนเอง (เก็บแยกจากคะแนนระบบ ไม่ทับของเดิม)
-- รันใน Supabase SQL Editor ครั้งเดียว (รันซ้ำได้) — ต้องรันหลัง 20261031100000_krtom_submissions.sql

alter table public.krtom_submissions add column if not exists teacher_score  int;
alter table public.krtom_submissions add column if not exists teacher_status text;          -- 'approved' = เห็นชอบคะแนนระบบ · 'edited' = ครูแก้คะแนน
alter table public.krtom_submissions add column if not exists teacher_note   text;
alter table public.krtom_submissions add column if not exists reviewed_at    timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'krtom_submissions_teacher_status_chk') then
    alter table public.krtom_submissions add constraint krtom_submissions_teacher_status_chk check (teacher_status is null or teacher_status in ('approved', 'edited'));
  end if;
end $$;

-- ครู: ดูงานที่ส่งทั้งหมด (เพิ่มคอลัมน์ผลการตรวจของครู)
drop function if exists public.krtom_teacher_work(uuid);
create or replace function public.krtom_teacher_work(p_token uuid)
returns table (
  id bigint, student_code text, full_name text, grade_id text, subject_id text, unit_idx int,
  activity text, answers jsonb, score int, max_score int, attempt int, submitted_at timestamptz,
  teacher_score int, teacher_status text, teacher_note text, reviewed_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.krtom_check_session(p_token);
  return query
    select w.id, w.student_code, w.full_name, w.grade_id, w.subject_id, w.unit_idx,
           w.activity, w.answers, w.score, w.max_score, w.attempt, w.submitted_at,
           w.teacher_score, w.teacher_status, w.teacher_note, w.reviewed_at
    from public.krtom_submissions w
    order by w.submitted_at desc
    limit 3000;
end;
$$;

-- ครู: เห็นชอบ (p_status='approved' ใช้คะแนนที่ระบบตรวจ) หรือแก้คะแนน (p_status='edited' พร้อมคะแนนใหม่)
create or replace function public.krtom_teacher_review_work(
  p_token uuid, p_id bigint, p_status text, p_score int default null, p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  w public.krtom_submissions;
begin
  perform public.krtom_check_session(p_token);
  if p_status not in ('approved', 'edited') then
    raise exception 'สถานะไม่ถูกต้อง';
  end if;
  select * into w from public.krtom_submissions where id = p_id;
  if not found then
    raise exception 'ไม่พบงานที่ส่ง';
  end if;
  if p_status = 'edited' and (p_score is null or p_score < 0 or p_score > w.max_score) then
    raise exception 'คะแนนต้องอยู่ระหว่าง 0 ถึง %', w.max_score;
  end if;
  update public.krtom_submissions
     set teacher_status = p_status,
         teacher_score  = case when p_status = 'approved' then w.score else p_score end,
         teacher_note   = nullif(left(trim(coalesce(p_note, '')), 500), ''),
         reviewed_at    = now()
   where id = p_id;
end;
$$;

revoke all on function public.krtom_teacher_work(uuid) from public;
revoke all on function public.krtom_teacher_review_work(uuid, bigint, text, int, text) from public;
grant execute on function public.krtom_teacher_work(uuid) to anon, authenticated;
grant execute on function public.krtom_teacher_review_work(uuid, bigint, text, int, text) to anon, authenticated;
