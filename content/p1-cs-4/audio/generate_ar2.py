# สร้างเสียง ป.1 หน่วย 5 (เสียง Niwat ช้า/ทุ้ม เหมือนหน่วยอื่น) รันด้วย: python generate.py
import sys, os, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base_gen as g
ITEMS = {"ar-desc": ["หน่วยที่ 5 การเปรียบเทียบ", "ลากคำตอบไปวางให้ตรงกับสถานการณ์ ทีละห้าข้อ", "โดยเปรียบเทียบแล้วเลือกสิ่งที่เหมาะสมที่สุด"], "ar-step5": ["นับจากซ้ายไปขวา"], "ar-step6": ["สี"], "ar-step7": ["ขนาด"], "ar-step8": ["รูปทรง"], "ar-step9": ["การใช้งาน"], "ar-step10": ["เทียบทีละส่วน"]}
t = tempfile.mkdtemp(); s = os.path.join(t, "s.mp3")
g.run(["ffmpeg","-y","-f","lavfi","-i","anullsrc=r=24000:cl=mono","-t",str(g.PAUSE_SECONDS),"-q:a","9",s])
for k, v in ITEMS.items():
    g.generate_item(k, v, t, s); print("OK", k)
