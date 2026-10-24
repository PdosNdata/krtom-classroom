# sync-deploy.ps1 — ซิงก์เว็บ CAI ไปที่โปรเจ็กต์เว็บโรงเรียน (bkkschoolWeb) แล้ว push ให้ Vercel เผยแพร่ขึ้น www.bankhodonkhan.ac.th
# ใช้งาน: ดับเบิลคลิก "เผยแพร่ขึ้นเว็บ.bat"   (หรือ powershell -File sync-deploy.ps1 [-Yes] [-Message "ข้อความ commit"])
param([switch]$Yes, [string]$Message = "")

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [Text.Encoding]::UTF8

# ───── ตั้งค่า ─────
$src      = $PSScriptRoot
$dstRepo  = "D:\++ทำเว็บแอป\bkkschoolWeb"           # โปรเจ็กต์เว็บโรงเรียน (ผูกกับ Vercel)
$dstSub   = "public\krtom-classroom"                  # โฟลเดอร์ย่อยที่เก็บเว็บ CAI
$siteUrl  = "https://www.bankhodonkhan.ac.th/krtom-classroom/"
$exclDirs = @("dltv", ".git", ".claude", "node_modules")              # ไม่ส่งขึ้นเว็บ (PDF ลิขสิทธิ์ DLTV ฯลฯ)
$exclFiles = @("*-old.mp3", "เฉลยปรนัย*", "student.xlsx", "~`$*", "Thumbs.db", ".DS_Store", ".gitignore", "sync-deploy.ps1", "เผยแพร่ขึ้นเว็บ.bat", ".last-sync")
$forbidden = "(^|/)dltv/|เฉลยปรนัย|-old\.mp3$|\.docx$|\.pdf$"          # ถ้าเจอใน commit ให้หยุดทันที

