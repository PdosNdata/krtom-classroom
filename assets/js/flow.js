/* flow.js — เรียนตามลำดับขั้นตอน (ไม่ให้ข้าม) + ส่งคะแนนเข้า Supabase
 * ลำดับ: objectives -> pretest -> knowledge -> worksheet -> posttest
 * ใช้ร่วมกันทั้งหน้าหลัก (app.js) และหน้าเนื้อหา content/xx-yy-n/*.html
 * - นักเรียน: ตรวจ/บันทึกผ่านโทเคนที่ได้ตอนล็อกอิน (krtomStudentToken) — ฝั่งเซิร์ฟเวอร์ตรวจลำดับขั้นซ้ำอีกชั้น
 * - ครู: เปิดได้ทุกขั้น และไม่บันทึกคะแนน
 */
(function(){
  const URL_ = "https://dhufwdxxfbahovnmjgrc.supabase.co";
  const KEY_ = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRodWZ3ZHh4ZmJhaG92bm1qZ3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MTIwODAsImV4cCI6MjA2OTM4ODA4MH0.V-7Jlkq5ucQBznGXjtUKCse8sLLnNJ0mDTlcgme8G0c";
  const STEPS = ["objectives", "pretest", "knowledge", "worksheet", "posttest"];
  const LOCAL_KEY = "krtomFlowLocal";

  const ss = (k) => { try{ return sessionStorage.getItem(k); }catch(e){ return null; } };

  // teacher | student (มีโทเคน เก็บที่เซิร์ฟเวอร์) | local (นักเรียนไม่มีโทเคน เก็บในเครื่อง) | open (ไม่ได้ล็อกอิน)
  function mode(){
    const role = ss("loggedInRole");
    if(role === "teacher") return "teacher";
    if(role === "student") return ss("krtomStudentToken") ? "student" : "local";
    return "open";
  }
  const tracked = () => { const m = mode(); return m === "student" || m === "local"; };

  async function rpc(name, args){
    const r = await fetch(URL_ + "/rest/v1/rpc/" + name, {
      method: "POST",
      headers: { apikey: KEY_, Authorization: "Bearer " + KEY_, "Content-Type": "application/json" },
      body: JSON.stringify(args)
    });
    let j = null; try{ j = await r.json(); }catch(e){}
    if(!r.ok){
      const e = new Error((j && j.message) || ("HTTP " + r.status));
      e.code = j && j.code; throw e;
    }
    return j;
  }

  const ukey = (u) => `${u.g}/${u.s}/${u.i}`;
  const localGet = () => { try{ return JSON.parse(ss(LOCAL_KEY) || "[]"); }catch(e){ return []; } };
  const localAdd = (k) => { const a = localGet(); if(!a.includes(k)){ a.push(k); try{ sessionStorage.setItem(LOCAL_KEY, JSON.stringify(a)); }catch(e){} } };

  // คืน Set ของ "g/s/i/step" ที่ทำแล้ว (โหมด teacher/open = ทุกขั้นถือว่าผ่านหมด)
  async function getProgress(){
    const m = mode();
    if(m === "local") return new Set(localGet());
    if(m !== "student") return null;
    const rows = await rpc("krtom_my_progress", { p_token: ss("krtomStudentToken") });
    return new Set((rows || []).map(r => `${r.grade_id}/${r.subject_id}/${r.unit_idx}/${r.step}`));
  }

  // ขั้นนี้ปลดล็อกหรือยัง (set = null → ไม่จำกัด)
  function unlocked(set, u, step){
    if(!set) return true;
    const i = STEPS.indexOf(step);
    return i <= 0 || set.has(`${ukey(u)}/${STEPS[i - 1]}`);
  }
  const done = (set, u, step) => !set || set.has(`${ukey(u)}/${step}`);

  async function mark(u, step){
    const m = mode();
    if(m === "local"){ localAdd(`${ukey(u)}/${step}`); return; }
    if(m !== "student") return;
    await rpc("krtom_mark_step", { p_token: ss("krtomStudentToken"), p_grade: u.g, p_subject: u.s, p_unit: u.i, p_step: step });
  }

  async function submit(u, type, score, total){
    const m = mode();
    if(m === "local"){ localAdd(`${ukey(u)}/${type}`); return { local: true }; }
    if(m !== "student") return { skipped: true };
    await rpc("krtom_submit_score", { p_token: ss("krtomStudentToken"), p_grade: u.g, p_subject: u.s, p_unit: u.i, p_type: type, p_score: score, p_total: total });
    return { saved: true };
  }

  const errText = (e) => {
    const m = (e && e.message) || "";
    if(/หมดเวลาเข้าสู่ระบบ/.test(m)) return "หมดเวลาเข้าสู่ระบบ กรุณาออกจากระบบแล้วเข้าใหม่";
    if(/ข้ามขั้น|ขั้นตอนก่อนหน้า/.test(m)) return "ต้องทำขั้นตอนก่อนหน้าให้ครบก่อน";
    if(/PGRST202|Could not find the function/i.test(m)) return "ระบบเก็บคะแนนยังไม่ได้ติดตั้งในฐานข้อมูล (ครูต้องรันไฟล์ SQL)";
    return "ส่งคะแนนไม่สำเร็จ (ตรวจสอบอินเทอร์เน็ต)";
  };

  // ---------------------------------------------------------------- หน้าเนื้อหา
  function initPage(){
    const m = location.pathname.match(/\/content\/([a-z]\d)-([a-z]+)-(\d+)\/(knowledge|worksheet|quiz)(?:-[\w-]+)?\.html$/i);
    if(!m) return;
    const u = { g: m[1], s: m[2], i: parseInt(m[3], 10) };
    const file = m[4].toLowerCase();
    const pre = file === "quiz" && /[?&]mode=pre(&|$)/.test(location.search);
    const step = file === "quiz" ? (pre ? "pretest" : "posttest") : file;
    const unitHref = `../../index.html#/unit/${u.g}/${u.s}/${u.i}/knowledge`;
    const md = mode();
    if(file !== "knowledge") choiceAudio();

    // จุดประสงค์แยกเป็นขั้นของตัวเองแล้ว → ซ่อนกล่องจุดประสงค์ในใบความรู้
    if(step === "knowledge"){
      const st = document.createElement("style");
      st.textContent = ".obj-box{display:none !important}";
      document.head.appendChild(st);
    }
    if(pre){
      document.title = document.title.replace("แบบทดสอบ:", "แบบทดสอบก่อนเรียน:");
      const h1 = document.querySelector("header h1");
      if(h1) h1.textContent = "📝 แบบทดสอบก่อนเรียน";
      document.querySelectorAll("#result-card button").forEach(b => { b.style.display = "none"; }); // ก่อนเรียนทำครั้งเดียว
      const st = document.createElement("style"); // ก่อนเรียน: ไม่เฉลยข้อถูก/ผิด (ข้อสอบชุดเดียวกับหลังเรียน)
      st.textContent = ".mcq label.correct,.mcq label.wrong{border-color:#E6E8F0 !important;background:transparent !important}";
      document.head.appendChild(st);
    }else if(step === "posttest"){
      const h1 = document.querySelector("header h1");
      if(h1) h1.textContent = "✅ แบบทดสอบหลังเรียน";
    }

    const note = (html, cls) => {
      const d = document.createElement("div");
      d.className = "flow-status " + (cls || "");
      d.innerHTML = html;
      return d;
    };

    if(!tracked()){
      if(md === "teacher" && (step === "pretest" || step === "posttest" || step === "worksheet")){
        hook(u, step, unitHref, false);
      }
      return;
    }

    // ---- ตรวจสิทธิ์เข้าหน้านี้ (ห้ามข้ามขั้น) ----
    const root = document.documentElement;
    root.style.visibility = "hidden";
    getProgress().then(set => {
      if(!unlocked(set, u, step)){
        alert("ต้องเรียนตามลำดับขั้นตอนก่อนนะ — กลับไปทำขั้นก่อนหน้าให้เสร็จแล้วค่อยมาขั้นนี้");
        location.replace(unitHref);
        return;
      }
      root.style.visibility = "";
      if(step === "knowledge") knowledgeBar(u, unitHref);
      else hook(u, step, unitHref, true);
    }).catch(e => {
      alert(errText(e) + "\nกำลังพากลับหน้าหน่วย");
      location.replace(unitHref);
    });
  }

  // เอาเมาส์ชี้ (หรือแตะ) ตัวเลือก → อ่านตัวเลือกนั้นออกเสียง (ไฟล์เสียงสำเร็จรูป audio/choices.json)
  function choiceAudio(){
    fetch("audio/choices.json").then(r => r.ok ? r.json() : null).then(man => {
      if(!man) return;
      let player = null, timer = null, last = { el:null, t:0 };
      const textOf = (label) => {
        const raw = (label.textContent || "").replace(/\s+/g, " ").trim();
        return [raw, raw.replace(/^[ก-ฮ]\.\s*/, ""), raw.replace(/^[A-Da-d][.)]\s*/, "")].find(t => man[t]);
      };
      const play = (label) => {
        const t = textOf(label); if(!t) return;
        if(last.el === label && performance.now() - last.t < 1500) return;
        last = { el: label, t: performance.now() };
        if(typeof window.stopSpeaking === "function") window.stopSpeaking();
        if(player){ player.pause(); }
        player = new Audio("audio/" + man[t]);
        player.play().catch(() => {});
      };
      document.addEventListener("pointerover", (e) => {
        if(e.pointerType !== "mouse") return;
        const label = e.target.closest && e.target.closest(".mcq label");
        if(!label || (e.relatedTarget && label.contains(e.relatedTarget))) return;
        clearTimeout(timer); timer = setTimeout(() => play(label), 200);   // หน่วงนิดเดียว กันเสียงรัวตอนลากเมาส์ผ่าน
      });
      document.addEventListener("pointerout", (e) => {
        const label = e.target.closest && e.target.closest(".mcq label");
        if(label && !(e.relatedTarget && label.contains(e.relatedTarget))){ clearTimeout(timer); if(player) player.pause(); }
      });
      document.addEventListener("click", (e) => {          // จอสัมผัส: แตะเลือกแล้วอ่านให้ฟัง
        const label = e.target.closest && e.target.closest(".mcq label");
        if(label) play(label);
      });
    }).catch(() => {});
  }

  function knowledgeBar(u, unitHref){
    const bar = document.createElement("div");
    bar.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:50;padding:10px 14px;background:#fff;border-top:1px solid #E6E8F0;box-shadow:0 -4px 14px rgba(0,0,0,.08);text-align:center";
    bar.innerHTML = '<button type="button" id="flow-read-done" style="padding:12px 26px;border:none;border-radius:999px;background:#10B981;color:#fff;font:700 1rem Sarabun,sans-serif;cursor:pointer">✅ อ่านจบแล้ว ไปทำใบงาน →</button><div id="flow-read-msg" style="font-size:.8rem;color:#DC2626;margin-top:4px"></div>';
    document.body.appendChild(bar);
    document.body.style.paddingBottom = "90px";
    const btn = bar.querySelector("#flow-read-done");
    btn.onclick = async () => {
      btn.disabled = true; btn.textContent = "กำลังบันทึก...";
      try{ await mark(u, "knowledge"); location.href = unitHref; }
      catch(e){ btn.disabled = false; btn.textContent = "✅ อ่านจบแล้ว ไปทำใบงาน →"; bar.querySelector("#flow-read-msg").textContent = errText(e); }
    };
  }

  // ดักปุ่มส่งคำตอบ/ตรวจคำตอบ แล้วส่งคะแนนเข้า Supabase (ครั้งแรกของการเปิดหน้านี้เท่านั้น)
  function hook(u, step, unitHref, save){
    const fnName = step === "worksheet" ? "checkAnswers" : "submitQuiz";
    const orig = window[fnName];
    if(typeof orig !== "function") return;
    let sent = false;
    window[fnName] = function(){
      const r = orig.apply(this, arguments);
      let score, total;
      if(step === "worksheet"){
        const p1 = parseInt((document.getElementById("p1-score") || {}).textContent, 10) || 0;
        score = p1 + document.querySelectorAll(".mcq label.correct input:checked").length;
        total = document.querySelectorAll(".dropzone").length + document.querySelectorAll(".mcq").length;
      }else{
        const mm = ((document.getElementById("score-text") || {}).textContent || "").match(/(\d+)\s*\/\s*(\d+)/);
        if(!mm) return r;
        score = parseInt(mm[1], 10); total = parseInt(mm[2], 10);
      }
      if(sent) return r;
      const host = step === "worksheet" ? document.getElementById("result") : document.getElementById("result-card");
      if(!host) return r;
      let box = document.getElementById("flow-status");
      if(!box){ box = document.createElement("div"); box.id = "flow-status"; box.style.cssText = "margin-top:12px;font-size:.9rem;line-height:1.6"; host.appendChild(box); }
      if(!save){ box.innerHTML = '<span style="color:#6B7280">👩‍🏫 โหมดครู: ไม่บันทึกคะแนน</span>'; return r; }
      sent = true;
      box.innerHTML = '<span style="color:#6B7280">กำลังบันทึกคะแนน...</span>';
      submit(u, step, score, total).then(res => {
        const next = `<div style="margin-top:10px"><a href="${unitHref}" style="display:inline-block;padding:10px 22px;border-radius:999px;background:#3B82F6;color:#fff;font-weight:700;text-decoration:none">ไปขั้นตอนถัดไป →</a></div>`;
        box.innerHTML = (res && res.local
          ? '<span style="color:#B45309">ℹ️ บันทึกความคืบหน้าในเครื่องนี้แล้ว (ยังไม่ได้เชื่อมระบบเก็บคะแนน)</span>'
          : '<span style="color:#059669">✅ บันทึกคะแนนแล้ว</span>') + next;
      }).catch(e => {
        sent = false;
        box.innerHTML = `<span style="color:#DC2626">${errText(e)}</span> <button type="button" style="margin-left:6px;padding:6px 14px;border:none;border-radius:999px;background:#3B82F6;color:#fff;cursor:pointer" onclick="${fnName}()">ลองส่งอีกครั้ง</button>`;
      });
      return r;
    };
  }

  window.KrtomFlow = { rpc, STEPS, mode, tracked, getProgress, unlocked, done, mark, submit, errText };
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", initPage); else initPage();
})();
