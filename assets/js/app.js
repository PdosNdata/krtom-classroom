/*
  app.js — ตัวเว็บแอปหลัก (ไม่ต้องมี build tool / server framework)
  ทำงานด้วย hash-routing (#/...) ล้วนๆ เพื่อให้อัปโหลดขึ้น hosting/โดเมน
  แบบไฟล์สแตติกธรรมดาได้ทันที ไม่ต้องตั้งค่า rewrite rule ใดๆ บนเซิร์ฟเวอร์
*/

const GROUP_COLOR = {
  "ประถมต้น": "var(--pink)",
  "ประถมปลาย": "var(--orange)",
  "มัธยมต้น": "var(--purple)"
};
const GROUP_ICON = { "ประถมต้น":"⭐", "ประถมปลาย":"⭐", "มัธยมต้น":"🎓" };

// รูปตัวการ์ตูนเด็ก: แยก layout ทีละชั้นชัดเจน (9 ชั้น) — ถ้ายังไม่มีไฟล์เฉพาะของชั้นนั้น
// จะไล่ fallback ไปใช้ภาพระดับช่วงชั้น แล้วจึงไปภาพเริ่มต้นสุดท้าย โดยอัตโนมัติ ไม่มีวันเห็นไอคอนรูปพัง
const GRADE_KID_IMG = {
  p1:"assets/images/home-kid-p1.png", p2:"assets/images/home-kid-p2.png", p3:"assets/images/home-kid-p3.png",
  p4:"assets/images/home-kid-p4.png", p5:"assets/images/home-kid-p5.png", p6:"assets/images/home-kid-p6.png",
  m1:"assets/images/home-kid-m1.png", m2:"assets/images/home-kid-m2.png", m3:"assets/images/home-kid-m3.png"
};
const GROUP_KID_IMG = {
  "ประถมต้น":  { boy:"assets/images/home-boy-primary.png",   girl:"assets/images/home-girl-primary.png" },
  "ประถมปลาย": { boy:"assets/images/home-boy-upper.png",     girl:"assets/images/home-girl-upper.png" },
  "มัธยมต้น":  { boy:"assets/images/home-boy-secondary.png", girl:"assets/images/home-girl-secondary.png" }
};
const KID_FALLBACK = { boy:"assets/images/home-boy.png", girl:"assets/images/home-girl.png" };

// ปุ่มแท็บ (ใบความรู้/ใบงาน/แบบทดสอบ/เกม/เกม AR) — แยก layout ให้แต่ละปุ่มมีรูปเฉพาะของตัวเอง
// ใช้รูปเดียวกันทุกหน่วย/ทุกชั้น (ไม่ผูกกับหน่วยใดหน่วยหนึ่ง) ถ้ายังไม่มีไฟล์จะใช้ปุ่มโค้ดแบบเดิมแทน
const TAB_IMG = {
  knowledge:"assets/images/home-tab-knowledge.png",
  worksheet:"assets/images/home-tab-worksheet.png",
  quiz:"assets/images/home-tab-quiz.png",
  game:"assets/images/home-tab-game.png",
  ar:"assets/images/home-tab-ar.png"
};

// รูปตัวการ์ตูนเด็กในกล่องต้อนรับหน้าแรก — เป็นคนละ layout แยกจากรูปในการ์ดชั้นเรียนโดยเฉพาะ
const HERO_KID_IMG = { boy:"assets/images/home-hero-boy.png", girl:"assets/images/home-hero-girl.png" };

// ปุ่มเล่นเนื้อหา (เล่นเกมนี้เลย / เวอร์ชันทางเลือกของเกม AR) — แยก layout ให้แต่ละปุ่มมีรูปเฉพาะของตัวเอง
// ใช้รูปเดียวกันทุกหน่วย/ทุกชั้น (ไม่ผูกกับหน่วยใดหน่วยหนึ่ง) ถ้ายังไม่มีไฟล์จะใช้ปุ่มโค้ดแบบเดิมแทน
const ACTION_BTN_IMG = {
  play: "assets/images/btn-play.png",
  handpoint: "assets/images/btn-ar-handpoint.png",
  nocamera: "assets/images/btn-ar-nocamera.png",
  "match-ar": "assets/images/btn-ar-match.png",
  "quiz-nocamera": "assets/images/btn-quiz-nocamera.png",
  "match-nocamera": "assets/images/btn-match-nocamera.png"
};

