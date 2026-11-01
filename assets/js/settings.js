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

  // ---------------------------------------------------------------- ตั้งค่า
  function open(){
    const teacher = typeof KrtomContent !== "undefined" && KrtomContent.isTeacher();
    if(!teacher){
      if(!stuToken()) return fire({ icon:"info", title:"ตั้งค่า", text:"กรุณาเข้าสู่ระบบด้วยเลขประจำตัวก่อน", confirmButtonText:"ตกลง", confirmButtonColor:"#3B82F6" });
      return fire({
        title:"⚙️ ตั้งค่า", showConfirmButton:false, showCloseButton:true,
        html:`<div class="kst-menu">${row("st-pw", "#6366F1", "🔑", "เปลี่ยนรหัสผ่านของฉัน", "ตั้งรหัสผ่านใหม่แทนเลขประจำตัว")}</div>
          <div class="kst-note">💡 รหัสผ่านเริ่มต้นคือเลขประจำตัวนักเรียน ถ้าลืมรหัสที่เปลี่ยนไว้ ให้แจ้งครูรีเซ็ตกลับเป็นเลขประจำตัว</div>`,
        didOpen: () => { document.getElementById("st-pw").onclick = () => { Swal.close(); changePassword("student"); }; }
      });
    }
    fire({
      title:"⚙️ ตั้งค่า", showConfirmButton:false, showCloseButton:true,
      html:`<div class="kst-menu">
        ${row("st-pw", "#6366F1", "🔑", "เปลี่ยนรหัสผ่าน", "เปลี่ยนรหัสผ่านเข้าสู่ระบบของครู")}
        ${row("st-reset", "#F59E0B", "🔄", "รีเซ็ตรหัสผ่านนักเรียน", "กลับเป็นเลขประจำตัว กรณีนักเรียนลืมรหัส")}
        ${row("st-keys", "#10B981", "📎", "เฉลยแต่ละหน่วย", "อัปโหลดและเปิดดูไฟล์เฉลยต้นฉบับ")}</div>`,
      didOpen: () => { document.getElementById("st-pw").onclick = () => { Swal.close(); changePassword("teacher"); }; document.getElementById("st-reset").onclick = () => { Swal.close(); resetStudents(); }; document.getElementById("st-keys").onclick = () => { Swal.close(); keyFilesDialog(); }; }
    });
  }

  async function changePassword(kind){
    const stu = kind === "student", MIN = stu ? 6 : 8;
    const r = await fire({
      title:"🔑 เปลี่ยนรหัสผ่าน",  showCancelButton:true, confirmButtonText:"บันทึก", cancelButtonText:"ยกเลิก", confirmButtonColor:"#6366F1",
      html:`<div style="text-align:left;font-size:.95em">
        <label class="kst-lab">รหัสผ่านเดิม</label><input id="pw0" type="password" autocomplete="current-password" class="swal2-input" style="margin:0 0 4px;width:100%">
        <label class="kst-lab">รหัสผ่านใหม่ (อย่างน้อย ${MIN} ตัวอักษร)</label><input id="pw1" type="password" autocomplete="new-password" class="swal2-input" style="margin:0 0 4px;width:100%">
        <label class="kst-lab">ยืนยันรหัสผ่านใหม่</label><input id="pw2" type="password" autocomplete="new-password" class="swal2-input" style="margin:0 0 4px;width:100%">
        <div style="color:#64748B;font-size:.85em">เปลี่ยนแล้วเครื่องอื่นที่ล็อกอินค้างอยู่จะถูกออกจากระบบ${stu ? " · ถ้าลืมรหัสใหม่ ให้แจ้งครูรีเซ็ตกลับเป็นเลขประจำตัว" : ""}</div></div>`,
      preConfirm: () => {
        const a = document.getElementById("pw0").value, b = document.getElementById("pw1").value, c = document.getElementById("pw2").value;
        if(!a){ Swal.showValidationMessage("กรอกรหัสผ่านเดิม"); return false; }
        if(b.length < MIN){ Swal.showValidationMessage("รหัสผ่านใหม่ต้องยาวอย่างน้อย " + MIN + " ตัวอักษร"); return false; }
        if(b !== c){ Swal.showValidationMessage("รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน"); return false; }
        if(b === a){ Swal.showValidationMessage("รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม"); return false; }
        return { a, b };
      }
    });
    if(!r.isConfirmed) return;
    try{
      if(stu) await KrtomFlow.rpc("krtom_student_change_password", { p_token: stuToken(), p_old:r.value.a, p_new:r.value.b });
      else await rpc("krtom_teacher_change_password", { p_old:r.value.a, p_new:r.value.b });
      fire({ icon:"success", title:"เปลี่ยนรหัสผ่านแล้ว", text:"ครั้งต่อไปให้เข้าสู่ระบบด้วยรหัสผ่านใหม่", confirmButtonColor:"#3B82F6" });
    }catch(e){ fire({ icon:"error", title:"เปลี่ยนรหัสผ่านไม่สำเร็จ", text: /รหัสครูหรือรหัสผ่านไม่ถูกต้อง|รหัสผ่านเดิมไม่ถูกต้อง/.test((e && e.message) || "") ? "รหัสผ่านเดิมไม่ถูกต้อง" : /หมดเวลาเข้าสู่ระบบ/.test((e && e.message) || "") ? "หมดเวลาเข้าสู่ระบบ กรุณาออกจากระบบแล้วเข้าใหม่" : (stu && needSql(e)) ? "ระบบเปลี่ยนรหัสผ่านยังไม่เปิดใช้ (ครูต้องรันไฟล์ SQL 20261104100000_krtom_student_password.sql)" : errMsg(e), confirmButtonColor:"#3B82F6" }); }
  }

  // ครู: รีเซ็ตรหัสผ่านนักเรียนกลับเป็นเลขประจำตัว
  const nameOf = (r) => String(r.full_name || "").replace(/\s+/g, " ").trim();
  async function resetStudents(){
    let roster; const st = new Map();
    try{ roster = (await rpc("krtom_teacher_roster")) || []; }catch(e){ return fire({ icon:"error", title:"โหลดรายชื่อไม่สำเร็จ", text: errMsg(e) }); }
    try{ ((await rpc("krtom_teacher_pw_status")) || []).forEach(x => st.set(x.student_code, x)); }
    catch(e){ if(needSql(e)) return fire({ icon:"error", title:"ยังไม่เปิดใช้", text:"ต้องรันไฟล์ SQL 20261104100000_krtom_student_password.sql ใน Supabase ก่อน" }); }
    const grades = [...new Map(roster.map(r => [r.grade_id, r.grade_label])).entries()];
    let gid = grades.length ? grades[0][0] : "";
    const list = () => roster.filter(r => r.grade_id === gid).sort((a, b) => a.seat_no - b.seat_no);
    const opts = () => list().map(r => `<option value="${esc(r.student_code)}">${esc(r.seat_no + ". " + nameOf(r))}${st.get(r.student_code) && st.get(r.student_code).changed ? "  🔒 เปลี่ยนรหัสแล้ว" : ""}</option>`).join("");
    const r = await fire({
      title:"🔄 รีเซ็ตรหัสผ่านนักเรียน",  showCancelButton:true, confirmButtonText:"รีเซ็ตรหัสผ่าน", cancelButtonText:"ยกเลิก", confirmButtonColor:"#F59E0B",
      html:`<div style="text-align:left;font-size:.95em">
        <select id="rs-g" class="swal2-select" style="margin:0 0 8px;width:100%">${grades.map(([id, l]) => `<option value="${esc(id)}" ${id === gid ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>
        <select id="rs-s" class="swal2-select" style="margin:0 0 8px;width:100%">${opts()}</select>
        <div style="color:#64748B;font-size:.85em">รีเซ็ตแล้วรหัสผ่านของนักเรียนคนนั้นจะกลับเป็น <b>เลขประจำตัว</b> และนักเรียนจะถูกออกจากระบบทุกเครื่อง (🔒 = เคยเปลี่ยนรหัสผ่านไว้)</div></div>`,
      didOpen: () => { const g = document.getElementById("rs-g"); g.onchange = () => { gid = g.value; document.getElementById("rs-s").innerHTML = opts(); }; },
      preConfirm: () => { const v = document.getElementById("rs-s").value; if(!v){ Swal.showValidationMessage("เลือกนักเรียนก่อน"); return false; } return v; }
    });
    if(!r.isConfirmed) return;
    const stu = roster.find(x => x.student_code === r.value), nm = stu ? nameOf(stu) : r.value;
    const ok = (await fire({ icon:"warning", title:"ยืนยันรีเซ็ต?", html:"รีเซ็ตรหัสผ่านของ<br><b>" + esc(nm) + "</b><br>กลับเป็นเลขประจำตัว <b>" + esc(r.value) + "</b>", showCancelButton:true, confirmButtonText:"รีเซ็ตเลย", cancelButtonText:"ยกเลิก", confirmButtonColor:"#F59E0B", cancelButtonColor:"#9CA3AF" })).isConfirmed;
    if(!ok) return;
    try{
      await rpc("krtom_teacher_reset_student_password", { p_student_code: r.value });
      fire({ icon:"success", title:"รีเซ็ตแล้ว", html:"รหัสผ่านของ <b>" + esc(nm) + "</b> กลับเป็นเลขประจำตัว <b>" + esc(r.value) + "</b> แล้ว", confirmButtonColor:"#3B82F6" });
    }catch(e){ fire({ icon:"error", title:"รีเซ็ตไม่สำเร็จ", text: errMsg(e) }); }
  }

  async function keyFilesDialog(){
    try{ await loadKeyFiles(true); }catch(e){ return fire({ icon:"error", title:"โหลดรายการไม่สำเร็จ", text: errMsg(e) }); }
    const G = (typeof CURRICULUM !== "undefined" ? CURRICULUM : []).map(g => ({ id:g.id, label:g.grade, subjects:g.subjects.map(s => ({ id:s.id, name:s.name, units:s.units.map(u => u.name) })) }));
    let gi = Math.max(0, G.findIndex(g => g.id === "m1")), si = 0, ui = 0;
    const html = () => {
      const g = G[gi], s = g.subjects[si] || g.subjects[0], list = filesFor(g.id, s.id, ui);
      return `<div style="text-align:left;font-size:.95em">
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
          <select id="kf-g" class="swal2-select" style="margin:0;flex:1;min-width:90px">${G.map((x, i) => `<option value="${i}" ${i === gi ? "selected" : ""}>${esc(x.label)}</option>`).join("")}</select>
          <select id="kf-s" class="swal2-select" style="margin:0;flex:2;min-width:140px">${g.subjects.map((x, i) => `<option value="${i}" ${i === si ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></div>
        <select id="kf-u" class="swal2-select" style="margin:0 0 10px;width:100%">${s.units.map((x, i) => `<option value="${i}" ${i === ui ? "selected" : ""}>หน่วยที่ ${i + 1}: ${esc(x)}</option>`).join("")}</select>
        <div style="font-weight:800;margin-bottom:4px">ไฟล์เฉลยของหน่วยนี้ (${list.length})</div>
        <div style="max-height:170px;overflow:auto;margin-bottom:10px">${list.length ? list.map(f => `<div style="display:flex;align-items:center;gap:6px;border:1px solid #E2E8F0;border-radius:10px;padding:6px 8px;margin:4px 0"><span style="flex:1;word-break:break-all">📄 ${esc(f.file_name)} <small style="color:#64748B">· ${fmtSize(f.size_bytes)}</small></span><button type="button" data-open="${f.id}" class="swal2-styled" style="margin:0;padding:4px 10px;background:#3B82F6;font-size:.85em">เปิดดู</button><button type="button" data-del="${f.id}" class="swal2-styled" style="margin:0;padding:4px 10px;background:#EF4444;font-size:.85em">ลบ</button></div>`).join("") : `<div style="color:#94A3B8">ยังไม่มีไฟล์เฉลยของหน่วยนี้</div>`}</div>
        <div style="font-weight:800;margin-bottom:4px">อัปโหลดไฟล์เฉลยใหม่</div>
        <input type="file" id="kf-file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.txt" style="width:100%;margin-bottom:6px">
        <button type="button" id="kf-up" class="swal2-styled" style="margin:0;background:#10B981">⬆️ อัปโหลด</button> <span id="kf-st" style="font-size:.88em;color:#475569"></span>
        <div style="color:#64748B;font-size:.8em;margin-top:6px">ไฟล์ไม่เกิน 25 MB · เก็บเป็นส่วนตัว ครูที่ล็อกอินเท่านั้นเปิดดูได้ (นักเรียนเข้าไม่ได้) · ไฟล์เฉลยเปิดดูได้จากหน้าต่างตรวจงานที่ส่งด้วย</div></div>`;
    };
    const draw = () => {
      Swal.update({ html: html() }); bind();
    };
    const bind = () => {
      const $ = (id) => document.getElementById(id);
      $("kf-g").onchange = (e) => { gi = +e.target.value; si = 0; ui = 0; draw(); };
      $("kf-s").onchange = (e) => { si = +e.target.value; ui = 0; draw(); };
      $("kf-u").onchange = (e) => { ui = +e.target.value; draw(); };
      document.querySelectorAll("[data-open]").forEach(b => b.onclick = () => openKeyFile(b.dataset.open));
      document.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
        const f = files.find(x => x.id === b.dataset.del); if(!f) return;
        const ok = (await fire({ icon:"warning", title:"ลบไฟล์เฉลยนี้?", text:f.file_name, showCancelButton:true, confirmButtonText:"ลบเลย", cancelButtonText:"ยกเลิก", confirmButtonColor:"#EF4444", cancelButtonColor:"#9CA3AF" })).isConfirmed;
        if(!ok) { keyFilesDialog(); return; }
        try{ await rpc("krtom_teacher_keyfile_delete", { p_id:f.id }); }catch(e){ fire({ icon:"error", title:"ลบไม่สำเร็จ", text: errMsg(e) }); return; }
        keyFilesDialog();
      });
      $("kf-up").onclick = async () => {
        const f = $("kf-file").files[0], st = $("kf-st"); if(!f){ st.style.color = "#DC2626"; st.textContent = "เลือกไฟล์ก่อน"; return; }
        if(f.size > 26214400){ st.style.color = "#DC2626"; st.textContent = "ไฟล์ใหญ่เกิน 25 MB"; return; }
        $("kf-up").disabled = true; st.style.color = "#475569"; st.textContent = "กำลังอัปโหลด...";
        try{ const g = G[gi], s = g.subjects[si]; await uploadFile(f, g.id, s.id, ui, (i, n) => { st.textContent = "กำลังอัปโหลด " + i + "/" + n + " ส่วน..."; }); await loadKeyFiles(true); draw(); }
        catch(e){ $("kf-up").disabled = false; st.style.color = "#DC2626"; st.textContent = "อัปโหลดไม่สำเร็จ: " + errMsg(e); }
      };
    };
    fire({ title:"📎 ไฟล์เฉลยแต่ละหน่วย", html: html(), showConfirmButton:false, showCloseButton:true, didOpen: bind }, true);
  }

  window.KrtomSettings = { open, loadKeyFiles, filesFor, openKeyFile, errMsg };
})();