function Say($t, $c = "White") { Write-Host $t -ForegroundColor $c }
function Pause2 { if (-not $Yes) { Read-Host "กด Enter เพื่อปิด" | Out-Null } }
function Fail($t) { Say "`n❌ $t" Red; Pause2; exit 1 }
function G($repo, [string[]]$a) {
  $old = $ErrorActionPreference; $ErrorActionPreference = "Continue"
  $o = & git.exe -C $repo @a 2>&1; $code = $LASTEXITCODE; $ErrorActionPreference = $old
  $lines = @($o | ForEach-Object { "$_" } | Where-Object { $_ -notmatch "^warning:" })
  if ($code -ne 0) { throw "git $($a -join ' ') ล้มเหลว:`n$($lines -join "`n")" }
  return $lines
}
try {
  Say "=== เผยแพร่เว็บ CAI ขึ้น $siteUrl ===" Cyan
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Fail "ไม่พบ git ในเครื่อง" }
  if (-not (Test-Path (Join-Path $dstRepo ".git"))) { Fail "ไม่พบโปรเจ็กต์เว็บโรงเรียนที่ $dstRepo (แก้ที่ตัวแปร `$dstRepo ในไฟล์นี้)" }
  $dst = Join-Path $dstRepo $dstSub

  # ───── ขั้น 1: เก็บงานของ CAI ลง git (repo krtom-classroom) ─────
  Say "`n[1/4] ตรวจงานใน krtom-classroom" Yellow
  $chg = @(G $src @("status", "--porcelain"))
  if ($chg.Count -gt 0) {
    Say "  มีไฟล์ที่เปลี่ยน $($chg.Count) รายการ"
    if (-not $Message) { $Message = if ($Yes) { "อัปเดตเว็บ CAI" } else { Read-Host "  ข้อความ commit (Enter = 'อัปเดตเว็บ CAI')" } }
    if (-not $Message) { $Message = "อัปเดตเว็บ CAI" }
    G $src @("add", "-A") | Out-Null
    G $src @("commit", "-q", "-m", $Message) | Out-Null
  } else { Say "  ไม่มีไฟล์ใหม่ให้ commit" }
  $ahead = (G $src @("rev-list", "--count", "@{u}..HEAD")).Trim()
  if ([int]$ahead -gt 0) { Say "  push ขึ้น GitHub (krtom-classroom)…"; G $src @("push", "origin", "HEAD") | Out-Null }
  $head = (G $src @("rev-parse", "--short", "HEAD")).Trim()

  # ───── ขั้น 2: เตรียมโปรเจ็กต์เว็บโรงเรียน ─────
  Say "`n[2/4] เตรียมโปรเจ็กต์เว็บโรงเรียน" Yellow
  if ((G $dstRepo @("branch", "--show-current")).Trim() -ne "main") { Fail "โปรเจ็กต์เว็บโรงเรียนไม่ได้อยู่บน branch main" }
  $other = @(G $dstRepo @("status", "--porcelain", "--", ".", ":!$($dstSub -replace '\\','/')")) | Where-Object { $_ }
  if ($other.Count -gt 0) { Say ($other | Select-Object -First 8 | Out-String) DarkYellow; Fail "โปรเจ็กต์เว็บโรงเรียนมีไฟล์อื่นที่ยังไม่ได้ commit ($($other.Count) รายการ) — จัดการก่อน เพื่อไม่ให้ปนกัน" }
  G $dstRepo @("pull", "--ff-only", "-q") | Out-Null

  # ───── ขั้น 3: คัดลอกไฟล์ ─────
  Say "`n[3/4] คัดลอกไฟล์เว็บ (ไม่รวม dltv/, เฉลยปรนัย, ไฟล์สำรอง)" Yellow
  $rc = @($src, $dst, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NP", "/R:1", "/W:1", "/XD") + $exclDirs + @("/XF") + $exclFiles
  & robocopy @rc | Out-Null
  if ($LASTEXITCODE -ge 8) { Fail "robocopy คัดลอกไม่สำเร็จ (รหัส $LASTEXITCODE)" }
  # ไฟล์ที่ถูกลบในต้นทางตั้งแต่ซิงก์ครั้งก่อน → ลบในปลายทางด้วย
  $lastFile = Join-Path $src ".last-sync"
  if (Test-Path $lastFile) {
    $last = (Get-Content $lastFile -Raw).Trim()
    $gone = @(G $src @("diff", "--diff-filter=D", "--name-only", "-z", "$last..HEAD") | ForEach-Object { $_ -split "`0" }) | Where-Object { $_ }
    foreach ($f in $gone) { $p = Join-Path $dst $f; if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Force; Say "  ลบ $f" DarkGray } }
  }

  # ───── ขั้น 4: ตรวจ + commit + push ให้ Vercel ─────
  Say "`n[4/4] ตรวจรายการที่จะเผยแพร่" Yellow
  G $dstRepo @("add", "-A", "--", $dstSub.Replace("\", "/")) | Out-Null
  $names = @(G $dstRepo @("diff", "--cached", "--name-only"))
  if ($names.Count -eq 0) { Say "`n✅ ไม่มีอะไรเปลี่ยนจากที่เผยแพร่ไว้แล้ว" Green; $head | Set-Content $lastFile; Pause2; exit 0 }
  $bad = @($names | Where-Object { $_ -match $forbidden })
  if ($bad.Count -gt 0) { G $dstRepo @("reset", "-q") | Out-Null; Say ($bad | Select-Object -First 10 | Out-String) Red; Fail "พบไฟล์ที่ห้ามเผยแพร่ใน commit ($($bad.Count) ไฟล์) — ยกเลิกแล้ว" }
  Say (G $dstRepo @("diff", "--cached", "--shortstat")) White
  $names | ForEach-Object { (($_ -replace "^public/krtom-classroom/", "") -split "/" | Select-Object -First 2) -join "/" } | Group-Object | Sort-Object Count -Descending | Select-Object -First 8 | ForEach-Object { Say ("   {0,4}  {1}" -f $_.Count, $_.Name) Gray }
  if (-not $Yes) {
    $ans = Read-Host "`nพิมพ์ Y แล้วกด Enter เพื่อเผยแพร่ขึ้นเว็บจริง (อย่างอื่น = ยกเลิก)"
    if ($ans -notmatch "^[Yy]") { G $dstRepo @("reset", "-q") | Out-Null; Say "ยกเลิกแล้ว (ไฟล์ที่คัดลอกยังอยู่ในโปรเจ็กต์เว็บโรงเรียน แต่ยังไม่ได้ commit)" Yellow; Pause2; exit 0 }
  }
  G $dstRepo @("commit", "-q", "-m", "krtom-classroom: sync จาก $head — $Message") | Out-Null
  G $dstRepo @("push", "origin", "main") | Out-Null
  $sha = (G $dstRepo @("rev-parse", "HEAD")).Trim()
  $head | Set-Content $lastFile
  Say "`n🚀 push แล้ว — รอ Vercel เผยแพร่…" Cyan
  if (Get-Command gh -ErrorAction SilentlyContinue) {
    for ($i = 0; $i -lt 14; $i++) {
      Start-Sleep 15
      $st = (& gh api "repos/PdosNdata/bkkschoolWeb/commits/$sha/status" --jq ".state" 2>$null)
      Say "   สถานะ: $st" Gray
      if ($st -eq "success") { Say "`n✅ เผยแพร่สำเร็จ: $siteUrl" Green; break }
      if ($st -in @("failure", "error")) { Fail "Vercel build ไม่ผ่าน — ดูที่ vercel.com" }
    }
  } else { Say "(ไม่มี gh — เปิด $siteUrl ตรวจเองหลังผ่านไป 1-2 นาที)" Gray }
  Pause2
} catch { Fail $_.Exception.Message }