// เรียงรูปไล่ลำดับสำรอง: ถ้าโหลดรูปแรกไม่ได้ (404) จะลองรูปถัดไปในลิสต์ให้อัตโนมัติ ไม่มีวันเห็นไอคอนรูปพัง
window.__kidFallback = function(img){
  let chain = [];
  try{ chain = JSON.parse(img.dataset.fallback || "[]"); } catch(e){ chain = []; }
  if(chain.length){
    img.src = chain.shift();
    img.dataset.fallback = JSON.stringify(chain);
  } else {
    img.onerror = null;
  }
};
function kidImg(cls, chain){
  const src = chain[0];
  const rest = chain.slice(1);
  const dataAttr = rest.length ? `data-fallback='${JSON.stringify(rest).replace(/'/g, "&#39;")}'` : "";
  return `<img class="${cls}" src="${src}" ${dataAttr} onerror="window.__kidFallback(this)" alt="">`;
}
// เวอร์ชันขี้เกียจโหลด: ไม่ใส่ src ตั้งแต่แรก จะเริ่มโหลดก็ต่อเมื่อถูกเรียก window.__startKidImg เท่านั้น
// ใช้กับรูปสำรองในการ์ดที่อาจไม่จำเป็นต้องใช้เลย (ถ้าการ์ดเต็มโหลดสำเร็จ) เพื่อไม่ให้เปลืองโควตาเน็ตของโรงเรียนเปล่าๆ
function kidImgLazy(cls, chain){
  const dataAttr = `data-fallback='${JSON.stringify(chain).replace(/'/g, "&#39;")}'`;
  return `<img class="${cls}" ${dataAttr} onerror="window.__kidFallback(this)" alt="">`;
}
window.__startKidImg = function(img){
  if(img && !img.src) window.__kidFallback(img);
};
const GRADE_EMOJI = {
  p1:"🌱", p2:"🌿", p3:"🌳", p4:"🚀", p5:"🛰️", p6:"🎓",
  m1:"💻", m2:"🐍", m3:"🧠"
};
const UNIT_COLORS = ["#3B82F6","#8B5CF6","#EC4899","#F97316","#10B981","#14B8A6"];
const GRADE_CARD_COLORS = {
  p1:["#F472B6","#EC4899"], p2:["#34D399","#10B981"], p3:["#60A5FA","#3B82F6"],
  p4:["#FB923C","#F97316"], p5:["#A78BFA","#8B5CF6"], p6:["#22D3EE","#14B8A6"],
  m1:["#818CF8","#6366F1"], m2:["#4ADE80","#22C55E"], m3:["#FBBF24","#F59E0B"]
};

const TABS = [
  { key:"knowledge", label:"ใบความรู้",  emoji:"📘" },
  { key:"worksheet", label:"ใบงาน",      emoji:"📝" },
  { key:"quiz",      label:"แบบทดสอบ",   emoji:"✅" },
  { key:"game",      label:"เกม",        emoji:"🎮" },
  { key:"ar",        label:"เกม AR",     emoji:"🕶️", arOnly:true }
];

// คำอธิบาย/ไอคอนประจำแท็บแต่ละประเภท (ใช้ทั้งตอน "พร้อมเล่น" และตอน "กำลังจัดทำ")
const TAB_META = {
  knowledge: { emoji:"📘", title:"ใบความรู้", cta:"เพิ่มใบความรู้",
    desc:"สรุปเนื้อหา แนวคิดหลัก และตัวอย่างประกอบของหน่วยนี้ อ่านง่ายบนมือถือ พร้อมภาพประกอบ" },
  worksheet: { emoji:"📝", title:"ใบงาน", cta:"เพิ่มใบงาน",
    desc:"แบบฝึกหัดออนไลน์ ตรวจคำตอบอัตโนมัติ พร้อมปุ่มพิมพ์ฉบับกระดาษ" },
  quiz: { emoji:"✅", title:"แบบทดสอบ", cta:"เพิ่มแบบทดสอบ",
    desc:"แบบทดสอบปรนัยท้ายหน่วย ตรวจให้คะแนนอัตโนมัติ พร้อมเฉลยเมื่อทำเสร็จ" },
  game: { emoji:"🎮", title:"เกมประจำหน่วย", cta:"เพิ่มเกม",
    desc:"มินิเกมทบทวนเนื้อหาหน่วยนี้ เช่น จับคู่ความจำ ทายภาพ หรือเรียงลำดับขั้นตอน เล่นได้ในเบราว์เซอร์ทันที" },
  ar: { emoji:"🕶️", title:"เกม AR", cta:"เพิ่มเกม AR",
    desc:"เกม AR ประจำหน่วยนี้ — บางหน่วยมีแบบใช้กล้องส่องหาอุปกรณ์จริง และแบบลากวางที่เล่นได้ทุกอุปกรณ์โดยไม่ต้องขอสิทธิ์กล้อง",
    extraLink:{ href:"ar-demo/game-style.html", label:"ดูตัวอย่างต้นแบบ" } }
};

