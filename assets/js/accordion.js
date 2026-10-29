/* accordion.js — หัวข้อในใบความรู้ (section.topic) กดที่หัวข้อเพื่อ ยุบ/ขยาย เนื้อหาได้
 * - ปุ่ม 🔊 ในหัวข้อยังใช้ได้ตามเดิม (กดเสียงแล้วหัวข้อจะขยายเอง)
 * - มีปุ่ม "ยุบทั้งหมด / ขยายทั้งหมด" ด้านบน */
(function(){
  "use strict";
  const secs = [...document.querySelectorAll("section.topic")];
  if(!secs.length) return;

  const st = document.createElement("style");
  st.textContent = `
    section.topic > h2.acc-h{ cursor:pointer; user-select:none; position:relative; }
    section.topic > h2.acc-h:hover{ filter:brightness(1.06); }
    section.topic > h2.acc-h:focus-visible{ outline:3px solid #FDE047; outline-offset:2px; }
    .acc-chev{ flex:none; display:inline-flex; align-items:center; justify-content:center; width:1.7em; height:1.7em; border-radius:50%; background:rgba(255,255,255,.3); font-size:.8em; margin-left:10px; transition:transform .2s; }
    section.topic.acc-collapsed > h2 .acc-chev{ transform:rotate(-90deg); }
    section.topic.acc-collapsed > :not(h2){ display:none !important; }
    section.topic.acc-collapsed{ margin-bottom:14px; }
    .acc-bar{ display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap; margin:0 0 12px; }
    .acc-bar button{ border:1px solid #CBD5E1; background:#fff; border-radius:999px; padding:5px 16px; font:inherit; font-size:.78rem; font-weight:700; color:#334155; cursor:pointer; box-shadow:0 2px 0 rgba(0,0,0,.08); }
    .acc-bar button:hover{ background:#EEF2FF; border-color:#6366F1; }
    @media print{ section.topic.acc-collapsed > :not(h2){ display:block !important; } .acc-bar, .acc-chev{ display:none !important; } }
  `;
  document.head.append(st);

  const setOpen = (sec, open) => {
    sec.classList.toggle("acc-collapsed", !open);
    const h = sec.querySelector(":scope > h2"); if(h) h.setAttribute("aria-expanded", open ? "true" : "false");
  };

  secs.forEach(sec => {
    const h = sec.querySelector(":scope > h2"); if(!h) return;
    h.classList.add("acc-h"); h.setAttribute("role", "button"); h.setAttribute("tabindex", "0"); h.setAttribute("aria-expanded", "true");
    h.title = "กดเพื่อยุบ / ขยายหัวข้อนี้";
    const chev = document.createElement("span"); chev.className = "acc-chev"; chev.textContent = "▾"; chev.setAttribute("aria-hidden", "true"); h.append(chev);
    const toggle = () => setOpen(sec, sec.classList.contains("acc-collapsed"));
    h.addEventListener("click", e => {
      if(e.target.closest("button, a")){ setOpen(sec, true); return; }       // ปุ่มเสียง/ลิงก์ในหัวข้อ: ขยายแล้วทำงานตามปกติ
      toggle();
    });
    h.addEventListener("keydown", e => { if((e.key === "Enter" || e.key === " ") && !e.target.closest("button, a")){ e.preventDefault(); toggle(); } });
  });

  if(secs.length > 1){
    const bar = document.createElement("div"); bar.className = "acc-bar";
    const mk = (txt, open) => { const b = document.createElement("button"); b.type = "button"; b.textContent = txt; b.onclick = () => secs.forEach(s => setOpen(s, open)); return b; };
    bar.append(mk("▾ ขยายทั้งหมด", true), mk("▸ ยุบทั้งหมด", false));
    secs[0].parentElement.insertBefore(bar, secs[0]);
  }
})();
