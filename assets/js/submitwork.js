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
    const out = [];
    document.querySelectorAll("textarea").forEach((ta, i) => {
      const text = ta.value.trim(); if(!text) return;
      const f = ta.closest(".field, .sec, .card, section") || ta.parentElement, lb = (ta.id && document.querySelector('label[for="' + ta.id + '"]')) || (f && f.querySelector("label, h2, h3, .q"));
      out.push({ q: clean(lb ? lb.textContent : "") || ("ข้อ " + (i + 1)), a: text });
    });
    // ใบงาน 2.8: ข้อกรอกค่า/เลือกค่า (.q[data-k])
    document.querySelectorAll(".q[data-k]").forEach(q => {
      const el = q.querySelector("input, select"); if(!el) return;
      out.push({ q: clean((q.querySelector(".no") || {}).textContent) + " " + clean((q.querySelector(".t") || {}).textContent), a: (el.value || "").trim() || "(ไม่ได้ตอบ)" });
    });
    // ปรนัย (ใบงาน 2.1): ข้อความคำถาม + ตัวเลือกที่เลือก
    const p1 = document.getElementById("p1-score"); if(p1) out.push({ q: "ตอนที่ 1 จับคู่คำศัพท์", a: "จับคู่ถูก " + p1.textContent + "/" + document.querySelectorAll(".dropzone").length });
    document.querySelectorAll(".mcq").forEach(q => {
      const c = q.querySelector("input[type=radio]:checked");
      out.push({ q: clean((q.querySelector(".q") || {}).textContent), a: c ? clean(c.closest("label").textContent) : "(ไม่ได้ตอบ)" });
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
  KrtomFlow.submit = async function(u, type, score, total){
    const r = await orig.apply(this, arguments);
    if(type === "worksheet") await send(u, score, total);
    return r;
  };
})();
