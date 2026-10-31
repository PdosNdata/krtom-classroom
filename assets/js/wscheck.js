/* wscheck.js — ระบบตรวจใบงาน ม.1 หน่วย 2 (ใบ 2.2–2.7) และหน่วย 1 (ใบ 1.1–1.7: run1) อัตโนมัติ
 * ตรวจ 8 ข้อ ข้อละ 1 คะแนน:
 *   ข้อ 1–4  ตรวจคำสำคัญ (วัตถุประสงค์ / Input / Process / Output)
 *   ข้อ 5    ตรวจรูปแบบและลำดับของอัลกอริทึมแบบธรรมชาติ
 *   ข้อ 6    รันรหัสลำลองจริงด้วยค่าทดสอบ (ใช้เอนจินในไฟล์นี้)
 *   ข้อ 7    ถอดลิงก์ผังงาน (?f=) แล้วตรวจโครงสร้าง ถ้าไม่มีลิงก์ตรวจจากคำบรรยาย
 *   ข้อ 8    ถอดลิงก์โค้ดจิ๊กซอว์ (?p=) แล้วตรวจชนิดบล็อกและค่า
 * ผลที่ได้เป็น "การตรวจเบื้องต้นโดยระบบ" ครูควรตรวจซ้ำได้
 */
(function(){
"use strict";

/* ───────── เกณฑ์ตรวจของแต่ละใบ ───────── */
const R = {
  2: { kind:"seq", topic:/ไข่|ขั้นตอน/, inp:/ไข่|กระทะ|น้ำมัน|เตา/, proc:/ตอก|ทอด|รอ|สุก|เรียง|ลำดับ/, out:/ไข่ดาว|จาน|ขั้นตอน/,
       order:[/ออกไข่|แม่ไก่/, /ตอก|กระทะ/, /สุก|รอ/, /จาน/],
       tests:[{ inp:[], expect:(o) => inOrder(o.lines, [/ออกไข่|แม่ไก่/, /ตอก/, /สุก|รอ/, /จาน/]), msg:"รหัสลำลองต้องแสดงขั้นตอนตามลำดับ: แม่ไก่ออกไข่ → ตอกไข่ลงกระทะ → รอไข่สุก → นำใส่จาน" }],
       blocks:{ need:[b => has(b, "flag"), b => count(b, ["say", "sayfor"]) >= 3], msg:["ต้องมีบล็อก \"เมื่อกดธงเขียว\"", "ต้องใช้บล็อก \"พูด\" อย่างน้อย 3 ขั้นตอน"] } },
  3: { kind:"seq", topic:/อุณหภูมิ|แปลง|เซลเซียส|ฟาเรนไฮต์/, inp:/F|ฟาเรนไฮต์|อุณหภูมิ/i, proc:/32/, proc2:[/32/, /5/, /9/], out:/C|เซลเซียส|องศา/i, procMsg:"ต้องเขียนสูตรที่มี 32, 5 และ 9 เช่น C = (F − 32) × 5 ÷ 9",
       order:[/รับ/, /คำนวณ/, /แสดง/],
       tests:[{ inp:[32], expect:(o) => hasNum(o, 0), msg:"F = 32 ควรได้ C = 0" }, { inp:[212], expect:(o) => hasNum(o, 100), msg:"F = 212 ควรได้ C = 100" }, { inp:[95], expect:(o) => hasNum(o, 35), msg:"F = 95 ควรได้ C = 35" }],
       blocks:{ need:[b => has(b, "flag"), b => has(b, "ask"), b => has(b, "sub") && has(b, "mul") && has(b, "div"), b => hasStr(b, "32") && hasStr(b, "5") && hasStr(b, "9"), b => count(b, ["say", "sayfor"]) >= 1],
                msg:["ต้องมีบล็อก \"เมื่อกดธงเขียว\"", "ต้องใช้บล็อก \"ถามและรอคำตอบ\" เพื่อรับค่า F", "ต้องใช้ตัวดำเนินการ − × ÷ ครบ (สูตร (F − 32) × 5 ÷ 9)", "สูตรต้องมีเลข 32, 5 และ 9", "ต้องใช้บล็อก \"พูด\" แสดงผล"] } },
  4: { kind:"sel", topic:/สวนสัตว์|ค่าเข้าชม|ส่วนสูง/, inp:/height|ส่วนสูง/i, proc:/120/, out:/20|ค่าเข้าชม|ไม่เสีย/, procMsg:"ต้องบอกเงื่อนไขที่ใช้ตรวจ เช่น height มากกว่า 120",
       order:[/รับ/, /ถ้า|ตรวจ/, /แสดง|20|บาท/],
       tests:[{ inp:[125], expect:(o) => /20/.test(o.text), msg:"ส่วนสูง 125 ต้องแสดงค่าเข้าชม 20 บาท" }, { inp:[121], expect:(o) => /20/.test(o.text), msg:"ส่วนสูง 121 (มากกว่า 120) ต้องเสียค่าเข้าชม 20 บาท" }, { inp:[120], expect:(o) => !/20/.test(o.text), msg:"ส่วนสูง 120 ไม่ได้ \"มากกว่า\" 120 จึงไม่ต้องเสียค่าเข้าชม" }, { inp:[110], expect:(o) => !/20/.test(o.text), msg:"ส่วนสูง 110 ไม่ต้องเสียค่าเข้าชม" }],
       dec:"120", blocks:{ need:[b => has(b, "flag"), b => (has(b, "if") || has(b, "ifelse")), b => condHas(b, "120"), b => hasStr(b, "20")],
                msg:["ต้องมีบล็อก \"เมื่อกดธงเขียว\"", "ต้องใช้บล็อก \"ถ้า … แล้ว\" (หรือ ถ้า…ไม่เช่นนั้น)", "เงื่อนไขต้องเปรียบเทียบกับ 120", "ต้องแสดงค่าเข้าชม 20 บาท"] } },
  5: { kind:"sel", topic:/รางวัล|คะแนน/, inp:/score|คะแนน/i, proc:/80/, out:/รางวัล/, procMsg:"ต้องบอกเงื่อนไขที่ใช้ตรวจ เช่น score มากกว่า 80",
       order:[/รับ/, /ถ้า|ตรวจ/, /แสดง|รางวัล/],
       tests:[{ inp:[85], expect:(o) => /รางวัล/.test(o.text), msg:"คะแนน 85 ต้องได้รางวัลพิเศษ" }, { inp:[81], expect:(o) => /รางวัล/.test(o.text), msg:"คะแนน 81 (มากกว่า 80) ต้องได้รางวัลพิเศษ" }, { inp:[80], expect:(o) => !/รางวัล/.test(o.text), msg:"คะแนน 80 ไม่ได้ \"มากกว่า\" 80 จึงยังไม่ได้รางวัลพิเศษ" }, { inp:[60], expect:(o) => !/รางวัล/.test(o.text), msg:"คะแนน 60 ไม่ควรได้รางวัลพิเศษ" }],
       dec:"80", blocks:{ need:[b => has(b, "flag"), b => (has(b, "if") || has(b, "ifelse")), b => condHas(b, "80"), b => hasStr(b, "รางวัล")],
                msg:["ต้องมีบล็อก \"เมื่อกดธงเขียว\"", "ต้องใช้บล็อก \"ถ้า … แล้ว\"", "เงื่อนไขต้องเปรียบเทียบกับ 80", "ต้องพูดข้อความที่มีคำว่า \"รางวัล\""] } },
  6: { kind:"loop", topic:/สามเหลี่ยม|วาด/, inp:/ด้าน|ความยาว|100|จำนวน/, proc:/3|สาม/, proc2:[/3|สาม/, /120/], out:/สามเหลี่ยม|รูป/, procMsg:"ต้องบอกว่าทำซ้ำ 3 รอบ และหมุนครั้งละ 120 องศา",
       order:[/ทำซ้ำ|วน/, /เดิน/, /หมุน/],
       tests:[{ inp:[], expect:(o) => o.lines.filter(l => /เดิน/.test(l)).length === 3 && o.lines.filter(l => /หมุน/.test(l)).length === 3, msg:"ต้องทำคำสั่ง เดิน และ หมุน อย่างละ 3 ครั้ง (ทำซ้ำ 3 รอบ)" }, { inp:[], expect:(o) => o.lines.filter(l => /เดิน/.test(l)).every(l => /100/.test(l)) && o.lines.filter(l => /หมุน/.test(l)).every(l => /120/.test(l)), msg:"เดินด้านละ 100 ก้าว และหมุนครั้งละ 120 องศา" }],
       loop:true, blocks:{ need:[b => has(b, "flag"), b => has(b, "repeat") || has(b, "while"), b => hasStr(b, "100") && hasStr(b, "120"), b => has(b, "move") && (has(b, "turnR") || has(b, "turnL")), b => has(b, "pendown")],
                msg:["ต้องมีบล็อก \"เมื่อกดธงเขียว\"", "ต้องใช้บล็อกทำซ้ำ (ทำซ้ำ n รอบ)", "ต้องมีเลข 100 (ความยาวด้าน) และ 120 (องศาที่หมุน)", "ต้องมีบล็อก เดิน และ หมุน", "ต้องใช้บล็อก \"ปากกา ลง\" เพื่อให้เห็นเส้น"] } },
  7: { kind:"loop", topic:/แมว|เหมียว|ร้อง/, inp:/times|จำนวนรอบ|รอบ|จำนวน/i, proc:/ทำซ้ำ|วนซ้ำ|times|รอบ/i, out:/เหมียว|ร้อง/, procMsg:"ต้องบอกว่าทำซ้ำตามจำนวนรอบ (ตัวแปร times)",
       order:[/รับ/, /ทำซ้ำ|วน/, /เหมียว|ร้อง/],
       tests:[{ inp:[3], expect:(o) => countMeow(o) === 3, msg:"ใส่ 3 แมวต้องร้อง \"เหมียว\" 3 ครั้ง" }, { inp:[5], expect:(o) => countMeow(o) === 5, msg:"ใส่ 5 แมวต้องร้อง 5 ครั้ง" }, { inp:[0], expect:(o) => countMeow(o) === 0, msg:"ใส่ 0 แมวต้องไม่ร้องเลย" }],
       loop:true, blocks:{ need:[b => has(b, "flag"), b => has(b, "ask"), b => has(b, "repeat") || has(b, "while"), b => loopUsesVar(b), b => has(b, "set")],
                msg:["ต้องมีบล็อก \"เมื่อกดธงเขียว\"", "ต้องใช้บล็อก \"ถามและรอคำตอบ\" รับจำนวนรอบ", "ต้องใช้บล็อกทำซ้ำ", "จำนวนรอบของบล็อกทำซ้ำต้องเป็นตัวแปร (ลากตัวแปรมาวางในช่อง)", "ต้องใช้บล็อก \"กำหนดตัวแปร\" เก็บจำนวนรอบ"] } }
};
const countMeow = (o) => o.lines.filter(l => /เหมียว/.test(l)).length;
const hasNum = (o, v) => (o.text.match(/-?\d+(\.\d+)?/g) || []).some(x => Math.abs(parseFloat(x) - v) < 0.6);
function inOrder(lines, res){ let at = -1; for(const re of res){ const i = lines.findIndex((l, k) => k > at && re.test(l)); if(i < 0) return false; at = i; } return true; }

/* ───────── เอนจินรหัสลำลอง (ไม่มีหน้าจอ) ───────── */
const stripCm = (l) => l.replace(/\/\/.*$/, "").replace(/(^|\s)#.*$/, "").trim();
function parseLine(raw){
  const t = stripCm(raw); if(!t) return null; let m;
  if((m = t.match(/^(START|END|ELSE|ENDIF|ENDWHILE)$/i))) return { k:m[1].toUpperCase() };
  if((m = t.match(/^INPUT\s+(.+)$/i))) return { k:"INPUT", a:m[1].split(/[,،]/).map(x => x.trim()).filter(Boolean) };
  if((m = t.match(/^(?:SET|COMPUTE)\s+([^=\s]+)\s*=\s*(.+)$/i))) return { k:"SET", v:m[1], e:m[2] };
  if((m = t.match(/^([A-Za-z_ก-๙][A-Za-z0-9_ก-๙]*)\s*=\s*(.+)$/))) return { k:"SET", v:m[1], e:m[2] };
  if((m = t.match(/^DISPLAY\s+(.+)$/i))) return { k:"DISPLAY", e:m[1] };
  if((m = t.match(/^DO\s+(.+)$/i))) return { k:"DO", a:m[1] };
  if((m = t.match(/^IF\s+(.+?)\s+THEN$/i))) return { k:"IF", e:m[1] };
  if((m = t.match(/^WHILE\s+(.+?)\s+DO$/i))) return { k:"WHILE", e:m[1] };
  return { k:"?", t };
}
const TOK = /"[^"]*"|“[^”]*”|'[^']*'|\d+(?:\.\d+)?|[A-Za-z_ก-๙][A-Za-z0-9_ก-๙]*|<>|>=|<=|≥|≤|[-+*\/%()=<>×÷−]|\s+|./g;
function toJS(e, known){
  const out = [];
  for(const t of e.match(TOK) || []){
    if(/^\s+$/.test(t)) continue;
    if(/^["“'].*["”']$/.test(t)){ out.push(JSON.stringify(t.slice(1, -1))); continue; }
    if(/^\d/.test(t)){ out.push(t); continue; }
    if(/^[A-Za-z_ก-๙]/.test(t)){
      const u = t.toUpperCase();
      if(u === "MOD") out.push("%"); else if(u === "AND") out.push("&&"); else if(u === "OR") out.push("||"); else if(u === "NOT") out.push("!");
      else if(u === "TRUE") out.push("true"); else if(u === "FALSE") out.push("false");
      else { if(!known.has(t)) throw { unknown:t }; out.push("$v[" + JSON.stringify(t) + "]"); }
      continue;
    }
    const map = { "=":"==", "<>":"!=", "≥":">=", "≤":"<=", "×":"*", "÷":"/", "−":"-" };
    if(["+", "-", "*", "/", "%", "(", ")", ">", "<", ">=", "<=", "=", "<>", "≥", "≤", "×", "÷", "−"].includes(t)) out.push(map[t] || t); else throw { bad:t };
  }
  return out.join(" ");
}
const evalE = (e, v) => new Function("$v", "return (" + toJS(e, new Set(Object.keys(v))) + ");")(v);
const show = (v) => typeof v === "number" ? String(+v.toFixed(8)) : typeof v === "boolean" ? (v ? "จริง" : "เท็จ") : String(v);
const conv = (s) => { const t = String(s).trim(); return t !== "" && isFinite(Number(t)) ? Number(t) : t; };

function analyzeCode(code){
  const lines = code.split("\n"), P = lines.map(parseLine), sig = P.map((p, i) => p ? i : -1).filter(i => i >= 0), errs = [];
  if(!sig.length) return ["ยังไม่ได้เขียนรหัสลำลอง"];
  if(P[sig[0]].k !== "START") errs.push("ต้องขึ้นต้นด้วย START");
  if(P[sig[sig.length - 1]].k !== "END") errs.push("ต้องลงท้ายด้วย END");
  const stack = [], def = new Set();
  sig.forEach(i => { const p = P[i], ln = i + 1;
    if(p.k === "?") errs.push(`บรรทัด ${ln}: ไม่รู้จักคำสั่ง "${p.t.split(/\s/)[0]}"`);
    else if(p.k === "INPUT") p.a.forEach(v => def.add(v));
    else if(p.k === "SET"){ try{ toJS(p.e, def); }catch(x){ errs.push(x.unknown ? `บรรทัด ${ln}: ใช้ตัวแปร "${x.unknown}" ก่อนกำหนดค่า` : `บรรทัด ${ln}: นิพจน์ไม่ถูกต้อง`); } def.add(p.v); }
    else if(p.k === "IF" || p.k === "WHILE"){ stack.push(p.k); try{ toJS(p.e, def); }catch(x){ errs.push(x.unknown ? `บรรทัด ${ln}: ใช้ตัวแปร "${x.unknown}" ก่อนกำหนดค่า` : `บรรทัด ${ln}: เงื่อนไขไม่ถูกต้อง`); } }
    else if(p.k === "ELSE"){ if(stack[stack.length - 1] !== "IF") errs.push(`บรรทัด ${ln}: ELSE ต้องอยู่ใน IF`); }
    else if(p.k === "ENDIF" || p.k === "ENDWHILE"){ const need = p.k === "ENDIF" ? "IF" : "WHILE"; if(stack.pop() !== need) errs.push(`บรรทัด ${ln}: ${p.k} ไม่มี ${need} คู่กัน`); } });
  stack.forEach(k => errs.push(k + " ยังไม่ปิดด้วย " + (k === "IF" ? "ENDIF" : "ENDWHILE")));
  return errs;
}
function runCode(code, inputs){
  const P = code.split("\n").map(parseLine), prog = [], st = [prog], owners = [];
  P.forEach(p => { if(!p) return; const cur = st[st.length - 1];
    if(p.k === "IF"){ p.t = []; p.f = []; cur.push(p); st.push(p.t); owners.push(p); }
    else if(p.k === "WHILE"){ p.t = []; cur.push(p); st.push(p.t); owners.push(p); }
    else if(p.k === "ELSE"){ st[st.length - 1] = owners[owners.length - 1].f; }
    else if(p.k === "ENDIF" || p.k === "ENDWHILE"){ st.pop(); owners.pop(); }
    else if(!["START", "END"].includes(p.k)) cur.push(p); });
  const vars = {}, lines = [], q = inputs.slice(); let steps = 0;
  function ex(list){ for(const p of list){ if(++steps > 20000) throw new Error("วนไม่รู้จบ");
    if(p.k === "INPUT") p.a.forEach(n => { vars[n] = q.length ? conv(q.shift()) : 0; });
    else if(p.k === "SET") vars[p.v] = evalE(p.e, vars);
    else if(p.k === "DISPLAY"){ const parts = p.e.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/), txt = []; parts.forEach(s => { try{ txt.push(show(evalE(s, vars))); }catch(x){ txt.push(s.trim().replace(/^["“'](.*)["”']$/, "$1")); } }); lines.push(txt.join(" ")); }
    else if(p.k === "DO") lines.push(p.a);
    else if(p.k === "IF") ex(evalE(p.e, vars) ? p.t : p.f);
    else if(p.k === "WHILE"){ while(evalE(p.e, vars)){ ex(p.t); if(++steps > 20000) throw new Error("วนไม่รู้จบ"); } } } }
  ex(prog); return { lines, text:lines.join(" | "), vars };
}

/* ───────── ถอดลิงก์จากช่องคำตอบ ───────── */
const b64d = (t) => JSON.parse(decodeURIComponent(escape(atob(t.replace(/-/g, "+").replace(/_/g, "/")))));
const b64t = (t) => decodeURIComponent(escape(atob(t.replace(/-/g, "+").replace(/_/g, "/"))));
function linkParam(text, key){ const m = text.match(new RegExp("[?&]" + key + "=([A-Za-z0-9_-]+)")); return m ? m[1] : null; }

/* ───────── ตรวจบล็อกโค้ดจิ๊กซอว์ ───────── */
function walkBlocks(list, cb){ (list || []).forEach(b => { if(!b || typeof b !== "object") return; cb(b); (b.a || []).forEach(x => { if(x && typeof x === "object") walkBlocks([x], cb); }); (b.s || []).forEach(s => walkBlocks(s, cb)); }); }
function allBlocks(d){ const out = []; (d.scripts || []).forEach(sc => walkBlocks(sc.b, b => out.push(b))); return out; }
const has = (bs, t) => bs.some(b => b.t === t);
const count = (bs, ts) => bs.filter(b => ts.includes(b.t)).length;
const hasStr = (bs, s) => JSON.stringify(bs.map(b => b.a)).includes('"' + s + '"') || JSON.stringify(bs.map(b => b.a)).includes(s);
const condHas = (bs, s) => bs.some(b => (b.t === "if" || b.t === "ifelse") && JSON.stringify(b.a).includes(s));
const loopUsesVar = (bs) => bs.some(b => (b.t === "repeat") && b.a && b.a[0] && typeof b.a[0] === "object" && b.a[0].t === "var");

/* ───────── ตรวจผังงาน ───────── */
function checkFlow(d, rule){
  const msgs = [], N = d.nodes || [], E = d.edges || [];
  if(!N.length) return ["ยังไม่ได้วาดผังงาน"];
  const starts = N.filter(n => n.k === "term" && /^เริ่ม/.test(n.t)), ends = N.filter(n => n.k === "term" && /^(จบ|สิ้นสุด)/.test(n.t));
  if(starts.length !== 1) msgs.push("ต้องมีสัญลักษณ์ ⬭ \"เริ่มต้น\" 1 จุด");
  if(ends.length < 1) msgs.push("ต้องมีสัญลักษณ์ ⬭ \"จบ\"");
  const out = (id) => E.filter(e => e.a === id), inn = (id) => E.filter(e => e.b === id);
  N.forEach(n => { if(ends.includes(n) || n.k === "conn" || n.k === "off") return;
    if(!out(n.id).length) msgs.push(`"${String(n.t).split("\n")[0]}" ยังไม่มีลูกศรออก`);
    if(!starts.includes(n) && !inn(n.id).length) msgs.push(`"${String(n.t).split("\n")[0]}" ยังไม่มีลูกศรเข้า`);
    if(n.k === "dec"){ const l = out(n.id).map(e => e.l); if(!(l.includes("ใช่") && l.includes("ไม่ใช่"))) msgs.push(`"${String(n.t).split("\n")[0]}" ต้องมีลูกศรออก "ใช่" และ "ไม่ใช่"`); } });
  const decs = N.filter(n => n.k === "dec");
  if(rule.kind === "sel" || rule.kind === "loop"){ if(!decs.length) msgs.push("ต้องใช้สัญลักษณ์ ◇ ตัดสินใจ"); }
  if(rule.kind === "seq" && decs.length) msgs.push("โจทย์นี้เป็นแบบเรียงลำดับ ไม่ต้องใช้ ◇ ตัดสินใจ");
  if(rule.dec && !N.some(n => n.k === "dec" && String(n.t).includes(rule.dec))) msgs.push(`เงื่อนไขใน ◇ ต้องเปรียบเทียบกับ ${rule.dec}`);
  if(rule.loop){ // ต้องมีลูกศรวนกลับ (เส้นที่ไปยังรูปทรงที่เคยผ่านแล้ว)
    let cyc = false; const color = {};
    (function dfs(id){ color[id] = 1; out(id).forEach(e => { if(color[e.b] === 1) cyc = true; else if(!color[e.b]) dfs(e.b); }); color[id] = 2; })(starts[0] ? starts[0].id : N[0].id);
    if(!cyc) msgs.push("ผังงานแบบทำซ้ำต้องมีลูกศรวนกลับไปที่ ◇ เงื่อนไข");
  }
  if(rule.kind !== "loop" && !N.some(n => n.k === "io" || n.k === "man" || n.k === "disp")) msgs.push("ควรมีสัญลักษณ์ ▱ รับค่า/แสดงผล");
  return msgs;
}

/* ───────── ตรวจข้อความธรรมดา ───────── */
function checkText(v, i, rule){
  if(!v || v.trim().length < 8) return ["ยังไม่ได้ตอก หรือตอบสั้นเกินไป"];
  const miss = [];
  if(i === 0){ if(!/เพื่อ/.test(v)) miss.push("วัตถุประสงค์ควรขึ้นต้นด้วย \"เพื่อ…\""); if(!rule.topic.test(v)) miss.push("วัตถุประสงค์ยังไม่ตรงกับโจทย์"); }
  if(i === 1 && !rule.inp.test(v)) miss.push("ข้อมูลนำเข้ายังไม่ตรงกับโจทย์ (ลองดูคำใบ้ใต้หัวข้อ)");
  if(i === 2){ const ps = rule.proc2 || [rule.proc]; if(!ps.every(re => re.test(v))) miss.push(rule.procMsg || "วิธีประมวลผลยังไม่ครบตามโจทย์"); }
  if(i === 3 && !rule.out.test(v)) miss.push("ข้อมูลนำออกยังไม่ตรงกับโจทย์");
  return miss;
}
function checkNatural(v, rule){
  if(!v || v.trim().length < 8) return ["ยังไม่ได้เขียนอัลกอริทึม"];
  const ls = v.split("\n").map(s => s.trim()).filter(Boolean), miss = [];
  if(!/^(\d+[.)]\s*)?เริ่ม/.test(ls[0])) miss.push("บรรทัดแรกควรเป็น \"เริ่มต้น\"");
  if(!/(^|\s)(\d+[.)]\s*)?(จบ|สิ้นสุด)/.test(ls[ls.length - 1])) miss.push("บรรทัดสุดท้ายควรเป็น \"จบ\"");
  if(ls.length < 4) miss.push("ควรมีอย่างน้อย 4 บรรทัด (เริ่มต้น … จบ)");
  if(rule.order && !inOrder(ls, rule.order)) miss.push("ลำดับขั้นตอนยังไม่ถูกต้องตามโจทย์");
  return miss;
}

/* ───────── ตัวตรวจหลัก ───────── */
function run(n, vals){
  const rule = R[n]; if(!rule) return null;
  const F = []; const add = (ok, title, msgs, note) => F.push({ ok, title, msgs, note });
  const T = ["วัตถุประสงค์", "ข้อมูลนำเข้า (Input)", "วิธีประมวลผล (Process)", "ข้อมูลนำออก (Output)", "อัลกอริทึมแบบธรรมชาติ", "รหัสลำลอง (Pseudocode)", "ผังงาน (Flowchart)", "โปรแกรมโค้ดจิ๊กซอว์"];
  for(let i = 0; i < 4; i++){ const m = checkText(vals[i] || "", i, rule); add(!m.length, T[i], m); }
  { const m = checkNatural(vals[4] || "", rule); add(!m.length, T[4], m); }
  // ข้อ 6
  { const txt = vals[5] || "", cut = txt.search(/\nลิงก์รหัสลำลอง/), code = cut >= 0 ? txt.slice(0, cut) : txt, msgs = [];
    if(code.trim().length < 8) msgs.push("ยังไม่ได้เขียนรหัสลำลอง");
    else { const errs = analyzeCode(code); if(errs.length) msgs.push(...errs.slice(0, 4));
      else rule.tests.forEach(t => { let res; try{ res = runCode(code, t.inp); }catch(e){ msgs.push("รันรหัสไม่สำเร็จ: " + (e.message || "ผิดพลาด")); return; } if(!t.expect(res)) msgs.push("ผลลัพธ์ไม่ถูกต้อง — " + t.msg); }); }
    add(!msgs.length, T[5], msgs.filter((x, k, a) => a.indexOf(x) === k), "ระบบรันรหัสของคุณกับค่าทดสอบจริง"); }
  // ข้อ 7
  { const txt = vals[6] || "", f = linkParam(txt, "f"); let msgs = [], note = "";
    if(txt.trim().length < 8) msgs.push("ยังไม่ได้วาดผังงาน");
    else if(f){ try{ msgs = checkFlow(b64d(f), rule); note = "ตรวจจากผังงานที่ส่งมาจากโปรแกรมวาดผังงาน"; }catch(e){ msgs.push("เปิดลิงก์ผังงานไม่ได้ — ลองกดส่งจากโปรแกรมวาดผังงานอีกครั้ง"); } }
    else { note = "ตรวจจากคำบรรยาย (ถ้าส่งจากโปรแกรมวาดผังงานจะตรวจละเอียดกว่า)";
      if(!/เริ่ม/.test(txt) || !/จบ/.test(txt)) msgs.push("ควรระบุ ⬭ เริ่มต้น และ ⬭ จบ");
      if(rule.kind !== "seq" && !/◇|ตัดสินใจ|เงื่อนไข|ใช่/.test(txt)) msgs.push("ควรระบุสัญลักษณ์ ◇ ตัดสินใจ (ใช่/ไม่ใช่)");
      if(rule.loop && !/วนกลับ|กลับ|ซ้ำ|ย้อน/.test(txt)) msgs.push("ผังงานแบบทำซ้ำต้องมีลูกศรวนกลับ"); }
    add(!msgs.length, T[6], msgs, note); }
  // ข้อ 8
  { const txt = vals[7] || "", p = linkParam(txt, "p"); let msgs = [], note = "";
    if(txt.trim().length < 8) msgs.push("ยังไม่ได้เขียนโปรแกรม");
    else if(p){ try{ const bs = allBlocks(b64d(p)); rule.blocks.need.forEach((fn, k) => { if(!fn(bs)) msgs.push(rule.blocks.msg[k]); }); note = "ตรวจจากโปรแกรมที่ส่งมาจากโค้ดจิ๊กซอว์"; }catch(e){ msgs.push("เปิดลิงก์โปรแกรมไม่ได้ — ลองกดส่งจากโค้ดจิ๊กซอว์อีกครั้ง"); } }
    else { note = "ตรวจจากคำบรรยาย (ถ้าส่งจากโค้ดจิ๊กซอว์จะตรวจละเอียดกว่า)"; if(!/บล็อก|ธงเขียว|พูด|ถาม|ทำซ้ำ|ถ้า/.test(txt)) msgs.push("ควรบอกว่าใช้บล็อกอะไรบ้าง หรือส่งโปรแกรมจากโค้ดจิ๊กซอว์"); }
    add(!msgs.length, T[7], msgs, note); }
  const score = F.filter(x => x.ok).length;
  return { fields:F, score, max:8 };
}


/* ───────── ใบงาน 2.8 (อัตนัย 3 ตอน): ใช้เกณฑ์ชุดเดียวกัน แยกตามโครงสร้าง ───────── */
const lastNum = (l) => { const m = String(l).match(/-?\d+(?:\.\d+)?/g); return m ? parseFloat(m[m.length - 1]) : NaN; };
R[81] = { kind:"seq", topic:/สามเหลี่ยม|พื้นที่/, inp:/ฐาน|base|สูง|height/i, proc2:[/ฐาน|base/i, /สูง|height/i, /2|ครึ่ง|0\.5/], procMsg:"ต้องใช้สูตรพื้นที่สามเหลี่ยม = ½ × ฐาน × สูง (มีฐาน สูง และ 2 หรือ 0.5)", out:/พื้นที่|area/i,
          order:[/รับ/, /คำนวณ/, /แสดง/],
          tests:[{ inp:[10, 6], expect:(o) => hasNum(o, 30), msg:"ฐาน 10 สูง 6 ควรได้พื้นที่ 30" }, { inp:[4, 5], expect:(o) => hasNum(o, 10), msg:"ฐาน 4 สูง 5 ควรได้พื้นที่ 10" }, { inp:[7, 2], expect:(o) => hasNum(o, 7), msg:"ฐาน 7 สูง 2 ควรได้พื้นที่ 7" }],
          blocks:{ need:[b => has(b, "flag"), b => count(b, ["ask"]) >= 2, b => has(b, "mul"), b => hasStr(b, "2") || hasStr(b, "0.5") || has(b, "div"), b => count(b, ["say", "sayfor"]) >= 1],
                   msg:["ต้องมีบล็อก \"เมื่อกดธงเขียว\"", "ต้องถามค่า 2 ค่า (ฐาน และ สูง)", "ต้องใช้ตัวดำเนินการ × คูณ", "สูตรต้องมี 2 (หาร 2) หรือ 0.5", "ต้องใช้บล็อก \"พูด\" แสดงผล"] } };
R[82] = { kind:"sel", topic:/ส่วนลด|ลด|ราคา/, inp:/price|ราคา|ยอด|ซื้อ|เงิน/i, proc2:[/500/, /10|0\.1|ร้อยละ|เปอร์เซ็นต์|%/], procMsg:"ต้องบอกเงื่อนไข 500 บาทขึ้นไป และลด 10%", out:/ราคา|จ่าย|ลด/, dec:"500",
          order:[/รับ/, /ถ้า|ตรวจ/, /แสดง|จ่าย|ลด/],
          tests:[{ inp:[600], expect:(o) => hasNum(o, 540), msg:"ซื้อ 600 บาท ลด 10% ต้องจ่าย 540 บาท" }, { inp:[500], expect:(o) => hasNum(o, 450), msg:"ซื้อ 500 บาท \"ตั้งแต่ 500 ขึ้นไป\" ได้ลด ต้องจ่าย 450 บาท" }, { inp:[1000], expect:(o) => hasNum(o, 900), msg:"ซื้อ 1000 บาท ต้องจ่าย 900 บาท" }, { inp:[499], expect:(o) => hasNum(o, 499), msg:"ซื้อ 499 บาท ไม่ถึง 500 ไม่ลด ต้องจ่าย 499 บาท" }],
          blocks:{ need:[b => has(b, "flag"), b => has(b, "ask"), b => (has(b, "if") || has(b, "ifelse")), b => condHas(b, "500"), b => hasStr(b, "0.9") || hasStr(b, "10") || hasStr(b, "90") || has(b, "mul")],
                   msg:["ต้องมีบล็อก \"เมื่อกดธงเขียว\"", "ต้องถามราคาสินค้า", "ต้องใช้บล็อก \"ถ้า … แล้ว\"", "เงื่อนไขต้องเปรียบเทียบกับ 500", "ต้องคำนวณส่วนลด (เช่น × 0.9 หรือ ลบ 10%)"] } };
R[83] = { kind:"loop", topic:/สูตรคูณ|แม่|คูณ/, inp:/i|count|ตัวนับ|ตัวแปร|3/i, proc2:[/ทำซ้ำ|วน|while|repeat/i, /5/, /3/], procMsg:"ต้องบอกว่าทำซ้ำ 5 รอบ (i จาก 1 ถึง 5) และคูณด้วย 3", out:/3|6|9|12|15|ผลคูณ|สูตรคูณ/, loop:true, dec:"5",
          order:[/ทำซ้ำ|วน/, /คูณ|×|\*/, /แสดง/],
          tests:[{ inp:[], expect:(o) => o.lines.length === 5, msg:"ต้องแสดงผล 5 บรรทัด (แม่ 3 ตั้งแต่ 1 ถึง 5)" }, { inp:[], expect:(o) => o.lines.map(lastNum).join(",") === "3,6,9,12,15", msg:"ผลคูณที่แสดงต้องเป็น 3, 6, 9, 12, 15 ตามลำดับ" }],
          blocks:{ need:[b => has(b, "flag"), b => has(b, "repeat") || has(b, "while"), b => hasStr(b, "3"), b => hasStr(b, "5"), b => count(b, ["say", "sayfor"]) >= 1],
                   msg:["ต้องมีบล็อก \"เมื่อกดธงเขียว\"", "ต้องใช้บล็อกทำซ้ำ", "ต้องมีเลข 3 (แม่ 3)", "ต้องมีเลข 5 (5 รอบ / ถึง 5)", "ต้องใช้บล็อก \"พูด\" แสดงผล"] } };
function run8(vals){
  const fields = []; let score = 0;
  [81, 82, 83].forEach((k, part) => { const r = run(k, vals.slice(part * 8, part * 8 + 8)); r.fields.forEach((f, i) => { f.label = "ตอนที่ " + (part + 1) + " ข้อ " + (i + 1); fields.push(f); }); score += r.score; });
  return { fields, score, max:24 };
}

/* ───────── ใบงานหน่วยที่ 1 (ใบ 1.1–1.7): ตรวจเบื้องต้นรายข้อ ข้อละ 1 คะแนน ───────── */
const TH_ITEM_SEP = /[\n,;、/|•·]+|\s+และ\s+|\s{2,}|(?:^|\s)\d+[.)]\s*|\s-\s/;
function itemsOf(v){
  let a = String(v || "").split(TH_ITEM_SEP).map(s => s.trim()).filter(s => s.length >= 2);
  if(a.length < 2) a = String(v || "").split(/\s+/).map(s => s.trim()).filter(s => s.length >= 2);   // เขียนคั่นด้วยเว้นวรรค
  return a;
}
function segsOf(v){ return String(v || "").split(/\n|→|->|\d+[.)]\s*|[;,]|แล้ว|จากนั้น/).map(s => s.trim()).filter(Boolean); }
function firstAt(segs, re, from){ for(let i = from || 0; i < segs.length; i++) if(re.test(segs[i])) return i; return -1; }
const noLink = (v) => String(v || "").split(/\n+ลิงก์รหัสลำลอง/)[0];   // ตัดท้ายลิงก์ที่โปรแกรมเติมให้ตอนส่งมา
const hasFlowLink = (v) => /flowchart\.html\?(s|f)=/.test(String(v || ""));
const short = (v, n) => !v || v.trim().length < (n || 8);
const SHORTMSG = "ยังไม่ได้ตอบ หรือตอบสั้นเกินไป";
// คำนวณสูตรที่นักเรียนเขียน (ใช้ตัวแปร N) — คืน function หรือ null
function formulaFn(text){
  let s = String(text || ""); const eq = s.lastIndexOf("="); if(eq >= 0) s = s.slice(eq + 1);
  s = s.split("\n")[0].replace(/[×xX✕]/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/[Nn]/g, "(N)").replace(/\s+/g, "");
  if(!s || /[^0-9N()+\-*/.]/.test(s)) return null;
  s = s.replace(/(\d|\))\(/g, "$1*(");
  try{ const f = new Function("N", "return (" + s + ");"); const t = f(1); if(typeof t !== "number" || !isFinite(t)) return null; return f; }catch(e){ return null; }
}

const R1 = {
  1: { titles:["ปัญหาที่เลือก", "สาระสำคัญของปัญหา", "รายละเอียดที่ตัดทิ้ง", "วิธีการแก้ปัญหา"],
    f:[
      (v) => short(v) ? [SHORTMSG] : [],
      (v) => short(v) ? [SHORTMSG] : itemsOf(v).length >= 2 ? [] : ["สาระสำคัญควรเขียนอย่างน้อย 2 อย่าง (คั่นด้วย , หรือขึ้นบรรทัดใหม่)"],
      (v, a) => { if(short(v, 4)) return [SHORTMSG]; const s = itemsOf(a[1]), d = itemsOf(v); return d.length && d.every(x => s.includes(x)) ? ["สิ่งที่ตัดทิ้งไม่ควรซ้ำกับสาระสำคัญในข้อ 2"] : []; },
      (v, a) => { if(short(v, 20)) return ["วิธีแก้ปัญหาควรอธิบายให้ละเอียดกว่านี้ (อย่างน้อย 20 ตัวอักษร)"]; const s = itemsOf(a[1]); return (s.some(x => v.includes(x)) || /สาระสำคัญ|รูปแบบ|ตัดทิ้ง|นามธรรม|แผนภาพ|แบบจำลอง/.test(v)) ? [] : ["วิธีแก้ปัญหาควรนำ \"สาระสำคัญ\" ที่เขียนไว้ในข้อ 2 มาใช้"]; }
    ] },
  2: { titles:["ปัญหาที่เลือก", "อัลกอริทึมแบบภาษาธรรมชาติ", "รหัสลำลอง (Pseudo Code)", "ผังงาน (Flowchart)"],
    f:[
      (v) => short(v) ? [SHORTMSG] : [],
      (v) => { if(short(v)) return [SHORTMSG]; const ls = v.split("\n").map(s => s.trim()).filter(Boolean), m = []; if(!/^(\d+[.)]\s*)?เริ่ม/.test(ls[0])) m.push("บรรทัดแรกควรเป็น \"เริ่มต้นการทำงาน\""); if(!/(จบ|สิ้นสุด)/.test(ls[ls.length - 1])) m.push("บรรทัดสุดท้ายควรเป็น \"จบการทำงาน\""); if(ls.length < 4) m.push("ควรมีอย่างน้อย 4 บรรทัด (เริ่มต้น … จบ)"); return m; },
      (v) => { v = noLink(v); if(short(v)) return [SHORTMSG]; const m = [], ls = v.split("\n").map(s => s.trim()).filter(Boolean).map(s => s.replace(/^\d+[.)]\s*/, ""));
        if(!/^START/i.test(ls[0])) m.push("บรรทัดแรกควรเป็น START");
        if(!/^(STOP|END)/i.test(ls[ls.length - 1])) m.push("บรรทัดสุดท้ายควรเป็น STOP");
        if(!/INPUT|READ/i.test(v)) m.push("ควรมีคำสั่ง INPUT รับค่า");
        if(!/COMPUTE|SET|=/i.test(v)) m.push("ควรมีคำสั่ง COMPUTE คำนวณ");
        if(!/OUTPUT|DISPLAY|PRINT/i.test(v)) m.push("ควรมีคำสั่ง OUTPUT แสดงผล");
        const iI = v.search(/INPUT|READ/i), iC = v.search(/COMPUTE|SET/i), iO = v.search(/OUTPUT|DISPLAY|PRINT/i);
        if(iI >= 0 && iC >= 0 && iO >= 0 && !(iI < iC && iC < iO)) m.push("ลำดับควรเป็น INPUT → COMPUTE → OUTPUT");
        return m; },
      (v) => { if(short(v)) return [SHORTMSG]; const m = [];
        if(hasFlowLink(v)) return /เริ่ม/.test(v) && /จบ/.test(v) ? [] : ["ผังงานต้องมี ⬭ \"เริ่มต้น\" และ ⬭ \"จบ\""];
        if(!/เริ่ม/.test(v) || !/จบ/.test(v)) m.push("ควรบอกสัญลักษณ์ ⬭ วงรี \"เริ่มต้น\" และ \"จบ\"");
        if(!/รับ|ด้านขนาน|แสดง|ผลลัพธ์/.test(v)) m.push("ควรมีสี่เหลี่ยมด้านขนาน (รับค่า/แสดงผล)");
        if(!/คำนวณ|ผืนผ้า|ประมวลผล/.test(v)) m.push("ควรมีสี่เหลี่ยมผืนผ้า (คำนวณ/ประมวลผล)");
        if(!/ลูกศร|→|->/.test(v)) m.push("ควรบอกว่าเชื่อมสัญลักษณ์ด้วยลูกศร");
        return m; }
    ] },
  3: { titles:["ปัญหาและสาเหตุของปัญหา", "ทางเลือกในการแก้ปัญหา", "วิธีที่เลือกและเหตุผล", "อัลกอริทึมของวิธีที่เลือก"],
    f:[
      (v) => { if(short(v, 15)) return ["ควรเขียนทั้งปัญหาและสาเหตุให้ชัดเจน (อย่างน้อย 15 ตัวอักษร)"]; return /สาเหตุ|เพราะ|เนื่องจาก|ทำให้|เกิดจาก/.test(v) ? [] : ["ควรบอกสาเหตุของปัญหา (ใช้คำว่า \"สาเหตุ\" หรือ \"เพราะ\")"]; },
      (v) => short(v) ? [SHORTMSG] : itemsOf(v).length >= 2 || /หรือ|ทางที่ 2|2\./.test(v) ? [] : ["ต้องเขียนทางเลือกอย่างน้อย 2 ทาง"],
      (v) => { if(short(v, 15)) return ["ควรบอกวิธีที่เลือกและเหตุผล (อย่างน้อย 15 ตัวอักษร)"]; return /เพราะ|เนื่องจาก|เหตุผล|ดังนั้น|จึง/.test(v) ? [] : ["ต้องบอกเหตุผลที่เลือกวิธีนี้ (ใช้คำว่า \"เพราะ\")"]; },
      (v) => { if(short(v, 15)) return [SHORTMSG]; return segsOf(v).length >= 3 ? [] : ["อัลกอริทึมควรมีอย่างน้อย 3 ขั้นตอน เรียงเป็นข้อ ๆ ตามลำดับ"]; }
    ] },
  4: { titles:["สิ่งที่ต้องใช้ในแผนที่ (สาระสำคัญ)", "สิ่งที่ตัดทิ้งได้", "เส้นทางจากบ้านไปโรงเรียน", "เส้นทางที่สั้นที่สุดและเหตุผล"],
    f:[
      (v) => short(v) ? [SHORTMSG] : itemsOf(v).length >= 2 ? [] : ["ควรเขียนอย่างน้อย 2 อย่าง เช่น ถนน สถานที่สำคัญ ทิศทาง ระยะทาง"],
      (v, a) => { if(short(v, 4)) return [SHORTMSG]; const s = itemsOf(a[0]), d = itemsOf(v); return d.length && d.every(x => s.includes(x)) ? ["สิ่งที่ตัดทิ้งไม่ควรซ้ำกับสิ่งที่ต้องใช้ในแผนที่"] : []; },
      (v) => { if(short(v, 10)) return [SHORTMSG]; const m = []; if(segsOf(v).length < 3) m.push("เส้นทางควรเขียนเป็นลำดับอย่างน้อย 3 ช่วง เช่น ออกจากบ้าน → เลี้ยวซ้าย → ถึงโรงเรียน"); if(!/บ้าน/.test(v)) m.push("ควรเริ่มจาก \"บ้าน\""); if(!/โรงเรียน|ร\.ร\./.test(v)) m.push("ควรจบที่ \"โรงเรียน\""); return m; },
      (v) => { if(short(v, 15)) return ["ควรเปรียบเทียบเส้นทางและบอกเหตุผลให้ละเอียดกว่านี้"]; const m = []; if(!/\d/.test(v)) m.push("ควรบอกระยะทางหรือเวลาเป็นตัวเลข เช่น 2 กม. หรือ 15 นาที"); if(!/ทางที่|เส้นทาง.*เส้นทาง|หรือ|กับ|เทียบ|1.*2|ก.*ข/.test(v)) m.push("ควรเปรียบเทียบอย่างน้อย 2 เส้นทาง"); if(!/เพราะ|สั้น|น้อยกว่า|เร็ว|ใกล้|เนื่องจาก/.test(v)) m.push("ควรบอกเหตุผลว่าเส้นทางไหนสั้นที่สุด เพราะอะไร"); return m; }
    ] },
  5: { titles:["จำนวนต้นข้าวโพดแปลงที่ 1 ถึง 6", "รูปแบบที่สังเกตเห็น", "สูตรหาจำนวนต้นของแปลงที่ N", "จำนวนต้นของแปลงที่ 20"],
    f:[
      (v) => { const n = (String(v).match(/\d+/g) || []).map(Number), want = [3, 5, 7, 9, 11, 13]; let at = 0; n.forEach(x => { if(x === want[at]) at++; }); return at === 6 ? [] : [n.length < 6 ? "ต้องเขียนให้ครบ 6 แปลง" : "ตัวเลขยังไม่ตรงกับรูปแบบของโจทย์ ลองทบทวนว่าแต่ละแปลงเพิ่มกี่ต้น"]; },
      (v) => short(v, 5) ? [SHORTMSG] : (/2/.test(v) && /เพิ่ม|บวก|มากขึ้น|ทีละ/.test(v)) ? [] : ["ต้องบอกว่าแต่ละแปลงเพิ่มขึ้นกี่ต้น (ทีละเท่าไร)"],
      (v) => { if(short(v, 4)) return [SHORTMSG]; const f = formulaFn(v); let ok = false; if(f){ try{ ok = [1, 2, 3, 4].every((n, i) => Math.abs(f(n) - [3, 5, 7, 9][i]) < 1e-9); }catch(e){} }
        if(!ok) ok = (/2\s*[×*xX]?\s*N|N\s*[×*xX]\s*2|2.*คูณ|คูณ.*2/.test(v)) && /(\+|บวก)\s*1/.test(v);
        return ok ? [] : ["สูตรต้องให้ผลถูกต้องเมื่อ N = 1, 2, 3 (ต้องได้ 3, 5, 7) ลองแทนค่าตรวจดู"]; },
      (v, a) => { if(short(v, 2)) return [SHORTMSG]; const f = formulaFn(a[2]); let mine = null; if(f){ try{ mine = f(20); }catch(e){} } const nums = (String(v).match(/\d+/g) || []).map(Number);
        return (nums.includes(41) || (mine != null && nums.includes(mine))) ? [] : ["ผลที่ได้ยังไม่ตรงกับสูตร ลองแทน N = 20 ในสูตรของตนเองอีกครั้ง"]; }
    ] },
  6: { titles:["ข้อมูลนำเข้า (Input)", "ผลลัพธ์ที่ต้องการ (Output)", "เรียงลำดับ 6 ขั้นตอน", "รหัสลำลอง (Pseudocode)", "ผังงานและคำอธิบาย"],
    f:[
      (v) => short(v, 5) ? [SHORTMSG] : (/ข้าว/.test(v) && /น้ำ/.test(v)) ? [] : ["ข้อมูลนำเข้าควรมี ข้าวสาร และ น้ำ (และหม้อหุงข้าว)"],
      (v) => short(v, 5) ? [SHORTMSG] : /ข้าว.*(สุก|สวย|พอดี)|สุก/.test(v) ? [] : ["ผลลัพธ์ที่ต้องการคือ ข้าวสุก (พอดี)"],
      (v) => seq6(v, true),
      (v) => { v = noLink(v); if(short(v, 15)) return [SHORTMSG]; const m = []; if(!/เริ่ม|START/i.test(v)) m.push("ควรมี \"เริ่มต้น\""); if(!/จบ|END|STOP/i.test(v)) m.push("ควรมี \"จบ\""); const r = seq6(v, false); return m.concat(r); },
      (v) => { if(short(v, 15)) return ["ควรอธิบายผังงานให้ละเอียดกว่านี้"]; const m = []; if(hasFlowLink(v)) return /เริ่ม/.test(v) && /จบ/.test(v) ? [] : ["ผังงานต้องมี ⬭ \"เริ่มต้น\" และ ⬭ \"จบ\""]; if(!/เริ่ม/.test(v) || !/จบ/.test(v)) m.push("ควรบอกสัญลักษณ์ ⬭ \"เริ่มต้น\" และ \"จบ\""); if(!/สี่เหลี่ยม/.test(v)) m.push("ควรบอกว่าขั้นตอนการทำงานใช้สี่เหลี่ยม"); if(!/ลูกศร|→/.test(v)) m.push("ควรบอกว่าใช้ลูกศรเชื่อมลำดับ"); return m; }
    ] },
  7: { titles:["ข้อมูลนำเข้า (Input)", "ผลลัพธ์ที่ต้องการ (Output)", "เรียงลำดับ 4 ขั้นตอนและเหตุผล", "อัลกอริทึมพร้อมการทำซ้ำ"],
    f:[
      (v) => { if(short(v, 5)) return [SHORTMSG]; const k = [/ปลา/, /ขวด|โหล/, /น้ำ/, /อาหาร/, /สาหร่าย/].filter(re => re.test(v)).length; return k >= 3 ? [] : ["ข้อมูลนำเข้าควรครอบคลุม ปลากัด ขวดโหล น้ำ อาหาร สาหร่าย (อย่างน้อย 3 อย่าง)"]; },
      (v) => short(v, 5) ? [SHORTMSG] : /สุขภาพ|แข็งแรง|ดี|สบาย|อยู่รอด|โต|สวย/.test(v) ? [] : ["ผลลัพธ์ควรบอกว่าปลากัดเป็นอย่างไร เช่น มีสุขภาพดี"],
      (v) => { if(short(v, 10)) return [SHORTMSG]; const g = segsOf(v), m = [], P = firstAt(g, /นำปลา|ปล่อยปลา|ใส่ปลา|ปลา.*(ใส่|ลง)/), F = firstAt(g, /อาหาร/), W = firstAt(g, /เปลี่ยนน้ำ/), S = firstAt(g, /สาหร่าย/);
        if(P < 0 || F < 0 || W < 0 || S < 0) m.push("ต้องเรียงให้ครบทั้ง 4 ขั้นตอนตามที่โจทย์ให้");
        else if(!(P < F && P < W)) m.push("ต้องนำปลาใส่ขวดโหลก่อน จึงจะให้อาหารและเปลี่ยนน้ำได้");
        if(!/เพราะ|เนื่องจาก|เหตุผล|จึง|ดังนั้น/.test(v)) m.push("ต้องบอกเหตุผลที่เรียงตามลำดับนี้ (ใช้คำว่า \"เพราะ\")");
        return m; },
      (v) => { v = noLink(v); if(short(v, 15)) return [SHORTMSG]; const m = []; if(!/เริ่ม|START/i.test(v)) m.push("ควรมี \"เริ่มต้น\""); if(!/ทำซ้ำ|ทุกวัน|ทุก ๆ|วนซ้ำ|WHILE|REPEAT|FOR/i.test(v)) m.push("ต้องมีการทำซ้ำ เช่น \"ทำทุกวัน\" หรือ \"ทำซ้ำ\""); if(!/อาหาร/.test(v)) m.push("ควรมีขั้นตอนให้อาหาร"); if(!/เปลี่ยนน้ำ|สาหร่าย|ปลา/.test(v)) m.push("ควรมีขั้นตอนดูแลปลา เช่น เปลี่ยนน้ำ"); if(!/จบ|END|STOP/i.test(v)) m.push("ควรมี \"จบ\""); return m; }
    ] }
};
// ลำดับหุงข้าว: ตักข้าว < ซาว < (ตวงน้ำ) < ใส่น้ำ < กดปุ่ม < รอ ; strict=true ต้องครบ 6 ขั้นตอน
function seq6(v, strict){
  const g = segsOf(v), K = { scoop:/ตัก|ข้าวสาร.*(ใส่|ลง)/, wash:/ซาว/, measure:/ตวง/, pour:/ใส่น้ำ|เทน้ำ|น้ำ.*(ใส่|ลง)หม้อ/, press:/กด/, wait:/รอ/ };
  const at = {}; for(const k in K) at[k] = firstAt(g, K[k]);
  const have = Object.keys(at).filter(k => at[k] >= 0), m = [];
  if(strict ? have.length < 6 : have.length < 4) m.push(strict ? "ต้องเรียงให้ครบทั้ง 6 ขั้นตอนตามที่โจทย์ให้" : "ควรมีขั้นตอนหลัก อย่างน้อย 4 อย่าง เช่น ตักข้าวสาร ซาวข้าว ใส่น้ำ กดปุ่มหุง");
  const before = (a, b) => at[a] < 0 || at[b] < 0 || at[a] < at[b];
  const bad = [];
  if(!before("scoop", "wash")) bad.push("ต้องตักข้าวสารใส่หม้อก่อนซาวข้าว");
  if(!before("wash", "pour")) bad.push("ต้องซาวข้าวก่อนใส่น้ำ");
  if(!before("measure", "pour")) bad.push("ต้องตวงน้ำก่อนใส่น้ำลงหม้อ");
  if(!before("pour", "press")) bad.push("ต้องใส่น้ำก่อนกดปุ่มหุงข้าว");
  if(!before("press", "wait")) bad.push("ต้องกดปุ่มหุงข้าวก่อนรอข้าวสุก");
  return m.concat(bad);
}
function run1(n, vals){
  const rule = R1[n]; if(!rule) return null;
  const F = rule.f.map((fn, i) => { let msgs; try{ msgs = fn(vals[i] || "", vals); }catch(e){ msgs = ["ตรวจข้อนี้ไม่ได้ — ลองเขียนใหม่ให้ชัดเจนขึ้น"]; } return { ok:!msgs.length, title:rule.titles[i], msgs, note:"" }; });
  return { fields:F, score:F.filter(x => x.ok).length, max:F.length };
}

const blocksFromText = (txt) => { const p = linkParam(txt || "", "p"); if(!p) return null; try{ const d = b64d(p); return { d, bs:allBlocks(d) }; }catch(e){ return null; } };
window.WSCheck = { blocksFromText, util:{ has, count, hasStr }, run8, run, run1, rules:R, runCode, analyzeCode };
})();
