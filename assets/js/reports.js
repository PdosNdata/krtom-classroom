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
  let st = { view:"class", grade:null, unit:null, student:null };
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
    return v === "—" ? ' class="rp-c rp-none"' : ' class="rp-c"';
  }

  async function render(){
    const hash = location.hash;
    applyTextSize("p6");
    setBreadcrumb([{ label:"🏠 หน้าแรก", href:"#/" }, { label:"📊 ดูงานนักเรียน" }]);
    if(!KrtomContent.isTeacher()){ location.hash = "#/"; return; }
    app.innerHTML = `<div class="page-title">📊 ดูงานนักเรียน</div><div class="page-subtitle">กำลังโหลดคะแนน...</div>`;
    try{ await load(false); }
    catch(e){
      if(location.hash !== hash) return;
      const m = (e && e.message) || "";
      const msg = /PGRST202|Could not find the function/i.test(m) ? "ยังไม่ได้ติดตั้งระบบรายงานในฐานข้อมูล (ต้องรันไฟล์ SQL 20261001100000 และ 20261001120000 ใน Supabase)"
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

    model = st.view === "class" ? buildClass() : buildStudent();
    app.innerHTML = `
      <div class="page-title">📊 ดูงานนักเรียน</div>
      <div class="page-subtitle">คะแนนแบบทดสอบก่อนเรียน · ใบงาน · แบบทดสอบหลังเรียน (นับครั้งที่ได้คะแนนสูงสุด)</div>
      <div class="rp-wrap">
        <div class="rp-tabs">
          <button type="button" class="rp-tab ${st.view === "class" ? "on" : ""}" data-view="class">👥 รายชั้น</button>
          <button type="button" class="rp-tab ${st.view === "student" ? "on" : ""}" data-view="student">🧒 รายคน</button>
        </div>
        <div class="rp-filters">
          <label>ชั้น <select id="rp-grade">${gs.map(g => `<option value="${g.id}" ${g.id === st.grade ? "selected" : ""}>${esc(g.label)}</option>`).join("")}</select></label>
          ${st.view === "class"
            ? `<label>หน่วย <select id="rp-unit">${units.map(u => `<option value="${u.key}" ${u.key === st.unit ? "selected" : ""}>${esc(u.label)}</option>`).join("")}</select></label>`
            : `<label>นักเรียน <select id="rp-student">${stu.map(r => `<option value="${esc(r.code)}" ${r.code === st.student ? "selected" : ""}>${esc(r.seat + ". " + r.name)}</option>`).join("")}</select></label>`}
        </div>
        ${(st.view === "class" && !units.length) ? `<p class="flow-note">ชั้นนี้ยังไม่มีหน่วยที่เปิดระบบเรียนตามลำดับขั้น</p>` : `
        <div class="rp-title">${esc(model.title)}</div>
        <div class="rp-sub">${esc(model.subtitle)}</div>
        <div class="rp-scroll">${tableHtml(model)}</div>`}
        <div class="rp-actions">
          <button type="button" data-act="print">🖨️ พิมพ์</button>
          <button type="button" data-act="xlsx">📊 Excel</button>
          <button type="button" data-act="pdf">📄 PDF</button>
          <button type="button" data-act="share">📤 แชร์</button>
          <button type="button" data-act="refresh">🔄 โหลดใหม่</button>
        </div>
        <p class="flow-note">PDF/พิมพ์: ตารางที่เห็นอยู่ตอนนี้ · Excel: มีคะแนนและคะแนนเต็มแยกคอลัมน์</p>
      </div>`;
    app.querySelectorAll(".rp-tab").forEach(b => b.onclick = () => { st.view = b.dataset.view; draw(); });
    const g = document.getElementById("rp-grade"); if(g) g.onchange = () => { st.grade = g.value; draw(); };
    const u = document.getElementById("rp-unit"); if(u) u.onchange = () => { st.unit = u.value; draw(); };
    const s = document.getElementById("rp-student"); if(s) s.onchange = () => { st.student = s.value; draw(); };
    app.querySelectorAll(".rp-actions button").forEach(b => b.onclick = () => act(b.dataset.act, b));
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
      if(a === "refresh"){ data = null; return render(); }
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