// เนื้อหาจริงที่ทำเสร็จแล้ว — key รูปแบบ "gradeId/subjectId/unitIndex"
// แต่ละหน่วยมีได้สูงสุด 5 แท็บ: knowledge / worksheet / quiz / game / ar
// แต่ละรายการ: { href, title, extraLink? }
const READY_CONTENT = {
  "p1/cs/0": {
    knowledge: { href:"content/p1-cs-0/knowledge.html", title:"การใช้งานเทคโนโลยีเบื้องต้น" },
    worksheet: { href:"content/p1-cs-0/worksheet.html", title:"ใบงานที่ 1.1 อุปกรณ์เทคโนโลยี" },
    quiz:      { href:"content/p1-cs-0/quiz.html", title:"แบบทดสอบท้ายหน่วย 10 ข้อ" },
    game:      { href:"content/p1-cs-0/game.html", title:"เกมพลิกไพ่ความจำ" },
    ar: {
      href:"content/p1-cs-0/ar-game.html", title:"ล่าอุปกรณ์คอมพิวเตอร์ AR (ใช้กล้อง)",
      extraLinks:[
        { key:"handpoint", href:"content/p1-cs-0/ar-game-handpoint.html", label:"☝️ เวอร์ชันชี้นิ้วตอบ (ใช้กล้อง)" },
        { key:"nocamera", href:"content/p1-cs-0/ar-game-nocamera.html", label:"🧩 เวอร์ชันไม่ใช้กล้อง (ลากวาง)" }
      ]
    }
  },
  "p1/cs/1": { ar: { href:"content/p1-cs-1/ar-game-nocamera.html", title:"เรียงลำดับขั้นตอนแปรงฟัน" } },
  "p1/cs/2": { ar: { href:"content/p1-cs-2/ar-game-nocamera.html", title:"เขียนโปรแกรมพาแมวไปหาปลา" } },
  "p1/cs/3": { ar: { href:"content/p1-cs-3/ar-game-nocamera.html", title:"จัดหมวดหมู่ ทำถูก/ทำไม่ถูก" } },
  "p6/cs/0": {
    knowledge: { href:"content/p6-cs-0/knowledge.html", title:"การแก้ปัญหาโดยใช้เหตุผลเชิงตรรกะ" },
    worksheet: { href:"content/p6-cs-0/worksheet.html", title:"ใบงานที่ 1.1 เหตุผลเชิงตรรกะและผังงาน" },
    quiz:      { href:"content/p6-cs-0/quiz.html", title:"แบบทดสอบท้ายหน่วย 10 ข้อ" },
    game: {
      href:"content/p6-cs-0/game.html", title:"เกมพลิกไพ่ความจำ",
      extraLinks:[
        { key:"match-nocamera", href:"content/p6-cs-0/ar-game-match-nocamera.html", label:"🧩 จับคู่สัญลักษณ์ (เมาส์ลาก)" },
        { key:"quiz-nocamera", href:"content/p6-cs-0/ar-game-nocamera.html", label:"🧩 เมาส์คลิกเลือกคำตอบ" }
      ]
    },
    ar: {
      href:"content/p6-cs-0/ar-game-handpoint.html", title:"ชี้นิ้วตอบคำถาม AR (ใช้กล้อง)",
      extraLinks:[
        { key:"match-ar", href:"content/p6-cs-0/ar-game-match.html", label:"🤏 จับคู่สัญลักษณ์ AR (จีบนิ้ว)" }
      ]
    }
  },
  "p6/cs/1": {
    knowledge: { href:"content/p6-cs-1/knowledge.html", title:"การออกแบบและเขียนโปรแกรมอย่างง่าย" },
    worksheet: { href:"content/p6-cs-1/worksheet.html", title:"ใบงานที่ 2.1 โครงสร้างการควบคุมโปรแกรม" },
    quiz:      { href:"content/p6-cs-1/quiz.html", title:"แบบทดสอบท้ายหน่วย 10 ข้อ" },
    game:      { href:"content/p6-cs-1/game.html", title:"เกมพลิกไพ่ความจำ" }
  },
  "p6/cs/2": {
    knowledge: { href:"content/p6-cs-2/knowledge.html", title:"การใช้อินเทอร์เน็ตค้นหาข้อมูล" },
    worksheet: { href:"content/p6-cs-2/worksheet.html", title:"ใบงานที่ 3.1 การค้นหาและประเมินข้อมูล" },
    quiz:      { href:"content/p6-cs-2/quiz.html", title:"แบบทดสอบท้ายหน่วย 10 ข้อ" },
    game:      { href:"content/p6-cs-2/game.html", title:"เกมพลิกไพ่ความจำ" }
  },
  "p6/cs/3": {
    knowledge: { href:"content/p6-cs-3/knowledge.html", title:"การใช้เทคโนโลยีสารสนเทศอย่างปลอดภัย" },
    worksheet: { href:"content/p6-cs-3/worksheet.html", title:"ใบงานที่ 4.1 ภัยคุกคามและการป้องกันตนเอง" },
    quiz:      { href:"content/p6-cs-3/quiz.html", title:"แบบทดสอบท้ายหน่วย 10 ข้อ" },
    game:      { href:"content/p6-cs-3/game.html", title:"เกมพลิกไพ่ความจำ" }
  }
};

