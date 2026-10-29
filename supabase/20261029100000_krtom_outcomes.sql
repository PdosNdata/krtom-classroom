-- ============================================================================
-- krtom-classroom: เก็บหลักฐานรายข้อ -> จุดประสงค์ (O) / สมรรถนะสำคัญ 5 ด้าน (C) /
--                  การอ่าน คิดวิเคราะห์ และเขียนสื่อความ ตัวชี้วัด ม.1-3 (R)
-- รันใน Supabase SQL Editor 1 ครั้ง ต่อจาก 20261001100000_krtom_learning_flow.sql
-- และ 20260930130000_krtom_teacher_session.sql (รันซ้ำได้ ไม่ทำข้อมูลเดิมหาย)
--
-- ความปลอดภัย (แบบเดียวกับไฟล์เดิม): ทุกตารางเปิด RLS และไม่มี policy = เว็บอ่าน/เขียนตรงไม่ได้
--   นักเรียนเขียนผ่านฟังก์ชันที่ตรวจ "โทเคนนักเรียน" เท่านั้น (เฉพาะชั้นของตัวเอง)
--   ครูอ่าน/ให้คะแนนผ่านฟังก์ชันที่ตรวจ "โทเคนครู"
--   แผนที่ข้อ -> จุดประสงค์อยู่ฝั่งเซิร์ฟเวอร์ (krtom_item_map) นักเรียนแก้ไม่ได้
--
-- ดูผล: view krtom_mastery_report (สรุปต่อคนต่อหน่วย)  /  krtom_mastery_long (ละเอียดทุกรหัส)
--        krtom_reflections (คำตอบวิจารณ์ รอครูให้คะแนน 0-3)
-- ============================================================================

-- ---------- 1) นิยามจุดประสงค์ / สมรรถนะ / ตัวชี้วัดอ่าน-เขียน ----------
create table if not exists public.krtom_outcome (
  code       text not null,                       -- O1.. / C1..C5 / R1..R5
  kind       text not null check (kind in ('objective','competency','rw')),
  grade_id   text not null default '*',           -- '*' = ใช้ร่วมทุกชั้น/ทุกหน่วย
  subject_id text not null default '*',
  unit_idx   int  not null default -1,
  label      text not null,
  primary key (grade_id, subject_id, unit_idx, code)
);
alter table public.krtom_outcome enable row level security;
revoke all on public.krtom_outcome from anon, authenticated;

insert into public.krtom_outcome (code, kind, grade_id, subject_id, unit_idx, label) values
  ('O1','objective','m1','cs',1,'อธิบายหลักการเขียนโปรแกรมและความแตกต่างของโปรแกรมภาษาต่าง ๆ ได้'),
  ('O2','objective','m1','cs',1,'อธิบายซอฟต์แวร์ที่ใช้เขียนโปรแกรม และแนวคิดเรื่องตัวแปร เงื่อนไข วนซ้ำได้'),
  ('O3','objective','m1','cs',1,'ออกแบบอัลกอริทึมและเขียนโปรแกรมอย่างง่ายเพื่อแก้ปัญหาทางคณิตศาสตร์ได้'),
  ('C1','competency','*','*',-1,'ความสามารถในการสื่อสาร'),
  ('C2','competency','*','*',-1,'ความสามารถในการคิด'),
  ('C3','competency','*','*',-1,'ความสามารถในการแก้ปัญหา'),
  ('C4','competency','*','*',-1,'ความสามารถในการใช้ทักษะชีวิต'),
  ('C5','competency','*','*',-1,'ความสามารถในการใช้เทคโนโลยี'),
  ('R1','rw','*','*',-1,'คัดสรรสื่อที่ต้องการอ่านเพื่อหาข้อมูล สร้างความเข้าใจและประยุกต์ใช้ความรู้จากการอ่าน'),
  ('R2','rw','*','*',-1,'จับประเด็นสำคัญและประเด็นสนับสนุน โต้แย้ง'),
  ('R3','rw','*','*',-1,'วิเคราะห์ วิจารณ์ ความสมเหตุสมผล ลำดับความ และความเป็นไปได้ของเรื่องที่อ่าน'),
  ('R4','rw','*','*',-1,'สรุปคุณค่า แนวคิด แง่คิดที่ได้จากการอ่าน'),
  ('R5','rw','*','*',-1,'สรุป อภิปราย ขยายความ แสดงความคิดเห็น โดยการเขียนสื่อสารในรูปแบบต่าง ๆ เช่น ผังความคิด')
