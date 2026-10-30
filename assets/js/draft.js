/* draft.js — เก็บงานที่ทำค้างไว้ (ใบงาน / แบบทดสอบ) ให้นักเรียนกลับมาทำต่อวันหลังได้
 * 1) ร่างยังบันทึกในเครื่องเหมือนเดิม (localStorage คีย์ขึ้นต้น krtomws) และสำรองขึ้นฐานข้อมูลผูกกับตัวนักเรียน
 *    (krtom_save_draft / krtom_load_drafts — ต้องรัน supabase/20261030100000_krtom_drafts.sql) เปลี่ยนเครื่องก็ทำต่อได้
 * 2) เครื่องที่ใช้ร่วมกัน: ถ้าเปลี่ยนคนล็อกอิน ร่างของคนเดิมในเครื่องจะถูกล้าง (ยังอยู่ในฐานข้อมูล)
 * 3) ข้อปรนัย (แบบทดสอบ/ใบงาน 2.1) จำตัวเลือกที่เลือกไว้ — จับคู่ด้วยรหัสข้อ + ข้อความตัวเลือก (สลับลำดับก็ยังถูก)
 * ต้องโหลดไว้ต้นหน้า (ก่อนสคริปต์ของหน้า) เพื่อให้ล้างร่างเก่าก่อนหน้าอ่านค่า
 */
