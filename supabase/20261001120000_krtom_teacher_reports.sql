-- ============================================================================
-- krtom-classroom: รายงานคะแนนสำหรับครู (เมนู "ดูงานนักเรียน")
-- รันต่อจาก 20261001100000_krtom_learning_flow.sql และ 20260930130000_krtom_teacher_session.sql
-- ฟังก์ชันทั้งสองตรวจ "โทเคนครู" ก่อนคืนข้อมูล (นักเรียน/คนทั่วไปเรียกแล้วได้ error)
-- ============================================================================

-- ---------- คะแนนทุกครั้งที่นักเรียนส่ง ----------
create or replace function public.krtom_teacher_scores(p_token uuid)
returns table (
  student_code text, full_name text, grade_id text, subject_id text,
  unit_idx int, score_type text, score int, total int, attempt int, created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.krtom_check_session(p_token);
  return query
    select s.student_code, s.full_name, s.grade_id, s.subject_id,
           s.unit_idx, s.score_type, s.score, s.total, s.attempt, s.created_at
    from public.krtom_scores s
    order by s.grade_id, s.unit_idx, s.student_code, s.score_type, s.attempt;
end;
$$;
grant execute on function public.krtom_teacher_scores(uuid) to anon, authenticated;

-- ---------- รายชื่อนักเรียน (ไว้แสดงคนที่ยังไม่ได้ทำ) ----------
create or replace function public.krtom_teacher_roster(p_token uuid)
returns table (student_code text, full_name text, grade_id text, grade_label text, seat_no int)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.krtom_check_session(p_token);
  return query
    select t.student_code, t.full_name, t.grade_id, t.grade_label, t.seat_no
    from public.krtom_students t
    order by t.grade_id, t.seat_no;
end;
$$;
grant execute on function public.krtom_teacher_roster(uuid) to anon, authenticated;