const app = document.getElementById("app");
const breadcrumb = document.getElementById("breadcrumb");

function findGrade(id){ return CURRICULUM.find(g => g.id === id); }
function findSubject(grade, id){ return grade.subjects.find(s => s.id === id); }

// ป.1–3 (เด็กเล็ก) ใช้ตัวอักษรใหญ่กว่าปกติ 2 เท่าทั้งเว็บ เพื่อให้อ่านง่ายขึ้น
const LARGE_TEXT_GRADES = ["p1", "p2", "p3"];
function applyTextSize(gradeId){
  document.documentElement.classList.toggle("large-text", LARGE_TEXT_GRADES.includes(gradeId));
}

function setBreadcrumb(parts){
  // parts: [{label, href?}]
  breadcrumb.innerHTML = parts.map((p,i) => {
    const isLast = i === parts.length - 1;
    const text = isLast ? `<span>${p.label}</span>` : `<a href="${p.href}">${p.label}</a>`;
    return i === 0 ? text : `<span class="sep">›</span>${text}`;
  }).join("");
}

function render(){
  const hash = location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/").filter(Boolean);

  if(parts[0] === "ar-games") return renderARGamesHub();

  if(parts[0] === "grade" && parts[1]){
    const grade = findGrade(parts[1]);
    if(!grade) return renderHome();
    if(parts[2] === "subject" && parts[3]){
      const subject = findSubject(grade, parts[3]);
      if(!subject) return renderGrade(grade);
      return renderUnitList(grade, subject);
    }
    // เข้าชั้นเรียน: ถ้ามีวิชาเดียวข้ามไปหน้ารายการหน่วยเลย
    if(grade.subjects.length === 1) return renderUnitList(grade, grade.subjects[0]);
    return renderGrade(grade);
  }

  if(parts[0] === "unit" && parts[1] && parts[2] && parts[3] !== undefined){
    const grade = findGrade(parts[1]);
    if(!grade) return renderHome();
    const subject = findSubject(grade, parts[2]);
    if(!subject) return renderHome();
    const idx = parseInt(parts[3], 10);
    const unit = subject.units[idx];
    if(!unit) return renderUnitList(grade, subject);
    const tab = parts[4] || "knowledge";
    return renderUnitDetail(grade, subject, idx, unit, tab);
  }

  renderHome();
}

