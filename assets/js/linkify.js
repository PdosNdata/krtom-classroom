/* linkify.js — ทำลิงก์ที่อยู่ในช่องคำตอบของใบงานให้กดได้ (ผังงาน / รหัสลำลอง / โค้ดจิ๊กซอว์ / ลิงก์อื่น)
 * ใต้ช่องที่มี URL จะมีปุ่มกดเปิดในแท็บใหม่ · อัปเดตเมื่อพิมพ์ หรือเมื่อโปรแกรมในอีกแท็บส่งข้อความกลับมา
 * ใส่ในหน้าใบงานทุกใบ (หน่วย 1 และ 2)
 */
(function(){
  if(window.__linkified) return; window.__linkified = true;
  function run(){
    const URLRE = /https?:\/\/[^\s<>"']+/g, boxes = new Map();
    const esc = (t) => String(t).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
    const label = (u) => /flowchart\.html/.test(u) ? "🔷 เปิดผังงาน" : /pseudocode\.html/.test(u) ? "📝 เปิดรหัสลำลอง" : /blocks\.html/.test(u) ? "🧩 เปิดโค้ดจิ๊กซอว์" : "🔗 เปิดลิงก์";
    function refresh(ta){
      const urls = [...new Set((ta.value.match(URLRE) || []).map(u => u.replace(/[.,;)]+$/, "")))];
      let box = boxes.get(ta);
      if(!urls.length){ if(box) box.style.display = "none"; return; }
      if(!box){ box = document.createElement("div"); box.style.cssText = "margin:6px 0 2px;display:flex;flex-wrap:wrap;gap:8px"; ta.insertAdjacentElement("afterend", box); boxes.set(ta, box); }
      const sig = urls.join("|"); if(box.dataset.sig !== sig){ box.dataset.sig = sig; box.innerHTML = urls.map(u => `<a href="${esc(u)}" target="_blank" rel="noopener" style="display:inline-block;background:#6366F1;color:#fff;text-decoration:none;font-weight:700;font-size:.9em;padding:6px 14px;border-radius:999px">${label(u)} ↗</a>`).join(""); }
      box.style.display = "flex";
    }
    const all = () => document.querySelectorAll("textarea").forEach(refresh);
    document.addEventListener("input", e => { if(e.target && e.target.tagName === "TEXTAREA") refresh(e.target); });
    all(); setTimeout(all, 600); setInterval(all, 1500);   // รองรับข้อความที่โหลดกลับ/ส่งมาจากแท็บอื่นภายหลัง
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
