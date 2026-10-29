-- ลิงก์ผังงานแบบสั้น (เช่น flowchart.html?s=K7M2QX) — ใช้กับหน้า "วาดผังงาน"
-- รันใน Supabase SQL Editor ครั้งเดียว (รันซ้ำได้) ถ้ายังไม่รัน ระบบจะใช้ลิงก์ยาวแบบเดิมแทนอัตโนมัติ

create table if not exists public.krtom_flow_share (
  code       text primary key,
  data       jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.krtom_flow_share enable row level security;      -- ไม่มี policy: เข้าถึงได้เฉพาะผ่านฟังก์ชันด้านล่าง

-- บันทึกผังงาน ได้รหัสสั้น 6 ตัว (ตัดตัวอักษรที่สับสน O/0/I/1)
create or replace function public.krtom_flow_share_put(p_data jsonb)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_try int := 0;
begin
  if p_data is null or jsonb_typeof(p_data) <> 'object'
     or jsonb_typeof(p_data->'nodes') <> 'array' or jsonb_typeof(p_data->'edges') <> 'array' then
    raise exception 'รูปแบบผังงานไม่ถูกต้อง';
  end if;
  if jsonb_array_length(p_data->'nodes') > 120 or jsonb_array_length(p_data->'edges') > 240
     or octet_length(p_data::text) > 60000 then
    raise exception 'ผังงานใหญ่เกินไป';
  end if;
  loop
    v_try := v_try + 1;
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    end loop;
    begin
      insert into public.krtom_flow_share (code, data) values (v_code, p_data);
      return v_code;
    exception when unique_violation then
      if v_try > 8 then raise exception 'สร้างรหัสไม่สำเร็จ ลองใหม่อีกครั้ง'; end if;
    end;
  end loop;
end;
$$;

-- เปิดผังงานจากรหัส
create or replace function public.krtom_flow_share_get(p_code text)
returns jsonb
language sql
security definer
set search_path = public, extensions
stable
as $$
  select data from public.krtom_flow_share where code = upper(btrim(p_code));
$$;

revoke all on function public.krtom_flow_share_put(jsonb) from public;
revoke all on function public.krtom_flow_share_get(text) from public;
grant execute on function public.krtom_flow_share_put(jsonb) to anon, authenticated;
grant execute on function public.krtom_flow_share_get(text) to anon, authenticated;
