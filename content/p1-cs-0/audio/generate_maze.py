# สร้างเสียงเกมวิ่งเก็บ (เสียง Niwat ช้า/ทุ้ม) รันด้วย: python generate_platformer.py
import sys, os, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate as g
ITEMS = {
 "maze-desc": ["เกมเขาวงกต เก็บอุปกรณ์คอมพิวเตอร์ แล้วหาทางออก","ใช้ลูกศรเพื่อเดินในเขาวงกต","เดินเก็บอุปกรณ์คอมพิวเตอร์ให้ครบ แล้วประตูทางออกจะเปิด","เมื่อเก็บครบ ให้เดินไปที่ประตูทางออก"],
 "maze-m1": ["จอมอนิเตอร์ แสดงผลข้อมูลให้เราเห็น"],
 "maze-m2": ["ซีพียู ประมวลผลข้อมูล เหมือนสมองของคอมพิวเตอร์"],
 "maze-m3": ["เมาส์ รับข้อมูล ใช้ชี้และคลิกเลือก"],
 "maze-m4": ["คีย์บอร์ด ป้อนตัวอักษร ตัวเลข และสัญลักษณ์"],
 "maze-m5": ["ลำโพง ส่งเสียงออกมาให้เราได้ยิน"],
 "maze-locked": ["ประตูยังไม่เปิด","เก็บอุปกรณ์ให้ครบก่อนนะ"],
 "maze-win": ["เก่งมาก หาทางออกเจอแล้ว","เก็บอุปกรณ์คอมพิวเตอร์ได้ครบ"],
}
t = tempfile.mkdtemp(); s = os.path.join(t, "s.mp3")
g.run(["ffmpeg","-y","-f","lavfi","-i","anullsrc=r=24000:cl=mono","-t",str(g.PAUSE_SECONDS),"-q:a","9",s])
for k, v in ITEMS.items():
    g.generate_item(k, v, t, s); print("OK", k)
