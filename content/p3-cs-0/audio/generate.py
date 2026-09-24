# -*- coding: utf-8 -*-
"""generate.py — สร้างไฟล์เสียง MP3 สำหรับปุ่มฟังเสียงของ ป.3 หน่วย 1 (ยังมีแค่เกมเตอติส เนื้อหาส่วนอื่นยังไม่ได้ทำ)"""
import subprocess, os, shutil, tempfile

VOICE = "th-TH-NiwatNeural"
RATE = "-10%"
PITCH = "-3Hz"
PAUSE_SECONDS = 0.5

ITEMS = {
    "tetris-desc": [
        "เกมเตอติสบวกลบคูณเลข",
        "บล็อกตัวเลขจะตกลงมาเรื่อยๆ แตะเลือกบล็อกสองอัน ที่รวมกันได้ตรงกับโจทย์ แล้วกดยืนยัน",
        "ถ้าตอบถูกบล็อกจะหายไป ถ้าบล็อกกองสูงจนเต็มกระดานจะจบเกม ระวังอย่าให้กองสูงเกินไปนะ",
    ],
    "game-desc": [
        "หน่วยที่ 1 การแสดงขั้นตอนวิธีการแก้ปัญหา",
        "พลิกไพ่ 2 ใบ หาคู่ที่ตรงกัน คือสัญลักษณ์ผังงานกับความหมาย",
        "ให้ครบทุกคู่ โดยใช้จำนวนครั้งน้อยที่สุด",
    ],
}


def run(cmd):
    subprocess.run(cmd, check=True, capture_output=True, text=True)


def generate_item(file_id, sentences, tmpdir, silence_path):
    parts = []
    for idx, sentence in enumerate(sentences):
        part_path = os.path.join(tmpdir, f"{file_id}_{idx}.mp3")
        run(["python", "-m", "edge_tts",
             "--voice", VOICE, f"--rate={RATE}", f"--pitch={PITCH}",
             "--text", sentence, "--write-media", part_path])
        parts.append(part_path)

    inputs = []
    for p in parts[:-1]:
        inputs.append(p)
        inputs.append(silence_path)
    inputs.append(parts[-1])

    cmd = ["ffmpeg", "-y"]
    for p in inputs:
        cmd += ["-i", p]
    n = len(inputs)
    filter_str = "".join(f"[{i}:a]" for i in range(n)) + f"concat=n={n}:v=0:a=1[out]"
    cmd += ["-filter_complex", filter_str, "-map", "[out]", f"{file_id}.mp3"]
    run(cmd)


def main():
    tmpdir = tempfile.mkdtemp(prefix="tts_parts_")
    silence_path = os.path.join(tmpdir, "silence.mp3")
    run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
         "-t", str(PAUSE_SECONDS), "-q:a", "9", silence_path])

    ok, fail = 0, 0
    for file_id, sentences in ITEMS.items():
        try:
            generate_item(file_id, sentences, tmpdir, silence_path)
            print(f"OK  {file_id}.mp3  ({len(sentences)} ประโยค)")
            ok += 1
        except subprocess.CalledProcessError as e:
            print(f"FAIL {file_id}.mp3: {e.stderr}")
            fail += 1

    shutil.rmtree(tmpdir, ignore_errors=True)
    print(f"\nเสร็จสิ้น: สำเร็จ {ok} ไฟล์, ล้มเหลว {fail} ไฟล์")


if __name__ == "__main__":
    main()
