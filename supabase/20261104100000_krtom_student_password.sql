-- นักเรียนเปลี่ยนรหัสผ่านเองได้ · ครูรีเซ็ตกลับเป็นรหัสเดิม (= เลขประจำตัว) ได้
-- ค่าเริ่มต้น: password_hash เป็น null = รหัสผ่านคือเลขประจำตัวนักเรียน (เหมือนเดิม) · เมื่อนักเรียนเปลี่ยน จะเก็บเป็น bcrypt hash
-- รันใน Supabase SQL Editor ครั้งเดียว (รันซ้ำได้) — ต้องรันหลัง 20261103100000_krtom_settings.sql

alter table public.krtom_students add column if not exists password_hash text;
alter table public.krtom_students add column if not exists password_changed_at timestamptz;

-- ตรวจรหัสผ่านนักเรียน (ใช้กับหน้าเข้าสู่ระบบเดิม ชื่อฟังก์ชันและผลลัพธ์เหมือนเดิม)
create or replace function public.krtom_verify_student_login(p_code text, p_password text)
returns table(student_code text, full_name text, grade_id text, grade_label text)
language sql
security definer
set search_path = public, extensions
as $$
  select s.student_code, s.full_name, s.grade_id, s.grade_label
  from public.krtom_students s
  where s.student_code = trim(p_code)
    and ( (s.password_hash is null and p_password = s.student_code)
       or (s.password_hash is not null and s.password_hash = crypt(p_password, s.password_hash)) )
  limit 1;
$$;
revoke all on function public.krtom_verify_student_login(text, text) from public;
grant execute on function public.krtom_verify_student_login(text, text) to anon, authenticated;

-- นักเรียน: เปลี่ยนรหัสผ่านของตัวเอง
create or replace function public.krtom_student_change_password(p_token uuid, p_old text, p_new text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  s public.krtom_student_sessions;
  v_ok boolean;
begin
  s := public.krtom_check_student(p_token);
  select (t.password_hash is null and p_old = t.student_code)
      or (t.password_hash is not null and t.password_hash = crypt(p_old, t.password_hash))
    into v_ok
  from public.krtom_students t where t.student_code = s.student_code;
  if v_ok is not true then
    perform pg_sleep(0.6);
    raise exception 'รหัสผ่านเดิมไม่ถูกต้อง';
  end if;
  if length(coalesce(p_new, '')) < 6 then
    raise exception 'รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัวอักษร';
  end if;
  if p_new = p_old then
    raise exception 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม';
  end if;
  update public.krtom_students
     set password_hash = crypt(p_new, gen_salt('bf')), password_changed_at = now()
   where student_code = s.student_code;
  delete from public.krtom_student_sessions where student_code = s.student_code and token <> p_token;   -- เครื่องอื่นต้องเข้าสู่ระบบใหม่
end;
$$;

-- ครู: รีเซ็ตรหัสผ่านนักเรียนกลับเป็นเลขประจำตัว (และให้นักเรียนคนนั้นออกจากระบบทุกเครื่อง)
create or replace function public.krtom_teacher_reset_student_password(p_token uuid, p_student_code text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.krtom_check_session(p_token);
  update public.krtom_students set password_hash = null, password_changed_at = null where student_code = p_student_code;
  if not found then raise exception 'ไม่พบนักเรียนเลขประจำตัวนี้'; end if;
  delete from public.krtom_student_sessions where student_code = p_student_code;
end;
$$;

-- ครู: ดูว่านักเรียนคนไหนเปลี่ยนรหัสผ่านไว้แล้ว (ไม่เห็นตัวรหัส)
create or replace function public.krtom_teacher_pw_status(p_token uuid)
returns table (student_code text, changed boolean, changed_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.krtom_check_session(p_token);
  return query select s.student_code, s.password_hash is not null, s.password_changed_at from public.krtom_students s;
end;
$$;

revoke all on function public.krtom_student_change_password(uuid, text, text) from public;
revoke all on function public.krtom_teacher_reset_student_password(uuid, text) from public;
revoke all on function public.krtom_teacher_pw_status(uuid) from public;
grant execute on function public.krtom_student_change_password(uuid, text, text) to anon, authenticated;
grant execute on function public.krtom_teacher_reset_student_password(uuid, text) to anon, authenticated;
grant execute on function public.krtom_teacher_pw_status(uuid) to anon, authenticated;
