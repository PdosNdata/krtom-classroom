/* blocks-missions.js — ภารกิจ CODE BLOCKS: เช็กลิสต์ตรวจอัตโนมัติ + ส่งงานให้ครู
 * เปิดจากใบงานฝึก (worksheet-blocks.html) ด้วย  blocks.html?ex=flower&mission=flower&back=worksheet-blocks.html
 * - เช็กลิสต์ตรวจจากบล็อกที่นักเรียนต่อไว้ (วิเคราะห์โครงสร้างบล็อก ไม่ใช่เทียบกับเฉลยตายตัว) และผลที่เห็นบนเวที
 * - นักเรียนที่ล็อกอิน กด "ส่งงานให้ครู" → บันทึกลง krtom_submissions (ใช้ระบบเดียวกับใบงาน ไม่ต้องรัน SQL เพิ่ม)
 *   activity = worksheet-2-14 … worksheet-2-20 (ภารกิจ 1–7) ครูเปิดดูที่เมนู "ดูงานนักเรียน" → งานที่ส่ง พร้อมลิงก์โปรแกรม
 * โหลดต่อท้ายสคริปต์หลักของ blocks.html (ใช้ตัวแปรร่วม SPRS, wsToJSON, shareURL, loadJSON, SAMPLES, toast, askConfirm)
 */
