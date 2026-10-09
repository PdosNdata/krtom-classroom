-- krtom-classroom: เปิดให้ ม.3 การออกแบบและเทคโนโลยี ส่งคะแนนแบบทดสอบฟอร์มได้ด้วย (ทำได้ครั้งเดียว) — รันต่อจาก 20261002110000
-- รันใน Supabase SQL Editor 1 ครั้ง (ต่อจาก 20261002100000)
-- ครูต้องการให้นักเรียนทำใหม่: ลบแถวคะแนนของคนนั้นในตาราง krtom_scores (Table Editor) แล้วนักเรียนจะทำได้อีกครั้ง

create or replace function public.krtom_submit_exam(
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
  v_allowed text[] := array['m2/design', 'm3/design'];
begin
  s := public.krtom_check_student(p_token);
  if (p_grade || '/' || p_subject) <> all (v_allowed) then
    raise exception 'หน่วยนี้ยังไม่เปิดให้ส่งคะแนนแบบนี้';
  end if;
  if p_type not in ('pretest', 'posttest') then
    raise exception 'ประเภทคะแนนไม่ถูกต้อง';
  end if;
  if p_grade <> s.grade_id then
    raise exception 'ไม่มีสิทธิ์บันทึกข้อมูลชั้นอื่น';
  end if;
  if p_unit < 0 or p_total < 1 or p_total > 200 or p_score < 0 or p_score > p_total then
    raise exception 'คะแนนไม่ถูกต้อง';
  end if;

  -- กันส่งซ้ำพร้อมกัน
  perform pg_advisory_xact_lock(hashtext(s.student_code || '/' || p_grade || '/' || p_subject || '/' || p_unit || '/' || p_type));
  if exists (
    select 1 from public.krtom_scores
    where student_code = s.student_code and grade_id = p_grade and subject_id = p_subject
      and unit_idx = p_unit and score_type = p_type
  ) then
    raise exception 'ทำแบบทดสอบนี้แล้ว (ทำได้ครั้งเดียว)';
  end if;

  insert into public.krtom_scores
    (student_code, full_name, grade_id, grade_label, subject_id, unit_idx, unit_no, score_type, score, total, attempt)
  values
    (s.student_code, s.full_name, p_grade, s.grade_label, p_subject, p_unit, p_unit + 1, p_type, p_score, p_total, 1);
  return 1;
end;
$$;
grant execute on function public.krtom_submit_exam(uuid, text, text, int, text, int, int) to anon, authenticated;