on conflict (grade_id, subject_id, unit_idx, code) do update set kind = excluded.kind, label = excluded.label;

-- ---------- 2) แผนที่ "ข้อ/กิจกรรม -> จุดประสงค์ + สมรรถนะ + อ่านเขียน" ----------
create table if not exists public.krtom_item_map (
  grade_id     text not null,
  subject_id   text not null,
  unit_idx     int  not null,
  activity     text not null,      -- quiz-pre | quiz-post | quiz-essay | worksheet-2-N | game-varfruit | game-varjump
  item_no      text not null,      -- quiz-N | eN | f1..f8 | c1,c2 (คำถามวิจารณ์) | total | L1..L3
  objective    text not null check (objective ~ '^O[0-9]+$'),
  competencies text[] not null default '{}',
  rw           text[] not null default '{}',
  primary key (grade_id, subject_id, unit_idx, activity, item_no, objective)
);
alter table public.krtom_item_map enable row level security;
revoke all on public.krtom_item_map from anon, authenticated;

-- ลบของเดิมของหน่วยนี้แล้วใส่ใหม่ (แก้แผนที่แล้วรันซ้ำได้)
delete from public.krtom_item_map where grade_id = 'm1' and subject_id = 'cs' and unit_idx = 1;
insert into public.krtom_item_map (grade_id, subject_id, unit_idx, activity, item_no, objective, competencies, rw)
select 'm1', 'cs', 1, v.activity, v.item_no, v.objective, v.competencies::text[], v.rw::text[]
from (values
  ('quiz-pre','quiz-0','O3','{C2,C3}','{R2}'),
  ('quiz-pre','quiz-1','O3','{C2,C3}','{R2}'),
  ('quiz-pre','quiz-2','O3','{C2,C3}','{R2}'),
  ('quiz-pre','quiz-3','O3','{C2,C3}','{R1}'),
  ('quiz-pre','quiz-4','O2','{C2}','{R1}'),
  ('quiz-pre','quiz-5','O1','{C2}','{R1}'),
  ('quiz-pre','quiz-6','O1','{C2}','{R1}'),
  ('quiz-pre','quiz-7','O1','{C2}','{R1}'),
  ('quiz-pre','quiz-8','O1','{C2}','{R1}'),
  ('quiz-pre','quiz-9','O1','{C2}','{R1}'),
  ('quiz-pre','quiz-10','O3','{C2,C3}','{R3}'),
  ('quiz-pre','quiz-11','O3','{C2,C3}','{R3}'),
  ('quiz-pre','quiz-12','O3','{C2,C3}','{R3}'),
  ('quiz-pre','quiz-13','O2','{C2}','{R4}'),
  ('quiz-pre','quiz-14','O3','{C2,C3}','{R2}'),
  ('quiz-pre','quiz-15','O3','{C2,C3}','{R3}'),
  ('quiz-pre','quiz-16','O2','{C2}','{R3}'),
  ('quiz-pre','quiz-17','O2','{C2}','{R3}'),
  ('quiz-pre','quiz-18','O2','{C2}','{R3}'),
  ('quiz-pre','quiz-19','O2','{C2}','{R4}'),
  ('quiz-pre','quiz-20','O2','{C2}','{R1}'),
  ('quiz-pre','quiz-21','O2','{C2}','{R3}'),
  ('quiz-pre','quiz-22','O2','{C2}','{R3}'),
  ('quiz-post','quiz-0','O3','{C2,C3}','{R2}'),
  ('quiz-post','quiz-1','O3','{C2,C3}','{R2}'),
  ('quiz-post','quiz-2','O3','{C2,C3}','{R2}'),
  ('quiz-post','quiz-3','O3','{C2,C3}','{R1}'),
  ('quiz-post','quiz-4','O2','{C2}','{R1}'),
  ('quiz-post','quiz-5','O1','{C2}','{R1}'),
  ('quiz-post','quiz-6','O1','{C2}','{R1}'),
  ('quiz-post','quiz-7','O1','{C2}','{R1}'),
  ('quiz-post','quiz-8','O1','{C2}','{R1}'),
  ('quiz-post','quiz-9','O1','{C2}','{R1}'),
  ('quiz-post','quiz-10','O3','{C2,C3}','{R3}'),
  ('quiz-post','quiz-11','O3','{C2,C3}','{R3}'),
  ('quiz-post','quiz-12','O3','{C2,C3}','{R3}'),
  ('quiz-post','quiz-13','O2','{C2}','{R4}'),
  ('quiz-post','quiz-14','O3','{C2,C3}','{R2}'),
  ('quiz-post','quiz-15','O3','{C2,C3}','{R3}'),
  ('quiz-post','quiz-16','O2','{C2}','{R3}'),
  ('quiz-post','quiz-17','O2','{C2}','{R3}'),
  ('quiz-post','quiz-18','O2','{C2}','{R3}'),
  ('quiz-post','quiz-19','O2','{C2}','{R4}'),
  ('quiz-post','quiz-20','O2','{C2}','{R1}'),
  ('quiz-post','quiz-21','O2','{C2}','{R3}'),
  ('quiz-post','quiz-22','O2','{C2}','{R3}'),
  ('quiz-essay','e1','O3','{C1,C3,C5}','{R1,R5}'),
  ('quiz-essay','e1','O2','{C2}','{R3}'),
  ('quiz-essay','e2','O3','{C1,C3,C5}','{R1,R5}'),
  ('quiz-essay','e2','O2','{C2}','{R3}'),
  ('quiz-essay','e3','O3','{C1,C3,C5}','{R1,R5}'),
  ('quiz-essay','e3','O2','{C2}','{R3}'),
  ('worksheet-2-2','f1','O3','{C2}','{R1,R2}'),
  ('worksheet-2-2','f2','O3','{C2}','{R2}'),
  ('worksheet-2-2','f3','O3','{C2}','{R2,R3}'),
  ('worksheet-2-2','f4','O3','{C2}','{R2}'),
  ('worksheet-2-2','f5','O3','{C1,C3}','{R5}'),
  ('worksheet-2-2','f6','O3','{C3,C5}','{R5}'),
  ('worksheet-2-2','f7','O3','{C3,C5}','{R5}'),
  ('worksheet-2-2','f8','O3','{C3,C5}','{R5}'),
  ('worksheet-2-2','f6','O2','{C2}','{R3}'),
  ('worksheet-2-2','f7','O2','{C2}','{R3}'),
  ('worksheet-2-2','f8','O2','{C2}','{R3}'),
  ('worksheet-2-2','c1','O2','{C2,C3}','{R3}'),
  ('worksheet-2-2','c2','O2','{C1,C2}','{R4}'),
  ('worksheet-2-3','f1','O3','{C2}','{R1,R2}'),
  ('worksheet-2-3','f2','O3','{C2}','{R2}'),
  ('worksheet-2-3','f3','O3','{C2}','{R2,R3}'),
  ('worksheet-2-3','f4','O3','{C2}','{R2}'),
  ('worksheet-2-3','f5','O3','{C1,C3}','{R5}'),
  ('worksheet-2-3','f6','O3','{C3,C5}','{R5}'),
  ('worksheet-2-3','f7','O3','{C3,C5}','{R5}'),
  ('worksheet-2-3','f8','O3','{C3,C5}','{R5}'),
  ('worksheet-2-3','f6','O2','{C2}','{R3}'),
  ('worksheet-2-3','f7','O2','{C2}','{R3}'),
  ('worksheet-2-3','f8','O2','{C2}','{R3}'),
  ('worksheet-2-3','c1','O2','{C2,C3}','{R3}'),
  ('worksheet-2-3','c2','O2','{C1,C2}','{R4}'),
  ('worksheet-2-4','f1','O3','{C2}','{R1,R2}'),
  ('worksheet-2-4','f2','O3','{C2}','{R2}'),
  ('worksheet-2-4','f3','O3','{C2}','{R2,R3}'),
  ('worksheet-2-4','f4','O3','{C2}','{R2}'),
  ('worksheet-2-4','f5','O3','{C1,C3}','{R5}'),
  ('worksheet-2-4','f6','O3','{C3,C5}','{R5}'),
  ('worksheet-2-4','f7','O3','{C3,C5}','{R5}'),
  ('worksheet-2-4','f8','O3','{C3,C5}','{R5}'),
  ('worksheet-2-4','f6','O2','{C2}','{R3}'),
  ('worksheet-2-4','f7','O2','{C2}','{R3}'),
  ('worksheet-2-4','f8','O2','{C2}','{R3}'),
  ('worksheet-2-4','c1','O2','{C2,C3}','{R3}'),
  ('worksheet-2-4','c2','O2','{C1,C2}','{R4}'),
  ('worksheet-2-5','f1','O3','{C2}','{R1,R2}'),
  ('worksheet-2-5','f2','O3','{C2}','{R2}'),
  ('worksheet-2-5','f3','O3','{C2}','{R2,R3}'),
  ('worksheet-2-5','f4','O3','{C2}','{R2}'),
  ('worksheet-2-5','f5','O3','{C1,C3}','{R5}'),
  ('worksheet-2-5','f6','O3','{C3,C5}','{R5}'),
  ('worksheet-2-5','f7','O3','{C3,C5}','{R5}'),
  ('worksheet-2-5','f8','O3','{C3,C5}','{R5}'),
  ('worksheet-2-5','f6','O2','{C2}','{R3}'),
  ('worksheet-2-5','f7','O2','{C2}','{R3}'),
  ('worksheet-2-5','f8','O2','{C2}','{R3}'),
  ('worksheet-2-5','c1','O2','{C2,C3}','{R3}'),
  ('worksheet-2-5','c2','O2','{C1,C2}','{R4}'),
  ('worksheet-2-6','f1','O3','{C2}','{R1,R2}'),
  ('worksheet-2-6','f2','O3','{C2}','{R2}'),
  ('worksheet-2-6','f3','O3','{C2}','{R2,R3}'),
  ('worksheet-2-6','f4','O3','{C2}','{R2}'),
  ('worksheet-2-6','f5','O3','{C1,C3}','{R5}'),
  ('worksheet-2-6','f6','O3','{C3,C5}','{R5}'),
  ('worksheet-2-6','f7','O3','{C3,C5}','{R5}'),
  ('worksheet-2-6','f8','O3','{C3,C5}','{R5}'),
  ('worksheet-2-6','f6','O2','{C2}','{R3}'),
  ('worksheet-2-6','f7','O2','{C2}','{R3}'),
  ('worksheet-2-6','f8','O2','{C2}','{R3}'),
  ('worksheet-2-6','c1','O2','{C2,C3}','{R3}'),
  ('worksheet-2-6','c2','O2','{C1,C2}','{R4}'),
  ('worksheet-2-7','f1','O3','{C2}','{R1,R2}'),
  ('worksheet-2-7','f2','O3','{C2}','{R2}'),
  ('worksheet-2-7','f3','O3','{C2}','{R2,R3}'),
  ('worksheet-2-7','f4','O3','{C2}','{R2}'),
  ('worksheet-2-7','f5','O3','{C1,C3}','{R5}'),
  ('worksheet-2-7','f6','O3','{C3,C5}','{R5}'),
  ('worksheet-2-7','f7','O3','{C3,C5}','{R5}'),
  ('worksheet-2-7','f8','O3','{C3,C5}','{R5}'),
  ('worksheet-2-7','f6','O2','{C2}','{R3}'),
  ('worksheet-2-7','f7','O2','{C2}','{R3}'),
  ('worksheet-2-7','f8','O2','{C2}','{R3}'),
  ('worksheet-2-7','c1','O2','{C2,C3}','{R3}'),
  ('worksheet-2-7','c2','O2','{C1,C2}','{R4}'),
  ('worksheet-2-1','total','O1','{C1,C2}','{R1,R2}'),
  ('worksheet-2-8','total','O2','{C2,C3,C5}','{R3,R5}'),
  ('worksheet-2-8','c1','O2','{C2,C3}','{R3}'),
  ('worksheet-2-8','c2','O2','{C1,C2}','{R4}'),
  ('game-varfruit','L1','O2','{C2,C3,C4,C5}','{R3}'),
  ('game-varjump','L1','O2','{C2,C3,C4,C5}','{R3}'),
  ('game-varfruit','L2','O2','{C2,C3,C4,C5}','{R3}'),
  ('game-varjump','L2','O2','{C2,C3,C4,C5}','{R3}'),
  ('game-varfruit','L3','O2','{C2,C3,C4,C5}','{R3}'),
  ('game-varjump','L3','O2','{C2,C3,C4,C5}','{R3}')
) as v(activity, item_no, objective, competencies, rw);