/* ---------------- หน้าแรก ---------------- */
function renderHome(){
  document.documentElement.classList.add("large-text"); // หน้าแรก: ตัวอักษรใหญ่กว่าปกติ 2 เท่า สีสันสดใสถูกใจเด็ก
  setBreadcrumb([{ label:"🏠 หน้าแรก" }]);

  const groups = ["ประถมต้น","ประถมปลาย","มัธยมต้น"];
  const groupHtml = groups.map(g => {
    const grades = CURRICULUM.filter(gr => gr.group === g);
    const kidSet = GROUP_KID_IMG[g];
    const cards = grades.map((gr, i) => {
      const [c1, c2] = GRADE_CARD_COLORS[gr.id] || [GROUP_COLOR[g], GROUP_COLOR[g]];
      const isBoy = i % 2 === 0;
      const kidChain = [
        isBoy ? kidSet.boy : kidSet.girl,
        isBoy ? KID_FALLBACK.boy : KID_FALLBACK.girl
      ];
      // การ์ดเต็ม (พี่ครูออกแบบมาเองทั้งใบ): ถ้าโหลดได้จะแทนที่การ์ดโค้ดทั้งหมด ถ้าไม่มีไฟล์จะใช้การ์ดโค้ดสำรองแทน
      return `
      <a class="card grade-card" href="#/grade/${gr.id}">
        <img class="g-fullcard-img" src="${GRADE_KID_IMG[gr.id]}" alt="${gr.grade}"
             onload="this.closest('.grade-card').classList.add('has-fullcard'); this.style.display='block'; this.nextElementSibling.style.display='none';"
             onerror="this.style.display='none'; window.__startKidImg(this.nextElementSibling.querySelector('.g-kid'));">
        <div class="g-coded-fallback">
          <div class="g-icon-wrap"><span class="g-emoji">${GRADE_EMOJI[gr.id] || "📚"}</span></div>
          <div class="g-info">
            <div class="g-name" style="background:linear-gradient(135deg, ${c1}, ${c2})">${gr.grade}</div>
            <div class="g-meta">${gr.subjects.length} วิชา${gr.hasAR ? " · มี AR" : ""}</div>
          </div>
          ${kidImgLazy("g-kid", kidChain)}
          <div class="g-arrow" style="background:${c2}">›</div>
        </div>
      </a>
    `;
    }).join("");
    const groupSlug = g === "ประถมต้น" ? "primary" : g === "ประถมปลาย" ? "upper" : "secondary";
    return `
      <div class="group-block group-${groupSlug}">
        <div class="group-title">${GROUP_ICON[g] || "⭐"} ${g}</div>
        <div class="card-grid">${cards}</div>
      </div>
    `;
  }).join("");

  app.innerHTML = `
    <div class="home-page">
    <div class="hero welcome-hero">
      <img class="welcome-banner-img" src="assets/images/home-welcome-banner.png"
           alt="ยินดีต้อนรับสู่บทเรียนคอมพิวเตอร์ช่วยสอน (CAI) วิทยาการคำนวณ"
           onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
      <div class="bubble-fallback">
        ${kidImg("kid left", [HERO_KID_IMG.boy, KID_FALLBACK.boy])}
        <span class="bulb">💡</span>
        <div class="bubble">
          <div class="hero-deco">✨ 🌟 ✨</div>
          <h1>👋 ยินดีต้อนรับสู่บทเรียนคอมพิวเตอร์ช่วยสอน (CAI) วิทยาการคำนวณ</h1>
          <p>เลือกระดับชั้นด้านล่าง แต่ละหน่วยมี <b>ใบความรู้ · ใบงาน · เกม</b> ครบ
             (ระดับ ป.1–ป.3 มีเกม AR เพิ่มพิเศษ) เข้าถึงได้ทุกที่ทุกเวลาผ่านมือถือหรือคอมพิวเตอร์</p>
        </div>
        ${kidImg("kid right", [HERO_KID_IMG.girl, KID_FALLBACK.girl])}
      </div>
    </div>

    ${groupHtml}

    <div class="hero">
      <h1>🕶️ เกม AR สำหรับ ป.1–3</h1>
      <p>
        เกม AR ของแต่ละหน่วย (ป.1–3) มีทั้งแบบ <b>ส่องกล้องหาอุปกรณ์จริง</b> (ใช้มาร์กเกอร์ หรือชี้นิ้วตอบคำถาม)
        และแบบ <b>ลาก/วางตัวการ์ตูนบนฉาก</b> ที่เล่นได้ทุกอุปกรณ์โดยไม่ต้องขอสิทธิ์กล้อง
      </p>
      <div class="compare-grid" style="grid-template-columns:1fr">
        <div class="compare-card">
          <h3>ตัวอย่างต้นแบบเกมสไตล์ลากวาง (ไม่ใช้กล้อง)</h3>
          <ul>
            <li>ทำงานได้ทุกอุปกรณ์ ไม่ต้องขอสิทธิ์ใดๆ โหลดไว เหมาะกับห้องคอมพิวเตอร์/มือถือของนักเรียน</li>
            <li>ปรับสติกเกอร์/ฉากให้ตรงเนื้อหาแต่ละหน่วยได้ง่าย</li>
          </ul>
          <div class="btn-row">
            <a class="btn pink" href="#/ar-games">🕶️ ดูรวมเกม AR ทั้งหมด →</a>
            <a class="btn secondary" href="ar-demo/game-style.html">ลองต้นแบบ</a>
          </div>
        </div>
      </div>
    </div>
    </div>
  `;
}

