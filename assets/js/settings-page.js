/* settings-page.js — หน้า "ตั้งค่า" (settings.html): เมนูซ้าย + เนื้อหาขวาในหน้าเดียวกัน
 * ครู: เปลี่ยนรหัสผ่าน · รีเซ็ตรหัสผ่านนักเรียน · การตรวจใบงาน · เฉลยแต่ละหน่วย   นักเรียน: เปลี่ยนรหัสผ่านของตัวเอง
 * ต้องรัน SQL: 20261103100000_krtom_settings · 20261104100000_krtom_student_password · 20261105100000_krtom_ws_modes
 */
(function(){
  const H = KrtomSettings.H, esc = H.esc, rpc = H.rpc, needSql = H.needSql, fmtSize = H.fmtSize, $ = (s, r) => (r || document).querySelector(s);
  const role = (() => { try{ return sessionStorage.getItem("loggedInRole"); }catch(e){ return null; } })();
  const teacher = role === "teacher" && !!H.token(), student = role === "student" && !!H.stuToken();
  const nm = (() => { try{ return sessionStorage.getItem("loggedInUserName") || ""; }catch(e){ return ""; } })();
  $("#who").innerHTML = nm ? '<span data-k-avatar>👤</span> ' + esc(nm) + (teacher ? " (ครู)" : "") : ""; if(window.KrtomAvatar) KrtomAvatar.paint();
  const panel = $("#panel"), nav = $("#nav");
  const AV = ["avatar", "#EC4899", "🧑‍🎨", "ภาพโปรไฟล์", "เลือกการ์ตูนผู้ชาย ผู้หญิง หรือเด็ก"];
  const NAV0 = teacher
    ? [["pw", "#6366F1", "🔑", "เปลี่ยนรหัสผ่าน", "เปลี่ยนรหัสผ่านเข้าสู่ระบบของครู"], ["reset", "#F59E0B", "🔄", "รีเซ็ตรหัสผ่านนักเรียน", "กลับเป็นเลขประจำตัว กรณีนักเรียนลืมรหัส"], ["modes", "#EC4899", "📝", "การตรวจใบงาน", "เลือกว่าใบงานไหนให้ระบบตรวจ หรือครูตรวจเอง"], ["keys", "#10B981", "📎", "เฉลยแต่ละหน่วย", "อัปโหลดและเปิดดูไฟล์เฉลยต้นฉบับ"]]
    : [["pw", "#6366F1", "🔑", "เปลี่ยนรหัสผ่านของฉัน", "ตั้งรหัสผ่านใหม่แทนเลขประจำตัว"]];
  const NAV = [AV].concat(NAV0);
  const msg = (el, kind, text) => { el.className = "msg " + kind; el.textContent = text; };
  const errText = (e) => /รหัสครูหรือรหัสผ่านไม่ถูกต้อง|รหัสผ่านเดิมไม่ถูกต้อง/.test((e && e.message) || "") ? "รหัสผ่านเดิมไม่ถูกต้อง"
    : /หมดเวลาเข้าสู่ระบบ/.test((e && e.message) || "") ? "หมดเวลาเข้าสู่ระบบ กรุณากลับหน้าแรกแล้วเข้าสู่ระบบใหม่" : KrtomSettings.errMsg(e);
  const sqlHint = (f) => "ยังไม่ได้ติดตั้งระบบนี้ (ต้องรันไฟล์ SQL " + f + " ใน Supabase)";

  if(!teacher && !student){
    nav.style.display = "none"; document.querySelector(".wrap").style.gridTemplateColumns = "1fr";
    panel.innerHTML = '<h2>กรุณาเข้าสู่ระบบก่อน</h2><p class="lead">หน้านี้ใช้ได้เมื่อเข้าสู่ระบบแล้ว</p><a class="btn" style="text-decoration:none;display:inline-block" href="index.html">ไปหน้าเข้าสู่ระบบ</a>';
    return;
  }
  nav.innerHTML = NAV.map(([id, c, ic, t, d]) => `<button type="button" class="it" data-id="${id}" style="--c:${c}"><span class="ic">${ic}</span><span><b>${t}</b><small>${d}</small></span></button>`).join("");
  nav.querySelectorAll(".it").forEach(b => b.onclick = () => { location.hash = "#" + b.dataset.id; });

  // ---------------------------------------------------------------- เปลี่ยนรหัสผ่าน
  function pwPanel(){
    const MIN = teacher ? 8 : 6;
    panel.innerHTML = `<h2>🔑 เปลี่ยนรหัสผ่าน</h2><p class="lead">${teacher ? "เปลี่ยนรหัสผ่านเข้าสู่ระบบของครู" : "รหัสผ่านเริ่มต้นคือเลขประจำตัวนักเรียน คุณตั้งรหัสใหม่ได้ ถ้าลืมให้แจ้งครูรีเซ็ตกลับเป็นเลขประจำตัว"}</p>
      <form id="pwf" autocomplete="off">
        <label class="f">รหัสผ่านเดิม</label><input id="pw0" type="password" autocomplete="current-password">
        <label class="f">รหัสผ่านใหม่ (อย่างน้อย ${MIN} ตัวอักษร)</label><input id="pw1" type="password" autocomplete="new-password">
        <label class="f">ยืนยันรหัสผ่านใหม่</label><input id="pw2" type="password" autocomplete="new-password">
        <div class="msg" id="pwm"></div>
        <p style="margin:16px 0 0"><button class="btn" type="submit">บันทึกรหัสผ่านใหม่</button></p></form>
      <div class="note">เปลี่ยนแล้วเครื่องอื่นที่ล็อกอินค้างอยู่จะถูกออกจากระบบ (เครื่องนี้ยังใช้งานต่อได้)</div>`;
    $("#pwf").onsubmit = async (e) => {
      e.preventDefault(); const a = $("#pw0").value, b = $("#pw1").value, c = $("#pw2").value, m = $("#pwm");
      if(!a) return msg(m, "err", "กรอกรหัสผ่านเดิม");
      if(b.length < MIN) return msg(m, "err", "รหัสผ่านใหม่ต้องยาวอย่างน้อย " + MIN + " ตัวอักษร");
      if(b !== c) return msg(m, "err", "รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน");
      if(b === a) return msg(m, "err", "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม");
      const btn = $("#pwf .btn"); btn.disabled = true; msg(m, "", "");
      try{
        if(teacher) await rpc("krtom_teacher_change_password", { p_old:a, p_new:b });
        else await KrtomFlow.rpc("krtom_student_change_password", { p_token: H.stuToken(), p_old:a, p_new:b });
        $("#pw0").value = $("#pw1").value = $("#pw2").value = ""; msg(m, "ok", "✅ เปลี่ยนรหัสผ่านแล้ว ครั้งต่อไปให้เข้าสู่ระบบด้วยรหัสผ่านใหม่");
      }catch(err){ msg(m, "err", (!teacher && needSql(err)) ? sqlHint("20261104100000_krtom_student_password.sql") : errText(err)); }
      btn.disabled = false;
    };
  }

  // ---------------------------------------------------------------- รีเซ็ตรหัสผ่านนักเรียน (ครู)
  async function resetPanel(){
    panel.innerHTML = '<h2>🔄 รีเซ็ตรหัสผ่านนักเรียน</h2><p class="lead">กำลังโหลดรายชื่อ...</p>';
    let roster; const st = new Map();
    try{ roster = (await rpc("krtom_teacher_roster")) || []; }catch(e){ return panel.innerHTML = '<h2>🔄 รีเซ็ตรหัสผ่านนักเรียน</h2><div class="msg err">โหลดรายชื่อไม่สำเร็จ: ' + esc(errText(e)) + "</div>"; }
    try{ ((await rpc("krtom_teacher_pw_status")) || []).forEach(x => st.set(x.student_code, x)); }
    catch(e){ if(needSql(e)) return panel.innerHTML = '<h2>🔄 รีเซ็ตรหัสผ่านนักเรียน</h2><div class="msg err">' + sqlHint("20261104100000_krtom_student_password.sql") + "</div>"; }
    const grades = [...new Map(roster.map(r => [r.grade_id, r.grade_label])).entries()];
    let gid = grades.length ? grades[0][0] : "";
    const nameOf = (r) => String(r.full_name || "").replace(/\s+/g, " ").trim();
    const list = () => roster.filter(r => r.grade_id === gid).sort((a, b) => a.seat_no - b.seat_no);
    const opts = () => list().map(r => `<option value="${esc(r.student_code)}">${esc(r.seat_no + ". " + nameOf(r))}${st.get(r.student_code) && st.get(r.student_code).changed ? "  🔒 เปลี่ยนรหัสแล้ว" : ""}</option>`).join("");
    panel.innerHTML = `<h2>🔄 รีเซ็ตรหัสผ่านนักเรียน</h2><p class="lead">รีเซ็ตแล้วรหัสผ่านของนักเรียนคนนั้นจะกลับเป็น <b>เลขประจำตัว</b> และนักเรียนจะถูกออกจากระบบทุกเครื่อง (🔒 = เคยเปลี่ยนรหัสผ่านไว้)</p>
      <label class="f">ชั้น</label><select id="rs-g">${grades.map(([id, l]) => `<option value="${esc(id)}">${esc(l)}</option>`).join("")}</select>
      <label class="f">นักเรียน</label><select id="rs-s">${opts()}</select>
      <div class="msg" id="rsm"></div>
      <p style="margin:16px 0 0"><button class="btn amber" id="rs-go" type="button">รีเซ็ตรหัสผ่านเป็นเลขประจำตัว</button></p>`;
    $("#rs-g").onchange = (e) => { gid = e.target.value; $("#rs-s").innerHTML = opts(); };
    $("#rs-go").onclick = async () => {
      const code = $("#rs-s").value, m = $("#rsm"); if(!code) return msg(m, "err", "เลือกนักเรียนก่อน");
      const s = roster.find(x => x.student_code === code), name = s ? nameOf(s) : code;
      const ok = (await Swal.fire({ icon:"warning", title:"ยืนยันรีเซ็ต?", html:"รีเซ็ตรหัสผ่านของ<br><b>" + esc(name) + "</b><br>กลับเป็นเลขประจำตัว <b>" + esc(code) + "</b>", showCancelButton:true, confirmButtonText:"รีเซ็ตเลย", cancelButtonText:"ยกเลิก", confirmButtonColor:"#F59E0B", cancelButtonColor:"#9CA3AF" })).isConfirmed;
      if(!ok) return;
      try{ await rpc("krtom_teacher_reset_student_password", { p_student_code: code }); st.set(code, { student_code:code, changed:false }); $("#rs-s").innerHTML = opts(); $("#rs-s").value = code; msg(m, "ok", "✅ รีเซ็ตแล้ว: รหัสผ่านของ " + name + " กลับเป็นเลขประจำตัว " + code); }
      catch(e){ msg(m, "err", "รีเซ็ตไม่สำเร็จ: " + errText(e)); }
    };
  }

  // ---------------------------------------------------------------- การตรวจใบงาน: ระบบตรวจ / ครูตรวจเอง
  async function modesPanel(){
    panel.innerHTML = '<h2>📝 การตรวจใบงาน</h2><p class="lead">กำลังโหลด...</p>';
    let manual;
    try{ manual = new Set(((await KrtomFlow.rpc("krtom_ws_modes", {})) || []).filter(x => x.mode === "manual").map(x => x.activity)); }
    catch(e){ return panel.innerHTML = '<h2>📝 การตรวจใบงาน</h2><div class="msg err">' + (needSql(e) ? sqlHint("20261105100000_krtom_ws_modes.sql") : esc(errText(e))) + "</div>"; }
    const act = (u, i) => "worksheet-" + u + "-" + (i + 1);
    const G = (typeof CURRICULUM !== "undefined" ? CURRICULUM : []).map(g => ({ id:g.id, label:g.grade, subjects:g.subjects.map(s => ({ id:s.id, name:s.name, units:s.units.map(u => u.name) })) }));
    const catFor = (g, sub, ui) => sub === "cs" ? H.WS_CAT.find(x => (x.g || "m1") === g && x.idx === ui) : null;   // ตอนนี้มีใบงานรายใบที่ตั้งโหมดได้เฉพาะ ม.1 วิทยาการคำนวณ หน่วย 1–2
    let gi = Math.max(0, G.findIndex(g => g.id === "m1")), si = 0, ui = 0;
    const html = () => {
      const g = G[gi], s = g.subjects[si] || g.subjects[0], cat = catFor(g.id, s.id, ui);
      return `<h2>📝 การตรวจใบงาน</h2><p class="lead">🟢 <b>ระบบตรวจ</b> = ระบบให้คะแนนและบอกถูก/ผิดรายข้อให้ครู · 🟠 <b>ครูตรวจเอง</b> = ระบบไม่ให้คะแนน นักเรียนส่งแล้วขึ้น “รอตรวจ” ครูเปิดดูแล้วให้คะแนนเองในเมนูดูงานนักเรียน (บันทึกทันทีที่กดปุ่ม)</p>
        <div class="row2"><select id="md-g">${G.map((x, i) => `<option value="${i}" ${i === gi ? "selected" : ""}>${esc(x.label)}</option>`).join("")}</select>
          <select id="md-s">${g.subjects.map((x, i) => `<option value="${i}" ${i === si ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></div>
        <select id="md-u" style="max-width:none;margin-bottom:6px">${s.units.map((x, i) => `<option value="${i}" ${i === ui ? "selected" : ""}>หน่วยที่ ${i + 1}: ${esc(x)}</option>`).join("")}</select>
        <div class="msg" id="mdm"></div>
        ${cat ? `<div class="unit">ใบงานของหน่วยนี้ (${cat.names.length} ใบ)<small>ตั้งทั้งหน่วย:</small><button type="button" data-all="auto">ระบบตรวจ</button><button type="button" data-all="manual">ครูตรวจเอง</button></div>
          ${cat.names.map((n, i) => { const m = manual.has(act(cat.u, i)); return `<div class="ws"><span class="no">${cat.disp || cat.u}.${i + 1}</span><span class="nm">${esc(n)}</span><span class="seg" data-ws="${act(cat.u, i)}"><button type="button" data-a="auto" class="${m ? "" : "on"}">ระบบตรวจ</button><button type="button" data-a="manual" class="${m ? "on" : ""}">ครูตรวจเอง</button></span></div>`; }).join("")}`
        : `<div class="note">หน่วยนี้ยังไม่มีใบงานรายใบที่ตั้งการตรวจได้ (ตอนนี้ใช้ได้กับ ม.1 วิทยาการคำนวณ หน่วยที่ 1–3 ม.3 วิทยาการคำนวณ หน่วยที่ 1–2 ป.4 และ ม.2 วิทยาการคำนวณ หน่วยที่ 1) เมื่อเพิ่มใบงานรายใบของหน่วยอื่น จะมาปรากฏที่นี่</div>`}`;
    };
    const set = async (ids, mode) => {
      try{
        for(const id of ids){ if((mode === "manual") === manual.has(id)) continue; await rpc("krtom_teacher_set_ws_mode", { p_activity:id, p_mode:mode }); if(mode === "manual") manual.add(id); else manual.delete(id); }
        try{ sessionStorage.removeItem("krtomWsModes"); }catch(e){}
        return true;
      }catch(e){ msg($("#mdm"), "err", "บันทึกไม่สำเร็จ: " + (needSql(e) ? sqlHint("20261105100000_krtom_ws_modes.sql") : errText(e))); return false; }
    };
    const draw = () => { panel.innerHTML = html(); bind(); };
    const bind = () => {
      $("#md-g").onchange = (e) => { gi = +e.target.value; si = 0; ui = 0; draw(); };
      $("#md-s").onchange = (e) => { si = +e.target.value; ui = 0; draw(); };
      $("#md-u").onchange = (e) => { ui = +e.target.value; draw(); };
      panel.querySelectorAll(".seg button").forEach(b => b.onclick = async () => { const seg = b.parentElement; if(await set([seg.dataset.ws], b.dataset.a)) seg.querySelectorAll("button").forEach(x => x.classList.toggle("on", x.dataset.a === (manual.has(seg.dataset.ws) ? "manual" : "auto"))); });
      panel.querySelectorAll("[data-all]").forEach(b => b.onclick = async () => { const g = G[gi], s = g.subjects[si] || g.subjects[0], cat = catFor(g.id, s.id, ui); if(cat && await set(cat.names.map((_, i) => act(cat.u, i)), b.dataset.all)) draw(); });
    };
    draw();
  }

  // ---------------------------------------------------------------- เฉลยแต่ละหน่วย (ไฟล์ต้นฉบับ)
  async function keysPanel(){
    panel.innerHTML = '<h2>📎 เฉลยแต่ละหน่วย</h2><p class="lead">กำลังโหลด...</p>';
    let files;
    try{ files = await H.loadKeyFiles(true); }catch(e){ return panel.innerHTML = '<h2>📎 เฉลยแต่ละหน่วย</h2><div class="msg err">โหลดรายการไม่สำเร็จ: ' + esc(KrtomSettings.errMsg(e)) + "</div>"; }
    const G = (typeof CURRICULUM !== "undefined" ? CURRICULUM : []).map(g => ({ id:g.id, label:g.grade, subjects:g.subjects.map(s => ({ id:s.id, name:s.name, units:s.units.map(u => u.name) })) }));
    let gi = Math.max(0, G.findIndex(g => g.id === "m1")), si = 0, ui = 0;
    const draw = (note) => {
      const g = G[gi], s = g.subjects[si] || g.subjects[0], list = files.filter(f => f.grade_id === g.id && f.subject_id === s.id && f.unit_idx === ui);
      panel.innerHTML = `<h2>📎 เฉลยแต่ละหน่วย</h2><p class="lead">อัปโหลดไฟล์เฉลยต้นฉบับ (PDF, Word, Excel, PowerPoint, รูปภาพ ไม่เกิน 25 MB) เก็บเป็นส่วนตัว เฉพาะครูที่ล็อกอินเปิดดูได้ นักเรียนเข้าไม่ได้ · เปิดดูได้จากหน้าต่างตรวจงานที่ส่งด้วย</p>
        <div class="row2"><select id="kf-g">${G.map((x, i) => `<option value="${i}" ${i === gi ? "selected" : ""}>${esc(x.label)}</option>`).join("")}</select>
          <select id="kf-s">${g.subjects.map((x, i) => `<option value="${i}" ${i === si ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></div>
        <select id="kf-u" style="max-width:none;margin-bottom:14px">${s.units.map((x, i) => `<option value="${i}" ${i === ui ? "selected" : ""}>หน่วยที่ ${i + 1}: ${esc(x)}</option>`).join("")}</select>
        <h3 style="margin:8px 0 6px">ไฟล์เฉลยของหน่วยนี้ (${list.length})</h3>
        ${list.length ? list.map(f => `<div class="file"><span>📄 ${esc(f.file_name)} <small style="color:var(--mut)">· ${fmtSize(f.size_bytes)}</small></span><button class="btn sm" type="button" data-open="${f.id}">เปิดดู</button><button class="btn sm red" type="button" data-del="${f.id}">ลบ</button></div>`).join("") : '<p style="color:#94A3B8;margin:6px 0">ยังไม่มีไฟล์เฉลยของหน่วยนี้</p>'}
        <h3 style="margin:18px 0 6px">อัปโหลดไฟล์เฉลยใหม่</h3>
        <input type="file" id="kf-file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.txt" style="max-width:420px">
        <p style="margin:10px 0 0"><button class="btn green" id="kf-up" type="button">⬆️ อัปโหลด</button></p><div class="msg ${note ? note[0] : ""}" id="kf-m">${note ? esc(note[1]) : ""}</div>`;
      $("#kf-g").onchange = (e) => { gi = +e.target.value; si = 0; ui = 0; draw(); };
      $("#kf-s").onchange = (e) => { si = +e.target.value; ui = 0; draw(); };
      $("#kf-u").onchange = (e) => { ui = +e.target.value; draw(); };
      panel.querySelectorAll("[data-open]").forEach(b => b.onclick = () => H.openKeyFile(b.dataset.open));
      panel.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
        const f = files.find(x => x.id === b.dataset.del); if(!f) return;
        const ok = (await Swal.fire({ icon:"warning", title:"ลบไฟล์เฉลยนี้?", text:f.file_name, showCancelButton:true, confirmButtonText:"ลบเลย", cancelButtonText:"ยกเลิก", confirmButtonColor:"#EF4444", cancelButtonColor:"#9CA3AF" })).isConfirmed;
        if(!ok) return;
        try{ await rpc("krtom_teacher_keyfile_delete", { p_id:f.id }); files = await H.loadKeyFiles(true); draw(["ok", "ลบไฟล์แล้ว"]); }catch(e){ draw(["err", "ลบไม่สำเร็จ: " + KrtomSettings.errMsg(e)]); }
      });
      $("#kf-up").onclick = async () => {
        const f = $("#kf-file").files[0], m = $("#kf-m"); if(!f) return msg(m, "err", "เลือกไฟล์ก่อน");
        if(f.size > 26214400) return msg(m, "err", "ไฟล์ใหญ่เกิน 25 MB");
        $("#kf-up").disabled = true; msg(m, "ok", "กำลังอัปโหลด...");
        try{ await H.uploadFile(f, g.id, s.id, ui, (i, n) => { m.textContent = "กำลังอัปโหลด " + i + "/" + n + " ส่วน..."; }); files = await H.loadKeyFiles(true); draw(["ok", "✅ อัปโหลดแล้ว: " + f.name]); }
        catch(e){ $("#kf-up").disabled = false; msg(m, "err", "อัปโหลดไม่สำเร็จ: " + KrtomSettings.errMsg(e)); }
      };
    };
    draw();
  }

  // ---------------------------------------------------------------- ภาพโปรไฟล์ (avatar)
  function avatarPanel(){
    const A = window.KrtomAvatar; if(!A){ panel.innerHTML = '<h2>🧑‍🎨 ภาพโปรไฟล์</h2><p class="lead">โหลดไม่สำเร็จ ลองรีเฟรชหน้านี้</p>'; return; }
    let tab = (A.LIST.find(x => x.id === A.get()) || A.LIST[0]).g;
    const draw = () => {
      const cur = A.get(), ca = A.LIST.find(x => x.id === cur);
      panel.innerHTML = `<h2>🧑‍🎨 ภาพโปรไฟล์</h2><p class="lead">เลือกการ์ตูนที่ชอบเป็นภาพของคุณ จะแสดงที่มุมขวาบนของหน้าเว็บ</p>
        <div class="av-now">${ca ? A.svg(cur) : '<div class="ph">👤</div>'}<div><b>${ca ? esc(ca.name) : "ยังไม่ได้เลือกภาพ"}</b><br><button type="button" class="btn sm gray" id="av-clear"${ca ? "" : " disabled"}>ใช้ไอคอนเดิม</button></div></div>
        <div class="av-tabs">${A.GROUPS.map(([g, t, ic]) => `<button type="button" data-g="${g}" class="${g === tab ? "on" : ""}">${ic} ${t}</button>`).join("")}</div>
        <div class="av-grid">${A.LIST.filter(x => x.g === tab).map(x => `<button type="button" class="av-it ${x.id === cur ? "on" : ""}" data-id="${x.id}">${A.svg(x.id)}<b>${esc(x.name)}</b></button>`).join("")}</div>
        <div class="msg" id="avm"></div>
        <div class="note">💡 ภาพที่เลือกเก็บไว้ในเครื่องนี้ ถ้าเปลี่ยนเครื่องหรือเบราว์เซอร์ใหม่ ต้องเลือกอีกครั้ง</div>`;
      panel.querySelectorAll(".av-tabs button").forEach(b => b.onclick = () => { tab = b.dataset.g; draw(); });
      panel.querySelectorAll(".av-it").forEach(b => b.onclick = () => { A.set(b.dataset.id); draw(); msg($("#avm"), "ok", "เปลี่ยนภาพโปรไฟล์แล้ว"); });
      const c = $("#av-clear"); if(c) c.onclick = () => { A.set(""); draw(); msg($("#avm"), "ok", "กลับไปใช้ไอคอนเดิมแล้ว"); };
    };
    draw();
  }

  const VIEWS = { avatar: avatarPanel, pw: pwPanel, reset: resetPanel, modes: modesPanel, keys: keysPanel };
  function route(){
    let id = (location.hash || "").replace("#", ""); if(!NAV.some(n => n[0] === id)) id = NAV[0][0];
    nav.querySelectorAll(".it").forEach(b => b.classList.toggle("on", b.dataset.id === id));
    VIEWS[id]();
  }
  window.addEventListener("hashchange", route); route();
})();