-- ---------- 3) หลักฐานรายข้อของนักเรียน (เก็บทุกครั้งที่ส่ง) ----------
create table if not exists public.krtom_evidence (
  id           bigint generated always as identity primary key,
  student_code text not null,
  full_name    text not null,
  grade_id     text not null,
  subject_id   text not null,
  unit_idx     int  not null check (unit_idx >= 0),
  activity     text not null,
  item_no      text not null,
  score        numeric not null check (score >= 0),
  max_score    numeric not null check (max_score > 0 and max_score <= 100),
  attempt      int  not null default 1,
  created_at   timestamptz not null default now(),
  check (score <= max_score),
  unique (student_code, grade_id, subject_id, unit_idx, activity, item_no, attempt)
);
alter table public.krtom_evidence enable row level security;
revoke all on public.krtom_evidence from anon, authenticated;
create index if not exists krtom_evidence_student on public.krtom_evidence (student_code, grade_id, subject_id, unit_idx);

-- ---------- 4) คำตอบวิจารณ์ (ข้อความ) + ครูให้คะแนน 0-3 ----------
create table if not exists public.krtom_reflections (
  id            bigint generated always as identity primary key,
  student_code  text not null,
  full_name     text not null,
  grade_id      text not null,
  subject_id    text not null,
  unit_idx      int  not null check (unit_idx >= 0),
  activity      text not null,
  item_no       text not null,
  answer        text not null check (char_length(answer) between 1 and 2000),
  teacher_score smallint check (teacher_score between 0 and 3),   -- 0 ยังไม่แสดงเหตุผล .. 3 เหตุผลชัดเจนครบถ้วน
  teacher_note  text,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (student_code, grade_id, subject_id, unit_idx, activity, item_no)
);
alter table public.krtom_reflections enable row level security;
revoke all on public.krtom_reflections from anon, authenticated;