/* ---------------- หน้ารวมเกม AR (ทุกหน่วย ป.1–3) ---------------- */
const AR_EMOJI_CYCLE = ["🤖","🧩","💡","🔧","🚀","🎯","🛰️","📡","🧠","🎮","🔍","🗂️","🛡️","🌈","⚙️","🎨"];

function renderARGamesHub(){
  applyTextSize("p1"); // หน้านี้รวมเนื้อหาเฉพาะ ป.1–3 เท่านั้น
  setBreadcrumb([
    { label:"🏠 หน้าแรก", href:"#/" },
    { label:"🕶️ รวมเกม AR" }
  ]);

  const games = [];
  CURRICULUM.filter(g => g.hasAR).forEach(grade => {
    grade.subjects.forEach(subject => {
      subject.units.forEach((unit, idx) => games.push({ grade, subject, idx, unit }));
    });
  });

  const gradeIds = [...new Set(games.map(g => g.grade.id))];
  const chips = ['<button class="chip active" onclick="filterARGames(this,\'all\')">🌟 ทั้งหมด</button>']
    .concat(gradeIds.map(gid => {
      const g = findGrade(gid);
      return `<button class="chip" onclick="filterARGames(this,'${gid}')">${GRADE_EMOJI[gid] || ""} ${g.grade}</button>`;
    })).join("");

  const cards = games.map((g, i) => {
    const key = `${g.grade.id}/${g.subject.id}/${g.idx}`;
    const ready = READY_CONTENT[key] && READY_CONTENT[key].ar;
    return `
    <div class="ar-card" data-grade="${g.grade.id}">
      <div class="ar-thumb" style="background:linear-gradient(135deg, ${UNIT_COLORS[i % UNIT_COLORS.length]}, ${UNIT_COLORS[(i + 2) % UNIT_COLORS.length]})">
        <span>${AR_EMOJI_CYCLE[i % AR_EMOJI_CYCLE.length]}</span>
      </div>
      <div class="ar-body">
        <div class="ar-grade-tag">${g.grade.grade} · ${g.subject.name}</div>
        <div class="ar-title">หน่วย ${g.idx + 1}: ${g.unit.name}</div>
        ${ready
          ? `<span class="status-badge ready" style="margin-top:8px">✅ พร้อมเล่น</span>
             <div class="btn-row"><a class="btn" href="${ready.href}" style="font-size:.8rem">▶ เล่นเลย</a></div>`
          : `<span class="status-badge" style="margin-top:8px">🚧 กำลังจัดทำ</span>
             <div class="btn-row"><a class="btn secondary" href="#/unit/${g.grade.id}/${g.subject.id}/${g.idx}/ar" style="font-size:.8rem">ดูหน้าหน่วยนี้</a></div>`
        }
      </div>
    </div>
  `;
  }).join("");

  app.innerHTML = `
    <div class="ar-hub-banner">
      <div class="ar-hub-deco">✨ ⭐ 🌟 ✨</div>
      <div class="burst">รวม<br>${games.length}<span>เกม AR</span></div>
      <h1>🕶️ คลังเกม AR ป.1–3</h1>
      <p>ครบทุกหน่วยการเรียนรู้ · สนุก เข้าใจง่าย · บางหน่วยมีแบบใช้กล้อง บางหน่วยเล่นได้ทุกอุปกรณ์โดยไม่ต้องขอสิทธิ์กล้อง</p>
      <a class="btn pink" href="ar-demo/game-style.html">🎮 ลองเล่นต้นแบบตอนนี้</a>
    </div>

    <div class="chip-row">${chips}</div>

    <div class="ar-grid">${cards}</div>
  `;
}

window.filterARGames = function(btn, filter){
  document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
  document.querySelectorAll(".ar-card").forEach(card => {
    card.style.display = (filter === "all" || card.dataset.grade === filter) ? "" : "none";
  });
};

