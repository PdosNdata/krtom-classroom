/* sfx.js — เสียงเอฟเฟกต์สั้น ๆ สำหรับเกม (สังเคราะห์ด้วย Web Audio ไม่ต้องมีไฟล์เสียง)
   ใช้: sfx.correct() ตอบถูก · sfx.wrong() ตอบผิด · sfx.win() ชนะ · sfx.lose() แพ้ · sfx.coin() · sfx.pop() · sfx.jump() · sfx.nope()
   มีปุ่มเปิด/ปิดเสียงเอฟเฟกต์ (จำค่าไว้ในเครื่อง) */
(function(){
  let ctx = null, on = true;
  try { on = localStorage.getItem("p1Sfx") !== "off"; } catch(e) {}
  function ac(){
    if(!ctx){ try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { return null; } }
    if(ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  // เล่นโน้ตหนึ่งตัว: ความถี่เริ่ม→ความถี่จบ, ชนิดคลื่น, ความดัง
  function tone(f0, t0, dur, type, vol, f1){
    const c = ac(); if(!c || !on) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type || "sine"; o.frequency.setValueAtTime(f0, t);
    if(f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.03);
  }
  const sfx = {
    correct(){ tone(659, 0, .16, "triangle", .26); tone(880, .12, .26, "triangle", .26); tone(1319, .12, .26, "sine", .07); },        // ติ๊ง-ติ๊ง ตอบถูก
    wrong(){ tone(220, 0, .22, "sawtooth", .16, 150); tone(147, .18, .34, "sawtooth", .16, 98); },                                    // บึ้ด ตอบผิด
    nope(){ tone(330, 0, .14, "square", .1, 262); tone(262, .13, .2, "square", .1, 196); },                                           // ยังไม่ถึง/ลองใหม่
    win(){ [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .11, .22, "triangle", .27)); tone(1047, .46, .5, "triangle", .27); tone(784, .46, .5, "sine", .12); tone(1319, .6, .5, "sine", .1); },
    lose(){ [392, 330, 262, 196].forEach((f, i) => tone(f, i * .16, .26, "sawtooth", .13, f * .93)); },
    coin(){ tone(988, 0, .08, "square", .09); tone(1319, .07, .16, "square", .09); },
    pop(){ tone(420, 0, .09, "sine", .22, 640); },
    jump(){ tone(300, 0, .16, "sine", .16, 700); },
    step(){ tone(200, 0, .05, "triangle", .12, 140); },
    get enabled(){ return on; },
    toggle(){ on = !on; try { localStorage.setItem("p1Sfx", on ? "on" : "off"); } catch(e) {} label(); if(on) sfx.pop(); return on; }
  };
  window.sfx = sfx;

  // ปุ่มเปิด/ปิดเสียงเอฟเฟกต์ (วางไว้ข้างปุ่มฟังคำอธิบาย ถ้าไม่มีให้ลอยมุมซ้ายล่าง)
  let btn = null;
  function label(){ if(btn){ btn.querySelector(".tts-icon").textContent = on ? "🔔" : "🔕"; btn.querySelector(".tts-label").textContent = on ? "เสียงเอฟเฟกต์: เปิด" : "เสียงเอฟเฟกต์: ปิด"; } }
  function mount(){
    btn = document.createElement("button"); btn.type = "button"; btn.className = "tts-btn"; btn.id = "sfx-btn";
    btn.innerHTML = '<span class="tts-icon">🔔</span> <span class="tts-label"></span>'; btn.style.marginLeft = "8px";
    btn.addEventListener("click", () => sfx.toggle());
    const host = document.querySelector(".listen");
    if(host) host.appendChild(btn); else { btn.style.cssText += ";position:fixed;left:8px;bottom:8px;z-index:9998"; document.body.appendChild(btn); }
    label();
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