-- ---------- 5) นักเรียนส่งหลักฐานรายข้อ ----------
-- p_items = [{"item":"f1","score":1,"max":1}, ...]  (ข้อที่ไม่มีในแผนที่จะถูกข้าม ไม่ทำให้ทั้งชุดล้ม)
-- คืนค่า: เลขครั้งที่ส่ง (attempt) ของกิจกรรมนี้
create or replace function public.krtom_submit_evidence(
  p_token uuid, p_grade text, p_subject text, p_unit int, p_activity text, p_items jsonb
)
returns int
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  s public.krtom_student_sessions;
  v_attempt int;
  it jsonb;
  v_item text; v_score numeric; v_max numeric;
begin
  s := public.krtom_check_student(p_token);
  if p_grade <> s.grade_id then
    raise exception 'ไม่มีสิทธิ์บันทึกข้อมูลชั้นอื่น';
  end if;
  if p_unit < 0 or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 80 then
    raise exception 'ข้อมูลหลักฐานไม่ถูกต้อง';
  end if;

  select coalesce(max(attempt), 0) + 1 into v_attempt
  from public.krtom_evidence
  where student_code = s.student_code and grade_id = p_grade and subject_id = p_subject
    and unit_idx = p_unit and activity = p_activity;

  for it in select * from jsonb_array_elements(p_items) loop
    v_item  := it->>'item';
    v_score := (it->>'score')::numeric;
    v_max   := (it->>'max')::numeric;
    continue when v_item is null or v_score is null or v_max is null;
    continue when v_max <= 0 or v_max > 100 or v_score < 0 or v_score > v_max;
    continue when not exists (
      select 1 from public.krtom_item_map m
      where m.grade_id = p_grade and m.subject_id = p_subject and m.unit_idx = p_unit
        and m.activity = p_activity and m.item_no = v_item);
    insert into public.krtom_evidence
      (student_code, full_name, grade_id, subject_id, unit_idx, activity, item_no, score, max_score, attempt)
    values
      (s.student_code, s.full_name, p_grade, p_subject, p_unit, p_activity, v_item, v_score, v_max, v_attempt)
    on conflict do nothing;
  end loop;
  return v_attempt;
