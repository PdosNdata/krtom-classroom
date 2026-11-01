/* dragws.js — ใบงานแบบ "ลากไปวาง" (ใบงาน 1.8 แยกย่อยปัญหา / 1.9 หารูปแบบ)
 * โครงหน้า: .tray[data-id] เก็บ .chip[data-ans] · .zone[data-key][data-mode="multi|one"] เป็นช่องรับ
 * chip.data-ans = key ของช่องที่ถูกต้อง (ว่าง = ตัวหลอก ไม่นับคะแนน) · วางผิดที่ได้ ระบบไม่บอกถูกผิด ตรวจเงียบตอนกดส่ง
 * ลาก (เมาส์/นิ้ว) หรือแตะตัวเลือกแล้วแตะช่องปลายทางก็ได้ · ลากออกมาวางที่เดิมหรือถาดเพื่อเปลี่ยนใจได้
 * ส่งคะแนนผ่าน KrtomFlow.submit และเก็บคำตอบเป็นช่องซ่อนให้ครูเปิดดู (submitwork.js)
 */
"use strict";
(function(){
const C = window.DRAGWS, $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const UI = C.u || 0, U = { g:"m1", s:"cs", i:UI }, DONE = "krtomws-done:m1/cs/" + UI + ":" + C.n;
const chips = $$(".chip"), zones = $$(".zone");
const TOTAL = chips.filter(c => c.dataset.ans).length;
let picked = null;       // chip ที่แตะเลือกไว้ (โหมดแตะ)

// ถาดแต่ละอัน สลับลำดับตัวเลือกแบบสุ่ม
$$(".tray").forEach(t => { const cs = $$(".chip", t); for(let i = cs.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); t.insertBefore(cs[j], cs[i]); } });
chips.forEach(c => { c.dataset.home = c.parentElement.dataset.id || ""; });

const homeOf = (c) => $('.tray[data-id="' + c.dataset.home + '"]');
function place(chip, zone){
  if(!zone){ homeOf(chip).appendChild(chip); }
  else if(zone.dataset.mode === "one"){
    const old = $(".chip", zone); if(old && old !== chip) homeOf(old).appendChild(old);
    zone.querySelector(".zbody").appendChild(chip);
  }else zone.querySelector(".zbody").appendChild(chip);
  refresh();
}
// สิ่งที่ต้องวางให้ครบก่อนส่ง: ช่องแบบ one ทุกช่อง + ตัวเลือกทุกชิ้นในถาดที่ตั้ง data-need="all" (ตัวหลอกที่ไม่มีช่องรับไม่ต้องวาง)
function progress(){
  const total = zones.filter(z => z.dataset.mode === "one").length + $$('.chip').filter(c => { const t = c.closest(".tray"); const h = c.dataset.home; return $('.tray[data-id="' + h + '"]').dataset.need === "all"; }).length;
  const done = zones.filter(z => z.dataset.mode === "one" && $(".chip", z)).length + $$('.zone[data-mode="multi"] .chip').length;
  return { done, total, left: total - done };
}
function refresh(){
  const p = progress();
  $("#meter-t").textContent = "วางแล้ว " + p.done + "/" + p.total + " รายการ";
  $("#bar").style.width = (p.done / p.total * 100) + "%";
  zones.forEach(z => z.classList.toggle("has", !!$(".chip", z)));
}
function zoneAt(x, y){ return zones.find(z => { const r = z.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }) || null; }

chips.forEach(chip => {
  chip.addEventListener("pointerdown", (e) => {
    if(e.button > 0) return;
    const sx = e.clientX, sy = e.clientY; let ghost = null, moved = false, over = null;
    const onMove = (ev) => {
      if(!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
      if(!moved){ moved = true; ghost = chip.cloneNode(true); ghost.classList.add("ghost"); document.body.appendChild(ghost); chip.classList.add("lifting"); }
      ghost.style.left = ev.clientX + "px"; ghost.style.top = ev.clientY + "px";
      over = zoneAt(ev.clientX, ev.clientY); zones.forEach(z => z.classList.toggle("over", z === over));
    };
    const onUp = (ev) => {
      document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerup", onUp);
      zones.forEach(z => z.classList.remove("over"));
      if(moved){ ghost.remove(); chip.classList.remove("lifting"); place(chip, zoneAt(ev.clientX, ev.clientY)); }
      else{       // แตะ: เลือก/ยกเลิกเลือกตัวเลือก
        if(picked === chip){ chip.classList.remove("picked"); picked = null; }
        else{ if(picked) picked.classList.remove("picked"); picked = chip; chip.classList.add("picked"); }
      }
    };
    document.addEventListener("pointermove", onMove); document.addEventListener("pointerup", onUp);
  });
});
// แตะช่องปลายทางหลังแตะเลือกตัวเลือก
zones.forEach(z => z.addEventListener("click", (e) => {
  if(!picked || e.target.closest(".chip")) return;
  const c = picked; c.classList.remove("picked"); picked = null; place(c, z);
}));
// แตะถาด = นำตัวเลือกที่เลือกไว้กลับ
$$(".tray").forEach(t => t.addEventListener("click", (e) => { if(!picked || e.target.closest(".chip")) return; const c = picked; c.classList.remove("picked"); picked = null; place(c, null); }));

function score(){
  let s = 0; chips.forEach(c => { if(!c.dataset.ans) return; const z = c.closest(".zone"); if(z && z.dataset.key === c.dataset.ans) s++; }); return s;
}
// ผลรายช่อง: ช่องรับหลายชิ้น ถูกเมื่อวางครบและไม่มีชิ้นผิด · ช่องรับชิ้นเดียวถูกเมื่อวางชิ้นที่ตรงกัน
function zoneItems(){
  return { ta: zones.map(z => {
    const inside = $$(".chip", z), want = chips.filter(c => c.dataset.ans === z.dataset.key), wrong = inside.filter(c => c.dataset.ans !== z.dataset.key);
    const ok = want.length ? (want.every(c => c.closest(".zone") === z) && !wrong.length) : !inside.length;
    return { ok, hint: ok ? "" : (wrong.length ? "มีชิ้นที่วางผิดที่: " + wrong.map(c => c.textContent.trim()).join(", ") : "ยังวางไม่ครบ") };
  }) };
}
function snapshot(){
  window.__wsItems = zoneItems();
  const box = $("#answers"); box.innerHTML = "";
  zones.forEach((z, i) => { const f = document.createElement("div"); f.className = "field";
    const l = document.createElement("label"); l.htmlFor = "ga" + i; l.textContent = z.dataset.title || ("ช่อง " + (i + 1));
    const ta = document.createElement("textarea"); ta.id = "ga" + i; ta.value = $$(".chip", z).map(c => c.textContent.trim()).join(", ") || "(ไม่ได้วาง)";
    f.appendChild(l); f.appendChild(ta); box.appendChild(f); });
}
$("#submit").onclick = async function(){
  const st = $("#status"), left = progress().left;
  if(left){ st.style.color = "#DC2626"; st.textContent = "ยังเหลือ " + left + " รายการที่ยังไม่ได้วาง กรุณาวางให้ครบก่อนส่ง"; return; }
  this.disabled = true; st.style.color = "#64748B"; st.textContent = "กำลังส่ง..."; snapshot();
  try{
    if(window.KrtomFlow) await KrtomFlow.submit(U, "worksheet", score(), TOTAL);
    try{ localStorage.setItem(DONE, "1"); }catch(e){}
    st.style.color = "#059669";
    st.innerHTML = '✅ ส่งใบงานแล้ว — ครูจะตรวจและแจ้งผลให้ <div style="margin-top:12px"><a class="btn" style="text-decoration:none;display:inline-block" href="worksheet.html">กลับไปเลือกใบงาน →</a></div>';
  }catch(e){
    this.disabled = false; st.style.color = "#DC2626"; st.textContent = (window.KrtomFlow ? KrtomFlow.errText(e) : "ส่งไม่สำเร็จ");
  }
};
window.__drag = { score, TOTAL, place, chips, zones };
refresh();
})();