/* ---------------- หน้าเลือกวิชา (ชั้นที่มี 2 วิชา) ---------------- */
function renderGrade(grade){
  applyTextSize(grade.id);
  setBreadcrumb([
    { label:"🏠 หน้าแรก", href:"#/" },
    { label: grade.grade }
  ]);

  const cards = grade.subjects.map(s => `
    <a class="card subject-card" href="#/grade/${grade.id}/subject/${s.id}">
      <span class="s-emoji">${s.id === "design" ? "🛠️" : "💻"}</span>
      <div>
        <div class="s-name">${s.name}</div>
        <div class="s-meta">${s.units.length} หน่วยการเรียนรู้ · รหัส ${s.code}</div>
      </div>
    </a>
  `).join("");

  app.innerHTML = `
    <div class="page-title">${GRADE_EMOJI[grade.id] || ""} ชั้น${grade.grade}</div>
    <div class="page-subtitle">เลือกวิชาที่ต้องการเรียน</div>
    <div class="card-grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">${cards}</div>
  `;
}

/* ---------------- หน้ารายการหน่วย ---------------- */
function renderUnitList(grade, subject){
  applyTextSize(grade.id);
  setBreadcrumb([
    { label:"🏠 หน้าแรก", href:"#/" },
    { label: grade.grade, href: grade.subjects.length > 1 ? `#/grade/${grade.id}` : "#/" },
    { label: subject.name }
  ]);

  // การ์ดหน่วยเต็ม (ถ้าครูออกแบบภาพของหน่วยนั้นไว้เอง): ถ้าโหลดได้จะแทนที่การ์ดโค้ดทั้งหมด ถ้าไม่มีไฟล์จะใช้การ์ดโค้ดสำรองแทน
  const cards = subject.units.map((u,i) => `
    <a class="card unit-card" href="#/unit/${grade.id}/${subject.id}/${i}">
      <img class="u-fullcard-img" src="assets/images/home-unit-${grade.id}-${subject.id}-${i}.png" alt="${u.name}"
           onload="this.closest('.unit-card').classList.add('has-fullcard'); this.style.display='block'; this.nextElementSibling.style.display='none';"
           onerror="this.style.display='none';">
      <div class="u-coded-fallback">
        <span class="u-num" style="background:${UNIT_COLORS[i % UNIT_COLORS.length]}">${i+1}</span>
        <div>
          <div class="u-name">${u.name}</div>
          <div class="u-tags">
            <span class="tag">📘 ใบความรู้</span>
            <span class="tag">📝 ใบงาน</span>
            <span class="tag">🎮 เกม</span>
            ${grade.hasAR ? '<span class="tag ar">🕶️ AR</span>' : ""}
          </div>
        </div>
      </div>
    </a>
  `).join("");

  app.innerHTML = `
    <div class="page-title">${subject.name} · ${grade.grade}</div>
    <div class="page-subtitle">รหัสอ้างอิงแผนการสอน: ${subject.code} — ทั้งหมด ${subject.units.length} หน่วยการเรียนรู้</div>
    <div class="card-grid" style="grid-template-columns:1fr">${cards}</div>
  `;
}

/* ---------------- หน้ารายละเอียดหน่วย (แท็บ) ---------------- */
function renderUnitDetail(grade, subject, idx, unit, activeTab){
  applyTextSize(grade.id);
  setBreadcrumb([
    { label:"🏠 หน้าแรก", href:"#/" },
    { label: grade.grade, href: grade.subjects.length > 1 ? `#/grade/${grade.id}` : "#/" },
    { label: subject.name, href: `#/grade/${grade.id}/subject/${subject.id}` },
    { label: `หน่วยที่ ${idx+1}` }
  ]);

  const visibleTabs = TABS.filter(t => !t.arOnly || grade.hasAR);
  const unitKey = `${grade.id}/${subject.id}/${idx}`;
  const tabBtns = visibleTabs.map(t => {
    const ready = READY_CONTENT[unitKey] && READY_CONTENT[unitKey][t.key];
    // ถ้าแท็บนี้มีเนื้อหาพร้อมเล่นแบบทางเดียว (ไม่มีเวอร์ชันให้เลือกหลายแบบ) กดแท็บแล้วเข้าเนื้อหาได้เลย ไม่ต้องกดปุ่ม "เล่นเกมนี้เลย" ซ้ำอีกที
    const directOpen = ready && ready.href && !(ready.extraLinks && ready.extraLinks.length);
    const onclick = directOpen
      ? `location.href='${ready.href}'`
      : `location.hash='#/unit/${grade.id}/${subject.id}/${idx}/${t.key}'`;
    return `
    <button class="tab-btn ${t.key === activeTab ? "active" : ""}" onclick="${onclick}">
      <img class="tab-btn-img" src="${TAB_IMG[t.key]}" alt="${t.label}"
           onload="this.closest('.tab-btn').classList.add('has-tabimg'); this.style.display='inline-block'; this.nextElementSibling.style.display='none';"
           onerror="this.style.display='none';">
      <span class="tab-btn-coded"><span>${t.emoji}</span>${t.label}</span>
    </button>
  `;
  }).join("");

  app.innerHTML = `
    <div class="page-title">หน่วยที่ ${idx+1}: ${unit.name}</div>
    <div class="page-subtitle">${subject.name} · ${grade.grade}</div>
    <div class="tabs">${tabBtns}</div>
    <div class="tab-panel" id="tab-panel">${renderTabContent(activeTab, grade, subject, unit, idx)}</div>
  `;
}