end;
$$;
grant execute on function public.krtom_submit_evidence(uuid, text, text, int, text, jsonb) to anon, authenticated;

-- ---------- 6) นักเรียนส่งคำตอบวิจารณ์ (ส่งซ้ำ = แก้คำตอบเดิม และรอครูตรวจใหม่) ----------
-- p_answers = [{"item":"c1","text":"..."}, ...]
create or replace function public.krtom_submit_reflection(
  p_token uuid, p_grade text, p_subject text, p_unit int, p_activity text, p_answers jsonb
)
returns int
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  s public.krtom_student_sessions;
  a jsonb; v_item text; v_text text; n int := 0;
begin
  s := public.krtom_check_student(p_token);
  if p_grade <> s.grade_id then
    raise exception 'ไม่มีสิทธิ์บันทึกข้อมูลชั้นอื่น';
  end if;
  if p_unit < 0 or jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) not between 1 and 10 then
    raise exception 'ข้อมูลคำตอบไม่ถูกต้อง';
  end if;
  for a in select * from jsonb_array_elements(p_answers) loop
    v_item := a->>'item';
    v_text := left(btrim(coalesce(a->>'text', '')), 2000);
    continue when v_item is null or char_length(v_text) < 1;
    continue when not exists (
      select 1 from public.krtom_item_map m
      where m.grade_id = p_grade and m.subject_id = p_subject and m.unit_idx = p_unit
        and m.activity = p_activity and m.item_no = v_item);
    insert into public.krtom_reflections
      (student_code, full_name, grade_id, subject_id, unit_idx, activity, item_no, answer)
    values (s.student_code, s.full_name, p_grade, p_subject, p_unit, p_activity, v_item, v_text)
    on conflict (student_code, grade_id, subject_id, unit_idx, activity, item_no) do update
      set answer = excluded.answer, updated_at = now(),
          teacher_score = case when public.krtom_reflections.answer is distinct from excluded.answer then null else public.krtom_reflections.teacher_score end,
          reviewed_at   = case when public.krtom_reflections.answer is distinct from excluded.answer then null else public.krtom_reflections.reviewed_at end;
    n := n + 1;
  end loop;
  return n;
