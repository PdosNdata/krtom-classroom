-- (1) ส่งใบงานแล้วส่งซ้ำไม่ได้ ถ้าครูไม่เปิดสิทธิ์ให้ส่งใหม่  (2) เฉลย/แนวคำตอบสำหรับครู (เก็บฝั่งเซิร์ฟเวอร์ นักเรียนอ่านไม่ได้)
-- รันใน Supabase SQL Editor ครั้งเดียว (รันซ้ำได้) — ต้องรันหลัง 20261101100000_krtom_work_review.sql
-- ตัวเนื้อหาเฉลยไม่อยู่ในไฟล์นี้ (ไฟล์นี้ขึ้นเว็บสาธารณะ): รันไฟล์ "เฉลยใบงาน-*.sql" ในโฟลเดอร์ แผนงาน แยกต่างหาก

alter table public.krtom_submissions add column if not exists allow_resubmit boolean not null default false;

create table if not exists public.krtom_answer_keys (
  activity text not null,        -- เช่น worksheet-1-3
  q_norm   text not null,        -- ข้อความหัวข้อ/โจทย์ ตัดช่องว่างทั้งหมด ใช้จับคู่กับคำตอบที่นักเรียนส่ง
  q        text not null,
  answer   text not null,
  primary key (activity, q_norm)
);
alter table public.krtom_answer_keys enable row level security;   -- ไม่มี policy: เข้าถึงได้เฉพาะผ่านฟังก์ชันครูด้านล่าง

-- นักเรียน: ส่งงาน — ถ้าเคยส่งแล้วและครูยังไม่เปิดสิทธิ์ส่งใหม่ จะส่งไม่ได้
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
  v_last public.krtom_submissions;
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
  select * into v_last from public.krtom_submissions
   where student_code = s.student_code and activity = p_activity order by attempt desc limit 1;
  if found and not v_last.allow_resubmit then
    raise exception 'ส่งใบงานนี้แล้ว ส่งซ้ำไม่ได้ ถ้าต้องการแก้ไขให้ขอครูเปิดสิทธิ์ส่งใหม่';
  end if;
  v_attempt := coalesce(v_last.attempt, 0) + 1;
  insert into public.krtom_submissions
    (student_code, full_name, grade_id, subject_id, unit_idx, activity, answers, score, max_score, attempt)
  values
    (s.student_code, s.full_name, p_grade, p_subject, p_unit, p_activity, p_answers, p_score, p_max, v_attempt);
  return v_attempt;
end;
$$;

-- นักเรียน: ใบงานนี้ส่งได้หรือไม่ (true = ยังไม่เคยส่ง หรือครูเปิดสิทธิ์ส่งใหม่)
create or replace function public.krtom_work_can_submit(p_token uuid, p_activity text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  s public.krtom_student_sessions;
  v_last public.krtom_submissions;
begin
  s := public.krtom_check_student(p_token);
  select * into v_last from public.krtom_submissions
   where student_code = s.student_code and activity = p_activity order by attempt desc limit 1;
  return (not found) or v_last.allow_resubmit;
end;
$$;

-- ครู: ดูงานที่ส่งทั้งหมด (เพิ่มสถานะสิทธิ์ส่งใหม่)
drop function if exists public.krtom_teacher_work(uuid);
create or replace function public.krtom_teacher_work(p_token uuid)
returns table (
  id bigint, student_code text, full_name text, grade_id text, subject_id text, unit_idx int,
  activity text, answers jsonb, score int, max_score int, attempt int, submitted_at timestamptz,
  teacher_score int, teacher_status text, teacher_note text, reviewed_at timestamptz, allow_resubmit boolean
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
           w.teacher_score, w.teacher_status, w.teacher_note, w.reviewed_at, w.allow_resubmit
    from public.krtom_submissions w
    order by w.submitted_at desc
    limit 3000;
end;
$$;

-- ครู: เปิด/ปิดสิทธิ์ส่งใหม่ของงานชิ้นนี้ (ผลกับการส่งครั้งถัดไปของนักเรียนคนนั้น ในใบงานนั้น)
create or replace function public.krtom_teacher_set_resubmit(p_token uuid, p_id bigint, p_allow boolean)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.krtom_check_session(p_token);
  update public.krtom_submissions set allow_resubmit = coalesce(p_allow, false) where id = p_id;
  if not found then raise exception 'ไม่พบงานที่ส่ง'; end if;
end;
$$;

-- ครู: ดูเฉลย/แนวคำตอบทั้งหมด
create or replace function public.krtom_teacher_keys(p_token uuid)
returns table (activity text, q_norm text, answer text)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.krtom_check_session(p_token);
  return query select k.activity, k.q_norm, k.answer from public.krtom_answer_keys k;
end;
$$;

revoke all on function public.krtom_submit_work(uuid, text, text, int, text, jsonb, int, int) from public;
revoke all on function public.krtom_work_can_submit(uuid, text) from public;
revoke all on function public.krtom_teacher_work(uuid) from public;
revoke all on function public.krtom_teacher_set_resubmit(uuid, bigint, boolean) from public;
revoke all on function public.krtom_teacher_keys(uuid) from public;
grant execute on function public.krtom_submit_work(uuid, text, text, int, text, jsonb, int, int) to anon, authenticated;
grant execute on function public.krtom_work_can_submit(uuid, text) to anon, authenticated;
grant execute on function public.krtom_teacher_work(uuid) to anon, authenticated;
grant execute on function public.krtom_teacher_set_resubmit(uuid, bigint, boolean) to anon, authenticated;
grant execute on function public.krtom_teacher_keys(uuid) to anon, authenticated;
