/* gamepad.js — ปุ่มควบคุมบนจอสัมผัสแบบเกม ROV: จอยสติ๊กซ้ายมือ + ปุ่มกระโดดขวามือ ลอยทับฉากเกม
   และพาเข้าโหมดเต็มจอแนวนอนทันทีที่กดเริ่มเกม (เฉพาะโทรศัพท์/แท็บเล็ต)

   วิธีทำงาน: แปลงการลาก/แตะเป็นเหตุการณ์คีย์บอร์ด (ArrowLeft/Right/Up/Down, Space) ส่งเข้า window
   เกมเดิมที่รองรับคีย์บอร์ดอยู่แล้วจึงใช้ได้ทันที ไม่ต้องแก้ตรรกะเกม

   ใช้งาน:  KrtomPad.init({ wrap:"#wrap", mode:"4dir" | "lr", jump:true, stickJump:true,
                            start:["#start-btn"], toggleFs:()=>{...} })
   - mode "4dir": เดินได้ 4 ทิศ (เขาวงกต)   - mode "lr": ซ้าย/ขวา + ปุ่มกระโดด (เกมแพลตฟอร์ม)
   - ทดสอบบนคอมพิวเตอร์: ใส่ ?pad=1 ท้ายที่อยู่เว็บ */
(function(){
  const KP = window.KrtomPad = { active:false };
  const forced = /[?&]pad=1/.test(location.search);
  const coarse = forced || (window.matchMedia && matchMedia("(pointer:coarse)").matches);
  const KEYS = { left:"ArrowLeft", right:"ArrowRight", up:"ArrowUp", down:"ArrowDown", jump:" ", pause:"p" };
  const held = new Set();

  function fire(type, key){
    try{ window.dispatchEvent(new KeyboardEvent(type, { key, code: key === " " ? "Space" : key, bubbles:true, cancelable:true })); }catch(e){}
  }
  function setKey(name, on){
    const k = KEYS[name];
    if(on && !held.has(name)){ held.add(name); fire("keydown", k); }
    else if(!on && held.has(name)){ held.delete(name); fire("keyup", k); }
  }
  const releaseAll = () => [...held].forEach(n => setKey(n, false));
  const buzz = (ms) => { try{ navigator.vibrate && navigator.vibrate(ms); }catch(e){} };

  /* ---------- เต็มจอ (ใช้ได้ทั้งแบบ Fullscreen API และแบบสำรองสำหรับ iPhone) ---------- */
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  const isFs = () => !!fsEl() || !!document.querySelector(".pfs, .kgp-pfs");
  function syncFs(){
    const on = isFs();
    document.documentElement.classList.toggle("kgp-fs", on);
    try{
      if(on && screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(() => {});
      else if(!on && screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
    }catch(e){}
    if(!on) releaseAll();
  }
  KP.toggleFs = async function(el){
    if(isFs()){
      try{ if(fsEl()){ (document.exitFullscreen || document.webkitExitFullscreen).call(document); } }catch(e){}
      document.querySelectorAll(".kgp-pfs").forEach(x => x.classList.remove("kgp-pfs"));
    }else{
      try{
        const f = el.requestFullscreen || el.webkitRequestFullscreen;
        if(f) await f.call(el); else el.classList.add("kgp-pfs");
      }catch(e){ el.classList.add("kgp-pfs"); }
    }
    setTimeout(syncFs, 50);
  };
  document.addEventListener("fullscreenchange", syncFs);
  document.addEventListener("webkitfullscreenchange", syncFs);
  new MutationObserver(syncFs).observe(document.documentElement, { subtree:true, attributes:true, attributeFilter:["class"] });
  window.addEventListener("blur", releaseAll);
  document.addEventListener("visibilitychange", () => { if(document.hidden) releaseAll(); });

  /* ---------- สร้างปุ่มควบคุม ---------- */
  KP.init = function(o){
    if(!coarse) return;
    const wrap = document.querySelector(o.wrap); if(!wrap || KP.active) return;
    KP.active = true; document.documentElement.classList.add("kgp-on");
    const mode = o.mode || "lr", toggleFs = o.toggleFs || (() => KP.toggleFs(wrap));

    const root = document.createElement("div"); root.className = "kgp";
    root.innerHTML =
      '<div class="kgp-stick" aria-label="จอยสติ๊ก"><i class="kgp-arr u"></i><i class="kgp-arr d"></i><i class="kgp-arr l"></i><i class="kgp-arr r"></i><div class="kgp-knob"></div></div>' +
      (o.jump ? '<button type="button" class="kgp-btn jump" aria-label="กระโดด"><b>⤒</b><small>กระโดด</small></button>' : '') +
      '<div class="kgp-side"><button type="button" class="kgp-mini" data-a="pause" aria-label="พักเกม">⏸</button>' +
      '<button type="button" class="kgp-mini" data-a="fs" aria-label="เต็มจอ">⛶</button></div>' +
      '<div class="kgp-hint">↻ หมุนโทรศัพท์เป็นแนวนอนเพื่อเล่น</div>';
    wrap.append(root);

    /* จอยสติ๊ก */
    const stick = root.querySelector(".kgp-stick"), knob = root.querySelector(".kgp-knob");
    let pid = null, cur = null;
    function apply(dx, dy){
      const len = Math.hypot(dx, dy), dead = .28;
      let want = null;
      if(len > dead){
        if(mode === "4dir"){
          const ax = Math.abs(dx), ay = Math.abs(dy);
          // ถ้ากำลังเดินทิศหนึ่งอยู่ ต้องลากอีกแกนมากกว่าชัดเจนจึงจะเปลี่ยนทิศ (กันสั่น)
          const horiz = cur === "left" || cur === "right";
          const useX = cur ? (horiz ? ax * 1.3 >= ay : ax > ay * 1.3) : ax > ay;
          want = useX ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
        }else{
          if(Math.abs(dx) > dead) want = dx < 0 ? "left" : "right";
        }
      }
      if(want !== cur){ ["left","right","up","down"].forEach(n => setKey(n, n === want)); cur = want; }
      if(mode === "lr" && o.stickJump) setKey("jump", dy < -.72 && !jumpBtnDown);
    }
    function move(e){
      const r = stick.getBoundingClientRect(), R = r.width / 2;
      let dx = (e.clientX - (r.left + R)) / R, dy = (e.clientY - (r.top + R)) / R;
      const len = Math.hypot(dx, dy); if(len > 1){ dx /= len; dy /= len; }
      knob.style.transform = "translate(" + (dx * R * .52) + "px," + (dy * R * .52) + "px)";
      apply(dx, dy);
    }
    function end(e){
      if(pid === null || (e && e.pointerId !== pid)) return;
      pid = null; stick.classList.remove("on"); knob.style.transform = "";
      cur = null; ["left","right","up","down"].forEach(n => setKey(n, false)); if(o.stickJump && !jumpBtnDown) setKey("jump", false);
    }
    stick.addEventListener("pointerdown", (e) => { e.preventDefault(); if(pid !== null) return; pid = e.pointerId; try{ stick.setPointerCapture(pid); }catch(_){} stick.classList.add("on"); buzz(6); move(e); });
    stick.addEventListener("pointermove", (e) => { if(e.pointerId === pid){ e.preventDefault(); move(e); } });
    ["pointerup","pointercancel","lostpointercapture"].forEach(ev => stick.addEventListener(ev, end));

    /* ปุ่มกระโดด (กดค้าง = กระโดดสูงขึ้น เหมือนคีย์บอร์ด) */
    let jumpBtnDown = false;
    const jb = root.querySelector(".kgp-btn.jump");
    if(jb){
      const on = (e) => { e.preventDefault(); jumpBtnDown = true; jb.classList.add("on"); setKey("jump", true); buzz(10); try{ jb.setPointerCapture(e.pointerId); }catch(_){} };
      const off = () => { jumpBtnDown = false; jb.classList.remove("on"); setKey("jump", false); };
      jb.addEventListener("pointerdown", on);
      ["pointerup","pointercancel","lostpointercapture"].forEach(ev => jb.addEventListener(ev, off));
    }

    /* ปุ่มเล็ก: พักเกม / เต็มจอ */
    root.querySelectorAll(".kgp-mini").forEach(b => {
      b.addEventListener("pointerdown", (e) => e.stopPropagation());
      b.addEventListener("click", (e) => {
        e.preventDefault();
        if(b.dataset.a === "pause"){ fire("keydown", "p"); fire("keyup", "p"); } else toggleFs();
      });
    });

    /* กดเริ่มเกม → เต็มจอทันที (ต้องทำในจังหวะที่ผู้เล่นแตะเอง เบราว์เซอร์จึงอนุญาต) */
    (o.start || []).forEach(sel => document.querySelectorAll(sel).forEach(b =>
      b.addEventListener("click", () => { if(!isFs() && Math.min(innerWidth, innerHeight) < 900) toggleFs(); }, true)));

    syncFs();
  };
})();
