/* formquiz.js — แบบทดสอบสไตล์ Google Form (อ่านข้อสอบจาก window.FORM_QUIZ ในไฟล์ data.js ของแต่ละหน่วย)
 *
 * รูปแบบข้อมูล (ดูตัวอย่างใน content/m2-design-1/data.js):
 *   FORM_QUIZ = {
 *     title, description, back:"ลิงก์กลับ", passPercent:60, showAnswers:true, shuffleOptions:false, sample:false,
 *     questions:[
 *       { type:"section", title:"ตอนที่ 1", description:"..." },
 *       { type:"choice",    q:"...", options:["ก","ข","ค","ง"], answer:1,        points:1, explain:"...", image:"รูป.webp" },
 *       { type:"checkbox",  q:"...", options:[...],            answer:[0,2],      points:2 },
 *       { type:"dropdown",  q:"...", options:[...],            answer:0 },
 *       { type:"truefalse", q:"...",                           answer:true },
 *       { type:"short",     q:"...",                           answers:["คำตอบ1","คำตอบ2"] },
 *       { type:"paragraph", q:"...",                           sample:"แนวคำตอบ (ครูตรวจเอง ไม่นับคะแนน)" }
 *     ]
 *   }
 * answer ของ choice/dropdown = ลำดับตัวเลือก เริ่มที่ 0 ; checkbox = รายการลำดับ ; required ค่าเริ่มต้น = จริง
 */
