# สร้างเสียง ป.1 หน่วย 5 (เสียง Niwat ช้า/ทุ้ม เหมือนหน่วยอื่น) รันด้วย: python generate.py
import sys, os, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base_gen as g
ITEMS = {"game-desc": ["หน่วยที่ 5 การเปรียบเทียบ", "พลิกไพ่ 2 ใบ หาคู่ที่ตรงกัน คือภาพกับสิ่งที่ใช้เปรียบเทียบ", "ให้ครบทุกคู่ โดยใช้จำนวนครั้งน้อยที่สุด"], "ar-desc": ["หน่วยที่ 5 การเปรียบเทียบ", "ลากคำตอบไปวางให้ตรงกับสถานการณ์", "โดยเปรียบเทียบแล้วเลือกสิ่งที่เหมาะสมที่สุด"], "ar-step1": ["ดินสอ"], "ar-step2": ["กระเป๋าเป้"], "ar-step3": ["มองจากบนลงล่าง"], "ar-step4": ["แยกตามประเภท"]}
t = tempfile.mkdtemp(); s = os.path.join(t, "s.mp3")
g.run(["ffmpeg","-y","-f","lavfi","-i","anullsrc=r=24000:cl=mono","-t",str(g.PAUSE_SECONDS),"-q:a","9",s])
for k, v in ITEMS.items():
    g.generate_item(k, v, t, s); print("OK", k)
