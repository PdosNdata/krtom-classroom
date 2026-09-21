# -*- coding: utf-8 -*-
"""สร้างไฟล์เสียงคำถามที่ 4-5 เพิ่มเติมสำหรับเกม AR ชี้นิ้วตอบคำถาม (ขยายจาก 3 เป็น 5 ข้อ)"""
import subprocess, os, shutil, tempfile

VOICE = "th-TH-NiwatNeural"
RATE = "-15%"
PITCH = "-3Hz"
PAUSE_SECONDS = 0.55

ITEMS = {
    "handpoint-q4": [
        "ข้อที่ 4",
        "อุปกรณ์ที่ทำหน้าที่ประมวลผลข้อมูล เรียกว่าอะไร",
    ],
    "handpoint-q5": [
        "ข้อที่ 5",
        "อุปกรณ์ที่ทำหน้าที่ส่งเสียงออกมาให้เราได้ยิน เรียกว่าอะไร",
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
