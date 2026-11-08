/* reports.js — เมนูครู "ดูงานนักเรียน": รายงานคะแนนรายชั้น / รายคน
 * คะแนน 3 ประเภท: แบบทดสอบก่อนเรียน / ใบงาน / แบบทดสอบหลังเรียน (ใช้คะแนนครั้งที่ดีที่สุด)
 * ส่งออก: พิมพ์ / Excel / PDF / แชร์   — ข้อมูลมาจาก Supabase ผ่านฟังก์ชันที่ตรวจโทเคนครู (ดู supabase/20261001120000_krtom_teacher_reports.sql)
 */
const KrtomReports = (function(){
  const TYPES = [
    { k:"pretest",   short:"ก่อนเรียน" },
    { k:"worksheet", short:"ใบงาน" },
    { k:"posttest",  short:"หลังเรียน" }
  ];
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const clean = (t) => String(t || "").replace(/\s+/g, " ").trim();
  const token = () => { try{ return sessionStorage.getItem("krtomTeacherToken"); }catch(e){ return null; } };

  let data = null;                       // { roster, agg }
  let st = { view:"class", grade:null, unit:null, student:null, ocFilter:"todo" };
  let keys = new Map();                  // เฉลย/แนวคำตอบ ดึงจากเซิร์ฟเวอร์ (นักเรียนอ่านไม่ได้)
  let wk = null;                         // งานที่ส่ง (krtom_teacher_work) โหลดเมื่อเปิดแท็บงานที่ส่ง
  let oc = null;                         // { mastery, refl } โหลดเมื่อเปิดแท็บจุดประสงค์/ตรวจคำตอบ
  let model = null;                      // ตารางที่แสดงอยู่ (ใช้ส่งออก)

  // ---------------------------------------------------------------- ข้อมูล
  async function load(force){
    if(data && !force) return data;
    const t = token();
    if(!t) throw new Error("หมดเวลาเข้าสู่ระบบ");
    const [roster, scores] = await Promise.all([
      KrtomFlow.rpc("krtom_teacher_roster", { p_token: t }),
      KrtomFlow.rpc("krtom_teacher_scores", { p_token: t })
    ]);
    const agg = new Map();
    (scores || []).forEach(r => {
      const k = `${r.student_code}|${r.grade_id}/${r.subject_id}/${r.unit_idx}|${r.score_type}`;
      const cur = agg.get(k);
      if(!cur){ agg.set(k, { score:r.score, total:r.total, attempts:1, last:r.created_at }); return; }
      cur.attempts++;
      if(r.score * cur.total > cur.score * r.total){ cur.score = r.score; cur.total = r.total; }   // เก็บครั้งที่ได้ % สูงสุด
      if(r.created_at > cur.last) cur.last = r.created_at;
    });
    data = { roster: (roster || []).map(r => ({ code:r.student_code, name:clean(r.full_name), g:r.grade_id, gl:r.grade_label, seat:r.seat_no })), agg };
    return data;
  }
  async function loadOc(force){
    if(oc && !force) return oc;
    const t = token();
    if(!t) throw new Error("หมดเวลาเข้าสู่ระบบ");
    const [mastery, refl] = await Promise.all([
      KrtomFlow.rpc("krtom_teacher_mastery", { p_token: t, p_mode: "all" }),
      KrtomFlow.rpc("krtom_teacher_reflections", { p_token: t })
    ]);
    oc = { mastery: mastery || [], refl: refl || [] };
    return oc;
  }
  const OC_COLS = [["objective","O1"],["objective","O2"],["objective","O3"],["competency","C1"],["competency","C2"],["competency","C3"],["competency","C4"],["competency","C5"],["rw","R1"],["rw","R2"],["rw","R3"],["rw","R4"],["rw","R5"]];
  const cell = (code, ukey, type) => data.agg.get(`${code}|${ukey}|${type}`) || null;
  const pct = (c) => c ? Math.round(c.score * 100 / c.total) : null;

  function grades(){
    const seen = new Map();
    data.roster.forEach(r => { if(!seen.has(r.g)) seen.set(r.g, r.gl); });
    return CURRICULUM.filter(g => seen.has(g.id)).map(g => ({ id:g.id, label:seen.get(g.id) }));
  }
  function flowUnits(gid){
    const g = CURRICULUM.find(x => x.id === gid), out = [];
    if(g) g.subjects.forEach(s => s.units.forEach((u, i) => {
      const rq = (typeof READY_CONTENT !== "undefined") && READY_CONTENT[`${g.id}/${s.id}/${i}`] && READY_CONTENT[`${g.id}/${s.id}/${i}`].quiz;
      if(isFlowUnit(g.id, s.id, i) || (rq && rq.scoreAs)) out.push({ key:`${g.id}/${s.id}/${i}`, short:`${s.name} หน่วยที่ ${i+1}`, label:`${s.name} หน่วยที่ ${i+1}: ${u.name}` });
    }));
    return out;
  }
  const fmt = (c) => c ? `${c.score}/${c.total}` : "—";
  const diff = (a, b) => (a && b) ? (pct(b) - pct(a)) : null;
  const fmtDiff = (d) => d == null ? "—" : (d > 0 ? `+${d}%` : `${d}%`);
  const avg = (arr) => { const v = arr.filter(x => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
  const dateTh = (iso) => { if(!iso) return "—"; const d = new Date(iso); return isNaN(d) ? "—" : d.toLocaleDateString("th-TH", { day:"numeric", month:"short", year:"2-digit" }); };

  // ---------------------------------------------------------------- สร้างตาราง (ใช้ทั้งแสดงผลและส่งออก)
  function buildClass(){
    const gl = (grades().find(g => g.id === st.grade) || {}).label || "";
    const unit = flowUnits(st.grade).find(u => u.key === st.unit);
    const stu = data.roster.filter(r => r.g === st.grade);
    const head = ["เลขที่", "ชื่อ-สกุล", "ก่อนเรียน", "ใบงาน", "หลังเรียน", "พัฒนาการ"];
    const xlHead = ["เลขที่", "เลขประจำตัว", "ชื่อ-สกุล", "ก่อนเรียน (คะแนน)", "ก่อนเรียน (เต็ม)", "ใบงาน (คะแนน)", "ใบงาน (เต็ม)", "หลังเรียน (คะแนน)", "หลังเรียน (เต็ม)", "พัฒนาการ (%)"];
    const cols = { pretest:[], worksheet:[], posttest:[] }, gains = [];
    const rows = [], xlRows = [];
    stu.forEach(s => {
      const c = {}; TYPES.forEach(t => { c[t.k] = unit ? cell(s.code, unit.key, t.k) : null; cols[t.k].push(pct(c[t.k])); });
      const d = diff(c.pretest, c.posttest); gains.push(d);
      rows.push([s.seat, s.name, fmt(c.pretest), fmt(c.worksheet), fmt(c.posttest), fmtDiff(d)]);
      xlRows.push([s.seat, s.code, s.name, c.pretest ? c.pretest.score : "", c.pretest ? c.pretest.total : "", c.worksheet ? c.worksheet.score : "", c.worksheet ? c.worksheet.total : "", c.posttest ? c.posttest.score : "", c.posttest ? c.posttest.total : "", d == null ? "" : d]);
    });
    const done = (k) => cols[k].filter(x => x != null).length;
    const av = (k) => { const a = avg(cols[k]); return a == null ? "—" : a + "%"; };
    const foot = [
      ["", "ส่งแล้ว (คน)", `${done("pretest")}/${stu.length}`, `${done("worksheet")}/${stu.length}`, `${done("posttest")}/${stu.length}`, ""],
      ["", "ค่าเฉลี่ย (%)", av("pretest"), av("worksheet"), av("posttest"), fmtDiff(avg(gains))]
    ];
    const xlFoot = [
      ["", "", "ส่งแล้ว (คน)", done("pretest"), "", done("worksheet"), "", done("posttest"), "", ""],
      ["", "", "ค่าเฉลี่ย (%)", avg(cols.pretest) ?? "", "", avg(cols.worksheet) ?? "", "", avg(cols.posttest) ?? "", "", avg(gains) ?? ""]
    ];
    return { kind:"class", title:`คะแนนรายชั้น ${gl}`, subtitle: unit ? unit.label : "", head, rows, foot, xlHead, xlRows, xlFoot, file:`คะแนน-${gl}-${unit ? unit.short : ""}` };
  }

  function buildOutcome(){
    const gl = (grades().find(g => g.id === st.grade) || {}).label || "";
    const unit = flowUnits(st.grade).find(u => u.key === st.unit);
    const stu = data.roster.filter(r => r.g === st.grade);
    const map = new Map();
    oc.mastery.forEach(m => { if(unit && `${m.grade_id}/${m.subject_id}/${m.unit_idx}` === unit.key) map.set(`${m.student_code}|${m.code}`, m); });
    const head = ["เลขที่", "ชื่อ-สกุล", ...OC_COLS.map(c => c[1])];
    const xlHead = ["เลขที่", "เลขประจำตัว", "ชื่อ-สกุล", ...OC_COLS.map(c => c[1] + " (%)")];
    const rows = [], xlRows = [], colVals = OC_COLS.map(() => []);
    stu.forEach(s => {
      const pc = OC_COLS.map((c, i) => { const m = map.get(`${s.code}|${c[1]}`); const v = m ? Math.round(m.ratio * 100) : null; colVals[i].push(v); return v; });
      rows.push([s.seat, s.name, ...pc.map(v => v == null ? "—" : v + "%")]);
      xlRows.push([s.seat, s.code, s.name, ...pc.map(v => v == null ? "" : v)]);
    });
    const av = colVals.map(a => avg(a));
    const foot = [["", "ค่าเฉลี่ย (%)", ...av.map(v => v == null ? "—" : v + "%")]];
    const xlFoot = [["", "", "ค่าเฉลี่ย (%)", ...av.map(v => v == null ? "" : v)]];
    return { kind:"class", title:`ผลจุดประสงค์ / สมรรถนะ / อ่านคิดเขียน ${gl}`, subtitle: unit ? unit.label : "", head, rows, foot, xlHead, xlRows, xlFoot, file:`จุดประสงค์-${gl}-${unit ? unit.short : ""}` };
  }

  function buildStudent(){
    const s = data.roster.find(r => r.code === st.student);
    const units = flowUnits(st.grade);
    const head = ["หน่วย", "ก่อนเรียน", "ใบงาน", "หลังเรียน", "พัฒนาการ", "ส่งล่าสุด"];
    const xlHead = ["หน่วย", "ก่อนเรียน (คะแนน)", "ก่อนเรียน (เต็ม)", "ใบงาน (คะแนน)", "ใบงาน (เต็ม)", "หลังเรียน (คะแนน)", "หลังเรียน (เต็ม)", "พัฒนาการ (%)", "ส่งล่าสุด"];
    const rows = [], xlRows = [];
    units.forEach(u => {
      const c = {}; let last = "";
      TYPES.forEach(t => { c[t.k] = s ? cell(s.code, u.key, t.k) : null; if(c[t.k] && c[t.k].last > last) last = c[t.k].last; });
      const d = diff(c.pretest, c.posttest);
      rows.push([u.label, fmt(c.pretest), fmt(c.worksheet), fmt(c.posttest), fmtDiff(d), dateTh(last)]);
      xlRows.push([u.label, c.pretest ? c.pretest.score : "", c.pretest ? c.pretest.total : "", c.worksheet ? c.worksheet.score : "", c.worksheet ? c.worksheet.total : "", c.posttest ? c.posttest.score : "", c.posttest ? c.posttest.total : "", d == null ? "" : d, dateTh(last)]);
    });
    return { kind:"student", title:`คะแนนรายคน: ${s ? s.name : ""}`, subtitle: s ? `${s.gl} · เลขที่ ${s.seat} · เลขประจำตัว ${s.code}` : "", head, rows, foot:[], xlHead, xlRows, xlFoot:[], file:`คะแนน-${s ? s.name : "นักเรียน"}` };
  }

  // ---------------------------------------------------------------- แสดงผล
  const tableHtml = (m) => `
    <table class="rp-table">
      <thead><tr>${m.head.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>${m.rows.map(r => `<tr>${r.map((v, i) => `<td${cellCls(m, i, v)}>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody>
      ${m.foot.length ? `<tfoot>${m.foot.map(r => `<tr>${r.map(v => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tfoot>` : ""}
    </table>`;
  function cellCls(m, i, v){
    const numeric = m.kind === "class" ? i >= 2 : i >= 1;
    if(!numeric) return "";
    if(v === "—") return ' class="rp-c rp-none"';
    if(st.view === "outcome"){ const n = parseInt(v, 10); return ` class="rp-c ${n >= 80 ? "rp-hi" : n >= 60 ? "rp-mid" : "rp-lo"}"`; }
    return ' class="rp-c"';
  }

  async function render(){
    const hash = location.hash;
    applyTextSize("p6");
    setBreadcrumb([{ label:"🏠 หน้าแรก", href:"#/" }, { label:"📊 ดูงานนักเรียน" }]);
    if(!KrtomContent.isTeacher()){ location.hash = "#/"; return; }
    app.innerHTML = `<div class="page-title">📊 ดูงานนักเรียน</div><div class="page-subtitle">กำลังโหลดคะแนน...</div>`;
    try{ await load(false); if(st.view === "outcome" || st.view === "review") await loadOc(false); if(st.view === "work") await loadWk(false); else await loadWk(false).catch(() => {}); }
    catch(e){
      if(location.hash !== hash) return;
      const m = (e && e.message) || "";
      const msg = /PGRST202|Could not find the function/i.test(m) ? "ยังไม่ได้ติดตั้งระบบรายงานในฐานข้อมูล (ต้องรันไฟล์ SQL 20261001100000, 20261001120000 และ 20261029100000 ใน Supabase)"
        : /หมดเวลาเข้าสู่ระบบ/.test(m) ? "หมดเวลาเข้าสู่ระบบ กรุณาออกจากระบบแล้วเข้าสู่ระบบครูใหม่" : "โหลดข้อมูลไม่สำเร็จ (ตรวจสอบอินเทอร์เน็ต)";
      app.innerHTML = `<div class="page-title">📊 ดูงานนักเรียน</div><div class="tab-panel"><p style="text-align:center">${esc(msg)}</p></div>`;
      return;
    }
    if(location.hash !== hash) return;
    draw();
  }

  function draw(){
    const gs = grades();
    if(!gs.length){ app.innerHTML = `<div class="page-title">📊 ดูงานนักเรียน</div><div class="tab-panel"><p style="text-align:center">ไม่พบรายชื่อนักเรียน</p></div>`; return; }
    if(!gs.some(g => g.id === st.grade)) st.grade = gs[0].id;
    const units = flowUnits(st.grade);
    if(!units.some(u => u.key === st.unit)) st.unit = units.length ? units[0].key : null;
    const stu = data.roster.filter(r => r.g === st.grade);
    if(!stu.some(r => r.code === st.student)) st.student = stu.length ? stu[0].code : null;

    if(st.view === "review"){ model = null; drawReview(gs); return; }
    if(st.view === "work"){ model = null; drawWork(gs); return; }
    model = st.view === "class" ? buildClass() : st.view === "outcome" ? buildOutcome() : buildStudent();
    app.innerHTML = `
      <div class="page-title">📊 ดูงานนักเรียน</div>
      <div class="page-subtitle">คะแนนแบบทดสอบก่อนเรียน · ใบงาน · แบบทดสอบหลังเรียน (นับครั้งที่ได้คะแนนสูงสุด)</div>
      <div class="rp-wrap">
        <div class="rp-tabs">
          <button type="button" class="rp-tab ${st.view === "class" ? "on" : ""}" data-view="class">👥 รายชั้น</button>
          <button type="button" class="rp-tab ${st.view === "student" ? "on" : ""}" data-view="student">🧒 รายคน</button>
          <button type="button" class="rp-tab ${st.view === "outcome" ? "on" : ""}" data-view="outcome">🎯 จุดประสงค์</button>
          <button type="button" class="rp-tab ${st.view === "review" ? "on" : ""}" data-view="review">✍️ ตรวจวิจารณ์${pendingN()}</button>
          <button type="button" class="rp-tab ${st.view === "work" ? "on" : ""}" data-view="work">📄 งานที่ส่ง</button>
        </div>
        <div class="rp-filters">
          <label>ชั้น <select id="rp-grade">${gs.map(g => `<option value="${g.id}" ${g.id === st.grade ? "selected" : ""}>${esc(g.label)}</option>`).join("")}</select></label>
          ${(st.view === "class" || st.view === "outcome")
            ? `<label>หน่วย <select id="rp-unit">${units.map(u => `<option value="${u.key}" ${u.key === st.unit ? "selected" : ""}>${esc(u.label)}</option>`).join("")}</select></label>`
            : `<label>นักเรียน <select id="rp-student">${stu.map(r => `<option value="${esc(r.code)}" ${r.code === st.student ? "selected" : ""}>${esc(r.seat + ". " + r.name)}</option>`).join("")}</select></label>`}
        </div>
        ${((st.view === "class" || st.view === "outcome") && !units.length) ? `<p class="flow-note">ชั้นนี้ยังไม่มีหน่วยที่เปิดระบบเรียนตามลำดับขั้น</p>` : `
        <div class="rp-title">${esc(model.title)}</div>
        <div class="rp-sub">${esc(model.subtitle)}</div>
        <div class="rp-scroll">${tableHtml(model)}</div>`}
        ${st.view === "student" ? studentWorkHtml(st.student) : ""}
        <div class="rp-actions">
          <button type="button" data-act="print">🖨️ พิมพ์</button>
          <button type="button" data-act="xlsx">📊 Excel</button>
          <button type="button" data-act="pdf">📄 PDF</button>
          <button type="button" data-act="share">📤 แชร์</button>
          <button type="button" data-act="refresh">🔄 โหลดใหม่</button>
        </div>
        ${st.view === "outcome" ? `<p class="flow-note">O = จุดประสงค์หน่วย · C = สมรรถนะสำคัญ 5 ด้าน · R = อ่าน คิดวิเคราะห์ และเขียนสื่อความ 5 ด้าน · ≥80% ดีมาก · 60–79% ผ่าน · ต่ำกว่า 60% ควรปรับปรุง (นับครั้งที่ดีที่สุดของแต่ละข้อ; คำตอบวิจารณ์นับเมื่อครูให้คะแนนแล้ว)</p>` : `<p class="flow-note">PDF/พิมพ์: ตารางที่เห็นอยู่ตอนนี้ · Excel: มีคะแนนและคะแนนเต็มแยกคอลัมน์</p>`}
      </div>`;
    app.querySelectorAll(".rp-tab").forEach(b => b.onclick = () => switchView(b.dataset.view));
    const g = document.getElementById("rp-grade"); if(g) g.onchange = () => { st.grade = g.value; draw(); };
    const u = document.getElementById("rp-unit"); if(u) u.onchange = () => { st.unit = u.value; draw(); };
    const s = document.getElementById("rp-student"); if(s) s.onchange = () => { st.student = s.value; draw(); };
    app.querySelectorAll(".rp-actions button").forEach(b => b.onclick = () => act(b.dataset.act, b));
    app.querySelectorAll(".wk-open").forEach(b => b.onclick = () => showWork(b.dataset.c, b.dataset.a));
  }

  // ---------------------------------------------------------------- งานที่ส่ง (คำตอบ + ลิงก์งานของนักเรียน)
  async function loadWk(force){
    if(wk && !force) return wk;
    const t = token(); if(!t) throw new Error("หมดเวลาเข้าสู่ระบบ");
    wk = (await KrtomFlow.rpc("krtom_teacher_work", { p_token: t })) || [];
    try{ await KrtomSettings.loadKeyFiles(true); }catch(e){}   // ไฟล์เฉลยต้นฉบับ (ยังไม่ได้ติดตั้ง/ยังไม่มี ก็ข้ามไป)
    try{ keys = new Map(((await KrtomFlow.rpc("krtom_teacher_keys", { p_token: t })) || []).map(k => [k.activity + "|" + k.q_norm, k.answer])); }catch(e){ keys = new Map(); }   // ยังไม่ได้ติดตั้ง/ยังไม่ใส่เฉลย ก็ข้ามไป
    return wk;
  }
  const WS_COUNT = { 0:15, 1:20, 2:9 };   // ม.1 หน่วย 2: ใบงาน 2.1–2.13 + ภารกิจ CODE BLOCKS 1–7 (= worksheet-2-14 … 2-20)
     // จำนวนใบงานต่อหน่วย (ใช้เรียงคอลัมน์)
  const linkify = (t) => esc(t).replace(/(https?:\/\/[^\s<>"']+)/g, (u) => { const c = u.replace(/[.,;)]+$/, ""), tail = u.slice(c.length); const lb = /flowchart\.html/.test(c) ? "🔷 เปิดผังงาน" : /pseudocode\.html/.test(c) ? "📝 เปิดรหัสลำลอง" : /blocks\.html/.test(c) ? "🧩 เปิด CODE BLOCKS" : "🔗 เปิดลิงก์"; return `<a href="${c}" target="_blank" rel="noopener" style="display:inline-block;background:#6366F1;color:#fff;text-decoration:none;font-weight:700;padding:2px 12px;border-radius:999px;font-size:.85em">${lb} ↗</a>${tail}`; });
  const qNorm = (q) => String(q || "").replace(/\s+/g, "").slice(0, 60);
  const keyOf = (act, q) => keys.get(act + "|" + qNorm(q));
  const isManual = (r) => Array.isArray(r.answers) && r.answers.length > 0 && r.answers.every(x => x.manual);   // ใบงานที่ตั้งให้ครูตรวจเอง
  const pending = (r) => isManual(r) && r.teacher_status == null;
  const eff = (r) => r.teacher_score != null ? r.teacher_score : r.score;
  const mark = (r) => (r.teacher_status === "edited" ? ' <span title="ครูแก้คะแนน">✏️</span>' : r.teacher_status === "approved" ? ' <span title="ครูเห็นชอบ">✅</span>' : "") + (r.allow_resubmit ? ' <span title="เปิดให้ส่งใหม่ได้">🔓</span>' : "");
  const wsName = (a) => { const bm = /^worksheet-2-(1[4-9]|20)$/.exec(a); if(bm) return "ใบงาน 🧩 ภารกิจ " + (bm[1] - 13); const m = /^worksheet-(\d+)-(\d+)$/.exec(a); return m ? (+m[1] > 80 ? `ใบงาน ป.3 ${m[1] - 80}.${m[2]}` : +m[1] > 70 ? `ใบงาน ป.2 ${m[1] - 70}.${m[2]}` : +m[1] > 60 ? `ใบงาน ป.6 ${m[1] - 60}.${m[2]}` : +m[1] > 40 ? `ใบงาน ป.4 ${m[1] - 40}.${m[2]}` : +m[1] > 30 ? `ใบงาน ม.3 ${m[1] - 30}.${m[2]}` : +m[1] > 20 ? `ใบงาน ม.2 ${m[1] - 20}.${m[2]}` : `ใบงาน ${m[1]}.${m[2]}`) : a; };

  // ชื่อใบงาน (แสดงในหน้ารายคน)
  const WS_NAMES = {
    "1-1":"แนวคิดเชิงนามธรรม", "1-2":"การเขียนอัลกอริทึม 3 รูปแบบ", "1-3":"ออกแบบอัลกอริทึมในชีวิตประจำวัน", "1-4":"บ้านฉันอยู่นี่ โรงเรียนอยู่ไหน", "1-5":"ไร่ข้าวโพดจำลอง", "1-6":"หุงข้าวให้สุกพอดี", "1-7":"เลี้ยงปลากัด",
    "1-8":"แยกย่อยปัญหา (ลากไปวาง)", "1-9":"หาตัวเลข หารูปร่าง (ลากไปวาง)", "1-10":"แนวคิดเชิงนามธรรมและอัลกอริทึมเบื้องต้น", "1-11":"ภาษาธรรมชาติและภาษาคอมพิวเตอร์", "1-12":"อัลกอริทึมด้วยรหัสลำลอง", "1-13":"อัลกอริทึมด้วยผังงาน", "1-14":"กิจกรรม ร้านน้ำผลไม้ปั่น", "1-15":"แบบทดสอบท้ายหน่วย",
    "2-1":"จับคู่ศัพท์ + เลือกตอบ", "2-2":"ไข่ดาว", "2-3":"อุณหภูมิ", "2-4":"สวนสัตว์", "2-5":"รางวัลพิเศษ", "2-6":"สามเหลี่ยม", "2-7":"แมวเหมียว", "2-8":"ตัวแปร", "2-9":"การเขียนโปรแกรมเบื้องต้น", "2-10":"ภาษาและซอฟต์แวร์เขียนโปรแกรม (ลากไปวาง)", "2-11":"เขียนโปรแกรมจากอัลกอริทึม", "2-12":"กิจกรรม ตู้กดน้ำมหาสนุก", "2-13":"แบบทดสอบท้ายหน่วย", "2-14":"CODE BLOCKS: วาดดอกไม้ (ทำซ้ำซ้อน)", "2-15":"CODE BLOCKS: เกลียวสีรุ้ง (ตัวแปร)", "2-16":"CODE BLOCKS: นับถอยหลังปล่อยจรวด (while)", "2-17":"CODE BLOCKS: ตัดเกรด (เงื่อนไขซ้อน)", "2-18":"CODE BLOCKS: แบบฝึกสูตรคูณ (สุ่มเลข)", "2-19":"CODE BLOCKS: เกมแมวรับดาว", "2-20":"CODE BLOCKS: ออกแบบโปรเจกต์ของตัวเอง",
    "3-1":"ข้อมูลปฐมภูมิ ทุติยภูมิ และซอฟต์แวร์", "3-2":"ข้อมูลและการเก็บรวบรวมข้อมูล", "3-3":"สารสนเทศและความสำคัญ", "3-4":"ส่วนประกอบของระบบสารสนเทศ (ลากไปวาง)", "3-5":"ดัชนีมวลกายของเพื่อน", "3-6":"ประมวลผลเชื่อมตรง/แบบกลุ่ม", "3-7":"ซอฟต์แวร์และการเลือกใช้งาน", "3-8":"กิจกรรม สารสนเทศสร้างได้ด้วยเรา", "3-9":"แบบทดสอบท้ายหน่วย",
    "31-1":"การรวบรวมข้อมูล", "31-2":"จัดประเภทข้อมูลและวิธีรวบรวม (ลากไปวาง)", "31-3":"การประมวลผลข้อมูล", "31-4":"กรรมวิธีและวิธีประมวลผล (ลากไปวาง)", "31-5":"การใช้ซอฟต์แวร์จัดการข้อมูลและสารสนเทศ", "31-6":"กิจกรรม สำรวจ BMI", "31-7":"แบบทดสอบท้ายหน่วย ตอนที่ 1", "31-8":"แบบทดสอบท้ายหน่วย ตอนที่ 2",
    "32-1":"การสืบค้นเพื่อหาแหล่งข้อมูล", "32-2":"โปรแกรมค้นหา เทคนิค และขั้นตอน (ลากไปวาง)", "32-3":"เทคนิคการสืบค้น", "32-4":"การประเมินความน่าเชื่อถือของข้อมูล", "32-5":"วิเคราะห์ความน่าเชื่อถือและเหตุผลวิบัติ", "32-6":"การรู้เท่าทันสื่อ", "32-7":"รู้เท่าทันสื่อและระดับเนื้อหา (ลากไปวาง)", "32-8":"กิจกรรม ความน่าเชื่อถือของข้อมูล", "32-9":"แบบทดสอบท้ายหน่วย ตอนที่ 1", "32-10":"แบบทดสอบท้ายหน่วย ตอนที่ 2",
    "41-1":"เหตุผลเชิงตรรกะ", "41-2":"ลำดับขั้นตอนและรูปแบบอัลกอริทึม (ลากไปวาง)", "41-3":"อัลกอริทึมด้วยข้อความและรหัสลำลอง", "41-4":"สัญลักษณ์และผังงาน (ลากไปวาง)", "41-5":"กิจกรรม ของขวัญสำหรับเพื่อน", "41-6":"แบบทดสอบท้ายหน่วย",
    "81-1":"แก้ปัญหาทีละขั้น", "81-2":"ข้อมูลและเงื่อนไข", "81-3":"ซูโดกุภาพ", "81-4":"แผนภาพต้นไม้", "81-5":"แสดงอัลกอริทึม 3 แบบ", "81-6":"กระปุกออมสิน", "81-7":"หนังสือเรียงแถว", "82-1":"ซองเงื่อนไขหุ่นยนต์สวนผัก", "82-2":"หุ่นยนต์ร้านขนม", "82-3":"แบบฝึกหัด คัดมะม่วง", "82-4":"โปรแกรมเก็บขยะ", "82-5":"แบบฝึกหัด ทาสีรั้ว",
    "71-1":"กิจกรรมที่บ้าน", "71-2":"ซื้อสินค้า", "71-3":"การแก้ปัญหาแบบมีลำดับขั้นตอน (เก็บของเข้าตู้)", "71-4":"ค้นหาสิ่งของ", "71-5":"สู่เส้นชัย", "71-6":"คิดอย่างเป็นระบบ",
    "61-1":"ปริศนาที่มีคำตอบ", "61-2":"ปริศนาไอศกรีม", "61-3":"สบู่ผิดกล่อง", "61-4":"เงื่อนไขอะไรดี", "61-5":"น้อยหน่าอยากกินขนม", "61-6":"ภารกิจของโป้ง", "61-7":"ของขวัญที่แตกต่าง", "61-8":"ใบกิจกรรม คำถามหลังทำกิจกรรม", "61-9":"สัญลักษณ์ผังงานและเงื่อนไข (ลากไปวาง)",
    "21-1":"องค์ประกอบของแนวคิดเชิงคำนวณ", "21-2":"แยกย่อย หารูปแบบ นามธรรม อัลกอริทึม (ลากไปวาง)", "21-3":"ประยุกต์ใช้แนวคิดเชิงคำนวณ", "21-4":"แนวคิดเชิงคำนวณกับการแก้ปัญหา", "21-5":"แบบทดสอบท้ายหน่วย", "21-6":"ฝึกเพิ่ม 4 องค์ประกอบ", "21-7":"แยกย่อย (1) ปัญหาใหญ่ → ปัญหาย่อย (ลากไปวาง)", "21-8":"แยกย่อย (2) แบ่งกลุ่มด้วยตำแหน่งหลัก (ลากไปวาง)", "21-9":"หารูปแบบ (1) ลำดับและกฎ (ลากไปวาง)", "21-10":"หารูปแบบ (2) งานที่ใช้วิธีเดียวกัน (ลากไปวาง)", "21-11":"นามธรรม (1) เรียงแถวตามความสูง (ลากไปวาง)", "21-12":"นามธรรม (2) แผนที่และผังบอกทาง (ลากไปวาง)", "21-13":"อัลกอริทึม (1) หาจำนวนมากที่สุด (ลากไปวาง)", "21-14":"อัลกอริทึม (2) ขั้นตอนชีวิตประจำวัน (ลากไปวาง)", "21-15":"รถสตาร์ทไม่ติด (กรณีศึกษา)", "21-16":"รถสตาร์ทไม่ติด (ลากไปวาง)", "21-17":"ผักนี้มีราคา (กรณีศึกษา)", "21-18":"ผักนี้มีราคา (ลากไปวาง)", "21-19":"ป.ปลาของฉัน (กรณีศึกษา)", "21-20":"ป.ปลาของฉัน (ลากไปวาง)", "21-21":"อีโมชันและเต้นหรรษา: ทำซ้ำ ×n (ลากไปวาง)", "21-22":"เต้นหรรษา (กรณีศึกษา)",
  };
  // ใบงานที่ส่งของนักเรียนคนเดียว: คะแนน + ลิงก์งานที่ส่ง (ผังงาน/รหัสลำลอง/CODE BLOCKS) + ปุ่มดูคำตอบ
  function studentWorkHtml(code){
    if(!wk) return `<p class="flow-note">ยังไม่มีข้อมูลงานที่ส่ง (ถ้ายังไม่เคยใช้ ต้องรันไฟล์ SQL 20261031100000_krtom_submissions.sql ใน Supabase)</p>`;
    const mine = wk.filter(r => r.student_code === code), latest = new Map();
    mine.forEach(r => { const c = latest.get(r.activity); if(!c || r.attempt > c.attempt) latest.set(r.activity, r); });
    const key = (a) => { const m = /^worksheet-(\d+)-(\d+)$/.exec(a); return m ? +m[1] * 1000 + +m[2] : 1e9; };
    const rows = [...latest.values()].sort((a, b) => key(a.activity) - key(b.activity));
    const linksOf = (r) => { const out = []; (Array.isArray(r.answers) ? r.answers : []).forEach((x, i) => { (String(x.a || "").match(/https?:\/\/[^\s<>"']+/g) || []).forEach(u => { const c = u.replace(/[.,;)]+$/, ""); const lb = /flowchart\.html/.test(c) ? "🔷 ผังงาน" : /pseudocode\.html/.test(c) ? "📝 รหัสลำลอง" : /blocks\.html/.test(c) ? "🧩 CODE BLOCKS" : "🔗 ลิงก์"; out.push(`<a href="${esc(c)}" target="_blank" rel="noopener" style="display:inline-block;background:#6366F1;color:#fff;text-decoration:none;font-weight:700;padding:2px 10px;border-radius:999px;font-size:.82em;margin:2px 4px 2px 0">${lb} ↗</a>`); }); }); return out.join(""); };
    const body = rows.length ? rows.map(r => { const m = /^worksheet-(\d+)-(\d+)$/.exec(r.activity), nm = m ? (WS_NAMES[m[1] + "-" + m[2]] || "") : ""; const lk = linksOf(r);
      return `<tr><td>${esc(wsName(r.activity))}${nm ? `<div style="font-size:.82em;color:#64748B">${esc(nm)}</div>` : ""}</td><td class="rp-c"><b>${pending(r) ? "📝 รอตรวจ" : eff(r) + "/" + r.max_score}</b>${mark(r)}${r.teacher_status === "edited" ? `<div style="font-size:.75em;color:#64748B">ระบบ ${r.score}</div>` : ""}</td><td class="rp-c">${r.attempt}</td><td class="rp-c">${esc(dateTh(r.submitted_at))}</td><td>${lk || '<span style="color:#94A3B8">—</span>'}</td><td class="rp-c"><button type="button" class="wk-open" data-c="${esc(code)}" data-a="${esc(r.activity)}">📄 ดูคำตอบ</button></td></tr>`; }).join("")
      : `<tr><td colspan="6" class="rp-c rp-none">นักเรียนคนนี้ยังไม่ได้ส่งใบงาน</td></tr>`;
    return `<div class="rp-title" style="margin-top:18px">📄 ใบงานที่ส่ง</div><div class="rp-sub">คะแนนที่ระบบตรวจเบื้องต้น และลิงก์งานที่นักเรียนส่ง (ครั้งล่าสุดของแต่ละใบงาน)</div>
      <div class="rp-scroll"><table class="rp-table"><thead><tr><th>ใบงาน</th><th>คะแนน</th><th>ส่งครั้งที่</th><th>ส่งล่าสุด</th><th>ลิงก์งานที่ส่ง</th><th>คำตอบ</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }
  function showWork(code, act){
    const rows = wk.filter(r => r.student_code === code && r.activity === act).sort((a, b) => b.attempt - a.attempt);
    if(!rows.length) return;
    const st0 = data.roster.find(r => r.code === code), r = rows[0];
    const flag = (x) => x.manual ? `<span style="background:#FEF3C7;color:#B45309;border-radius:999px;padding:1px 10px;font-size:.8em;font-weight:800;margin-left:6px">📝 ครูตรวจเอง</span>` : x.ok === true ? `<span style="background:#DCFCE7;color:#047857;border-radius:999px;padding:1px 10px;font-size:.8em;font-weight:800;margin-left:6px">✔ ถูก</span>` : x.ok === false ? `<span style="background:#FEE2E2;color:#B91C1C;border-radius:999px;padding:1px 10px;font-size:.8em;font-weight:800;margin-left:6px">✖ ยังไม่ถูก</span>` : "";
    const ans = (Array.isArray(r.answers) ? r.answers : []).map((x, i) => `<div style="text-align:left;margin:10px 0"><div style="font-weight:800;color:#4338CA">${esc(x.q)}${flag(x)}</div><div style="white-space:pre-wrap;background:${x.ok === false ? "#FFF7F7" : "#F8FAFC"};border-radius:10px;padding:8px 10px;margin-top:4px;line-height:1.55;${x.ok === false ? "border:1px solid #FECACA;" : ""}">${linkify(x.a)}</div>${x.ok === false && x.hint ? `<div style="color:#B45309;font-size:.85em;margin-top:3px">⚠️ ระบบเห็นว่า: ${esc(x.hint)}</div>` : ""}${keyOf(act, x.q) ? `<div style="margin-top:4px;background:#ECFDF5;border:1px dashed #34D399;border-radius:10px;padding:6px 10px;font-size:.88em;color:#065F46;line-height:1.5"><b>🔑 เฉลย/แนวคำตอบ:</b> ${esc(keyOf(act, x.q))}</div>` : ""}<button type="button" class="key-edit" data-i="${i}" style="margin-top:3px;background:none;border:none;color:#6366F1;font-size:.8em;cursor:pointer;font-weight:700">${keyOf(act, x.q) ? "✏️ แก้เฉลยข้อนี้" : "➕ เพิ่มเฉลยข้อนี้"}</button></div>`).join("");
    const rv = r.teacher_status === "edited" ? `<div style="margin-top:6px;background:#FEF3C7;border-radius:8px;padding:5px 10px">✏️ ครูแก้คะแนนเป็น <b>${r.teacher_score}/${r.max_score}</b>${r.teacher_note ? " · " + esc(r.teacher_note) : ""}</div>` : r.teacher_status === "approved" ? `<div style="margin-top:6px;background:#DCFCE7;border-radius:8px;padding:5px 10px">✅ ครูเห็นชอบคะแนน ${r.teacher_score}/${r.max_score} แล้ว</div>` : "";
    const kf = (window.KrtomSettings ? KrtomSettings.filesFor(r.grade_id, r.subject_id, r.unit_idx) : []);
    const kfHtml = `<div style="text-align:left;margin:8px 0 2px;font-size:.88em;color:#475569">📎 ไฟล์เฉลยต้นฉบับของหน่วยนี้: ${kf.length ? kf.map(f => `<button type="button" class="kf-open" data-id="${f.id}" style="background:#3B82F6;color:#fff;border:none;border-radius:999px;padding:2px 12px;margin:2px 4px 2px 0;font-weight:700;cursor:pointer">${esc(f.file_name)}</button>`).join("") : `<span style="color:#94A3B8">ยังไม่ได้อัปโหลด (เมนู ตั้งค่า → อัปโหลดเฉลยแต่ละหน่วย)</span>`}</div>`;
    const hasMarks = (r.answers || []).some && (r.answers || []).some(x => x.ok === true || x.ok === false || x.manual);
    window.Swal && Swal.fire({
      title: `${wsName(act)} — ${esc(st0 ? st0.name : r.full_name)}`,
      html: `<div style="text-align:left;color:#475569;font-size:.9em">${isManual(r) ? `<b>ใบงานนี้ตั้งให้ครูตรวจเอง</b> — ระบบไม่ให้คะแนน (เต็ม ${r.max_score})` : `คะแนนที่ระบบตรวจเบื้องต้น: <b>${r.score}/${r.max_score}</b>`} · ส่งครั้งที่ ${r.attempt}${rows.length > 1 ? ` (ส่งทั้งหมด ${rows.length} ครั้ง แสดงครั้งล่าสุด)` : ""} · ${dateTh(r.submitted_at)}${hasMarks ? "" : " · (งานชิ้นนี้ส่งก่อนมีระบบแสดงถูก/ผิดรายข้อ)"}${rv}</div>${kfHtml}
        <label style="display:flex;align-items:center;gap:8px;text-align:left;margin:10px 0 2px;padding:8px 12px;border:2px solid ${r.allow_resubmit ? "#34D399" : "#CBD5E1"};border-radius:12px;background:${r.allow_resubmit ? "#ECFDF5" : "#F8FAFC"};font-weight:700;cursor:pointer"><input type="checkbox" id="rv-resub" ${r.allow_resubmit ? "checked" : ""} style="width:20px;height:20px"> 🔓 อนุญาตให้นักเรียนคนนี้ส่งใบงานนี้ใหม่ <span style="font-weight:400;color:#64748B;font-size:.85em">(ไม่ติ๊ก = ส่งแล้วส่งซ้ำไม่ได้)</span></label>${ans}`,
      width: 720, showConfirmButton: !isManual(r), didOpen: () => {
        const pop = Swal.getPopup();
        pop.querySelectorAll(".kf-open").forEach(b => b.onclick = () => KrtomSettings.openKeyFile(b.dataset.id));
        pop.querySelectorAll(".key-edit").forEach(b => b.onclick = async () => {
          const x = r.answers[+b.dataset.i], cur = keyOf(act, x.q) || "";
          Swal.close();
          const res = await Swal.fire({ title:"✏️ เฉลย/แนวคำตอบ", width:600, showCancelButton:true, confirmButtonText:"บันทึก", cancelButtonText:"ยกเลิก", confirmButtonColor:"#10B981",
            html:`<div style="text-align:left;font-size:.9em;margin-bottom:6px;color:#475569">${esc(x.q)}</div><textarea id="key-txt" class="swal2-textarea" style="margin:0;width:100%;height:150px" placeholder="พิมพ์เฉลยหรือแนวคำตอบ (เว้นว่างแล้วบันทึก = ลบเฉลยข้อนี้)">${esc(cur)}</textarea>` });
          if(res.isConfirmed){
            const v = (document.getElementById("key-txt") || {}).value;
            try{ await KrtomFlow.rpc("krtom_teacher_set_key", { p_token: token(), p_activity: act, p_q_norm: qNorm(x.q), p_q: x.q, p_answer: v == null ? "" : v }); if(v && v.trim()) keys.set(act + "|" + qNorm(x.q), v); else keys.delete(act + "|" + qNorm(x.q)); }
            catch(e){ await Swal.fire({ icon:"error", title:"บันทึกเฉลยไม่สำเร็จ", text: window.KrtomSettings ? KrtomSettings.errMsg(e) : "ลองใหม่" }); }
          }
          showWork(code, act);
        });
      }, willClose: () => { const c = document.getElementById("rv-resub"); r._resub = c ? c.checked : r.allow_resubmit; }, showDenyButton: true, showCancelButton: true,
      confirmButtonText: "✅ เห็นชอบคะแนน", denyButtonText: isManual(r) ? "✏️ ให้คะแนน" : "✏️ แก้คะแนน", cancelButtonText: "ปิด",
      confirmButtonColor: "#10B981", denyButtonColor: "#F59E0B", cancelButtonColor: "#64748B"
    }).then(async (res) => {
      if(r._resub !== undefined && !!r._resub !== !!r.allow_resubmit){
        try{ await KrtomFlow.rpc("krtom_teacher_set_resubmit", { p_token: token(), p_id: r.id, p_allow: !!r._resub }); r.allow_resubmit = !!r._resub; draw(); }
        catch(e){ Swal.fire({ icon:"error", title:"บันทึกสิทธิ์ส่งใหม่ไม่สำเร็จ", text: /PGRST202|Could not find the function/i.test((e && e.message) || "") ? "ยังไม่ได้ติดตั้ง (ต้องรันไฟล์ SQL 20261101110000_krtom_resubmit_keys.sql ใน Supabase)" : "ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่" }); }
      }
      delete r._resub;
      if(res.isConfirmed) await reviewWork(r, "approved");
      else if(res.isDenied) await editScore(r);
    });
  }
  async function reviewWork(r, status, score, note){
    try{
      await KrtomFlow.rpc("krtom_teacher_review_work", { p_token: token(), p_id: r.id, p_status: status, p_score: status === "edited" ? score : null, p_note: note || null });
      r.teacher_status = status; r.teacher_score = status === "approved" ? r.score : score; r.teacher_note = note || null;
      draw();
    }catch(e){
      const m = (e && e.message) || "";
      Swal.fire({ icon:"error", title:"บันทึกไม่สำเร็จ", text: /PGRST202|Could not find the function/i.test(m) ? "ยังไม่ได้ติดตั้งระบบตรวจงาน (ต้องรันไฟล์ SQL 20261101100000_krtom_work_review.sql ใน Supabase)" : m || "ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่" });
    }
  }
  async function editScore(r){
    const res = await Swal.fire({
      title: "แก้คะแนน", width: 460, showCancelButton: true, confirmButtonText: "บันทึก", cancelButtonText: "ยกเลิก", confirmButtonColor: "#F59E0B",
      html: `<div style="text-align:left;font-size:.95em">คะแนนเต็ม ${r.max_score} · ระบบตรวจได้ ${r.score}<br><label style="font-weight:700">คะแนนใหม่</label><br><input id="rv-score" type="number" min="0" max="${r.max_score}" step="1" value="${eff(r)}" class="swal2-input" style="margin:6px 0 10px;width:100%"><br><label style="font-weight:700">หมายเหตุ (ไม่บังคับ)</label><br><textarea id="rv-note" class="swal2-textarea" style="margin:6px 0;width:100%" placeholder="เช่น ตอบถูกแต่เขียนต่างจากเฉลย">${esc(r.teacher_note || "")}</textarea></div>`,
      preConfirm: () => { const v = parseInt(document.getElementById("rv-score").value, 10); if(!(v >= 0 && v <= r.max_score)){ Swal.showValidationMessage("คะแนนต้องเป็นเลข 0 ถึง " + r.max_score); return false; } return { v, note: document.getElementById("rv-note").value }; }
    });
    if(res.isConfirmed) await reviewWork(r, "edited", res.value.v, res.value.note);
  }
  function drawWork(gs){
    const units = flowUnits(st.grade), stu = data.roster.filter(r => r.g === st.grade);
    const unit = units.find(u => u.key === st.unit) || units[0], idx = unit ? +unit.key.split("/")[2] : 0;
    const mine = wk.filter(r => unit && `${r.grade_id}/${r.subject_id}/${r.unit_idx}` === unit.key);
    const isM3 = unit && unit.key.startsWith("m3/"), isP4 = unit && unit.key.startsWith("p4/"), isM2 = unit && unit.key.startsWith("m2/"), isP6 = unit && unit.key.startsWith("p6/"), isP2 = unit && unit.key.startsWith("p2/"), isP3 = unit && unit.key.startsWith("p3/"), acts = [], wc = isM3 ? { 0:8, 1:10 }[idx] : isP4 ? { 0:6 }[idx] : isM2 ? { 0:22 }[idx] : isP6 ? { 0:9 }[idx] : isP2 ? { 0:6 }[idx] : isP3 ? { 0:7, 1:5 }[idx] : WS_COUNT[idx], pf = isM3 ? 30 : isP4 ? 40 : isM2 ? 20 : isP6 ? 60 : isP2 ? 70 : isP3 ? 80 : 0; for(let n = 1; n <= (wc || 0); n++) acts.push(`worksheet-${pf + idx + 1}-${n}`);
    mine.forEach(r => { if(!acts.includes(r.activity)) acts.push(r.activity); });
    const latest = new Map(); mine.forEach(r => { const k = r.student_code + "|" + r.activity, c = latest.get(k); if(!c || r.attempt > c.attempt) latest.set(k, r); });
    app.innerHTML = `
      <div class="page-title">📊 ดูงานนักเรียน</div>
      <div class="page-subtitle">งานที่นักเรียนส่ง: คะแนนที่ระบบตรวจเบื้องต้น + คำตอบและลิงก์งานที่ทำ (กดตัวเลขเพื่อเปิดดู)</div>
      <div class="rp-wrap">
        <div class="rp-tabs">
          <button type="button" class="rp-tab" data-view="class">👥 รายชั้น</button>
          <button type="button" class="rp-tab" data-view="student">🧒 รายคน</button>
          <button type="button" class="rp-tab" data-view="outcome">🎯 จุดประสงค์</button>
          <button type="button" class="rp-tab" data-view="review">✍️ ตรวจวิจารณ์${pendingN()}</button>
          <button type="button" class="rp-tab on" data-view="work">📄 งานที่ส่ง</button>
        </div>
        <div class="rp-filters">
          <label>ชั้น <select id="rp-grade">${gs.map(g => `<option value="${g.id}" ${g.id === st.grade ? "selected" : ""}>${esc(g.label)}</option>`).join("")}</select></label>
          <label>หน่วย <select id="rp-unit">${units.map(u => `<option value="${u.key}" ${unit && u.key === unit.key ? "selected" : ""}>${esc(u.label)}</option>`).join("")}</select></label>
        </div>
        ${unit ? `<div class="rp-scroll"><table class="rp-table">
          <thead><tr><th>เลขที่</th><th>ชื่อ-สกุล</th>${acts.map(a => `<th>${esc(wsName(a).replace("ใบงาน ", ""))}</th>`).join("")}</tr></thead>
          <tbody>${stu.map(s => `<tr><td class="rp-c">${esc(s.seat)}</td><td>${esc(s.name)}</td>${acts.map(a => { const r = latest.get(s.code + "|" + a); return r ? `<td class="rp-c"><button type="button" class="wk-open" data-c="${esc(s.code)}" data-a="${a}" title="เปิดดูงาน">${pending(r) ? "📝 รอตรวจ" : eff(r) + "/" + r.max_score}${mark(r)} 📄</button></td>` : `<td class="rp-c rp-none">—</td>`; }).join("")}</tr>`).join("")}</tbody>
          <tfoot><tr><td></td><td>ส่งแล้ว (คน)</td>${acts.map(a => `<td class="rp-c">${stu.filter(s => latest.has(s.code + "|" + a)).length}/${stu.length}</td>`).join("")}</tr></tfoot>
        </table></div>` : `<p class="flow-note">ชั้นนี้ยังไม่มีหน่วยที่เปิดระบบเรียนตามลำดับขั้น</p>`}
        <p class="flow-note">ตัวเลข = คะแนนที่ระบบตรวจเบื้องต้น (ครูตรวจซ้ำได้) · กดเพื่อดูคำตอบและลิงก์งานที่นักเรียนส่ง · นักเรียนไม่เห็นเฉลยหรือผลตรวจ</p>
        <div class="rp-actions"><button type="button" id="wk-refresh">🔄 โหลดใหม่</button></div>
      </div>`;
    app.querySelectorAll(".rp-tab").forEach(b => b.onclick = () => switchView(b.dataset.view));
    document.getElementById("rp-grade").onchange = (e) => { st.grade = e.target.value; st.unit = null; draw(); };
    document.getElementById("rp-unit").onchange = (e) => { st.unit = e.target.value; draw(); };
    document.getElementById("wk-refresh").onclick = async () => { wk = null; await switchView("work"); };
    app.querySelectorAll(".wk-open").forEach(b => b.onclick = () => showWork(b.dataset.c, b.dataset.a));
  }

  // ---------------------------------------------------------------- ตรวจคำตอบวิจารณ์
  const pendingN = () => { if(!oc) return ""; const n = oc.refl.filter(r => r.teacher_score == null).length; return n ? ` (${n})` : ""; };
  async function switchView(v){
    st.view = v;
    if(oc && oc._stale && v === "outcome") oc = null;
    if(v === "work" && !wk){
      app.innerHTML = `<div class="page-title">📊 ดูงานนักเรียน</div><div class="page-subtitle">กำลังโหลดงานที่ส่ง...</div>`;
      try{ await loadWk(false); }
      catch(e){
        const m = (e && e.message) || "";
        const msg = /PGRST202|Could not find the function/i.test(m) ? "ยังไม่ได้ติดตั้งระบบเก็บงานในฐานข้อมูล (ต้องรันไฟล์ SQL 20261031100000_krtom_submissions.sql ใน Supabase)" : "โหลดข้อมูลไม่สำเร็จ (ตรวจสอบอินเทอร์เน็ต)";
        st.view = "class";
        app.innerHTML = `<div class="page-title">📊 ดูงานนักเรียน</div><div class="tab-panel"><p style="text-align:center">${esc(msg)}</p><p style="text-align:center"><button type="button" class="rp-tab on" id="rp-back" style="flex:none;padding:8px 18px">กลับไปรายชั้น</button></p></div>`;
        document.getElementById("rp-back").onclick = draw;
        return;
      }
    }
    if((v === "outcome" || v === "review") && !oc){
      app.innerHTML = `<div class="page-title">📊 ดูงานนักเรียน</div><div class="page-subtitle">กำลังโหลดข้อมูลจุดประสงค์...</div>`;
      try{ await loadOc(false); }
      catch(e){
        const m = (e && e.message) || "";
        const msg = /PGRST202|Could not find the function/i.test(m) ? "ยังไม่ได้ติดตั้งระบบจุดประสงค์ในฐานข้อมูล (ต้องรันไฟล์ SQL 20261029100000_krtom_outcomes.sql ใน Supabase)" : "โหลดข้อมูลไม่สำเร็จ (ตรวจสอบอินเทอร์เน็ต)";
        st.view = "class";
        app.innerHTML = `<div class="page-title">📊 ดูงานนักเรียน</div><div class="tab-panel"><p style="text-align:center">${esc(msg)}</p><p style="text-align:center"><button type="button" class="rp-tab on" id="rp-back" style="flex:none;padding:8px 18px">กลับไปรายชั้น</button></p></div>`;
        document.getElementById("rp-back").onclick = draw;
        return;
      }
    }
    draw();
  }
  const ACT_NAME = (a) => { const m = /^worksheet-2-(\d)$/.exec(a); return m ? `ใบงาน 2.${m[1]}` : a; };
  const Q_NAME = (i) => ({ c1:"คำถามวิจารณ์ข้อ 1", c2:"คำถามวิจารณ์ข้อ 2" }[i] || i);
  function drawReview(gs){
    const nameOf = new Map(data.roster.map(r => [r.code, r]));
    const list = oc.refl.filter(r => r.grade_id === st.grade && (st.ocFilter === "all" || r.teacher_score == null));
    app.innerHTML = `
      <div class="page-title">📊 ดูงานนักเรียน</div>
      <div class="page-subtitle">ตรวจคำตอบคำถามวิจารณ์ท้ายใบงาน ให้คะแนน 0–3 (นับเข้าผลจุดประสงค์ R3/R4 เมื่อให้คะแนนแล้ว)</div>
      <div class="rp-wrap">
        <div class="rp-tabs">
          <button type="button" class="rp-tab" data-view="class">👥 รายชั้น</button>
          <button type="button" class="rp-tab" data-view="student">🧒 รายคน</button>
          <button type="button" class="rp-tab" data-view="outcome">🎯 จุดประสงค์</button>
          <button type="button" class="rp-tab on" data-view="review">✍️ ตรวจวิจารณ์${pendingN()}</button>
          <button type="button" class="rp-tab" data-view="work">📄 งานที่ส่ง</button>
        </div>
        <div class="rp-filters">
          <label>ชั้น <select id="rp-grade">${gs.map(g => `<option value="${g.id}" ${g.id === st.grade ? "selected" : ""}>${esc(g.label)}</option>`).join("")}</select></label>
          <label>แสดง <select id="rp-ocf"><option value="todo" ${st.ocFilter === "todo" ? "selected" : ""}>ยังไม่ได้ตรวจ</option><option value="all" ${st.ocFilter === "all" ? "selected" : ""}>ทั้งหมด</option></select></label>
        </div>
        ${list.length ? list.map(r => { const s = nameOf.get(r.student_code); return `
        <div class="rv-card" data-id="${r.id}">
          <div class="rv-head"><b>${esc((s ? s.seat + ". " : "") + (s ? s.name : r.full_name || r.student_code))}</b> · ${esc(ACT_NAME(r.activity))} · ${esc(Q_NAME(r.item_no))}</div>
          <div class="rv-ans">${esc(r.answer)}</div>
          <div class="rv-row">
            <label>คะแนน <select class="rv-score"><option value="">—</option>${[0,1,2,3].map(n => `<option value="${n}" ${r.teacher_score === n ? "selected" : ""}>${n}</option>`).join("")}</select></label>
            <input class="rv-note" type="text" maxlength="200" placeholder="ข้อเสนอแนะ (ไม่บังคับ)" value="${esc(r.teacher_note || "")}">
            <button type="button" class="rv-save">บันทึก</button>
            <span class="rv-st">${r.teacher_score != null ? "✅ ตรวจแล้ว" : ""}</span>
          </div>
        </div>`; }).join("") : `<p class="flow-note" style="text-align:center">${st.ocFilter === "todo" ? "ไม่มีคำตอบที่รอตรวจ 🎉" : "ยังไม่มีคำตอบวิจารณ์จากนักเรียน"}</p>`}
        <p class="flow-note">เกณฑ์: 0 = ไม่ตอบ/ไม่เกี่ยวข้อง · 1 = ตอบแต่ไม่มีเหตุผล · 2 = มีเหตุผลบางส่วน · 3 = มีเหตุผลชัดเจนอ้างอิงงานของตน</p>
        <div class="rp-actions"><button type="button" id="rv-refresh">🔄 โหลดใหม่</button></div>
      </div>`;
    app.querySelectorAll(".rp-tab").forEach(b => b.onclick = () => switchView(b.dataset.view));
    document.getElementById("rp-grade").onchange = (e) => { st.grade = e.target.value; draw(); };
    document.getElementById("rp-ocf").onchange = (e) => { st.ocFilter = e.target.value; draw(); };
    document.getElementById("rv-refresh").onclick = async () => { oc = null; await switchView("review"); };
    app.querySelectorAll(".rv-card").forEach(card => {
      const btn = card.querySelector(".rv-save"), stEl = card.querySelector(".rv-st");
      btn.onclick = async () => {
        const sc = card.querySelector(".rv-score").value;
        if(sc === ""){ stEl.textContent = "เลือกคะแนนก่อน"; return; }
        btn.disabled = true; stEl.textContent = "กำลังบันทึก...";
        try{
          const note = card.querySelector(".rv-note").value;
          await KrtomFlow.rpc("krtom_teacher_review", { p_token: token(), p_id: Number(card.dataset.id), p_score: Number(sc), p_note: note });
          const r = oc.refl.find(x => String(x.id) === card.dataset.id); if(r){ r.teacher_score = Number(sc); r.teacher_note = note; }
          oc._stale = true;
          stEl.textContent = "✅ บันทึกแล้ว";
        }catch(e){ stEl.textContent = "บันทึกไม่สำเร็จ"; }
        finally{ btn.disabled = false; }
      };
    });
  }

  // ---------------------------------------------------------------- ส่งออก
  const scripts = {};
  const loadScript = (url) => scripts[url] || (scripts[url] = new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = url; s.onload = res; s.onerror = () => { delete scripts[url]; rej(new Error("โหลดไลบรารีไม่สำเร็จ")); };
    document.head.appendChild(s);
  }));
  const XLSX_URL = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
  const PDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
  const today = () => new Date().toLocaleDateString("th-TH", { day:"numeric", month:"long", year:"numeric" });
  const toast = (icon, title, text) => window.Swal && Swal.fire({ icon, title, text, confirmButtonText:"ตกลง", confirmButtonColor:"#3B82F6" });

  const css = `body{font-family:"Sarabun","TH Sarabun New",Tahoma,sans-serif;color:#111;padding:8px}
    h1{font-size:20px;margin:0 0 2px} .sub{color:#555;margin:0 0 4px;font-size:14px} .date{color:#777;margin:0 0 10px;font-size:12px}
    table{border-collapse:collapse;width:100%;font-size:13px} th,td{border:1px solid #888;padding:4px 7px} th{background:#E0E7FF}
    td.rp-c{text-align:center} tfoot td{background:#F3F4F6;font-weight:700}`;
  const bodyHtml = (m) => `<h1>${esc(m.title)}</h1><p class="sub">${esc(m.subtitle)}</p><p class="date">โรงเรียนบ้านค้อดอนแคน · พิมพ์เมื่อ ${today()}</p>${tableHtml(m)}`;

  function xlsxBook(m){
    const aoa = [[m.title], [m.subtitle], [], m.xlHead, ...m.xlRows, ...(m.xlFoot.length ? [[], ...m.xlFoot] : [])];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = m.xlHead.map((h, i) => ({ wch: /ชื่อ|หน่วย/.test(h) ? 34 : 14 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "คะแนน");
    return wb;
  }
  const fileName = (ext) => `${model.file}-${new Date().toISOString().slice(0, 10)}.${ext}`.replace(/[\\/:*?"<>|]/g, "-");
  const summaryText = (m) => `${m.title}\n${m.subtitle}\n\n` + [m.head, ...m.rows, ...m.foot].map(r => r.join(" | ")).join("\n");

  async function act(a, btn){
    if(!model) return;
    try{
      if(a === "refresh"){ data = null; oc = null; wk = null; return render(); }
      if(a === "print"){
        const w = window.open("", "_blank");
        if(!w) return toast("info", "เบราว์เซอร์บล็อกหน้าต่างพิมพ์", "กรุณาอนุญาตป๊อปอัปของเว็บนี้ แล้วกดพิมพ์อีกครั้ง");
        w.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${esc(model.title)}</title><link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet"><style>${css}</style></head><body>${bodyHtml(model)}</body></html>`);
        w.document.close();
        setTimeout(() => { w.focus(); w.print(); }, 700);
        return;
      }
      btn.disabled = true;
      if(a === "xlsx"){
        await loadScript(XLSX_URL);
        XLSX.writeFile(xlsxBook(model), fileName("xlsx"));
      }else if(a === "pdf"){
        await loadScript(PDF_URL);
        const box = document.createElement("div");
        box.style.cssText = "position:fixed;left:-10000px;top:0;width:720px;background:#fff";
        box.innerHTML = `<style>${css}</style>${bodyHtml(model)}`;
        document.body.appendChild(box);
        try{
          await html2pdf().set({ margin:10, filename:fileName("pdf"), image:{ type:"jpeg", quality:.95 }, html2canvas:{ scale:2 }, jsPDF:{ unit:"mm", format:"a4", orientation: model.head.length > 6 ? "landscape" : "portrait" } }).from(box).save();
        } finally { box.remove(); }
      }else if(a === "share"){
        await loadScript(XLSX_URL);
        const blob = new Blob([XLSX.write(xlsxBook(model), { bookType:"xlsx", type:"array" })], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const file = new File([blob], fileName("xlsx"), { type: blob.type });
        if(navigator.canShare && navigator.canShare({ files:[file] })){
          await navigator.share({ files:[file], title:model.title });
        }else if(navigator.share){
          await navigator.share({ title:model.title, text:summaryText(model) });
        }else{
          await navigator.clipboard.writeText(summaryText(model));
          toast("success", "คัดลอกสรุปคะแนนแล้ว", "นำไปวางในไลน์/อีเมลได้เลย");
        }
      }
    }catch(e){
      if(e && e.name === "AbortError") return;               // ผู้ใช้ยกเลิกหน้าต่างแชร์
      toast("error", "ทำรายการไม่สำเร็จ", (e && e.message) || "");
    }finally{ btn.disabled = false; }
  }

  return { render };
})();
