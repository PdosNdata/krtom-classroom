/*
  tts.js — ปุ่มฟังเสียง เล่นจาก "ไฟล์เสียงสำเร็จรูป" (MP3 เสียง Neural อัดไว้ล่วงหน้า)
  แทนการใช้ Web Speech API ของเบราว์เซอร์ เพราะคุณภาพ/ความเป็นธรรมชาติของเสียง
  ขึ้นกับเครื่องผู้ใช้แต่ละคนมากเกินไป — ไฟล์สำเร็จรูปให้เสียงเดียวกันทุกเครื่องแน่นอน

  วิธีใช้ในหน้า HTML:
    <button class="tts-btn" data-audio-src="audio/knowledge-topic1.mp3">
      <span class="tts-icon">🔊</span> <span class="tts-label">ฟัง</span>
    </button>

  สำหรับข้อความที่เปลี่ยนแปลงตามสถานการณ์ (เช่น คะแนนเกม) ยังใช้ speakText()
  ของ Web Speech API เป็น fallback ได้ (ดูฟังก์ชันด้านล่าง) แต่เนื้อหาหลักทุกอย่าง
  ควรใช้ไฟล์เสียงสำเร็จรูปผ่าน playAudio() เป็นหลัก
*/

let ttsCurrentBtn = null;
let ttsAudioEl = null; // ใช้ <audio> element เดียวเล่นซ้ำ เพื่อให้หยุดของเก่าได้ง่าย

function playAudio(src, btn){
  const clickedWhileSpeaking = ttsCurrentBtn === btn && ttsAudioEl && !ttsAudioEl.paused;
  stopSpeaking();
  if(clickedWhileSpeaking) return; // กดซ้ำปุ่มเดิมตอนกำลังเล่นอยู่ = หยุดเล่น

  ttsAudioEl = new Audio(src);
  ttsCurrentBtn = btn;
  if(btn) setBtnState(btn, true);

  ttsAudioEl.addEventListener("ended", () => {
    if(ttsCurrentBtn === btn){ if(btn) setBtnState(btn, false); ttsCurrentBtn = null; }
  });
  ttsAudioEl.addEventListener("error", () => {
    if(ttsCurrentBtn === btn){ if(btn) setBtnState(btn, false); ttsCurrentBtn = null; }
    console.warn("เล่นไฟล์เสียงไม่สำเร็จ:", src);
  });
  ttsAudioEl.play().catch(() => {
    if(btn) setBtnState(btn, false);
    ttsCurrentBtn = null;
  });
}

function stopSpeaking(){
  if(ttsAudioEl){ ttsAudioEl.pause(); ttsAudioEl.currentTime = 0; }
  if("speechSynthesis" in window) window.speechSynthesis.cancel();
  if(ttsCurrentBtn){ setBtnState(ttsCurrentBtn, false); ttsCurrentBtn = null; }
}

function setBtnState(btn, speaking){
  btn.classList.toggle("speaking", speaking);
  const icon = btn.querySelector(".tts-icon");
  const label = btn.querySelector(".tts-label");
  if(icon) icon.textContent = speaking ? "⏸" : "🔊";
  if(label) label.textContent = speaking ? "กำลังเล่น..." : (btn.dataset.ttsLabel || "ฟัง");
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tts-btn[data-audio-src]").forEach(btn => {
    const label = btn.querySelector(".tts-label");
    if(label) btn.dataset.ttsLabel = label.textContent;
    btn.addEventListener("click", () => playAudio(btn.dataset.audioSrc, btn));
  });
});

window.addEventListener("beforeunload", stopSpeaking);

/* ---------------------------------------------------------------
   speakText() — fallback สำหรับข้อความที่ต้อง generate สดๆ เท่านั้น
   (เช่น ข้อความคะแนนจบเกมที่เปลี่ยนไปตามจำนวนครั้งที่เล่น)
   คุณภาพเสียงจะขึ้นกับเครื่องผู้ใช้ ไม่การันตีความเป็นธรรมชาติเหมือน playAudio()
--------------------------------------------------------------- */
function speakText(text, btn){
  if(!("speechSynthesis" in window)) return;
  stopSpeaking();
  setTimeout(() => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "th-TH";
    utter.rate = 0.95;
    if(btn){
      ttsCurrentBtn = btn;
      setBtnState(btn, true);
      utter.onend = () => { if(ttsCurrentBtn === btn){ setBtnState(btn, false); ttsCurrentBtn = null; } };
      utter.onerror = utter.onend;
    }
    window.speechSynthesis.speak(utter);
  }, 60);
}