end;
$$;
grant execute on function public.krtom_submit_reflection(uuid, text, text, int, text, jsonb) to anon, authenticated;

-- ---------- 7) คำนวณระดับความสำเร็จ (ภายในเท่านั้น) ----------
-- ใช้ "ครั้งที่ดีที่สุด" ของแต่ละข้อ · คำตอบวิจารณ์นับเมื่อครูให้คะแนนแล้ว (เต็ม 3)
-- p_mode: 'all' = ทุกกิจกรรมยกเว้นแบบทดสอบก่อนเรียน · 'pre' = เฉพาะแบบทดสอบก่อนเรียน · 'post' = เฉพาะแบบทดสอบหลังเรียน (เทียบพัฒนาการ)
create or replace function public.krtom_mastery_rows(p_student text, p_mode text default 'all')
returns table (
  student_code text, full_name text, grade_id text, subject_id text, unit_idx int,
  kind text, code text, score numeric, max_score numeric, ratio numeric, level text, n_items int
)
language sql
security definer
set search_path = public, extensions
as $$
  with best as (
    select distinct on (e.student_code, e.grade_id, e.subject_id, e.unit_idx, e.activity, e.item_no)
           e.student_code, e.full_name, e.grade_id, e.subject_id, e.unit_idx, e.activity, e.item_no,
           e.score, e.max_score
    from public.krtom_evidence e
    where p_student is null or e.student_code = p_student
    order by e.student_code, e.grade_id, e.subject_id, e.unit_idx, e.activity, e.item_no,
             (e.score / e.max_score) desc, e.attempt desc
  ),
  refl as (
    select r.student_code, r.full_name, r.grade_id, r.subject_id, r.unit_idx, r.activity, r.item_no,
           r.teacher_score::numeric as score, 3::numeric as max_score
    from public.krtom_reflections r
    where r.teacher_score is not null and (p_student is null or r.student_code = p_student)
  ),
  ev as (
    select * from best
    union all
    select * from refl
  ),
  filt as (
    select * from ev
    where (p_mode = 'pre'  and ev.activity = 'quiz-pre')
       or (p_mode = 'post' and ev.activity = 'quiz-post')
       or (p_mode = 'all'  and ev.activity <> 'quiz-pre')
  ),
  x as (
    select f.student_code, f.full_name, f.grade_id, f.subject_id, f.unit_idx, f.score, f.max_score,
           'objective'::text as kind, m.objective as code
    from filt f join public.krtom_item_map m
      on m.grade_id = f.grade_id and m.subject_id = f.subject_id and m.unit_idx = f.unit_idx
     and m.activity = f.activity and m.item_no = f.item_no
    union all
    select f.student_code, f.full_name, f.grade_id, f.subject_id, f.unit_idx, f.score, f.max_score,
           'competency', c
    from filt f join public.krtom_item_map m
      on m.grade_id = f.grade_id and m.subject_id = f.subject_id and m.unit_idx = f.unit_idx
     and m.activity = f.activity and m.item_no = f.item_no
    cross join lateral unnest(m.competencies) as c
    union all
    select f.student_code, f.full_name, f.grade_id, f.subject_id, f.unit_idx, f.score, f.max_score,
           'rw', r
    from filt f join public.krtom_item_map m
      on m.grade_id = f.grade_id and m.subject_id = f.subject_id and m.unit_idx = f.unit_idx
     and m.activity = f.activity and m.item_no = f.item_no
    cross join lateral unnest(m.rw) as r
  )
  select x.student_code, x.full_name, x.grade_id, x.subject_id, x.unit_idx, x.kind, x.code,
         sum(x.score), sum(x.max_score),
         round(sum(x.score) / nullif(sum(x.max_score), 0), 4),
         case when sum(x.score) / nullif(sum(x.max_score), 0) >= 0.8 then 'ดีมาก'
              when sum(x.score) / nullif(sum(x.max_score), 0) >= 0.6 then 'ผ่าน'
              else 'ควรปรับปรุง' end,
         count(*)::int
  from x
  group by x.student_code, x.full_name, x.grade_id, x.subject_id, x.unit_idx, x.kind, x.code;
