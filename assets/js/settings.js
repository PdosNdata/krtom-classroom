/* settings.js — เมนู "ตั้งค่า" ของครู: เปลี่ยนรหัสผ่าน · อัปโหลด/เปิดไฟล์เฉลยต้นฉบับแต่ละหน่วย
 * ต้องรัน supabase/20261103100000_krtom_settings.sql · ไฟล์เฉลยเก็บเป็นส่วน ๆ ในฐานข้อมูล อ่านได้เฉพาะครูที่ล็อกอิน (ไม่ผ่านที่เก็บไฟล์สาธารณะ)
 */
(function(){
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const token = () => { try{ return sessionStorage.getItem("krtomTeacherToken"); }catch(e){ return null; } };
  const rpc = (n, a) => KrtomFlow.rpc(n, Object.assign({ p_token: token() }, a || {}));
  const stuToken = () => { try{ return sessionStorage.getItem("krtomStudentToken"); }catch(e){ return null; } };
  const needSql = (e) => /PGRST202|Could not find the function/i.test((e && e.message) || "");
  const errMsg = (e) => needSql(e) ? "ยังไม่ได้ติดตั้งระบบนี้ในฐานข้อมูล (ต้องรันไฟล์ SQL 20261103100000_krtom_settings.sql ใน Supabase)" : (e && e.message) || "ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่";
  const fmtSize = (n) => n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
  const CH = 450000;
  // ---- หน้าตาหน้าต่างตั้งค่า (ขนาดตัวอักษรคงที่ ไม่ขึ้นกับขนาดตัวอักษรของหน้าเว็บ) ----
  const css = document.createElement("style");
  css.textContent = `
  .kst-pop{ font-family:"Sarabun","TH Sarabun New",system-ui,sans-serif !important; font-size:16px !important; width:min(92vw,460px) !important; border-radius:22px !important; padding:20px 18px 22px !important; }
  .kst-pop.kst-wide{ width:min(94vw,560px) !important; }
  .kst-pop .swal2-title{ font-size:1.4em !important; font-weight:800; padding:4px 8px 0 !important; color:#1E293B; }
  .kst-pop .swal2-html-container{ font-size:1em !important; margin:12px 0 0 !important; padding:0 !important; line-height:1.55; }
  .kst-pop .swal2-input, .kst-pop .swal2-select, .kst-pop .swal2-textarea{ font-size:1em !important; height:2.7em; box-sizing:border-box; border-radius:12px; }
  .kst-pop .swal2-textarea{ height:auto; }
  .kst-pop .swal2-styled{ font-size:1em !important; border-radius:999px !important; padding:.55em 1.4em !important; }
  .kst-pop .swal2-validation-message{ font-size:.9em; }
  .kst-menu{ display:grid; gap:10px; }
  .kst-row{ display:flex; align-items:center; gap:14px; width:100%; text-align:left; background:#fff; border:2px solid #E2E8F0; border-radius:18px; padding:12px 14px; cursor:pointer; font:inherit; color:#1E293B; transition:transform .12s, box-shadow .12s, border-color .12s; }
  .kst-row:hover{ transform:translateY(-2px); box-shadow:0 8px 18px rgba(15,23,42,.12); border-color:var(--c,#6366F1); }
  .kst-ic{ flex:none; width:48px; height:48px; border-radius:15px; display:flex; align-items:center; justify-content:center; font-size:1.6em; background:var(--c,#6366F1); box-shadow:0 4px 10px rgba(0,0,0,.18); }
  .kst-tx{ flex:1; min-width:0; }
  .kst-t{ font-weight:800; font-size:1.02em; line-height:1.3; }
  .kst-d{ font-size:.82em; color:#64748B; line-height:1.4; margin-top:2px; }
  .kst-go{ flex:none; color:#94A3B8; font-size:1.4em; font-weight:700; }
  .kst-note{ margin-top:12px; padding:10px 12px; border-radius:12px; background:#F1F5F9; color:#475569; font-size:.85em; line-height:1.5; text-align:left; }
  .kst-unit{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:14px 0 6px; font-weight:800; color:#1E293B; text-align:left; }
  .kst-unit small{ margin-left:auto; font-weight:600; color:#64748B; }
  .kst-unit button{ border:1px solid #CBD5E1; background:#fff; border-radius:999px; padding:2px 10px; font:inherit; font-size:.8em; cursor:pointer; color:#334155; }
  .kst-unit button:hover{ background:#EEF2FF; }
  .kst-ws{ display:flex; align-items:center; gap:10px; padding:7px 0; border-bottom:1px solid #F1F5F9; text-align:left; }
  .kst-ws .no{ flex:none; min-width:2.6em; font-weight:800; color:#6366F1; }
  .kst-ws .nm{ flex:1; min-width:0; font-size:.92em; line-height:1.35; }
  .kst-seg{ flex:none; display:inline-flex; border:2px solid #E2E8F0; border-radius:999px; overflow:hidden; }
  .kst-seg button{ border:none; background:#fff; padding:4px 11px; font:inherit; font-size:.82em; cursor:pointer; color:#64748B; font-weight:700; }
  .kst-seg button.on[data-a="auto"]{ background:#10B981; color:#fff; } .kst-seg button.on[data-a="manual"]{ background:#F59E0B; color:#fff; }
  .kst-lab{ display:block; font-weight:700; margin:10px 0 4px; text-align:left; }`;
  document.head.appendChild(css);
  const fire = (o, wide) => Swal.fire(Object.assign({ customClass:{ popup:"kst-pop" + (wide ? " kst-wide" : "") } }, o));
  const row = (id, c, ic, t, d) => `<button type="button" id="${id}" class="kst-row" style="--c:${c}"><span class="kst-ic">${ic}</span><span class="kst-tx"><div class="kst-t">${t}</div><div class="kst-d">${d}</div></span><span class="kst-go">›</span></button>`;                                   // ไบต์ต่อส่วน (base64 ≈ 600 KB)

  let files = null;                                    // รายการไฟล์เฉลย (ข้อมูลอย่างเดียว ไม่มีเนื้อไฟล์)
  async function loadKeyFiles(force){ if(files && !force) return files; files = (await rpc("krtom_teacher_keyfiles")) || []; return files; }
  const filesFor = (g, s, u) => (files || []).filter(f => f.grade_id === g && f.subject_id === s && f.unit_idx === u);

  function toB64(buf){ let s = ""; const a = new Uint8Array(buf), step = 0x8000; for(let i = 0; i < a.length; i += step) s += String.fromCharCode.apply(null, a.subarray(i, i + step)); return btoa(s); }
  async function uploadFile(file, g, s, u, onProg){
    const n = Math.ceil(file.size / CH);
    const id = await rpc("krtom_teacher_keyfile_begin", { p_grade:g, p_subject:s, p_unit:u, p_name:file.name, p_mime:file.type || "", p_size:file.size, p_chunks:n });
    for(let i = 0; i < n; i++){
      const buf = await file.slice(i * CH, (i + 1) * CH).arrayBuffer();
      await rpc("krtom_teacher_keyfile_put", { p_id:id, p_idx:i, p_data:toB64(buf) });
      if(onProg) onProg(i + 1, n);
    }
    await rpc("krtom_teacher_keyfile_commit", { p_id:id });
  }
  async function openKeyFile(id){
    const f = (files || []).find(x => x.id === id); if(!f) return;
    const w = /pdf|image|text/.test(f.mime || "") ? window.open("", "_blank") : null;      // เปิดแท็บไว้ก่อน กันเบราว์เซอร์บล็อกป๊อปอัป
    if(w) w.document.write("<p style='font-family:sans-serif'>กำลังโหลดไฟล์เฉลย...</p>");
    try{
      const parts = [];
      for(let i = 0; i < f.chunks; i++){ const b = atob(await rpc("krtom_teacher_keyfile_chunk", { p_id:id, p_idx:i })); const a = new Uint8Array(b.length); for(let j = 0; j < b.length; j++) a[j] = b.charCodeAt(j); parts.push(a); }
      const url = URL.createObjectURL(new Blob(parts, { type: f.mime || "application/octet-stream" }));
      if(w) w.location = url; else { const a = document.createElement("a"); a.href = url; a.download = f.file_name; document.body.appendChild(a); a.click(); a.remove(); }
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    }catch(e){ if(w) w.close(); fire({ icon:"error", title:"เปิดไฟล์ไม่สำเร็จ", text: errMsg(e) }); }
  }

  const WS_CAT = [
    { u:1, idx:0, label:"หน่วยที่ 1 การออกแบบและการเขียนอัลกอริทึม", names:["แนวคิดเชิงนามธรรม", "การเขียนอัลกอริทึม 3 รูปแบบ", "ออกแบบอัลกอริทึมในชีวิตประจำวัน", "บ้านฉันอยู่นี่ โรงเรียนอยู่ไหน", "ไร่ข้าวโพดจำลอง", "หุงข้าวให้สุกพอดี", "เลี้ยงปลากัด", "แยกย่อยปัญหา (ลากไปวาง)", "หาตัวเลข หารูปร่าง (ลากไปวาง)", "แนวคิดเชิงนามธรรมและอัลกอริทึมเบื้องต้น", "ภาษาธรรมชาติและภาษาคอมพิวเตอร์", "อัลกอริทึมด้วยรหัสลำลอง", "อัลกอริทึมด้วยผังงาน", "กิจกรรม ร้านน้ำผลไม้ปั่น", "แบบทดสอบท้ายหน่วย"] },
    { u:2, idx:1, label:"หน่วยที่ 2 การออกแบบและการเขียนโปรแกรมเบื้องต้น", names:["จับคู่ศัพท์ + เลือกตอบ", "ไข่ดาว", "อุณหภูมิ", "สวนสัตว์", "รางวัลพิเศษ", "สามเหลี่ยม", "แมวเหมียว", "ตัวแปร", "การเขียนโปรแกรมเบื้องต้น", "ภาษาและซอฟต์แวร์เขียนโปรแกรม (ลากไปวาง)", "เขียนโปรแกรมจากอัลกอริทึม", "กิจกรรม ตู้กดน้ำมหาสนุก", "แบบทดสอบท้ายหน่วย"] },
    { u:3, idx:2, label:"หน่วยที่ 3 การจัดการข้อมูลและสารสนเทศ", names:["ข้อมูลปฐมภูมิ ทุติยภูมิ และซอฟต์แวร์", "ข้อมูลและการเก็บรวบรวมข้อมูล", "สารสนเทศและความสำคัญ", "ส่วนประกอบของระบบสารสนเทศ (ลากไปวาง)", "ดัชนีมวลกายของเพื่อน", "ประมวลผลเชื่อมตรง/แบบกลุ่ม", "ซอฟต์แวร์และการเลือกใช้งาน", "กิจกรรม สารสนเทศสร้างได้ด้วยเรา", "แบบทดสอบท้ายหน่วย"] }
    ,{ g:"m3", u:31, disp:1, idx:0, label:"ม.3 หน่วยที่ 1 การจัดการข้อมูลและสารสนเทศ", names:["การรวบรวมข้อมูล", "จัดประเภทข้อมูลและวิธีรวบรวม (ลากไปวาง)", "การประมวลผลข้อมูล", "กรรมวิธีและวิธีประมวลผล (ลากไปวาง)", "การใช้ซอฟต์แวร์จัดการข้อมูลและสารสนเทศ", "กิจกรรม สำรวจ BMI", "แบบทดสอบท้ายหน่วย ตอนที่ 1", "แบบทดสอบท้ายหน่วย ตอนที่ 2"] }
    ,{ g:"m3", u:32, disp:2, idx:1, label:"ม.3 หน่วยที่ 2 ความน่าเชื่อถือของข้อมูล", names:["การสืบค้นเพื่อหาแหล่งข้อมูล", "โปรแกรมค้นหา เทคนิค และขั้นตอน (ลากไปวาง)", "เทคนิคการสืบค้น", "การประเมินความน่าเชื่อถือของข้อมูล", "วิเคราะห์ความน่าเชื่อถือและเหตุผลวิบัติ", "การรู้เท่าทันสื่อ", "รู้เท่าทันสื่อและระดับเนื้อหา (ลากไปวาง)", "กิจกรรม ความน่าเชื่อถือของข้อมูล", "แบบทดสอบท้ายหน่วย ตอนที่ 1", "แบบทดสอบท้ายหน่วย ตอนที่ 2"] }
    ,{ g:"p4", u:41, disp:1, idx:0, label:"ป.4 หน่วยที่ 1 ขั้นตอนวิธีการแก้ปัญหา", names:["เหตุผลเชิงตรรกะ", "ลำดับขั้นตอนและรูปแบบอัลกอริทึม (ลากไปวาง)", "อัลกอริทึมด้วยข้อความและรหัสลำลอง", "สัญลักษณ์และผังงาน (ลากไปวาง)", "กิจกรรม ของขวัญสำหรับเพื่อน", "แบบทดสอบท้ายหน่วย"] }
    ,{ g:"m2", u:21, disp:1, idx:0, label:"ม.2 หน่วยที่ 1 แก้ปัญหาด้วยแนวคิดเชิงคำนวณ", names:["องค์ประกอบของแนวคิดเชิงคำนวณ", "แยกย่อย หารูปแบบ นามธรรม อัลกอริทึม (ลากไปวาง)", "ประยุกต์ใช้แนวคิดเชิงคำนวณ", "แนวคิดเชิงคำนวณกับการแก้ปัญหา", "แบบทดสอบท้ายหน่วย", "ฝึกเพิ่ม 4 องค์ประกอบ (อย่างละ 2 ข้อ)", "แยกย่อย (1) ปัญหาใหญ่ → ปัญหาย่อย (ลากไปวาง)", "แยกย่อย (2) แบ่งกลุ่มด้วยตำแหน่งหลัก (ลากไปวาง)", "หารูปแบบ (1) ลำดับและกฎ (ลากไปวาง)", "หารูปแบบ (2) งานที่ใช้วิธีเดียวกัน (ลากไปวาง)", "นามธรรม (1) เรียงแถวตามความสูง (ลากไปวาง)", "นามธรรม (2) แผนที่และผังบอกทาง (ลากไปวาง)", "อัลกอริทึม (1) หาจำนวนมากที่สุด (ลากไปวาง)", "อัลกอริทึม (2) ขั้นตอนชีวิตประจำวัน (ลากไปวาง)", "รถสตาร์ทไม่ติด (กรณีศึกษา)", "รถสตาร์ทไม่ติด (ลากไปวาง)", "ผักนี้มีราคา (กรณีศึกษา)", "ผักนี้มีราคา (ลากไปวาง)", "ป.ปลาของฉัน (กรณีศึกษา)", "ป.ปลาของฉัน (ลากไปวาง)", "อีโมชันและเต้นหรรษา: ทำซ้ำ ×n (ลากไปวาง)", "เต้นหรรษา (กรณีศึกษา)"] }
    ,{ g:"p6", u:61, disp:1, idx:0, label:"ป.6 หน่วยที่ 1 การแก้ปัญหา", names:["ปริศนาที่มีคำตอบ", "ปริศนาไอศกรีม", "สบู่ผิดกล่อง", "เงื่อนไขอะไรดี", "น้อยหน่าอยากกินขนม", "ภารกิจของโป้ง", "ของขวัญที่แตกต่าง", "ใบกิจกรรม คำถามหลังทำกิจกรรม", "สัญลักษณ์ผังงานและเงื่อนไข (ลากไปวาง)"] }
  ];

  // ---------------------------------------------------------------- เปิดหน้า "ตั้งค่า" ในแท็บใหม่ (เมนูซ้าย + เนื้อหาขวา ในหน้าเดียวกัน)
  function open(){
    try{ window.open("settings.html", "_blank"); }catch(e){ location.href = "settings.html"; }
  }

  window.KrtomSettings = { open, loadKeyFiles, filesFor, openKeyFile, errMsg, H:{ esc, token, stuToken, rpc, needSql, fmtSize, uploadFile, WS_CAT, fire, loadKeyFiles, openKeyFile } };
})();
