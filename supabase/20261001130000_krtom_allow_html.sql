-- krtom-classroom: อนุญาตให้ครูอัปโหลดไฟล์ .html (เกม/สื่อโต้ตอบ) ในเมนู "เพิ่มเนื้อหา"
-- รันใน Supabase SQL Editor 1 ครั้ง
-- หมายเหตุความปลอดภัย: Supabase เสิร์ฟไฟล์ HTML เป็นข้อความธรรมดา เว็บจึงดึงมาแสดงใน iframe แบบ sandbox
--                      (สคริปต์ในไฟล์รันได้ แต่เข้าถึงข้อมูลล็อกอินของเว็บหลักไม่ได้)
update storage.buckets
set allowed_mime_types = (
  select array_agg(distinct m)
  from unnest(coalesce(allowed_mime_types, array[]::text[]) || array['text/html']) as m
)
where id = 'krtom-content';
