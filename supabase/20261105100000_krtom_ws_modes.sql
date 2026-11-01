-- ครูเลือกได้ว่าใบงานไหน "ระบบตรวจ" (ค่าเริ่มต้น) หรือ "ครูตรวจเอง" — ตั้งที่เมนู ตั้งค่า → การตรวจใบงาน
-- ใบงานที่ตั้งเป็นครูตรวจเอง: นักเรียนส่งแล้วระบบไม่ให้คะแนน (บันทึกเป็นรอตรวจ) ครูเปิดดูแล้วให้คะแนนเองในหน้า "งานที่ส่ง"
-- รันใน Supabase SQL Editor ครั้งเดียว (รันซ้ำได้) — ต้องรันหลัง 20261101110000_krtom_resubmit_keys.sql

create table if not exists public.krtom_ws_modes (
  activity   text primary key check (activity ~ '^worksheet-[0-9]{1,2}-[0-9]{1,2}$'),
  mode       text not null check (mode in ('auto', 'manual')),
  updated_at timestamptz not null default now()
);
alter table public.krtom_ws_modes enable row level security;     -- ไม่มี policy: อ่าน/เขียนผ่านฟังก์ชันด้านล่างเท่านั้น

-- ทุกคน (หน้าใบงานของนักเรียน) อ่านได้: คืนเฉพาะใบงานที่ตั้งเป็น manual (ที่เหลือ = ระบบตรวจ)
create or replace function public.krtom_ws_modes()
returns table (activity text, mode text)
language sql
security definer
set search_path = public
as $$
  select m.activity, m.mode from public.krtom_ws_modes m where m.mode = 'manual';
$$;

-- ครู: ตั้งโหมดของใบงานหนึ่งใบ (auto = ลบแถว กลับเป็นค่าเริ่มต้น)
create or replace function public.krtom_teacher_set_ws_mode(p_token uuid, p_activity text, p_mode text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.krtom_check_session(p_token);
  if p_activity is null or p_activity !~ '^worksheet-[0-9]{1,2}-[0-9]{1,2}$' or p_mode not in ('auto', 'manual') then
    raise exception 'ข้อมูลไม่ถูกต้อง';
  end if;
  if p_mode = 'auto' then
    delete from public.krtom_ws_modes where activity = p_activity;
  else
    insert into public.krtom_ws_modes (activity, mode) values (p_activity, 'manual')
    on conflict (activity) do update set mode = 'manual', updated_at = now();
  end if;
end;
$$;

revoke all on function public.krtom_ws_modes() from public;
revoke all on function public.krtom_teacher_set_ws_mode(uuid, text, text) from public;
grant execute on function public.krtom_ws_modes() to anon, authenticated;
grant execute on function public.krtom_teacher_set_ws_mode(uuid, text, text) to anon, authenticated;