(function(){
  const qs = new URLSearchParams(location.search), mid = qs.get("mission");
  if(!mid || typeof wsToJSON !== "function") return;

  // ---------- เครื่องมือวิเคราะห์โครงสร้างบล็อก ----------
  const isB = (x) => x && typeof x === "object" && typeof x.t === "string";
  const nv = (x) => isB(x) || x == null || x === "" ? NaN : Number(x);
  function desc(b, out){            // บล็อกลูกทั้งหมดที่อยู่ข้างใน (ทั้งช่องใส่ค่าและบล็อกที่ครอบอยู่)
    out = out || [];
    (b.a || []).forEach(x => { if(isB(x)){ out.push(x); desc(x, out); } });
    (b.s || []).forEach(arr => (arr || []).forEach(x => { if(isB(x)){ out.push(x); desc(x, out); } }));
    return out;
  }
  const kids = (b) => [].concat(...(b.s || []).map(a => (a || []).filter(isB)));   // บล็อกที่ครอบอยู่ชั้นตรง ๆ
  function collect(){
    const j = wsToJSON(true), all = [];
    j.sprites.forEach((sp, si) => (sp.scripts || []).forEach(sc => (sc.b || []).forEach(b => { if(isB(b)){ all.push(b); desc(b).forEach(x => all.push(x)); } })));
    return { all, sprites: j.sprites, json: j };
  }
  const has = (c, t, f) => c.all.some(b => b.t === t && (!f || f(b)));
  const num = (b, i) => nv((b.a || [])[i]);
  const isVar = (x, name) => isB(x) && x.t === "var" && (name == null || x.name === name);
  function maxDepth(c, t){          // บล็อกชนิด t ซ้อนกันกี่ชั้น (นับสูงสุด)
    let best = 0;
    const go = (b, d) => { const nd = d + (b.t === t ? 1 : 0); if(nd > best) best = nd; (b.a || []).forEach(x => { if(isB(x)) go(x, nd); }); (b.s || []).forEach(arr => (arr || []).forEach(x => { if(isB(x)) go(x, nd); })); };
    c.sprites.forEach(sp => (sp.scripts || []).forEach(sc => (sc.b || []).forEach(b => { if(isB(b)) go(b, 0); })));
    return best;
  }
  const inLoop = (c, t, f, loopT) => c.all.some(l => (loopT || ["repeat", "forever", "while"]).includes(l.t) && desc(l).some(x => x.t === t && (!f || f(x))));
  const texts = (b) => desc(b).concat([b]).map(x => (x.a || []).filter(v => !isB(v)).join(" ")).join(" ");

  // ---------- นิยามภารกิจ ----------
  const RUN = { t:"รันโปรแกรมนี้ (กด 🟩 ธงเขียว) หลังแก้ล่าสุด", run:true };
  const MISSIONS = {
    flower: { n:1, ex:"flower", title:"วาดดอกไม้", tag:"ทำซ้ำซ้อน", goal:"เข้าใจการทำซ้ำซ้อนกัน (ทำซ้ำในทำซ้ำ)",
      checks:[
        { t:"ใช้บล็อก “ทำซ้ำ” ซ้อนอยู่ในบล็อก “ทำซ้ำ” (2 ชั้น)", f:c => maxDepth(c, "repeat") >= 2 },
        { t:"แก้ทำซ้ำด้านนอกให้เหลือ 6 ครั้ง", f:c => has(c, "repeat", b => num(b, 0) === 6 && desc(b).some(x => x.t === "repeat")) },
        { t:"แก้ “หมุนขวา” ในทำซ้ำด้านนอกเป็น 60 องศา", f:c => has(c, "repeat", b => num(b, 0) === 6 && kids(b).some(x => x.t === "turnR" && num(x, 0) === 60)) },
        Object.assign({}, RUN, { t:"กดธงเขียวแล้วเห็นดอกไม้ครบรอบบนเวที", draw:true })],
      qs:["ก) ทำซ้ำชั้นใน (ทำซ้ำ 4 ครั้ง) วาดรูปอะไร?", "ข) ต้องหมุนขวากี่องศา เมื่อทำซ้ำด้านนอก 6 ครั้ง จึงจะวนครบรอบ (360°)? แสดงวิธีคิด"] },
    spiral: { n:2, ex:"spiral", title:"เกลียวสีรุ้ง", tag:"ตัวแปร", goal:"ใช้ตัวแปรที่ค่าเปลี่ยนไปทุกรอบของการทำซ้ำ",
      checks:[
        { t:"ใช้ตัวแปร len เป็นระยะ “เดิน” ในการทำซ้ำ", f:c => inLoop(c, "move", b => isVar((b.a || [])[0], "len"), ["repeat"]) },
        { t:"แก้ “หมุนขวา” จาก 91 เป็นค่าอื่น (เช่น 120 หรือ 60)", f:c => inLoop(c, "turnR", b => num(b, 0) > 0 && num(b, 0) !== 91, ["repeat"]) },
        { t:"ลองแก้ “เปลี่ยน len ทีละ” จาก 3 เป็นค่าอื่น (เช่น 6)", f:c => has(c, "change", b => (b.a || [])[0] === "len" && Number.isFinite(nv((b.a || [])[1])) && nv((b.a || [])[1]) !== 3) },
        Object.assign({}, RUN, { t:"กดธงเขียวแล้วเห็นเกลียวบนเวที", draw:true })],
      qs:["ก) ตัวแปร len ทำหน้าที่อะไรในโปรแกรมนี้?", "ข) ถ้าเปลี่ยน “เพิ่ม len ทีละ 3” เป็น 6 เกลียวจะเป็นอย่างไร?"] },
    countdown: { n:3, ex:"countdown", title:"นับถอยหลังปล่อยจรวด", tag:"while / ตัวแปร", goal:"ใช้การวนซ้ำที่มีเงื่อนไข",
      checks:[
        { t:"ตั้งค่า n เริ่มต้นเป็น 5", f:c => has(c, "set", b => (b.a || [])[0] === "n" && nv((b.a || [])[1]) === 5) },
        { t:"ใช้บล็อกวนซ้ำแบบมีเงื่อนไข (ทำซ้ำขณะที่…)", f:c => has(c, "while") },
        { t:"รอครั้งละ 1.5 วินาทีในวงวนซ้ำ", f:c => inLoop(c, "wait", b => num(b, 0) === 1.5, ["while"]) },
        { t:"ยังมี “เปลี่ยน n ทีละ -1” อยู่ในวงวนซ้ำ", f:c => inLoop(c, "change", b => (b.a || [])[0] === "n" && nv((b.a || [])[1]) === -1, ["while"]) },
        RUN],
      qs:["ก) โปรแกรมหยุดวนซ้ำเมื่อเงื่อนไขใดเป็นเท็จ?", "ข) ถ้าลืมบล็อก “เปลี่ยน n ทีละ -1” จะเกิดอะไรขึ้น เพราะเหตุใด?"] },
    grade: { n:4, ex:"grade", title:"ตัดเกรด", tag:"เงื่อนไขซ้อน", goal:"ใช้ ถ้า…แล้ว…ไม่เช่นนั้น หลายชั้นเพื่อเลือกทางจากหลายกรณี",
      checks:[
        { t:"รับคะแนนด้วย “ถามและรอคำตอบ” แล้วใช้ “คำตอบ” ตรวจเงื่อนไข", f:c => has(c, "ask") && has(c, "ifelse", b => desc(b).some(x => x.t === "answer")) },
        { t:"ใช้ ถ้า…ไม่เช่นนั้น ซ้อนกันอย่างน้อย 3 ชั้น", f:c => maxDepth(c, "ifelse") >= 3 },
        { t:"เพิ่มเงื่อนไขเทียบกับ 50 (ต่ำกว่า 50)", f:c => c.all.some(b => ["gt", "lt", "eq"].includes(b.t) && (b.a || []).some(v => [49, 50].includes(nv(v)))) },
        { t:"เพิ่มบล็อก “พูด” ว่า “เกรด 0” สำหรับคะแนนต่ำกว่า 50", f:c => has(c, "say", b => /เกรด\s*0/.test(texts(b))) },
        RUN],
      qs:["ก) ผลลัพธ์ของคะแนน 85, 72, 65 และ 40 คือเกรดอะไรบ้าง? (ทดสอบแล้วบันทึกผล)", "ข) ทำไมจึงตรวจ “มากกว่า 79” ก่อน “มากกว่า 69” ?"] },
    mathquiz: { n:5, ex:"mathquiz", title:"แบบฝึกสูตรคูณ", tag:"สุ่มเลข + รับค่า", goal:"สุ่มค่าด้วยตัวแปร รับคำตอบ และตรวจคำตอบ",
      checks:[
        { t:"สุ่มเลข 1 ถึง 12 ทั้งตัวแปร a และ b", f:c => c.all.filter(b => b.t === "rand" && num(b, 0) === 1 && num(b, 1) === 12).length >= 2 },
        { t:"เก็บเลขที่สุ่มไว้ในตัวแปร a และ b (ใช้บล็อก “ตั้งค่า”)", f:c => has(c, "set", b => (b.a || [])[0] === "a" && isB((b.a || [])[1]) && (b.a[1].t === "rand")) && has(c, "set", b => (b.a || [])[0] === "b" && isB((b.a || [])[1]) && (b.a[1].t === "rand")) },
        { t:"ถามโจทย์ แล้วตรวจคำตอบด้วย ถ้า…ไม่เช่นนั้น", f:c => has(c, "ask") && has(c, "ifelse", b => desc(b).some(x => x.t === "answer")) },
        { t:"⭐ ท้าทาย: ทำโจทย์แบบ “บวก” (ใช้บล็อกบวกในการตรวจคำตอบ)", f:c => has(c, "ifelse", b => desc(b).some(x => x.t === "add")) },
        RUN],
      qs:["ก) บล็อก “สุ่มเลข” ช่วยโปรแกรมอย่างไร?", "ข) ออกแบบเอง: เปลี่ยนโจทย์เป็น “บวก” แล้วเขียนบล็อกที่ต้องแก้"] },
    "game-catch": { n:6, ex:"game-catch", title:"เกมแมวรับดาว", tag:"เหตุการณ์ + ตัวละครหลายตัว", goal:"ควบคุมตัวละครด้วยปุ่มลูกศร และตรวจการชนกัน",
      checks:[
        { t:"มีตัวละครอย่างน้อย 2 ตัว (แมวกับดาว)", f:c => c.sprites.length >= 2 },
        { t:"ควบคุมแมวซ้าย–ขวาด้วยปุ่มลูกศร (เปลี่ยนตำแหน่ง x)", f:c => has(c, "if", b => desc(b).some(x => x.t === "keydown") && desc(b).some(x => x.t === "changex")) },
        { t:"ทำให้ดาวตกเร็วขึ้น (เปลี่ยน y ทีละน้อยกว่า -7 เช่น -10)", f:c => has(c, "changey", b => num(b, 0) < -7) },
        { t:"ทำให้แมวเดินเร็วขึ้น (เปลี่ยน x ทีละมากกว่า 8)", f:c => has(c, "changex", b => Math.abs(num(b, 0)) > 8) },
        { t:"คะแนนเพิ่มเมื่อดาวแตะแมว (ถ้าแตะ → เปลี่ยนคะแนน)", f:c => has(c, "if", b => desc(b).some(x => x.t === "touchspr") && desc(b).some(x => x.t === "change")) },
        { t:"⭐ ท้าทาย: มีเสียงดังเมื่อรับดาวได้", f:c => has(c, "if", b => desc(b).some(x => x.t === "touchspr") && desc(b).some(x => ["beep", "playuntil", "playnote"].includes(x.t))) }],
      qs:["ก) ตัวละครมีกี่ตัว และแต่ละตัวมีหน้าที่อะไร?", "ข) คะแนนเพิ่มเมื่อไร? ชี้บล็อกที่ทำให้เกิดเหตุการณ์นั้น", "ค) ท้าทาย: เพิ่มบล็อกให้เสียงดังเมื่อรับดาวได้ (เขียนบล็อกที่ใช้)"] },
    project: { n:7, ex:"blank", title:"ออกแบบโปรเจกต์ของตัวเอง", tag:"สร้างสรรค์", goal:"ใช้ภาพวาดเอง (กระดานวาดภาพ) และบล็อกที่เรียนมาสร้างงานใหม่",
      checks:[
        { t:"มีบล็อก “เมื่อกดธงเขียว” เริ่มโปรแกรม", f:c => has(c, "flag") },
        { t:"ใช้บล็อกอย่างน้อย 5 ชนิดที่ต่างกัน (ไม่นับ เมื่อกดธงเขียว)", f:c => new Set(c.all.filter(b => b.t !== "flag").map(b => b.t)).size >= 5 },
        { t:"ใช้การทำซ้ำหรือเงื่อนไขอย่างน้อย 1 อย่าง", f:c => c.all.some(b => ["repeat", "forever", "while", "if", "ifelse"].includes(b.t)) },
        RUN],
      qs:["ชื่อโปรเจกต์ / เรื่องราวที่จะทำ:", "บล็อกหลักที่ใช้ (อย่างน้อย 5 บล็อก):", "สิ่งที่ยังไม่สำเร็จ / จะปรับปรุงอย่างไร:"] }
  };
  const M = MISSIONS[mid];
  if(!M) return;
  const ACT = "worksheet-2-" + (13 + M.n), UNIT = { g:"m1", s:"cs", i:1 };

  // ---------- สถานะ ----------
  const $$ = (s, r) => (r || document).querySelector(s);
  const ss = (k) => { try{ return sessionStorage.getItem(k); }catch(e){ return null; } };
  const ls = { get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }, set(k, v){ try{ localStorage.setItem(k, v); }catch(e){} } };
  const KW = "krtomMission:" + mid, KQ = "krtomMissionQ:" + mid;
  const sig = () => { try{ return JSON.stringify(wsToJSON(true).sprites.map(s => (s.scripts || []).map(sc => sc.b))); }catch(e){ return ""; } };
  let lastRun = null, sentInfo = null, canSend = null, last = "";

  // ---------- เก็บงานของภารกิจนี้ไว้ (กลับมาเปิดใหม่ งานไม่หาย) ----------
  try{
    const sv = JSON.parse(ls.get(KW) || "null");
    if(sv && (sv.sprites || sv.scripts)){ loadJSON(sv); if(typeof resetSprite === "function") resetSprite(); }
  }catch(e){}
  const saveWork = () => { try{ ls.set(KW, JSON.stringify(wsToJSON(false))); }catch(e){} };

  // ---------- หน้าตา ----------
  const st = document.createElement("style");
  st.textContent = `
  #msn{ background:#fff; border:2px solid #A78BFA; border-radius:12px; flex:none; overflow:hidden; font-size:.84rem; }
  #msn .mh{ width:100%; display:flex; align-items:center; gap:8px; background:linear-gradient(135deg,#EDE9FE,#DBEAFE); border:none; padding:8px 12px; font:inherit; font-weight:800; color:#4C1D95; cursor:pointer; text-align:left; }
  #msn .mh .pg{ margin-left:auto; background:#7C3AED; color:#fff; border-radius:999px; padding:1px 10px; font-size:.78rem; }
  #msn .mh .pg.full{ background:#059669; }
  #msn .mb{ padding:8px 12px 10px; display:none; }
  #msn.open .mb{ display:block; }
  #msn .tag{ font-size:.72rem; background:#FEF3C7; color:#92400E; border-radius:999px; padding:0 8px; font-weight:700; }
  #msn .goal{ color:#475569; margin:0 0 6px; }
  #msn ul{ list-style:none; margin:0 0 8px; padding:0; }
  #msn li{ display:flex; gap:7px; align-items:flex-start; padding:3px 0; line-height:1.45; }
  #msn li .ck{ flex:none; width:20px; height:20px; border-radius:6px; border:2px solid #CBD5E1; display:flex; align-items:center; justify-content:center; font-size:.8rem; color:#fff; background:#fff; }
  #msn li.ok .ck{ background:#10B981; border-color:#10B981; }
  #msn li.ok{ color:#065F46; }
  #msn .q{ margin:6px 0; }
  #msn .q label{ display:block; font-weight:700; margin-bottom:2px; }
  #msn textarea{ width:100%; box-sizing:border-box; min-height:44px; resize:vertical; font:inherit; font-size:.84rem; border:1px solid #CBD5E1; border-radius:8px; padding:5px 8px; }
  #msn .act{ display:flex; gap:8px; flex-wrap:wrap; margin-top:6px; }
  #msn .act button{ border:none; border-radius:999px; padding:6px 14px; font:inherit; font-weight:700; cursor:pointer; background:#E2E8F0; color:#1F2430; }
  #msn .act #msn-send{ background:#2563EB; color:#fff; }
  #msn .act button[disabled]{ opacity:.5; cursor:not-allowed; }
  #msn .stt{ margin-top:6px; font-weight:700; }
  #msn .stt.ok{ color:#047857; } #msn .stt.warn{ color:#B45309; } #msn .stt.err{ color:#B91C1C; }`;
  document.head.appendChild(st);

  const box = document.createElement("div"); box.id = "msn";
  box.innerHTML = `<button type="button" class="mh"><span>🎯 ภารกิจ ${M.n}: <span class="mt"></span></span> <span class="tag"></span><span class="pg">0/0</span><span class="arr">▾</span></button>
    <div class="mb"><p class="goal"></p><ul></ul><div class="qs"></div><div class="act"><button type="button" id="msn-send">📤 ส่งงานให้ครู</button><button type="button" id="msn-reset" title="กลับไปเริ่มจากโปรแกรมตัวอย่างของภารกิจนี้">↺ เริ่มภารกิจใหม่</button></div><div class="stt"></div></div>`;
  $$(".mt", box).textContent = M.title; $$(".tag", box).textContent = M.tag; $$(".goal", box).textContent = "เป้าหมาย: " + M.goal;
  const qsEl = $$(".qs", box), qAns = (() => { try{ return JSON.parse(ls.get(KQ) || "[]"); }catch(e){ return []; } })();
  M.qs.forEach((q, i) => {
    const d = document.createElement("div"); d.className = "q"; const l = document.createElement("label"), t = document.createElement("textarea");
    l.textContent = q; t.value = qAns[i] || ""; t.setAttribute("aria-label", q); t.oninput = () => { qAns[i] = t.value; ls.set(KQ, JSON.stringify(qAns)); };
    d.append(l, t); qsEl.append(d);
  });
  const right = $$("#right"); right.insertBefore(box, right.firstChild);
  const open = (v, keep) => { box.classList.toggle("open", v); $$(".arr", box).textContent = v ? "▾" : "▸"; if(keep) try{ sessionStorage.setItem("krtomMsnOpen", v ? "1" : "0"); }catch(e){} };
  open(ss("krtomMsnOpen") == null ? !matchMedia("(max-width:640px)").matches : ss("krtomMsnOpen") === "1");
  $$(".mh", box).onclick = () => open(!box.classList.contains("open"), true);

  // ---------- ตรวจเช็กลิสต์ ----------
  function evaluate(){
    const c = collect(); c.drew = false;
    const cur = sig(), ranNow = !!lastRun && lastRun.sig === cur;
    if(ranNow && M.checks.some(k => k.draw)){ try{ const cv = document.getElementById("pen"), d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data; for(let i = 3; i < d.length; i += 16) if(d[i]){ c.drew = true; break; } }catch(e){} }
    return M.checks.map(k => { let ok = false; try{ ok = k.run ? ranNow && (!k.draw || c.drew) : !!k.f(c); }catch(e){} return ok; });
  }
  function paint(){
    const res = evaluate(), ul = $$("ul", box), key = res.join("");
    if(key !== last || !ul.children.length){
      last = key; ul.innerHTML = "";
      M.checks.forEach((k, i) => { const li = document.createElement("li"); li.className = res[i] ? "ok" : ""; li.innerHTML = '<span class="ck">' + (res[i] ? "✓" : "") + "</span><span></span>"; li.lastChild.textContent = k.t; ul.append(li); });
      const n = res.filter(Boolean).length, pg = $$(".pg", box); pg.textContent = n + "/" + res.length; pg.classList.toggle("full", n === res.length);
    }
    return res;
  }
  $$("#flag").addEventListener("click", () => { setTimeout(() => { lastRun = { sig: sig() }; saveWork(); }, 60); });
  let tick = 0; setInterval(() => { paint(); if(++tick % 4 === 0) saveWork(); }, 1000);
  setTimeout(paint, 200);

  // ---------- สถานะการส่ง ----------
  const stt = $$(".stt", box), sendBtn = $$("#msn-send", box);
  const say = (t, cls) => { stt.textContent = t; stt.className = "stt " + (cls || ""); };
  const mode = () => (window.KrtomFlow ? KrtomFlow.mode() : "open");
  const token = () => ss("krtomStudentToken");
  async function refreshSend(){
    const m = mode();
    if(m === "teacher"){ sendBtn.disabled = true; say("👩‍🏫 โหมดครู: ดูภารกิจตัวอย่าง (ไม่บันทึกงาน)", "warn"); return; }
    if(m !== "student"){ sendBtn.disabled = true; say("ℹ️ ยังไม่ได้เข้าสู่ระบบนักเรียน — ทำภารกิจและดูเช็กลิสต์ได้ แต่ส่งงานให้ครูไม่ได้ (เข้าสู่ระบบจากหน้าแรกก่อน)", "warn"); return; }
    try{ canSend = (await KrtomFlow.rpc("krtom_work_can_submit", { p_token: token(), p_activity: ACT })) !== false; }catch(e){ canSend = true; }
    sendBtn.disabled = !canSend;
    say(canSend ? "" : "✅ ส่งภารกิจนี้แล้ว — ถ้าต้องการแก้ไขหรือทำใหม่ ให้ขอครูเปิดสิทธิ์ส่งใหม่", canSend ? "" : "ok");
  }
  setTimeout(refreshSend, 100);

  async function manualSet(){
    try{ const r = await KrtomFlow.rpc("krtom_ws_modes", {}); return new Set((r || []).filter(x => x.mode === "manual").map(x => x.activity)); }catch(e){ return new Set(); }
  }
  sendBtn.onclick = async () => {
    if(mode() !== "student") return;
    const res = paint(), n = res.filter(Boolean).length;
    const okc = await askConfirm("ส่งภารกิจ " + M.n + " “" + M.title + "” ให้ครู?\nเช็กลิสต์ผ่าน " + n + " จาก " + res.length + " ข้อ" + (n < res.length ? "\n(ยังทำไม่ครบ ส่งได้ แต่ส่งแล้วส่งซ้ำไม่ได้ ถ้ายังไม่ครบแนะนำให้ทำต่อก่อน)" : "") + "\nส่งแล้วส่งซ้ำไม่ได้ จนกว่าครูจะเปิดสิทธิ์", { title:"ส่งงานให้ครู", confirmText:"ส่งเลย" });
    if(!okc) return;
    sendBtn.disabled = true; say("กำลังส่ง…", "warn");
    try{
      const manual = (await manualSet()).has(ACT), rows = [];
      M.checks.forEach((k, i) => { const r = { q:"เช็กลิสต์: " + k.t, a: res[i] ? "ทำได้ ✔" : "ยังไม่ได้ทำ" }; if(manual) r.manual = true; else r.ok = res[i]; rows.push(r); });
      M.qs.forEach((q, i) => rows.push({ q, a: String(qAns[i] || "").trim().slice(0, 1500) || "(ไม่ได้ตอบ)", manual:true }));
      if(!manual) rows.slice(M.checks.length).forEach(r => { delete r.manual; });
      let link = ""; try{ link = shareURL(); }catch(e){}
      rows.push({ q:"ลิงก์โปรแกรมที่ทำ (กดเปิดดูโปรแกรมของนักเรียน)", a: link.length > 40000 ? "(โปรแกรมใหญ่เกินไปสำหรับลิงก์ — ให้นักเรียนแสดงในชั้นเรียน)" : link });
      const score = manual ? 0 : n, total = res.length;
      await KrtomFlow.rpc("krtom_submit_work", { p_token: token(), p_grade: UNIT.g, p_subject: UNIT.s, p_unit: UNIT.i, p_activity: ACT, p_answers: rows, p_score: score, p_max: total });
      saveWork(); canSend = false; say("🎉 ส่งภารกิจให้ครูเรียบร้อยแล้ว", "ok"); toast("ส่งงานให้ครูแล้ว ✅");
    }catch(e){
      sendBtn.disabled = false;
      const m = (e && e.message) || "";
      say(/ส่งใบงานนี้แล้ว/.test(m) ? "ส่งภารกิจนี้แล้ว — ส่งซ้ำไม่ได้ ถ้าต้องการแก้ไขให้ขอครูเปิดสิทธิ์ส่งใหม่" : /PGRST202|Could not find the function/i.test(m) ? "ระบบเก็บงานยังไม่ได้ติดตั้งในฐานข้อมูล (แจ้งครู)" : /หมดเวลา|token|โทเคน/i.test(m) ? "หมดเวลาเข้าสู่ระบบ — ออกจากระบบแล้วเข้าใหม่ งานในหน้านี้ไม่หาย" : "ส่งไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่", "err");
      if(/ส่งใบงานนี้แล้ว/.test(m)){ sendBtn.disabled = true; }
    }
  };
  $$("#msn-reset", box).onclick = async () => {
    if(!(await askConfirm("เริ่มภารกิจนี้ใหม่จากโปรแกรมตัวอย่าง? งานที่แก้ไว้จะหายไป", { danger:true, title:"เริ่มใหม่ไหม?", confirmText:"เริ่มใหม่" }))) return;
    loadJSON(JSON.parse(JSON.stringify(SAMPLES[M.ex]))); if(typeof resetSprite === "function") resetSprite();
    document.getElementById("pen").getContext("2d").clearRect(0, 0, 480, 360); lastRun = null; last = ""; saveWork(); paint();
  };
  window.__mission = { id: mid, act: ACT, evaluate, M };
})();
