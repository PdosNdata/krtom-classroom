/* submitwork.js — เก็บ "งานที่นักเรียนส่ง" (คำตอบทั้งชุด + ลิงก์งานที่ทำ + คะแนนที่ระบบตรวจ) ไว้ให้ครูเปิดดู
 * ห่อ KrtomFlow.submit ของหน้าใบงาน: เมื่อนักเรียนที่ล็อกอินกดส่งสำเร็จ ส่งสำเนาคำตอบไป krtom_submit_work
 * (ต้องรัน supabase/20261031100000_krtom_submissions.sql — ถ้ายังไม่รัน จะข้ามเงียบ ๆ ไม่กระทบการส่งคะแนน)
 * โหลดต่อท้ายหลัง flow.js ในหน้าใบงานทุกใบ
 */
(function(){
  const m = /(worksheet-\d+-\d+)\.html$/.exec(location.pathname);
  if(!m || !window.KrtomFlow) return;
  const act = m[1], orig = KrtomFlow.submit;
  const clean = (t) => String(t || "").replace(/\s+/g, " ").trim();
  function collect(){
    const out = [], items = window.__wsItems || {};      // ผลตรวจรายข้อที่หน้าใบงานจดไว้ (ถ้ามี)
    document.querySelectorAll("textarea").forEach((ta, i) => {
      const text = ta.value.trim(); if(!text) return;
      const f = ta.closest(".field, .sec, .card, section") || ta.parentElement, lb = (ta.id && document.querySelector('label[for="' + ta.id + '"]')) || (f && f.querySelector("label, h2, h3, .q"));
      const it = items.ta && items.ta[i], row = { q: clean(lb ? lb.textContent : "") || ("ข้อ " + (i + 1)), a: text };
      if(it){ row.ok = it.ok; if(it.hint) row.hint = it.hint; }
      out.push(row);
    });
    // ใบงาน 2.8: ข้อกรอกค่า/เลือกค่า (.q[data-k])
    document.querySelectorAll(".q[data-k]").forEach(q => {
      const el = q.querySelector("input, select"); if(!el) return;
      out.push({ q: clean((q.querySelector(".no") || {}).textContent) + " " + clean((q.querySelector(".t") || {}).textContent), a: (el.value || "").trim() || "(ไม่ได้ตอบ)" });
    });
    // ปรนัย (ใบงาน 2.1): ข้อความคำถาม + ตัวเลือกที่เลือก
    const p1 = document.getElementById("p1-score"); if(p1) out.push({ q: "ตอนที่ 1 จับคู่คำศัพท์", a: "จับคู่ถูก " + p1.textContent + "/" + document.querySelectorAll(".dropzone").length });
    document.querySelectorAll(".mcq").forEach((q, j) => {
      const c = q.querySelector("input[type=radio]:checked");
      const it = items.mcq && items.mcq[j], row = { q: clean((q.querySelector(".q") || {}).textContent), a: c ? clean(c.closest("label").textContent) : "(ไม่ได้ตอบ)" };
      if(it) row.ok = it.ok;
      out.push(row);
    });
    return out;
  }
  async function send(u, score, total){
    const answers = collect();
    if(!answers.length || KrtomFlow.mode() !== "student") return;
    try{ await KrtomFlow.rpc("krtom_submit_work", { p_token: sessionStorage.getItem("krtomStudentToken"), p_grade: u.g, p_subject: u.s, p_unit: u.i, p_activity: act, p_answers: answers, p_score: score, p_max: total }); }
    catch(e){ /* ยังไม่ได้ติดตั้ง SQL / ออฟไลน์: ข้ามไป */ }
  }
  window.KrtomSubmitWork = send;   // ใบงานที่ไม่ได้ส่งผ่าน KrtomFlow.submit (เช่น 2.1) เรียกใช้เอง
  // ส่งแล้วส่งซ้ำไม่ได้ จนกว่าครูจะเปิดสิทธิ์ (ถามเซิร์ฟเวอร์ ถ้ายังไม่ได้ติดตั้ง SQL หรือออฟไลน์ ให้ข้ามไป)
  async function canSubmit(){
    if(KrtomFlow.mode() !== "student") return true;
    try{ return (await KrtomFlow.rpc("krtom_work_can_submit", { p_token: sessionStorage.getItem("krtomStudentToken"), p_activity: act })) !== false; }
    catch(e){ return true; }
  }
  window.addEventListener("load", async () => {
    if(await canSubmit()) return;
    document.querySelectorAll("#submit, #check-btn").forEach(b => { b.disabled = true; b.style.opacity = ".5"; b.style.cursor = "not-allowed"; });
    const n = document.createElement("div");
    n.style.cssText = "max-width:740px;margin:12px auto;padding:10px 16px;border-radius:14px;background:#ECFDF5;border:2px solid #34D399;color:#065F46;font-weight:700;text-align:center";
    n.textContent = "✅ ส่งใบงานนี้แล้ว — ส่งซ้ำไม่ได้ ถ้าต้องการแก้ไขหรือทำใหม่ ให้ขอครูเปิดสิทธิ์ส่งใหม่";
    const m = document.querySelector("main"); if(m) m.insertBefore(n, m.firstChild);
  });
  KrtomFlow.submit = async function(u, type, score, total){
    if(type === "worksheet" && !(await canSubmit())) throw new Error("ส่งใบงานนี้แล้ว");
    const r = await orig.apply(this, arguments);
    if(type === "worksheet") await send(u, score, total);
    return r;
  };
})();