$$;
revoke all on function public.krtom_mastery_rows(text, text) from public, anon, authenticated;

-- ---------- 8) นักเรียนดูผลของตัวเอง ----------
create or replace function public.krtom_my_mastery(p_token uuid, p_mode text default 'all')
returns table (grade_id text, subject_id text, unit_idx int, kind text, code text,
               score numeric, max_score numeric, ratio numeric, level text, n_items int)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  s public.krtom_student_sessions;
begin
  s := public.krtom_check_student(p_token);
  return query
    select m.grade_id, m.subject_id, m.unit_idx, m.kind, m.code, m.score, m.max_score, m.ratio, m.level, m.n_items
    from public.krtom_mastery_rows(s.student_code, p_mode) m
    order by m.unit_idx, m.kind, m.code;
end;
$$;
grant execute on function public.krtom_my_mastery(uuid, text) to anon, authenticated;

-- ---------- 9) ครู: ดูผลทั้งห้อง / อ่านคำตอบวิจารณ์ / ให้คะแนน ----------
create or replace function public.krtom_teacher_mastery(p_token uuid, p_mode text default 'all')
returns table (student_code text, full_name text, grade_id text, subject_id text, unit_idx int,
               kind text, code text, score numeric, max_score numeric, ratio numeric, level text, n_items int)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.krtom_check_session(p_token);
  return query
    select * from public.krtom_mastery_rows(null, p_mode)
    order by 3, 5, 1, 6, 7;
end;
$$;
grant execute on function public.krtom_teacher_mastery(uuid, text) to anon, authenticated;

