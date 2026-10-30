-- ร่างงานของนักเรียน (ใบงาน / แบบทดสอบที่ทำค้างไว้) เก็บบนฐานข้อมูล ผูกกับตัวนักเรียน
-- ทำให้เปิดวันหลัง หรือเปลี่ยนเครื่อง ก็ทำต่อจากเดิมได้
-- รันใน Supabase SQL Editor ครั้งเดียว (รันซ้ำได้) — ต้องรันหลัง 20261001100000_krtom_learning_flow.sql

create table if not exists public.krtom_drafts (
  student_code text not null,
  draft_key    text not null,
  data         text not null,
  updated_at   timestamptz not null default now(),
  primary key (student_code, draft_key)
);
alter table public.krtom_drafts enable row level security;      -- ไม่มี policy: เข้าถึงได้เฉพาะผ่านฟังก์ชันด้านล่าง

-- บันทึก/ทับร่าง 1 รายการ (ตรวจโทเคนนักเรียน, เก็บได้เฉพาะของตัวเอง)
create or replace function public.krtom_save_draft(p_token uuid, p_key text, p_data text)
returns timestamptz
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  s public.krtom_student_sessions;
  v_now timestamptz := now();
begin
  s := public.krtom_check_student(p_token);
  if p_key is null or p_key !~ '^krtomws[A-Za-z0-9:/_.\-]{0,110}$' then
    raise exception 'ชื่อร่างงานไม่ถูกต้อง';
  end if;
  if p_data is null or length(p_data) > 60000 then
    raise exception 'ร่างงานใหญ่เกินไป';
  end if;
  if (select count(*) from public.krtom_drafts where student_code = s.student_code) >= 200
     and not exists (select 1 from public.krtom_drafts where student_code = s.student_code and draft_key = p_key) then
    raise exception 'เก็บร่างงานเต็มแล้ว';
  end if;
  insert into public.krtom_drafts (student_code, draft_key, data, updated_at)
  values (s.student_code, p_key, p_data, v_now)
  on conflict (student_code, draft_key) do update set data = excluded.data, updated_at = excluded.updated_at;
  return v_now;
end;
$$;

-- อ่านร่างทั้งหมดของตัวเอง
create or replace function public.krtom_load_drafts(p_token uuid)
returns table (draft_key text, data text, updated_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  s public.krtom_student_sessions;
begin
  s := public.krtom_check_student(p_token);
  return query
    select d.draft_key, d.data, d.updated_at
    from public.krtom_drafts d
    where d.student_code = s.student_code
    order by d.updated_at desc
    limit 200;
end;
$$;

revoke all on function public.krtom_save_draft(uuid, text, text) from public;
revoke all on function public.krtom_load_drafts(uuid) from public;
grant execute on function public.krtom_save_draft(uuid, text, text) to anon, authenticated;
grant execute on function public.krtom_load_drafts(uuid) to anon, authenticated;
