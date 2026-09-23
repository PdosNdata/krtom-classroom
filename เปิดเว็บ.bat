@echo off
cd /d "%~dp0"
echo กำลังเปิดเว็บไซต์... (อย่าปิดหน้าต่างนี้ ให้เปิดไว้ตลอดเวลาที่ใช้งานเว็บ)
start "" http://localhost:8123
python -m http.server 8123
pause
