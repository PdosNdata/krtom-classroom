-- krtom-classroom: ให้แบบทดสอบสไตล์ฟอร์ม (หน่วยที่ไม่ใช่ระบบเรียน 5 ขั้น) ส่งคะแนนเข้าตาราง krtom_scores ได้
-- ตอนนี้เปิดให้เฉพาะ ม.2 การออกแบบและเทคโนโลยี (เพิ่มรายการใน v_allowed ถ้าต้องการหน่วยอื่น)
-- รันใน Supabase SQL Editor 1 ครั้ง (ต่อจากไฟล์ 20261001120000)
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
  v_attempt int;
  v_allowed text[] := array['m2/design'];
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

  select coalesce(max(attempt), 0) + 1 into v_attempt
  from public.krtom_scores
  where student_code = s.student_code and grade_id = p_grade and subject_id = p_subject
    and unit_idx = p_unit and score_type = p_type;

  insert into public.krtom_scores
    (student_code, full_name, grade_id, grade_label, subject_id, unit_idx, unit_no, score_type, score, total, attempt)
  values
    (s.student_code, s.full_name, p_grade, s.grade_label, p_subject, p_unit, p_unit + 1, p_type, p_score, p_total, v_attempt);
  return v_attempt;
end;
$$;
grant execute on function public.krtom_submit_exam(uuid, text, text, int, text, int, int) to anon, authenticated;
