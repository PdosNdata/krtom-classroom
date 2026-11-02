/* avatars.js — ภาพโปรไฟล์การ์ตูน (avatar) ให้ผู้ใช้เลือก: ผู้ชาย · ผู้หญิง · เด็ก
 * วาดด้วย SVG ในโค้ดทั้งหมด (ไม่มีไฟล์รูป) · เก็บตัวเลือกไว้ในเครื่องนี้ (localStorage) แยกตามชื่อผู้เข้าระบบ
 * ใช้ที่: ป้ายชื่อมุมขวาบนของหน้าแรก และหน้า "ตั้งค่า"
 */
(function(){
  const W = "#FFFFFF";
  // skin = สีผิว · hair = สีผม · style = ทรงผม · shirt = สีเสื้อ · bg = สีพื้นหลังวงกลม
  const LIST = [
    { id:"m1", g:"man",   name:"พี่ชายผมสั้น",   skin:"#F6C9A0", hair:"#2B2118", style:"short",   shirt:"#3B82F6", bg:"#DBEAFE" },
    { id:"m2", g:"man",   name:"พี่ชายแว่น",     skin:"#E9B98C", hair:"#5B3A1E", style:"short",   shirt:"#10B981", bg:"#D1FAE5", glasses:true },
    { id:"m3", g:"man",   name:"คุณลุงหนวด",     skin:"#D9A877", hair:"#374151", style:"short",   shirt:"#8B5CF6", bg:"#EDE9FE", beard:true },
    { id:"m4", g:"man",   name:"พี่ชายหมวก",     skin:"#F2C29B", hair:"#2B2118", style:"cap",     shirt:"#F97316", bg:"#FFEDD5", cap:"#EF4444" },
    { id:"w1", g:"woman", name:"พี่สาวผมยาว",    skin:"#F8D2B0", hair:"#2B2118", style:"long",    shirt:"#EC4899", bg:"#FCE7F3" },
    { id:"w2", g:"woman", name:"พี่สาวมวยผม",    skin:"#EBBB91", hair:"#4A2C17", style:"bun",     shirt:"#14B8A6", bg:"#CCFBF1", glasses:true },
    { id:"w3", g:"woman", name:"พี่สาวผมบ๊อบ",   skin:"#F6C9A0", hair:"#7C3A12", style:"bob",     shirt:"#F59E0B", bg:"#FEF3C7" },
    { id:"w4", g:"woman", name:"พี่สาวหางม้า",   skin:"#E3AE82", hair:"#1F2937", style:"pony",    shirt:"#6366F1", bg:"#E0E7FF" },
    { id:"k1", g:"kid",   name:"น้องชายผมตั้ง",  skin:"#F8D2B0", hair:"#2B2118", style:"spiky",   shirt:"#EF4444", bg:"#FEE2E2", kid:true },
    { id:"k2", g:"kid",   name:"น้องชายหมวก",    skin:"#EBBB91", hair:"#4A2C17", style:"cap",     shirt:"#0EA5E9", bg:"#E0F2FE", kid:true, cap:"#22C55E" },
    { id:"k3", g:"kid",   name:"น้องหญิงจุกคู่",  skin:"#F8D2B0", hair:"#2B2118", style:"pigtail", shirt:"#F472B6", bg:"#FCE7F3", kid:true },
    { id:"k4", g:"kid",   name:"น้องหญิงโบว์",   skin:"#F2C29B", hair:"#5B3A1E", style:"bow",     shirt:"#A855F7", bg:"#F3E8FF", kid:true, bow:"#F43F5E" }
  ];
  const GROUPS = [["man", "ผู้ชาย", "👨"], ["woman", "ผู้หญิง", "👩"], ["kid", "เด็ก", "🧒"]];

  function svg(id, size){
    const a = LIST.find(x => x.id === id); if(!a) return "";
    const kid = !!a.kid, cy = kid ? 51 : 48, rx = kid ? 24 : 22, ry = kid ? 25 : 24, eyeR = kid ? 3.6 : 2.7;
    const hair = a.hair, skin = a.skin;
    let back = "", front = "", extra = "";
    if(a.style === "long") back = `<path d="M25 54 Q20 18 50 17 Q80 18 75 54 L78 84 Q50 90 22 84 Z" fill="${hair}"/>`;
    if(a.style === "pony") back = `<path d="M68 30 Q92 36 84 68 Q80 54 70 48 Z" fill="${hair}"/>`;
    if(a.style === "pigtail") back = `<ellipse cx="22" cy="56" rx="8" ry="12" fill="${hair}"/><ellipse cx="78" cy="56" rx="8" ry="12" fill="${hair}"/>`;
    const fringe = `<path d="M${50 - rx - 1} ${cy - 5} Q${50 - rx} ${cy - 27} 50 ${cy - 27} Q${50 + rx} ${cy - 27} ${50 + rx + 1} ${cy - 5} Q62 ${cy - 17} 50 ${cy - 15} Q38 ${cy - 17} ${50 - rx - 1} ${cy - 5} Z" fill="${hair}"/>`;
    if(a.style === "short") front = `<path d="M27 46 Q25 19 50 19 Q75 19 73 46 Q64 31 50 32 Q36 31 27 46 Z" fill="${hair}"/>`;
    if(a.style === "long" || a.style === "pony" || a.style === "pigtail") front = fringe;
    if(a.style === "bob") front = `<path d="M25 58 Q18 20 50 18 Q82 20 75 58 L70 58 Q70 34 50 33 Q30 34 30 58 Z" fill="${hair}"/>`;
    if(a.style === "bun") front = fringe + `<circle cx="50" cy="15" r="9" fill="${hair}"/>`;
    if(a.style === "spiky") front = `<path d="M26 ${cy - 3} L27 ${cy - 22} L36 ${cy - 15} L42 ${cy - 31} L50 ${cy - 17} L58 ${cy - 31} L64 ${cy - 15} L73 ${cy - 22} L74 ${cy - 3} Q62 ${cy - 16} 50 ${cy - 15} Q38 ${cy - 16} 26 ${cy - 3} Z" fill="${hair}"/>`;
    if(a.style === "bow") front = fringe + `<path d="M62 ${cy - 28} L74 ${cy - 36} L74 ${cy - 20} Z M62 ${cy - 28} L50 ${cy - 36} L50 ${cy - 20} Z" fill="${a.bow}"/><circle cx="62" cy="${cy - 28}" r="3.6" fill="${a.bow}"/>`;
    if(a.cap){
      front = (a.style === "cap" ? `<path d="M26 ${cy - 4} Q27 ${cy - 26} 50 ${cy - 26} Q73 ${cy - 26} 74 ${cy - 4} Z" fill="${a.cap}"/><path d="M58 ${cy - 4} Q80 ${cy - 6} 84 ${cy + 1} L58 ${cy + 1} Z" fill="${a.cap}" opacity=".85"/><circle cx="50" cy="${cy - 27}" r="3" fill="${a.cap}"/>` : "");
    }
    const mouthColor = a.beard ? "#FFFFFF" : "#7C2D12";
    if(a.beard) extra += `<path d="M30 ${cy + 4} Q32 ${cy + 28} 50 ${cy + 28} Q68 ${cy + 28} 70 ${cy + 4} Q62 ${cy + 16} 50 ${cy + 16} Q38 ${cy + 16} 30 ${cy + 4} Z" fill="${hair}"/>`;
    const glasses = a.glasses ? `<g fill="none" stroke="#111827" stroke-width="2"><circle cx="41" cy="${cy + 2}" r="7"/><circle cx="59" cy="${cy + 2}" r="7"/><path d="M48 ${cy + 2} L52 ${cy + 2}"/></g>` : "";
    const eyes = kid
      ? `<circle cx="41" cy="${cy + 2}" r="${eyeR}" fill="#1F2937"/><circle cx="59" cy="${cy + 2}" r="${eyeR}" fill="#1F2937"/><circle cx="42.2" cy="${cy + 0.8}" r="1.2" fill="${W}"/><circle cx="60.2" cy="${cy + 0.8}" r="1.2" fill="${W}"/>`
      : `<circle cx="41" cy="${cy + 2}" r="${eyeR}" fill="#1F2937"/><circle cx="59" cy="${cy + 2}" r="${eyeR}" fill="#1F2937"/>`;
    const body = kid ? `<path d="M22 100 Q22 78 50 76 Q78 78 78 100 Z" fill="${a.shirt}"/>` : `<path d="M16 100 Q16 74 50 72 Q84 74 84 100 Z" fill="${a.shirt}"/>`;
    const collar = `<path d="M42 ${kid ? 76 : 72} L50 ${kid ? 84 : 82} L58 ${kid ? 76 : 72} Z" fill="${W}" opacity=".9"/>`;
    const px = size ? ` width="${size}" height="${size}"` : "";
    return `<svg class="k-av-svg" viewBox="0 0 100 100"${px} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${a.name}">` +
      `<circle cx="50" cy="50" r="50" fill="${a.bg}"/><g clip-path="circle(50px at 50px 50px)">${body}${collar}` +
      `<rect x="43" y="${kid ? 62 : 64}" width="14" height="14" rx="5" fill="${skin}"/>${back}` +
      `<ellipse cx="50" cy="${cy}" rx="${rx}" ry="${ry}" fill="${skin}"/>${extra}` +
      `<circle cx="35" cy="${cy + 10}" r="4.2" fill="#F472B6" opacity=".38"/><circle cx="65" cy="${cy + 10}" r="4.2" fill="#F472B6" opacity=".38"/>` +
      `${eyes}${glasses}<path d="M43 ${cy + 11} Q50 ${cy + 18} 57 ${cy + 11}" fill="none" stroke="${mouthColor}" stroke-width="2.2" stroke-linecap="round"/>${front}</g></svg>`;
  }

  const user = () => { try{ return sessionStorage.getItem("loggedInUserName") || ""; }catch(e){ return ""; } };
  const role = () => { try{ return sessionStorage.getItem("loggedInRole") || ""; }catch(e){ return ""; } };
  const key = () => "krtomAvatar:" + role() + ":" + user();
  function get(){ try{ const v = localStorage.getItem(key()); return LIST.some(x => x.id === v) ? v : ""; }catch(e){ return ""; } }
  function set(id){ try{ if(id) localStorage.setItem(key(), id); else localStorage.removeItem(key()); }catch(e){} paint(); }
  // วาดภาพโปรไฟล์บนป้ายชื่อมุมขวาบน (หน้าแรก) และหน้าตั้งค่า
  function paint(){
    const id = get(), html = id ? '<span class="k-av">' + svg(id, 26) + "</span>" : "👤";
    document.querySelectorAll("[data-k-avatar]").forEach(el => { el.innerHTML = html; });
  }
  window.addEventListener("storage", (e) => { if(e.key && e.key.indexOf("krtomAvatar:") === 0) paint(); });
  const st = document.createElement("style");
  st.textContent = ".k-av{ display:inline-flex; width:26px; height:26px; border-radius:50%; overflow:hidden; vertical-align:middle; box-shadow:0 0 0 2px rgba(255,255,255,.85); } .k-av svg{ display:block; width:100%; height:100%; }";
  document.head.appendChild(st);
  window.KrtomAvatar = { LIST, GROUPS, svg, get, set, paint };
  document.addEventListener("DOMContentLoaded", paint);
})();