(function(){
  const URL_ = "https://dhufwdxxfbahovnmjgrc.supabase.co/rest/v1/rpc/";
  const KEY_ = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRodWZ3ZHh4ZmJhaG92bm1qZ3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MTIwODAsImV4cCI6MjA2OTM4ODA4MH0.V-7Jlkq5ucQBznGXjtUKCse8sLLnNJ0mDTlcgme8G0c";
  const PFX = /^krtomws/, META = "krtomDraftMeta", OWNER = "krtomDraftOwner";
  const ss = (k) => { try{ return sessionStorage.getItem(k); }catch(e){ return null; } };
  const lsGet = (k) => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
  const lsOrigSet = Storage.prototype.setItem, lsOrigRemove = Storage.prototype.removeItem;
  const rawSet = (k, v) => { try{ lsOrigSet.call(localStorage, k, v); }catch(e){} };
  const rawDel = (k) => { try{ lsOrigRemove.call(localStorage, k); }catch(e){} };
  const token = () => ss("krtomStudentToken");
  const student = () => ss("loggedInRole") === "student" && !!token();
  const meta = () => { try{ return JSON.parse(lsGet(META) || "{}"); }catch(e){ return {}; } };
  const saveMeta = (m) => rawSet(META, JSON.stringify(m));
  const draftKeys = () => { const a = []; try{ for(let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if(PFX.test(k)) a.push(k); } }catch(e){} return a; };

  async function rpc(name, args, keepalive){
    const r = await fetch(URL_ + name, { method:"POST", keepalive:!!keepalive, headers:{ apikey:KEY_, Authorization:"Bearer " + KEY_, "Content-Type":"application/json" }, body:JSON.stringify(args) });
    if(!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }

  // ---------- 1) เปลี่ยนคนล็อกอินบนเครื่องเดิม → ล้างร่างของคนเก่า (ก่อนหน้าอ่านค่า) ----------
  if(ss("loggedInRole") === "student"){
    const me = (ss("loggedInUserName") || "") + "|" + (ss("loggedInStudentGrade") || ""), own = lsGet(OWNER);
    if(own && own !== me){ draftKeys().forEach(rawDel); rawDel(META); }
    rawSet(OWNER, me);
  }

  // ---------- 2) ส่งร่างขึ้นฐานข้อมูลเมื่อมีการบันทึกในเครื่อง ----------
  const queue = new Set(); let timer = 0, applying = false;
  async function flush(keepalive){
    clearTimeout(timer); timer = 0;
    if(!student()) { queue.clear(); return; }
    const keys = [...queue]; queue.clear();
    for(const k of keys){
      const v = lsGet(k); if(v == null) continue;
      try{ await rpc("krtom_save_draft", { p_token:token(), p_key:k, p_data:v }, keepalive); }catch(e){ /* ยังไม่ได้ติดตั้ง SQL/ออฟไลน์: เก็บในเครื่องไว้ก่อน */ }
    }
  }
  const touched = (k) => { if(applying || !PFX.test(k)) return; const m = meta(); m[k] = Date.now(); saveMeta(m); if(!student()) return; queue.add(k); clearTimeout(timer); timer = setTimeout(() => flush(false), 1500); };
  Storage.prototype.setItem = function(k, v){ lsOrigSet.call(this, k, v); if(this === localStorage) touched(String(k)); };
  Storage.prototype.removeItem = function(k){ lsOrigRemove.call(this, k); };
  addEventListener("pagehide", () => { if(queue.size) flush(true); });
  document.addEventListener("visibilitychange", () => { if(document.visibilityState === "hidden" && queue.size) flush(true); });

  // ---------- 3) ปรนัย: จำตัวเลือกที่เลือก ----------
  const file = location.pathname.split("/").pop().replace(/\.html$/, "");
  const MCQKEY = "krtomws:m1/cs/1:mcq:" + file + (/[?&]mode=pre(&|$)/.test(location.search) ? ":pre" : "");
  const qid = (q) => { const b = q.querySelector("[data-audio-src]"); return b ? b.dataset.audioSrc : null; };
  const choiceText = (inp) => { const l = inp.closest("label"); return l ? l.textContent.replace(/^\s*[ก-ฮ]\.\s*/, "").replace(/\s+/g, " ").trim() : ""; };
  function saveRadios(){
    const o = {}; document.querySelectorAll(".mcq").forEach(q => { const id = qid(q), c = q.querySelector("input[type=radio]:checked"); if(id && c) o[id] = choiceText(c); });
    try{ localStorage.setItem(MCQKEY, JSON.stringify(o)); }catch(e){}
  }
  function restoreRadios(){
    let o; try{ o = JSON.parse(lsGet(MCQKEY) || "{}"); }catch(e){ return; }
    let n = 0;
    document.querySelectorAll(".mcq").forEach(q => {
      const id = qid(q), want = id && o[id]; if(!want) return;
      const inp = [...q.querySelectorAll("input[type=radio]")].find(i => choiceText(i) === want);
      if(inp && !q.querySelector("input[type=radio]:checked")){ inp.checked = true; n++; inp.dispatchEvent(new Event("change", { bubbles:true })); }
    });
    if(n && typeof window.updateProgress === "function") try{ window.updateProgress(); }catch(e){}
  }

  // ---------- 4) ซิงก์กับฐานข้อมูลหลังหน้าโหลด ----------
  async function sync(){
    if(!student()) return;
    let rows; try{ rows = await rpc("krtom_load_drafts", { p_token:token() }); }catch(e){ return; }
    const m = meta(), seen = new Set(); let changed = false;
    applying = true;
    (rows || []).forEach(r => {
      if(!PFX.test(r.draft_key)) return; seen.add(r.draft_key);
      const lv = lsGet(r.draft_key), lts = m[r.draft_key] || 0, cts = Date.parse(r.updated_at) || 0;
      if(lv == null || (lv !== r.data && cts > lts)){ rawSet(r.draft_key, r.data); m[r.draft_key] = cts; changed = true; }
      else if(lv !== r.data) queue.add(r.draft_key);   // ในเครื่องใหม่กว่า → ส่งขึ้น
    });
    applying = false; saveMeta(m);
    draftKeys().forEach(k => { if(!seen.has(k)) queue.add(k); });   // ร่างที่มีแต่ในเครื่อง → สำรองขึ้น
    if(queue.size) flush(false);
    if(changed){ const g = "krtomDraftRl:" + location.pathname; if(!ss(g)){ try{ sessionStorage.setItem(g, "1"); }catch(e){} location.reload(); } }
  }

  function init(){
    if(document.querySelector(".mcq input[type=radio]")){
      restoreRadios();
      document.addEventListener("change", e => { if(e.target && e.target.matches && e.target.matches(".mcq input[type=radio]")) saveRadios(); });
      // ส่งคำตอบแล้ว → ล้างตัวเลือกที่จำไว้ (ทำใหม่รอบหน้าจะได้เริ่มสะอาด)
      if(typeof window.submitQuiz === "function"){ const orig = window.submitQuiz; window.submitQuiz = function(){ const r = orig.apply(this, arguments); try{ localStorage.setItem(MCQKEY, "{}"); }catch(e){} return r; }; }
    }
    sync();
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  window.KrtomDraft = { sync, flush: () => flush(false), keys: draftKeys };
})();