function renderTabContent(tab, grade, subject, unit, idx){
  const meta = TAB_META[tab];
  if(!meta) return "";

  const key = `${grade.id}/${subject.id}/${idx}`;
  const ready = READY_CONTENT[key] && READY_CONTENT[key][tab];

  if(ready) return readyPanel({
    emoji: meta.emoji, title: meta.title,
    desc: `${meta.title} "${ready.title}" พร้อมใช้งานแล้ว`,
    href: ready.href,
    extraLink: ready.extraLink || null,
    extraLinks: ready.extraLinks || null
  });

  return placeholderPanel({
    emoji: meta.emoji, title: meta.title, desc: meta.desc, cta: meta.cta,
    extraLink: meta.extraLink || null
  });
}

function actionBtn(href, key, label, cls){
  const img = ACTION_BTN_IMG[key];
  if(!img) return `<a class="btn ${cls}" href="${href}">${label}</a>`;
  return `
    <a class="btn ${cls} action-btn" href="${href}">
      <img class="action-btn-img" src="${img}" alt="${label}"
           onload="this.closest('.action-btn').classList.add('has-actionimg'); this.nextElementSibling.style.display='none';"
           onerror="this.style.display='none';">
      <span class="action-btn-coded">${label}</span>
    </a>
  `;
}
function readyPanel({emoji, title, desc, href, extraLink, extraLinks}){
  // รองรับทั้ง extraLink เดี่ยว (ของเดิม) และ extraLinks เป็น array (หลายทางเลือก)
  const links = extraLinks || (extraLink ? [extraLink] : []);
  // ถ้ามีแค่ทางเดียว (ไม่มีเวอร์ชันให้เลือก) กดที่แท็บด้านบนแล้วเข้าเนื้อหาได้เลย ไม่ต้องมีปุ่ม "เล่นเกมนี้เลย" ซ้ำในนี้
  if(!links.length) return `
    <span class="status-badge ready">✅ พร้อมเล่น</span>
    <div class="placeholder-box" style="border-style:solid; background:#FAFDFB">
      <span class="p-emoji">${emoji}</span>
      <div style="margin-top:6px;font-size:.88rem"><a href="${href}">คลิกที่นี่เพื่อเปิด</a></div>
    </div>
  `;
  return `
    <span class="status-badge ready">✅ พร้อมเล่น</span>
    <div class="placeholder-box" style="border-style:solid; background:#FAFDFB">
      <div class="btn-row" style="justify-content:center; flex-direction:column; align-items:center">
        ${actionBtn(href, "play", "▶ เล่นเกมนี้เลย", "")}
        ${links.map(l => actionBtn(l.href, l.key, l.label, "secondary")).join("")}
      </div>
    </div>
  `;
}

function placeholderPanel({emoji, title, desc, cta, extraLink}){
  return `
    <span class="status-badge">🚧 กำลังจัดทำ</span>
    <div class="placeholder-box">
      <span class="p-emoji">${emoji}</span>
      <div><b>${title}</b> ของหน่วยนี้ยังไม่ถูกเพิ่มเข้าระบบ</div>
      <div style="margin-top:6px;font-size:.88rem">${desc}</div>
      <div class="btn-row" style="justify-content:center">
        <span class="btn secondary" style="cursor:default">✏️ ${cta} (เร็วๆ นี้)</span>
        ${extraLink ? `<a class="btn" href="${extraLink.href}">${extraLink.label}</a>` : ""}
      </div>
    </div>
  `;
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);
render();