create or replace function public.krtom_teacher_reflections(p_token uuid)
returns table (id bigint, student_code text, full_name text, grade_id text, subject_id text, unit_idx int,
               activity text, item_no text, answer text, teacher_score smallint, teacher_note text,
               reviewed_at timestamptz, updated_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.krtom_check_session(p_token);
  return query
    select r.id, r.student_code, r.full_name, r.grade_id, r.subject_id, r.unit_idx, r.activity, r.item_no,
           r.answer, r.teacher_score, r.teacher_note, r.reviewed_at, r.updated_at
    from public.krtom_reflections r
    order by (r.teacher_score is not null), r.grade_id, r.unit_idx, r.student_code, r.activity, r.item_no;
end;
$$;
grant execute on function public.krtom_teacher_reflections(uuid) to anon, authenticated;

create or replace function public.krtom_teacher_review(p_token uuid, p_id bigint, p_score int, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.krtom_check_session(p_token);
  if p_score < 0 or p_score > 3 then
    raise exception 'คะแนนต้องอยู่ระหว่าง 0-3';
  end if;
  update public.krtom_reflections
     set teacher_score = p_score, teacher_note = nullif(btrim(coalesce(p_note, '')), ''), reviewed_at = now()
   where id = p_id;
end;
$$;
grant execute on function public.krtom_teacher_review(uuid, bigint, int, text) to anon, authenticated;

-- ---------- 10) รายงานสำหรับครู (เปิดใน Supabase Table Editor / SQL Editor) ----------
-- ผลละเอียดทุกรหัส (O / C / R)
create or replace view public.krtom_mastery_long with (security_invoker = on) as
select s.grade_label as "ชั้น", m.full_name as "ชื่อ", m.student_code as "เลขประจำตัว",
       m.unit_idx + 1 as "หน่วยที่", m.kind as "ประเภท", m.code as "รหัส",
       o.label as "ความหมาย", m.score as "คะแนนที่ได้", m.max_score as "คะแนนเต็ม",
       round(m.ratio * 100) as "ร้อยละ", m.level as "ระดับ", m.n_items as "จำนวนข้อ"
from public.krtom_mastery_rows(null, 'all') m
left join lateral (select grade_label from public.krtom_scores sc where sc.student_code = m.student_code limit 1) s on true
left join public.krtom_outcome o
  on o.code = m.code and (o.grade_id = m.grade_id or o.grade_id = '*')
 and (o.unit_idx = m.unit_idx or o.unit_idx = -1)
order by m.grade_id, m.unit_idx, m.student_code, m.kind, m.code;

-- สรุปต่อคนต่อหน่วย: ร้อยละของ O1-O3, C1-C5, R1-R5 (กว้าง 1 แถวต่อคน)
create or replace view public.krtom_mastery_report with (security_invoker = on) as
select m.grade_id as "ชั้น", m.full_name as "ชื่อ", m.student_code as "เลขประจำตัว", m.unit_idx + 1 as "หน่วยที่",
  round(100 * max(m.ratio) filter (where m.code = 'O1')) as "O1_%",
  round(100 * max(m.ratio) filter (where m.code = 'O2')) as "O2_%",
  round(100 * max(m.ratio) filter (where m.code = 'O3')) as "O3_%",
  round(100 * max(m.ratio) filter (where m.code = 'C1')) as "C1สื่อสาร_%",
  round(100 * max(m.ratio) filter (where m.code = 'C2')) as "C2คิด_%",
  round(100 * max(m.ratio) filter (where m.code = 'C3')) as "C3แก้ปัญหา_%",
  round(100 * max(m.ratio) filter (where m.code = 'C4')) as "C4ทักษะชีวิต_%",
  round(100 * max(m.ratio) filter (where m.code = 'C5')) as "C5เทคโนโลยี_%",
  round(100 * max(m.ratio) filter (where m.code = 'R1')) as "R1_%",
  round(100 * max(m.ratio) filter (where m.code = 'R2')) as "R2_%",
  round(100 * max(m.ratio) filter (where m.code = 'R3')) as "R3_%",
  round(100 * max(m.ratio) filter (where m.code = 'R4')) as "R4_%",
  round(100 * max(m.ratio) filter (where m.code = 'R5')) as "R5_%"
from public.krtom_mastery_rows(null, 'all') m
group by m.grade_id, m.full_name, m.student_code, m.unit_idx
order by m.grade_id, m.unit_idx, m.student_code;

-- เทียบก่อน/หลังเรียนรายจุดประสงค์ (แบบทดสอบปรนัยชุดเดียวกัน ก่อน vs หลัง)
create or replace view public.krtom_prepost_report with (security_invoker = on) as
select pr.full_name as "ชื่อ", pr.student_code as "เลขประจำตัว", pr.unit_idx + 1 as "หน่วยที่", pr.code as "จุดประสงค์",
       round(100 * pr.ratio) as "ก่อนเรียน_%",
       round(100 * po.ratio) as "หลังเรียน_%",
       round(100 * (po.ratio - pr.ratio)) as "พัฒนาการ_จุด%"
from public.krtom_mastery_rows(null, 'pre') pr
join public.krtom_mastery_rows(null, 'post') po
  on po.student_code = pr.student_code and po.unit_idx = pr.unit_idx and po.kind = pr.kind and po.code = pr.code
 and po.grade_id = pr.grade_id and po.subject_id = pr.subject_id
where pr.kind = 'objective'
order by pr.grade_id, pr.unit_idx, pr.student_code, pr.code;

revoke all on public.krtom_mastery_long, public.krtom_mastery_report, public.krtom_prepost_report from anon, authenticated;
