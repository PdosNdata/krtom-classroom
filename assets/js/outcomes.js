/* outcomes.js — ป้าย "ทำแล้วได้ตามจุดประสงค์ข้อใด" + คำถามวิจารณ์ท้ายใบงาน (ม.1 หน่วย 2)
 * รหัส: O = จุดประสงค์ · C = สมรรถนะสำคัญ 5 ด้าน · R = การอ่าน คิดวิเคราะห์ และเขียนสื่อความ (ตัวชี้วัด ม.1–3)
 * แผนที่ชิ้นงาน → รหัส อยู่ที่ PAGES / QUIZ_MAP (ชุดเดียวกับที่จะส่งเข้าฐานข้อมูล ดู แผนงาน/แผนจุดประสงค์-...html)
 * ใช้ได้กับหน้าใน content/m1-cs-1/ เท่านั้น ใส่ <script src="../../assets/js/outcomes.js"></script> ท้ายหน้า (หลังสคริปต์ของหน้า)
 */
(function(){
  const O = {
    O1: "อธิบายหลักการเขียนโปรแกรมและความแตกต่างของโปรแกรมภาษาต่าง ๆ ได้",
    O2: "อธิบายซอฟต์แวร์ที่ใช้เขียนโปรแกรม และแนวคิดเรื่องตัวแปร เงื่อนไข วนซ้ำได้",
    O3: "ออกแบบอัลกอริทึมและเขียนโปรแกรมอย่างง่ายเพื่อแก้ปัญหาทางคณิตศาสตร์ได้"
  };
  const C = { C1:"สื่อสาร", C2:"การคิด", C3:"แก้ปัญหา", C4:"ทักษะชีวิต", C5:"เทคโนโลยี" };
  const R = {
    R1:"คัดสรรสื่อ/อ่านแล้วนำไปใช้", R2:"จับประเด็นสำคัญ", R3:"วิเคราะห์ วิจารณ์ ความสมเหตุสมผล",
    R4:"สรุปคุณค่า แนวคิด แง่คิด", R5:"เขียนสื่อสารด้วยผังงาน/รหัส/โค้ด"
  };

  const PAGES = {
    "knowledge":        { o:["O1","O2","O3"], c:["C1","C5"],            r:["R1","R2"],            what:"ใบความรู้นี้" },
    "variable-slides":  { o:["O2"],           c:["C1","C5"],            r:["R1"],                 what:"สไลด์นี้" },
    "worksheet-2-1":    { o:["O1"],           c:["C1","C2"],            r:["R1","R2"],            what:"ใบงานนี้" },
    "worksheet-2-2":    { o:["O2","O3"],      c:["C2","C3","C5"],       r:["R1","R2","R3","R5"],  what:"ใบงานนี้", crit:[
      "ถ้าสลับลำดับขั้นตอนในโจทย์นี้ (เช่น ทำขั้นหลังก่อนขั้นแรก) ผลลัพธ์ยังสมเหตุสมผลหรือไม่ เพราะอะไร",
      "ทำไมโจทย์นี้ใช้โครงสร้างแบบเรียงลำดับก็เพียงพอ ไม่จำเป็นต้องใช้เงื่อนไขหรือการทำซ้ำ" ] },
    "worksheet-2-3":    { o:["O2","O3"],      c:["C2","C3","C5"],       r:["R1","R2","R3","R5"],  what:"ใบงานนี้", crit:[
      "ลองใส่ค่านำเข้าที่ต่างกันมาก ๆ (เช่น ค่าต่ำสุดกับค่าสูงสุดที่เป็นไปได้) ผลลัพธ์ที่ได้สมเหตุสมผลหรือไม่ เพราะอะไร",
      "ถ้าไม่เรียงลำดับ รับค่า → ประมวลผล → แสดงผล โปรแกรมจะมีปัญหาอย่างไร" ] },
    "worksheet-2-4":    { o:["O2","O3"],      c:["C2","C3","C5"],       r:["R1","R2","R3","R4","R5"], what:"ใบงานนี้", crit:[
      "ถ้านักเรียนสูงเท่ากับ 120 พอดี โปรแกรมของเราตัดสินอย่างไร เงื่อนไขแบบนี้เหมาะสมหรือไม่ เพราะอะไร",
      "ถ้าสวนสัตว์ต้องการแบ่งราคาตั๋วเป็น 3 ช่วงส่วนสูง โครงสร้างเงื่อนไขควรเปลี่ยนอย่างไร" ] },
    "worksheet-2-5":    { o:["O2","O3"],      c:["C2","C3","C5"],       r:["R1","R2","R3","R4","R5"], what:"ใบงานนี้", crit:[
      "คนที่ได้ 80 คะแนนพอดีจะได้รางวัลหรือไม่ ผลนี้ยุติธรรมและสมเหตุสมผลหรือไม่ เพราะอะไร",
      "เปรียบเทียบข้อดีข้อเสียของเงื่อนไข \"มากกว่า 80\" กับ \"มากกว่าหรือเท่ากับ 80\"" ] },
    "worksheet-2-6":    { o:["O2","O3"],      c:["C2","C3","C5"],       r:["R1","R2","R3","R4","R5"], what:"ใบงานนี้", crit:[
      "ถ้าเปลี่ยนจำนวนรอบที่วนซ้ำเป็นค่าอื่น ผลลัพธ์จะเปลี่ยนอย่างไร และยังสมเหตุสมผลกับโจทย์หรือไม่",
      "เขียนคำสั่งซ้ำทีละบรรทัดกับใช้การวนซ้ำ แบบไหนดีกว่า มีข้อดีข้อเสียอย่างไร" ] },
    "worksheet-2-7":    { o:["O2","O3"],      c:["C2","C3","C5"],       r:["R1","R2","R3","R4","R5"], what:"ใบงานนี้", crit:[
      "ถ้ากำหนดจำนวนรอบผิด (เช่น 0 รอบ หรือไม่มีวันจบ) จะเกิดอะไรขึ้น และถือว่าสมเหตุสมผลหรือไม่",
      "โจทย์นี้เหมาะกับการวนซ้ำมากกว่าเงื่อนไขหรือไม่ เพราะอะไร" ] },
    "worksheet-2-8":    { o:["O2"],           c:["C2","C3","C5"],       r:["R1","R3","R5"],       what:"ใบงานนี้", crit:[
      "ถ้า apple = 5 แล้วสั่ง SET apple = 0 ค่าเดิมหายไปไหม เทียบกับการเทผลไม้ออกจากตะกร้าในชีวิตจริงสมเหตุสมผลหรือไม่",
      "ถ้าโปรแกรมไม่มีตัวแปรเลย จะมีข้อเสียอย่างไร ยกตัวอย่างประกอบ" ] },
    "quiz":             { o:["O1","O2","O3"], c:["C1","C2","C3"],       r:["R1","R2","R3","R4","R5"], what:"แบบทดสอบนี้" },
    "game":             { o:["O1"],           c:["C1","C2"],           r:["R1"],                 what:"เกมนี้" },
    "game-scratch":     { o:["O2","O3"],      c:["C2","C5"],            r:["R1","R2"],            what:"เกมนี้" },
    "game-variable":    { o:["O2"],           c:["C2","C3","C4","C5"],  r:["R3"],                 what:"เกมนี้" },
    "game-variable-jump": { o:["O2"],         c:["C2","C3","C4","C5"],  r:["R3"],                 what:"เกมนี้" },
    "blocks":           { o:["O3"],           c:["C3","C5"],            r:["R5"],                 what:"โปรแกรมนี้" },
    "flowchart":        { o:["O3"],           c:["C3","C5"],            r:["R5"],                 what:"โปรแกรมนี้" },
    "pseudocode":       { o:["O3"],           c:["C3","C5"],            r:["R5"],                 what:"โปรแกรมนี้" }
  };
  // ข้อสอบปรนัยรายข้อ (key = รหัสเสียงของข้อ เพราะข้อถูกสลับลำดับทุกครั้ง)
  const QUIZ_MAP = {
    "quiz-0":["O3","R2"],"quiz-1":["O3","R2"],"quiz-2":["O3","R2"],"quiz-3":["O3","R1"],"quiz-4":["O2","R1"],
    "quiz-5":["O1","R1"],"quiz-6":["O1","R1"],"quiz-7":["O1","R1"],"quiz-8":["O1","R1"],"quiz-9":["O1","R1"],
    "quiz-10":["O3","R3"],"quiz-11":["O3","R3"],"quiz-12":["O3","R3"],"quiz-13":["O2","R4"],"quiz-14":["O3","R2"],
    "quiz-15":["O3","R3"],"quiz-16":["O2","R3"],"quiz-17":["O2","R3"],"quiz-18":["O2","R3"],"quiz-19":["O2","R4"],
    "quiz-20":["O2","R1"],"quiz-21":["O2","R3"],"quiz-22":["O2","R3"]
  };

  const file = (location.pathname.split("/").pop() || "").replace(/\.html$/i, "");
  const cfg = PAGES[file];
  window.KrtomOutcomes = { PAGES, QUIZ_MAP, labels:{ O, C, R }, file };
  if(cfg) buildUI();
  setupEvidence();

  function buildUI(){

  const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const css = document.createElement("style");
  css.textContent = `
  .oc-box{ background:linear-gradient(135deg,#EFF6FF,#F5F3FF); border:2px solid #C7D2FE; border-radius:16px; padding:12px 16px; margin:0 0 16px; font-family:"Sarabun","TH Sarabun New",sans-serif; font-size:.88rem; line-height:1.65; color:#1F2430; box-shadow:0 3px 8px rgba(67,56,202,.08); text-align:left; }
  .oc-box .oc-h{ font-weight:800; color:#4338CA; margin-bottom:4px; }
  .oc-box .oc-row{ display:flex; flex-wrap:wrap; gap:4px 6px; align-items:center; margin-top:3px; }
  .oc-box .oc-lab{ font-weight:700; color:#475569; margin-right:2px; }
  .oc-box .oc-chip{ display:inline-block; border-radius:99px; padding:0 10px; font-weight:700; font-size:.78rem; }
  .oc-box .oc-o{ background:#FDE68A; color:#78350F; } .oc-box .oc-c{ background:#BBF7D0; color:#14532D; } .oc-box .oc-r{ background:#BFDBFE; color:#1E3A8A; }
  .oc-box ul{ margin:2px 0 0; padding-left:20px; } .oc-box.oc-mini{ padding:6px 12px; font-size:.78rem; margin:6px 10px; }
  .oc-crit{ background:#FFFBEB; border:2px solid #FCD34D; border-radius:16px; padding:14px 18px; margin:14px 0; font-family:"Sarabun","TH Sarabun New",sans-serif; }
  .oc-crit h3{ margin:0 0 4px; font-size:1rem; color:#92400E; } .oc-crit .oc-sub{ font-size:.8rem; color:#78716C; margin-bottom:8px; }
  .oc-crit label{ display:block; font-weight:700; font-size:.88rem; margin:10px 0 4px; } .oc-crit textarea{ width:100%; box-sizing:border-box; border:2px solid #E7E5E4; border-radius:12px; padding:8px 10px; font:inherit; font-size:.9rem; resize:vertical; }
  .oc-crit .oc-st{ margin-top:6px; font-size:.82rem; font-weight:700; color:#64748B; } .oc-crit .oc-st.ok{ color:#059669; }
  @media print{ .oc-box{ box-shadow:none; } }`;
  document.head.appendChild(css);

  const chips = (arr, map, cls) => arr.map(k => `<span class="oc-chip ${cls}" title="${esc(map[k])}">${k} ${esc(map[k].length > 26 && cls === "oc-o" ? "" : map[k])}</span>`).join("");
  const mini = ["blocks", "flowchart", "pseudocode", "game", "game-scratch", "game-variable", "game-variable-jump", "variable-slides"].includes(file);
  const box = document.createElement("div");
  box.className = "oc-box" + (mini ? " oc-mini" : "");
  box.innerHTML = `<div class="oc-h">🎯 ${esc(cfg.what)}ทำแล้วได้ตามจุดประสงค์</div>` +
    `<ul>${cfg.o.map(k => `<li><b>${k}</b> ${esc(O[k])}</li>`).join("")}</ul>` +
    `<div class="oc-row"><span class="oc-lab">🧠 สมรรถนะสำคัญ:</span>${chips(cfg.c, C, "oc-c")}</div>` +
    `<div class="oc-row"><span class="oc-lab">✍️ อ่าน คิดวิเคราะห์ เขียนสื่อความ:</span>${chips(cfg.r, R, "oc-r")}</div>`;

  // ตำแหน่งวางกล่อง: ใบงาน/แบบทดสอบ/ใบความรู้ → ต้นเนื้อหา · เกม/เครื่องมือ → ใต้หัวหน้า
  const main = document.querySelector("main");
  const intro = document.querySelector("main .card.intro, main .intro");
  if(intro && intro.parentNode) intro.parentNode.insertBefore(box, intro.nextSibling);
  else if(main) main.insertBefore(box, main.firstChild);
  else { const h = document.querySelector("header"); if(h && h.parentNode) h.parentNode.insertBefore(box, h.nextSibling); else document.body.insertBefore(box, document.body.firstChild); }

  // คำถามวิจารณ์ท้ายใบงาน (R3 วิเคราะห์/วิจารณ์ · R4 สรุปแง่คิด) — เก็บแยกจาก 8 ข้อหลัก ไม่นับเป็นข้อบังคับ
  if(cfg.crit){
    const m = file.match(/worksheet-2-(\d)/); if(!m) return;
    const KEY = "krtomws:m1/cs/1:" + m[1] + "crit";
    const card = document.createElement("div");
    card.className = "oc-crit"; card.id = "oc-crit";
    card.innerHTML = `<h3>💭 คำถามชวนคิดวิจารณ์ (R3 · R4)</h3><div class="oc-sub">ตอบสั้น ๆ ด้วยเหตุผลของตัวเอง ไม่มีถูกผิดตายตัว ครูอ่านและให้ข้อเสนอแนะ</div>` +
      cfg.crit.map((q, i) => `<label for="oc-q${i}">${i + 1}) ${esc(q)}</label><textarea id="oc-q${i}" rows="3" placeholder="พิมพ์ความคิดเห็นพร้อมเหตุผล..."></textarea>`).join("") +
      `<div class="oc-st" id="oc-st"></div>`;
    const anchor = document.querySelector(".actions");
    if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(card, anchor);
    else (main || document.body).appendChild(card);
    const tas = [...card.querySelectorAll("textarea")], st = card.querySelector("#oc-st");
    const done = () => tas.filter(t => t.value.trim().length >= 15).length;
    const upd = () => { const n = done(); st.className = "oc-st" + (n === tas.length ? " ok" : ""); st.textContent = n === tas.length ? "✅ ตอบคำถามชวนคิดครบแล้ว" : "ตอบแล้ว " + n + "/" + tas.length + " ข้อ (ข้อละอย่างน้อย 15 ตัวอักษร)"; };
    try{ const sv = JSON.parse(localStorage.getItem(KEY) || "[]"); tas.forEach((t, i) => { if(sv[i]) t.value = sv[i]; }); }catch(e){}
    tas.forEach(t => t.addEventListener("input", () => { try{ localStorage.setItem(KEY, JSON.stringify(tas.map(x => x.value))); }catch(e){} upd(); }));
    upd();
    window.KrtomOutcomes.critAnswers = () => tas.map(t => t.value.trim());
    window.KrtomOutcomes.critDone = () => done() === tas.length;
  }
  }

  // ───────── ส่งหลักฐานรายข้อเข้าฐานข้อมูล (เฉพาะนักเรียนที่ล็อกอินและมีโทเคน; ครู/ไม่ล็อกอิน = ข้าม) ─────────
  // ต้องรันไฟล์ supabase/20261029100000_krtom_outcomes.sql ก่อน ถ้ายังไม่ได้รัน จะเงียบ ๆ ไม่กระทบการส่งคะแนนเดิม
  function setupEvidence(){
    const U = { g:"m1", s:"cs", i:1 };
    const student = () => window.KrtomFlow && KrtomFlow.mode() === "student";
    const token = () => { try{ return sessionStorage.getItem("krtomStudentToken"); }catch(e){ return null; } };
    async function sendEvidence(activity, items){
      if(!student() || !items.length) return false;
      try{
        await KrtomFlow.rpc("krtom_submit_evidence", { p_token:token(), p_grade:U.g, p_subject:U.s, p_unit:U.i, p_activity:activity, p_items:items });
        return true;
      }catch(e){ console.warn("[outcomes] ส่งหลักฐานไม่สำเร็จ", e && e.message); return false; }
    }
    async function sendReflection(activity){
      if(!student() || !window.KrtomOutcomes.critAnswers) return;
      const answers = window.KrtomOutcomes.critAnswers().map((text, i) => ({ item:"c" + (i + 1), text })).filter(a => a.text);
      if(!answers.length) return;
      try{ await KrtomFlow.rpc("krtom_submit_reflection", { p_token:token(), p_grade:U.g, p_subject:U.s, p_unit:U.i, p_activity:activity, p_answers:answers }); }
      catch(e){ console.warn("[outcomes] ส่งคำตอบวิจารณ์ไม่สำเร็จ", e && e.message); }
    }
    window.KrtomOutcomes.sendEvidence = sendEvidence;

    // ใบงาน 2.2–2.8: ห่อ KrtomFlow.submit (ใบงานเรียกตอนกด "ส่งใบงาน")
    const wm = file.match(/^worksheet-2-(\d)$/);
    if(wm && window.KrtomFlow){
      const n = +wm[1], act = file, orig = KrtomFlow.submit;
      KrtomFlow.submit = async function(u, type, score, total){
        const res = await orig.apply(this, arguments);
        if(type === "worksheet" && student()){      // orig โยนข้อผิดพลาดถ้าบันทึกไม่สำเร็จ ถึงตรงนี้จึงถือว่าสำเร็จ
          let items = [{ item:"total", score, max:total }];
          if(n >= 2 && n <= 7 && window.WSCheck){
            const vals = [...document.querySelectorAll("textarea")].filter(x => !x.closest("#oc-crit")).map(x => x.value);
            const r = WSCheck.run(n, vals);
            if(r) items = r.fields.map((f, i) => ({ item:"f" + (i + 1), score:f.ok ? 1 : 0, max:1 }));
          }
          await sendEvidence(act, items); await sendReflection(act);
        }
        return res;
      };
    }
    // ใบงาน 2.1: flow.js ดักฟังก์ชัน checkAnswers เอง -> ห่อไว้ก่อน (flow ห่อทับทีหลัง) แล้วส่งเมื่อมีคะแนน
    if(file === "worksheet-2-1" && typeof window.checkAnswers === "function"){
      const orig = window.checkAnswers; let sent = false;
      window.checkAnswers = function(){
        const r = orig.apply(this, arguments);
        if(!sent){
          const p1 = parseInt((document.getElementById("p1-score") || {}).textContent, 10) || 0;
          const score = p1 + document.querySelectorAll(".mcq label.correct input:checked").length;
          const total = document.querySelectorAll(".dropzone").length + document.querySelectorAll(".mcq").length;
          if(total > 0){ sent = true; sendEvidence("worksheet-2-1", [{ item:"total", score, max:total }]).then(ok => { if(!ok) sent = false; }); }
        }
        return r;
      };
    }
    // แบบทดสอบ: ปรนัยรายข้อ (key = รหัสเสียงของข้อ) + อัตนัยรายโจทย์ (หลังเรียนเท่านั้น)
    if(file === "quiz" && typeof window.submitQuiz === "function"){
      const orig = window.submitQuiz; let sent = false;
      const pre = /[?&]mode=pre(&|$)/.test(location.search);
      window.submitQuiz = function(){
        const r = orig.apply(this, arguments);
        if(sent) return r;
        const items = [];
        document.querySelectorAll(".mcq").forEach(q => {
          const b = q.querySelector("[data-audio-src]"); if(!b) return;
          const key = (b.dataset.audioSrc.match(/(quiz-\d+)\.mp3/) || [])[1]; if(!key) return;
          const chosen = q.querySelector("input:checked");
          items.push({ item:key, score:(chosen && parseInt(chosen.value, 10) === parseInt(q.dataset.correct, 10)) ? 1 : 0, max:1 });
        });
        sent = true;
        sendEvidence(pre ? "quiz-pre" : "quiz-post", items).then(ok => { if(!ok) sent = false; });
        if(!pre && window.WSCheck){
          const eb = [...document.querySelectorAll("textarea")]; // 24 ช่องอัตนัย (3 โจทย์ × 8)
          if(eb.length >= 24){
            const er = WSCheck.run8(eb.slice(-24).map(x => x.value));
            if(er) sendEvidence("quiz-essay", [0, 1, 2].map(p => ({ item:"e" + (p + 1), score:er.fields.slice(p * 8, p * 8 + 8).filter(f => f.ok).length, max:8 })));
          }
        }
        return r;
      };
    }
  }
})();
