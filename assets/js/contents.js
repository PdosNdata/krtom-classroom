/*
  contents.js — เนื้อหาที่ครูเพิ่มเอง (อัปโหลดไฟล์ / ลิงก์ / YouTube) เก็บใน Supabase
  ตาราง krtom_contents (ทุกคนอ่านได้) + เขียน/ลบผ่านฟังก์ชัน krtom_add_content / krtom_delete_content
  ที่ตรวจรหัสครูฝั่งเซิร์ฟเวอร์ — ดูไฟล์ SQL: supabase/20260930120000_krtom_contents.sql
*/
const KrtomContent = (() => {
  const BUCKET = "krtom-content";
  const MAX_BYTES = 25 * 1024 * 1024;
  const ALLOWED_EXT = ["pdf","png","jpg","jpeg","webp","gif","mp4","webm","mp3","m4a","docx","pptx","xlsx","txt","html"];
  const MIME_BY_EXT = {
    pdf:"application/pdf", png:"image/png", jpg:"image/jpeg", jpeg:"image/jpeg", webp:"image/webp", gif:"image/gif",
    mp4:"video/mp4", webm:"video/webm", mp3:"audio/mpeg", m4a:"audio/mp4", txt:"text/plain", html:"text/html",
    docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pptx:"application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  };
  const TAB_LABEL = { knowledge:"📘 ใบความรู้", worksheet:"📝 ใบงาน", quiz:"✅ แบบทดสอบ", game:"🎮 เกม", ar:"🕶️ เกม AR" };
  const SECTION_LABEL = { main:"เนื้อหาเพิ่มเติม", article:"📖 เนื้อหาบทความ", cartoon:"🎬 การ์ตูนแอนิเมชั่น" };

  let all = [];
  let loaded = false;

  const sb = () => (typeof getSupabase === "function" ? getSupabase() : null);
  const isTeacher = () => { try{ return sessionStorage.getItem("loggedInRole") === "teacher"; }catch(e){ return false; } };

  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  }
  // อนุญาตเฉพาะลิงก์ http(s) กันลิงก์อันตราย (เช่น javascript:)
  function safeUrl(u){
    try{
      const x = new URL(String(u).trim());
      return (x.protocol === "https:" || x.protocol === "http:") ? x.href : null;
    }catch(e){ return null; }
  }
  function youtubeId(u){
    const s = safeUrl(u); if(!s) return null;
    try{
      const x = new URL(s), h = x.hostname.replace(/^www\.|^m\./, "");
      let id = null;
      if(h === "youtu.be") id = x.pathname.slice(1).split("/")[0];
      else if(h === "youtube.com" || h === "youtube-nocookie.com"){
        if(x.pathname === "/watch") id = x.searchParams.get("v");
        else { const m = x.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?]+)/); if(m) id = m[1]; }
      }
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }catch(e){ return null; }
  }
  function fileUrl(item){
    const c = sb();
    if(!c || !item.storage_path) return null;
    return c.storage.from(BUCKET).getPublicUrl(item.storage_path).data.publicUrl;
  }
  function errMsg(e){
    const m = (e && (e.message || e.error_description)) || String(e || "");
    if(/Could not find the function|PGRST202|does not exist|relation .* does not exist/i.test(m))
      return "ยังไม่ได้ติดตั้งฐานข้อมูลเพิ่มเนื้อหา (ต้องรันไฟล์ SQL ใน Supabase ก่อน)";
    if(/Failed to fetch|NetworkError/i.test(m)) return "เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่";
    if(/mime|not allowed|invalid.*type/i.test(m)) return "ไฟล์ชนิดนี้ไม่รองรับ";
    if(/exceeded|too large|maximum allowed size|413/i.test(m)) return "ไฟล์ใหญ่เกิน 25 MB";
    return m;
  }

  // ---------- โหลด/ดึงข้อมูล ----------
  async function load(){
    const c = sb();
    if(!c){ return all; }
    const { data, error } = await c.from("krtom_contents").select("*").order("created_at", { ascending:true });
    if(!error){ all = data || []; loaded = true; }
    return all;
  }
  const itemsFor = (g, s, i, tab) => all.filter(x => x.grade_id === g && x.subject_id === s && x.unit_idx === i && x.tab_key === tab);
  const hasItems = (g, s, i, tab) => itemsFor(g, s, i, tab).length > 0;

  // ---------- แสดงผลรายการ (หน้าหน่วย) ----------
  function iconFor(item){
    const m = item.mime || "";
    if(m.startsWith("image/")) return "🖼️";
    if(m.startsWith("video/")) return "🎞️";
    if(m.startsWith("audio/")) return "🎧";
    if(m === "application/pdf") return "📕";
    if(m === "text/html") return "🎮";
    if(/wordprocessing/.test(m)) return "📄";
    if(/presentation/.test(m)) return "📊";
    if(/spreadsheet/.test(m)) return "📈";
    return "📎";
  }
  function renderItem(item){
    const t = esc(item.title);
    const d = item.description ? `<p class="cx-desc">${esc(item.description)}</p>` : "";
    const del = isTeacher() ? `<button type="button" class="cx-del" title="ลบเนื้อหานี้" onclick="KrtomContent.remove('${esc(item.id)}')">🗑 ลบ</button>` : "";
    let body = "";
    if(item.kind === "youtube"){
      const id = youtubeId(item.url);
      const link = safeUrl(item.url);
      body = id
        ? `<div class="cx-video"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0" title="${t}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`
        : (link ? `<a class="cx-open" href="${esc(link)}" target="_blank" rel="noopener noreferrer">▶ เปิดวิดีโอ</a>` : "");
    } else if(item.kind === "link"){
      const link = safeUrl(item.url);
      body = link ? `<a class="cx-open" href="${esc(link)}" target="_blank" rel="noopener noreferrer">🔗 เปิดลิงก์</a>` : "";
    } else {
      const u = fileUrl(item), m = item.mime || "";
      if(u && m.startsWith("image/")) body = `<a href="${esc(u)}" target="_blank" rel="noopener"><img class="cx-img" src="${esc(u)}" alt="${t}" loading="lazy"></a>`;
      else if(u && m.startsWith("video/")) body = `<video class="cx-media" src="${esc(u)}" controls preload="metadata"></video>`;
      else if(u && m.startsWith("audio/")) body = `<audio class="cx-audio" src="${esc(u)}" controls preload="none"></audio>`;
      else if(u && m === "text/html") body = `<button type="button" class="cx-open" onclick="KrtomContent.openHtml('${esc(item.id)}')">🎮 เปิดเล่น / ดูหน้านี้</button>`;
      else if(u) body = `<a class="cx-open" href="${esc(u)}" target="_blank" rel="noopener">${m === "application/pdf" ? "📖 เปิดอ่าน" : "⬇️ เปิด/ดาวน์โหลด"}</a>`;
    }
    return `<article class="cx-card"><div class="cx-head"><span class="cx-ico">${item.kind === "youtube" ? "▶️" : item.kind === "link" ? "🔗" : iconFor(item)}</span><h3>${t}</h3>${del}</div>${d}${body}</article>`;
  }
  // opts.pre = การ์ดสำเร็จรูปของเว็บ (เช่น เกมพลิกไพ่) ที่ต้องการวางรวมในกริดเดียวกัน, opts.title = หัวข้อกลุ่ม
  function renderItems(items, opts){
    opts = opts || {};
    if(!items.length && !opts.pre) return "";
    if(opts.pre != null){
      return `<div class="cx-wrap"><div class="cx-title">${opts.title || "🎮 เกมและกิจกรรม"}</div>${opts.pre}${items.length ? `${opts.pre ? '<div class="cx-sec">เพิ่มโดยครู</div>' : ""}<div class="cx-grid">${items.map(renderItem).join("")}</div>` : ""}</div>`;
    }
    const order = ["article", "cartoon", "main"];
    const groups = order.map(sec => ({ sec, list: items.filter(x => x.section === sec) })).filter(g => g.list.length);
    const showHeads = groups.length > 1 || groups[0].sec !== "main";
    return `<div class="cx-wrap"><div class="cx-title">📚 เนื้อหาที่ครูเพิ่ม</div>` +
      groups.map(g => `${showHeads ? `<div class="cx-sec">${SECTION_LABEL[g.sec]}</div>` : ""}<div class="cx-grid">${g.list.map(renderItem).join("")}</div>`).join("") + `</div>`;
  }

  // โทเคนครู (ได้จากการล็อกอินหน้าแรก) ใช้ยืนยันสิทธิ์ทุกครั้งที่เพิ่ม/ลบ
  const token = () => { try{ return sessionStorage.getItem("krtomTeacherToken"); }catch(e){ return null; } };
  function sessionExpired(){
    Swal.fire({ icon:"warning", title:"หมดเวลาเข้าสู่ระบบ", text:"กรุณาออกจากระบบแล้วเข้าสู่ระบบครูใหม่อีกครั้ง", confirmButtonText:"ตกลง", confirmButtonColor:"#3B82F6" });
  }
  const isExpiredErr = (e) => /หมดเวลาเข้าสู่ระบบ/.test((e && e.message) || "");

  // ไฟล์ .html ที่ครูอัปโหลด: ดึงเนื้อหามาแสดงใน iframe แบบ sandbox (สคริปต์รันได้ แต่แตะข้อมูลล็อกอินของเว็บหลักไม่ได้)
  async function openHtml(id){
    const item = all.find(x => String(x.id) === String(id));
    if(!item) return;
    const u = fileUrl(item); if(!u) return;
    const wrap = document.createElement("div");
    wrap.className = "cx-htmlview";
    wrap.innerHTML = `<div class="cx-htmlbar"><span class="cx-htmltitle">🎮 ${esc(item.title)}</span><button type="button" class="cx-hb" data-act="fs">⛶ เต็มจอ</button><button type="button" class="cx-hb cx-hclose" data-act="close">✕ ปิด</button></div><div class="cx-htmlbody"><div class="cx-htmlload">กำลังโหลด...</div></div>`;
    document.body.appendChild(wrap);
    document.body.style.overflow = "hidden";
    const close = () => { wrap.remove(); document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
    const onKey = (e) => { if(e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    wrap.querySelector('[data-act="close"]').onclick = close;
    wrap.querySelector('[data-act="fs"]').onclick = () => { const f = wrap.querySelector("iframe"); if(f && f.requestFullscreen) f.requestFullscreen().catch(() => {}); };
    try{
      const r = await fetch(u);
      if(!r.ok) throw new Error("HTTP " + r.status);
      const html = await r.text();
      const body = wrap.querySelector(".cx-htmlbody");
      body.innerHTML = "";
      const f = document.createElement("iframe");
      f.setAttribute("sandbox", "allow-scripts allow-forms allow-modals allow-popups allow-pointer-lock");
      f.setAttribute("allow", "fullscreen; autoplay");
      f.title = item.title;
      f.srcdoc = html;
      body.appendChild(f);
    }catch(e){
      wrap.querySelector(".cx-htmlbody").innerHTML = '<div class="cx-htmlload">เปิดไฟล์ไม่สำเร็จ ลองใหม่อีกครั้ง</div>';
    }
  }

  async function remove(id){
    const ok = await Swal.fire({ icon:"question", title:"ลบเนื้อหานี้ใช่ไหม?", showCancelButton:true, confirmButtonText:"ลบ", cancelButtonText:"ยกเลิก", confirmButtonColor:"#EF4444", cancelButtonColor:"#9CA3AF" });
    if(!ok.isConfirmed) return;
    const { error } = await sb().rpc("krtom_delete_content", { p_token: token(), p_id: id });
    if(error){
      if(isExpiredErr(error)) return sessionExpired();
      Swal.fire({ icon:"error", title:"ลบไม่สำเร็จ", text:errMsg(error), confirmButtonText:"ตกลง" });
      return;
    }
    await load(); if(typeof render === "function") render();
    Swal.fire({ icon:"success", title:"ลบแล้ว", timer:1200, showConfirmButton:false });
  }

  // ---------- ฟอร์มเพิ่มเนื้อหา ----------
  function opt(v, t, sel){ return `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(t)}</option>`; }

  function openAddForm(preset){
    if(!isTeacher()){ Swal.fire({ icon:"warning", title:"เฉพาะครูเท่านั้น", confirmButtonText:"ตกลง" }); return; }
    if(document.getElementById("cx-modal")) return;
    if(!token()){ sessionExpired(); return; }
    const p = preset || {};
    const wrap = document.createElement("div");
    wrap.id = "cx-modal"; wrap.className = "cx-overlay";
    wrap.innerHTML = `
      <div class="cx-box" role="dialog" aria-modal="true" aria-label="เพิ่มเนื้อหา">
        <button type="button" class="cx-x" aria-label="ปิด">✕</button>
        <h2>➕ เพิ่มเนื้อหา</h2>
        <form id="cx-form" novalidate>
          <div class="cx-row">
            <label>ชั้น<select id="cx-grade">${CURRICULUM.map(g => opt(g.id, g.grade, g.id === p.grade)).join("")}</select></label>
            <label>วิชา<select id="cx-subject"></select></label>
          </div>
          <label>หน่วยการเรียนรู้<select id="cx-unit"></select></label>
          <div class="cx-row">
            <label>เพิ่มไว้ที่แท็บ<select id="cx-tab"></select></label>
            <label id="cx-section-wrap">หมวดในใบความรู้<select id="cx-section">
              ${opt("main","เนื้อหาเพิ่มเติม (ทั่วไป)")}${opt("article","📖 เนื้อหาบทความ")}${opt("cartoon","🎬 การ์ตูนแอนิเมชั่น", p.section === "cartoon")}
            </select></label>
          </div>
          <fieldset class="cx-kinds">
            <legend>ประเภทเนื้อหา</legend>
            <label><input type="radio" name="cx-kind" value="youtube" ${p.section === "cartoon" ? "checked" : ""}> ▶️ ลิงก์ YouTube</label>
            <label><input type="radio" name="cx-kind" value="file" ${p.section === "cartoon" ? "" : "checked"}> 📎 อัปโหลดไฟล์</label>
            <label><input type="radio" name="cx-kind" value="link"> 🔗 ลิงก์เว็บอื่น</label>
          </fieldset>
          <label>ชื่อเนื้อหา *<input id="cx-title" type="text" maxlength="200" placeholder="เช่น การ์ตูนรู้จักอุปกรณ์คอมพิวเตอร์"></label>
          <label>คำอธิบายสั้น ๆ (ไม่บังคับ)<textarea id="cx-desc" rows="2" maxlength="2000" placeholder="บอกนักเรียนว่าเนื้อหานี้คืออะไร"></textarea></label>
          <label id="cx-url-wrap">ลิงก์ *<input id="cx-url" type="url" placeholder="https://www.youtube.com/watch?v=..."></label>
          <label id="cx-file-wrap">ไฟล์ * <small>(PDF, รูปภาพ, วิดีโอ MP4/WebM, เสียง MP3, Word/PowerPoint/Excel, TXT, HTML เกม/สื่อโต้ตอบ — ไม่เกิน 25 MB)</small>
            <input id="cx-file" type="file" accept=".${ALLOWED_EXT.join(",.")}"></label>
          <div id="cx-err" class="cx-err" role="alert"></div>
          <div class="cx-actions">
            <button type="button" class="cx-cancel">ยกเลิก</button>
            <button type="submit" class="cx-save">💾 บันทึกเนื้อหา</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(wrap);
    document.body.classList.add("cx-lock");

    const $ = (id) => wrap.querySelector("#" + id);
    const close = () => { wrap.remove(); document.body.classList.remove("cx-lock"); };
    wrap.querySelector(".cx-x").onclick = close;
    wrap.querySelector(".cx-cancel").onclick = close;
    wrap.addEventListener("mousedown", e => { if(e.target === wrap) wrap._down = true; });
    wrap.addEventListener("mouseup", e => { if(e.target === wrap && wrap._down) close(); wrap._down = false; });

    const grade = () => CURRICULUM.find(g => g.id === $("cx-grade").value);
    function fillSubjects(){
      const g = grade();
      $("cx-subject").innerHTML = g.subjects.map(s => opt(s.id, s.name, s.id === p.subject)).join("");
      fillUnits(); fillTabs();
    }
    function fillUnits(){
      const s = grade().subjects.find(x => x.id === $("cx-subject").value) || grade().subjects[0];
      $("cx-unit").innerHTML = s.units.map((u, i) => opt(i, `หน่วยที่ ${i + 1}: ${u.name}`, i === p.unit)).join("");
    }
    function fillTabs(){
      const tabs = ["knowledge","worksheet","quiz","game"].concat(grade().hasAR ? ["ar"] : []);
      $("cx-tab").innerHTML = tabs.map(t => opt(t, TAB_LABEL[t], t === (p.tab || "knowledge"))).join("");
      syncSection();
    }
    function syncSection(){ $("cx-section-wrap").style.display = $("cx-tab").value === "knowledge" ? "" : "none"; }
    function syncKind(){
      const k = wrap.querySelector('input[name="cx-kind"]:checked').value;
      $("cx-file-wrap").style.display = k === "file" ? "" : "none";
      $("cx-url-wrap").style.display = k === "file" ? "none" : "";
      $("cx-url").placeholder = k === "youtube" ? "https://www.youtube.com/watch?v=... หรือ https://youtu.be/..." : "https://...";
    }
    $("cx-grade").onchange = fillSubjects;
    $("cx-subject").onchange = () => { fillUnits(); };
    $("cx-tab").onchange = syncSection;
    wrap.querySelectorAll('input[name="cx-kind"]').forEach(r => r.onchange = syncKind);
    fillSubjects(); syncKind();
    if(p.subject) $("cx-subject").value = p.subject;
    setTimeout(() => $("cx-title").focus(), 50);

    $("cx-form").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const err = (m) => { $("cx-err").textContent = m || ""; };
      err("");
      const kind = wrap.querySelector('input[name="cx-kind"]:checked').value;
      const title = $("cx-title").value.trim();
      if(!title) return err("กรุณาใส่ชื่อเนื้อหา");
      let url = null, file = null;
      if(kind === "file"){
        file = $("cx-file").files[0];
        if(!file) return err("กรุณาเลือกไฟล์");
        const ext = (file.name.split(".").pop() || "").toLowerCase();
        if(!ALLOWED_EXT.includes(ext)) return err("ไฟล์ชนิดนี้ไม่รองรับ (รองรับ: " + ALLOWED_EXT.join(", ") + ")");
        if(file.size > MAX_BYTES) return err("ไฟล์ใหญ่เกิน 25 MB");
      } else {
        url = safeUrl($("cx-url").value);
        if(!url) return err("ลิงก์ไม่ถูกต้อง (ต้องขึ้นต้นด้วย https://)");
        if(kind === "youtube" && !youtubeId(url)) return err("ไม่ใช่ลิงก์ YouTube ที่ถูกต้อง");
      }

      const btn = wrap.querySelector(".cx-save"); btn.disabled = true; const label = btn.textContent;
      try{
        const c = sb(); if(!c) throw new Error("เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่");
        let storagePath = null, mime = null;
        if(file){
          btn.textContent = "กำลังอัปโหลดไฟล์...";
          const ext = file.name.split(".").pop().toLowerCase();
          mime = MIME_BY_EXT[ext] || file.type || null;
          const rnd = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2));
          storagePath = `uploads/${rnd}.${ext}`;
          const up = await c.storage.from(BUCKET).upload(storagePath, file, { contentType: mime || undefined, upsert:false });
          if(up.error) throw up.error;
        }
        btn.textContent = "กำลังบันทึก...";
        const tab = $("cx-tab").value;
        const r = await c.rpc("krtom_add_content", {
          p_token: token(),
          p_grade:$("cx-grade").value, p_subject:$("cx-subject").value, p_unit:parseInt($("cx-unit").value, 10),
          p_tab:tab, p_section: tab === "knowledge" ? $("cx-section").value : "main",
          p_kind:kind, p_title:title, p_description:$("cx-desc").value,
          p_url:url, p_storage_path:storagePath, p_mime:mime
        });
        if(r.error) throw r.error;
        const saved = { grade:$("cx-grade").value, subject:$("cx-subject").value, unit:$("cx-unit").value, tab };
        close();
        await load(); if(typeof render === "function") render();
        Swal.fire({ icon:"success", title:"เพิ่มเนื้อหาแล้ว", text:"เนื้อหาปรากฏในหน้าหน่วยเรียบร้อย", confirmButtonText:"ตกลง", confirmButtonColor:"#3B82F6" })
          .then(() => { location.hash = `#/unit/${saved.grade}/${saved.subject}/${saved.unit}/${saved.tab}`; });
      }catch(e){
        if(isExpiredErr(e)){ close(); return sessionExpired(); }
        err(errMsg(e));
        btn.disabled = false; btn.textContent = label;
      }
    });
  }

  document.addEventListener("keydown", e => {
    if(e.key === "Escape"){ const m = document.getElementById("cx-modal"); if(m){ m.remove(); document.body.classList.remove("cx-lock"); } }
  });
  document.addEventListener("DOMContentLoaded", () => {
    load().then(() => { if(all.length && typeof render === "function") render(); }).catch(() => {});
  });

  const renderCards = (items) => items.map(renderItem).join("");

  return { load, itemsFor, hasItems, renderItems, renderCards, openAddForm, openHtml, remove, isTeacher, get loaded(){ return loaded; } };
})();