(function(){
  const D = window.FORM_QUIZ || {};
  const root = document.getElementById("fq-app");
  if(!root) return;
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const norm = (s) => String(s == null ? "" : s).trim().toLowerCase().replace(/\s+/g, "");
  const safeSrc = (u) => { u = String(u || "").trim(); return u && !/^\s*(javascript|data|vbscript):/i.test(u) ? u : ""; };
  const ss = (k) => { try{ return sessionStorage.getItem(k); }catch(e){ return null; } };
  const isTeacher = ss("loggedInRole") === "teacher";
  const SB_URL = "https://dhufwdxxfbahovnmjgrc.supabase.co/rest/v1/rpc/", SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRodWZ3ZHh4ZmJhaG92bm1qZ3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MTIwODAsImV4cCI6MjA2OTM4ODA4MH0.V-7Jlkq5ucQBznGXjtUKCse8sLLnNJ0mDTlcgme8G0c";
  async function rpc(name, args){
    const r = await fetch(SB_URL + name, { method:"POST", headers:{ apikey:SB_KEY, Authorization:"Bearer " + SB_KEY, "Content-Type":"application/json" }, body: JSON.stringify(args) });
    let j = null; try{ j = await r.json(); }catch(e){}
    if(!r.ok) throw new Error((j && j.message) || ("HTTP " + r.status));
    return j;
  }
  const shuffle = (a) => { a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const Q = (D.questions || []).filter(Boolean);
  const items = Q.filter(q => q.type !== "section");
  const maxScore = items.reduce((s, q) => s + (q.type === "paragraph" ? 0 : (q.points == null ? 1 : q.points)), 0);
  const letters = ["ก.", "ข.", "ค.", "ง.", "จ.", "ฉ.", "ช.", "ซ."];
  let submitted = false;
  const optObj = (o) => (o && typeof o === "object") ? o : { text: o };
  const optText = (q, k) => { const o = optObj(q.options[k]); return o.text != null ? String(o.text) : (o.alt || ("ตัวเลือก " + (letters[k] || (k + 1)).replace(".", ""))); };
  const optInner = (o) => { o = optObj(o); return (o.img && safeSrc(o.img) ? `<img class="fq-oimg" src="${esc(safeSrc(o.img))}" alt="${esc(o.alt || "")}">` : "") + (o.text != null ? esc(o.text) : ""); };

  if(D.title) document.title = D.title;
  if(!items.length){
    root.innerHTML = `<div class="fq-card fq-head"><h1>${esc(D.title || "แบบทดสอบ")}</h1><p>${esc(D.description || "")}</p></div><div class="fq-card fq-empty">📝 ยังไม่มีข้อสอบในหน่วยนี้<br><small>(อยู่ระหว่างจัดทำ)</small></div>`;
    return;
  }

  async function boot(){
    const tok = ss("krtomStudentToken");
    if(D.once && D.scoreAs && D.unit && ss("loggedInRole") === "student" && tok){
      root.innerHTML = '<div class="fq-card fq-empty">กำลังตรวจสอบ...</div>';
      try{
        const rows = await rpc("krtom_my_exam_score", { p_token: tok, p_grade: D.unit.g, p_subject: D.unit.s, p_unit: D.unit.i, p_type: D.scoreAs });
        const r = Array.isArray(rows) ? rows[0] : rows;
        if(r){
          const pct = r.total ? Math.round(r.score * 100 / r.total) : 0;
          const d = r.created_at ? new Date(r.created_at).toLocaleString("th-TH", { dateStyle:"long", timeStyle:"short" }) : "";
          root.innerHTML = `<div class="fq-card fq-head"><h1>${esc(D.title || "แบบทดสอบ")}</h1></div>
            <div class="fq-card fq-result"><div style="font-size:2.4em">✅</div><div style="font-weight:700">คุณทำแบบทดสอบนี้แล้ว</div>
            <div class="fq-score">${r.score} / ${r.total}</div><div class="fq-bar"><i style="width:${pct}%"></i></div>
            <div style="font-weight:700">${pct}%</div>${d ? `<div class="fq-meta" style="border:0">ส่งเมื่อ ${esc(d)}</div>` : ""}
            <div class="fq-meta" style="border:0">แบบทดสอบนี้ทำได้ครั้งเดียว หากต้องการทำใหม่ ให้แจ้งครู</div></div>`;
          return;
        }
      }catch(e){ /* เช็กไม่ได้ → ให้ทำต่อ ฝั่งเซิร์ฟเวอร์จะกันส่งซ้ำอยู่ดี */ }
    }
    start();
  }
  function start(){
  // ---------------------------------------------------------------- สร้างฟอร์ม
  let html = "", no = 0;
  html += `${D.sample ? `<div class="fq-sample">⚠️ นี่คือข้อสอบตัวอย่างเพื่อแสดงรูปแบบ — ครูจะนำข้อสอบจริงมาแทน</div>` : ""}
    <div class="fq-card fq-head">
      <h1>${esc(D.title || "แบบทดสอบ")}</h1>
      ${D.description ? `<p>${esc(D.description)}</p>` : ""}
      <div class="fq-meta">${items.length} ข้อ · คะแนนเต็ม ${maxScore} คะแนน${D.passPercent ? ` · เกณฑ์ผ่าน ${D.passPercent}%` : ""}</div>
      <div style="margin-top:14px"><div class="fq-qt" style="margin-bottom:4px">ชื่อ-สกุล<span class="fq-star">*</span></div>
        <input class="fq-field" id="fq-name" type="text" placeholder="คำตอบของคุณ" value="${esc(ss("loggedInUserName") || "")}"></div>
      <div class="fq-req-note">* ต้องตอบคำถามนี้</div>
    </div>`;
  Q.forEach((q, i) => {
    if(q.type === "section"){
      html += `<div class="fq-card fq-sec"><h2>${esc(q.title || "")}</h2>${q.description ? `<p>${esc(q.description)}</p>` : ""}</div>`;
      return;
    }
    no++;
    const req = q.required !== false;
    const pts = q.type === "paragraph" ? "" : `<span class="fq-pts">(${q.points == null ? 1 : q.points} คะแนน)</span>`;
    const order = (q.options || []).map((_, k) => k);
    const ord = D.shuffleOptions && (q.type === "choice" || q.type === "checkbox") ? shuffle(order) : order;
    let body = "";
    if(q.type === "choice" || q.type === "checkbox"){
      const t = q.type === "choice" ? "radio" : "checkbox";
      body = ord.map((k, pos) => `<label class="fq-opt" data-k="${k}"><input type="${t}" name="q${i}" value="${k}"><span class="fq-ot">${(D.letters === false) ? "" : esc(letters[pos] || "") + " "}${optInner(q.options[k])}</span></label>`).join("");
    }else if(q.type === "truefalse"){
      body = `<label class="fq-opt" data-k="1"><input type="radio" name="q${i}" value="1"><span>ถูก</span></label><label class="fq-opt" data-k="0"><input type="radio" name="q${i}" value="0"><span>ผิด</span></label>`;
    }else if(q.type === "dropdown"){
      body = `<select class="fq-field" name="q${i}"><option value="">เลือก</option>${(q.options || []).map((o, k) => `<option value="${k}">${esc(optObj(o).text != null ? optObj(o).text : optObj(o).alt)}</option>`).join("")}</select>`;
    }else if(q.type === "short"){
      body = `<input class="fq-field" type="text" name="q${i}" placeholder="คำตอบของคุณ" autocomplete="off">`;
    }else{
      body = `<textarea class="fq-field" name="q${i}" placeholder="คำตอบของคุณ"></textarea>`;
    }
    html += `<section class="fq-card fq-q" data-i="${i}" data-req="${req ? 1 : 0}">
      ${q.context ? `<div class="fq-ctx">${esc(q.context)}</div>` : ""}
      <div class="fq-qt"><span class="fq-no">${no}.</span>${esc(q.q)}${req ? '<span class="fq-star">*</span>' : ""}${pts}</div>
      ${q.image && safeSrc(q.image) ? `<img class="fq-img" src="${esc(safeSrc(q.image))}" alt="">` : ""}
      ${body}
      <div class="fq-msg">⚠ ต้องตอบคำถามนี้</div>
      <div class="fq-fb" style="display:none"></div>
    </section>`;
  });
  html += `<div class="fq-actions"><button type="button" class="fq-btn" id="fq-submit">ส่ง</button><button type="button" class="fq-link" id="fq-clear">ล้างแบบฟอร์ม</button></div>`;
  root.innerHTML = `<div id="fq-result-slot"></div>${html}`;

  // บาร์ด้านบน (ครู: ปุ่มดูเฉลย)
  const top = document.querySelector(".fq-top .sp");
  if(top && isTeacher){
    const b = document.createElement("button"); b.type = "button"; b.textContent = "👩‍🏫 โหมดครู: แสดงเฉลย"; b.onclick = () => showKey();
    top.after(b);
  }

  // ---------------------------------------------------------------- ตอบ / ตรวจ
  const card = (i) => root.querySelector(`.fq-q[data-i="${i}"]`);
  function getAns(i){
    const q = Q[i], c = card(i);
    if(q.type === "checkbox") return [...c.querySelectorAll("input:checked")].map(x => +x.value);
    if(q.type === "choice" || q.type === "truefalse"){ const x = c.querySelector("input:checked"); return x ? +x.value : null; }
    if(q.type === "dropdown"){ const v = c.querySelector("select").value; return v === "" ? null : +v; }
    if(q.type === "short") return c.querySelector("input").value.trim();
    return c.querySelector("textarea").value.trim();
  }
  const answered = (q, a) => q.type === "checkbox" ? a.length > 0 : (q.type === "short" || q.type === "paragraph") ? a !== "" : a !== null;
  function keyText(q){
    if(q.type === "choice" || q.type === "dropdown") return optText(q, q.answer);
    if(q.type === "checkbox") return (q.answer || []).map(k => optText(q, k)).join(" , ");
    if(q.type === "truefalse") return q.answer ? "ถูก" : "ผิด";
    if(q.type === "short") return (q.answers || []).join("  /  ");
    return q.sample || "";
  }
  function grade(q, a){
    if(q.type === "paragraph") return { manual:true };
    let ok = false;
    if(q.type === "choice" || q.type === "dropdown") ok = a === q.answer;
    else if(q.type === "truefalse") ok = a === (q.answer ? 1 : 0);
    else if(q.type === "checkbox"){ const k = (q.answer || []).slice().sort().join(","); ok = a.slice().sort().join(",") === k; }
    else if(q.type === "short") ok = (q.answers || []).some(x => norm(x) === norm(a));
    return { ok };
  }
  // เลือกแล้วไฮไลต์ตัวเลือก
  root.addEventListener("change", (e) => {
    if(submitted) return;
    const c = e.target.closest(".fq-q"); if(!c) return;
    c.querySelectorAll(".fq-opt").forEach(l => l.classList.toggle("sel", !!l.querySelector("input:checked")));
    c.classList.remove("missing");
  });
  root.addEventListener("input", (e) => { const c = e.target.closest && e.target.closest(".fq-q"); if(c && !submitted) c.classList.remove("missing"); });

  function lockAndMark(reveal, keyOnly){
    Q.forEach((q, i) => {
      if(q.type === "section") return;
      const c = card(i), fb = c.querySelector(".fq-fb"), a = getAns(i), g = grade(q, a);
      c.querySelectorAll("input,select,textarea").forEach(x => x.disabled = true);
      if(keyOnly){ /* โหมดครู: ไม่มีคำตอบนักเรียน ไม่ขึ้นถูก/ผิด */ }
      else if(g.manual){ c.classList.add("manual"); }
      else c.classList.add(g.ok ? "right" : "wrong");
      let opts = "";
      if(q.type === "choice" || q.type === "dropdown" || q.type === "truefalse" || q.type === "checkbox"){
        const keys = q.type === "checkbox" ? (q.answer || []) : q.type === "truefalse" ? [q.answer ? 1 : 0] : [q.answer];
        const mine = q.type === "checkbox" ? a : [a];
        c.querySelectorAll(".fq-opt").forEach(l => {
          const k = +l.dataset.k;
          if(keys.includes(k)) l.classList.add("is-correct");
          else if(!keyOnly && mine.includes(k)) l.classList.add("is-wrong");
        });
      }
      if(reveal !== false && D.showAnswers !== false){
        const tag = keyOnly ? "" : g.manual ? '<span class="tag manual">ครูตรวจ</span>' : g.ok ? '<span class="tag right">✓ ถูก</span>' : '<span class="tag wrong">✗ ผิด</span>';
        const pts = (keyOnly || g.manual) ? "" : ` ${g.ok ? (q.points == null ? 1 : q.points) : 0}/${q.points == null ? 1 : q.points} คะแนน`;
        const mineTxt = (q.type === "short" || q.type === "paragraph") ? (a || "(ไม่ได้ตอบ)")
          : q.type === "checkbox" ? (a.map(k => optText(q, k)).join(" , ") || "(ไม่ได้ตอบ)")
          : q.type === "truefalse" ? (a === null ? "(ไม่ได้ตอบ)" : a ? "ถูก" : "ผิด") : (a === null ? "(ไม่ได้ตอบ)" : optText(q, a));
        fb.style.display = "block";
        fb.innerHTML = `${tag}<b>${pts}</b>
          ${(keyOnly || g.ok) ? "" : `<div>คำตอบของคุณ: ${esc(mineTxt)}</div>`}
          ${g.manual ? (q.sample ? `<div class="fq-key">แนวคำตอบ: ${esc(q.sample)}</div>` : "") : `<div class="fq-key">เฉลย: ${esc(keyText(q))}</div>`}
          ${q.explain ? `<div class="fq-exp">💡 ${esc(q.explain)}</div>` : ""}`;
      }
    });
  }

  function submit(){
    const name = document.getElementById("fq-name");
    let firstMissing = null;
    if(!name.value.trim()){ name.style.borderBottomColor = "#D93025"; firstMissing = name; }
    Q.forEach((q, i) => {
      if(q.type === "section") return;
      const c = card(i), a = getAns(i);
      const miss = c.dataset.req === "1" && !answered(q, a);
      c.classList.toggle("missing", miss);
      if(miss && !firstMissing) firstMissing = c;
    });
    if(firstMissing){ firstMissing.scrollIntoView({ behavior:"smooth", block:"center" }); return; }
    submitted = true;
    let score = 0;
    Q.forEach((q, i) => { if(q.type === "section") return; const g = grade(q, getAns(i)); if(!g.manual && g.ok) score += (q.points == null ? 1 : q.points); });
    lockAndMark();
    const pct = maxScore ? Math.round(score * 100 / maxScore) : 0;
    const pass = D.passPercent ? pct >= D.passPercent : true;
    const msg = pct === 100 ? "🌟 ยอดเยี่ยมมาก! ถูกครบทุกข้อ" : pass ? "👏 ผ่านเกณฑ์ เก่งมาก" : "💪 ลองทบทวนเนื้อหาแล้วทำใหม่อีกครั้งนะ";
    const slot = document.getElementById("fq-result-slot");
    slot.innerHTML = `<div class="fq-card fq-result ${pass ? "" : "fail"}">
        <div style="color:#5F6368">คะแนนของ ${esc(name.value.trim())}</div>
        <div class="fq-score">${score} / ${maxScore}</div>
        <div class="fq-bar"><i style="width:${pct}%"></i></div>
        <div style="font-weight:700">${pct}% — ${msg}</div>
        ${items.some(q => q.type === "paragraph") ? '<div class="fq-meta" style="border:0">* ข้อเขียนอธิบายไม่นับในคะแนนอัตโนมัติ ครูตรวจเอง</div>' : ""}
        <div class="fq-actions" style="justify-content:center;margin-top:14px">${D.once && D.scoreAs && ss("loggedInRole") === "student" ? "" : '<button type="button" class="fq-btn" onclick="location.reload()">🔄 ทำใหม่อีกครั้ง</button>'}<button type="button" class="fq-link" onclick="window.print()">🖨️ พิมพ์ผล</button></div>
      </div>`;
    document.getElementById("fq-submit").disabled = true;
    document.getElementById("fq-clear").style.display = "none";
    window.scrollTo({ top:0, behavior:"smooth" });
    saveScore(score, slot.querySelector(".fq-result"));
  }

  // ส่งคะแนนเข้า Supabase (ตาราง krtom_scores) เมื่อเป็นนักเรียนที่ล็อกอิน — D.scoreAs = "pretest" | "posttest", D.unit = {g,s,i}
  async function saveScore(score, host){
    if(!D.scoreAs || !D.unit || !host) return;
    const box = document.createElement("div"); box.className = "fq-meta"; box.style.cssText = "border:0;margin-top:10px;font-weight:700"; host.appendChild(box);
    const role = ss("loggedInRole"), tok = ss("krtomStudentToken");
    const typeTh = D.scoreAs === "pretest" ? "แบบทดสอบก่อนเรียน" : "แบบทดสอบหลังเรียน";
    if(role === "teacher"){ box.textContent = "👩‍🏫 โหมดครู: ไม่บันทึกคะแนน"; return; }
    if(role !== "student" || !tok){ box.textContent = "ℹ️ ยังไม่ได้เข้าสู่ระบบนักเรียน คะแนนจึงไม่ถูกบันทึก"; box.style.color = "#B45309"; return; }
    box.textContent = "กำลังบันทึกคะแนน..."; box.style.color = "#5F6368";
    try{
      await rpc("krtom_submit_exam", { p_token: tok, p_grade: D.unit.g, p_subject: D.unit.s, p_unit: D.unit.i, p_type: D.scoreAs, p_score: score, p_total: maxScore });
      box.textContent = "✅ บันทึกคะแนน" + typeTh + "แล้ว (ทำได้ครั้งเดียว)"; box.style.color = "#137333";
    }catch(e){
      const m = (e && e.message) || "";
      box.style.color = "#D93025";
      box.textContent = /หมดเวลาเข้าสู่ระบบ/.test(m) ? "หมดเวลาเข้าสู่ระบบ กรุณาออกจากระบบแล้วเข้าใหม่ คะแนนยังไม่ถูกบันทึก"
        : /ทำแบบทดสอบนี้แล้ว/.test(m) ? "คุณเคยส่งแบบทดสอบนี้แล้ว (ทำได้ครั้งเดียว) คะแนนครั้งแรกยังคงอยู่"
        : /PGRST202|Could not find the function/i.test(m) ? "ระบบเก็บคะแนนยังไม่ได้ติดตั้งในฐานข้อมูล (ครูต้องรันไฟล์ SQL)"
        : "บันทึกคะแนนไม่สำเร็จ (ตรวจสอบอินเทอร์เน็ต)";
    }
  }
  function showKey(){
    if(submitted) return;
    submitted = true;
    lockAndMark(true, true);
    document.getElementById("fq-submit").disabled = true;
    document.getElementById("fq-clear").style.display = "none";
    document.getElementById("fq-result-slot").innerHTML = `<div class="fq-sample">👩‍🏫 โหมดครู: แสดงเฉลยทุกข้อ (กด "ทำใหม่" โดยรีเฟรชหน้า)</div>`;
  }
  document.getElementById("fq-submit").onclick = submit;
  document.getElementById("fq-clear").onclick = () => { if(confirm("ล้างคำตอบทั้งหมด?")) location.reload(); };
  }
  boot();
})();
