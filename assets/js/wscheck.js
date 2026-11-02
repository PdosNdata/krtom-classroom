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
  1: { manual:[0], titles:["ปัญหาที่เลือก", "สาระสำคัญของปัญหา", "รายละเอียดที่ตัดทิ้ง", "วิธีการแก้ปัญหา"],
    f:[
      (v) => short(v) ? [SHORTMSG] : [],
      (v) => short(v) ? [SHORTMSG] : itemsOf(v).length >= 2 ? [] : ["สาระสำคัญควรเขียนอย่างน้อย 2 อย่าง (คั่นด้วย , หรือขึ้นบรรทัดใหม่)"],
      (v, a) => { if(short(v, 4)) return [SHORTMSG]; const s = itemsOf(a[1]), d = itemsOf(v); return d.length && d.every(x => s.includes(x)) ? ["สิ่งที่ตัดทิ้งไม่ควรซ้ำกับสาระสำคัญในข้อ 2"] : []; },
      (v, a) => { if(short(v, 8)) return ["วิธีแก้ปัญหาควรเขียนให้ชัดเจนกว่านี้"]; const s = itemsOf(a[1]); return (s.some(x => v.includes(x)) || /สาระสำคัญ|รูปแบบ|ตัดทิ้ง|นามธรรม|แผนภาพ|แบบจำลอง|ตั้ง|ปรับ|เลิก|ลด|เพิ่ม|หยุด|นอน|ตื่น|เตรียม|แก้|ทำ|ควร|งด|จด|วางแผน|ฝึก|เลือก|แยก|ใช้/.test(v)) ? [] : ["วิธีแก้ปัญหาควรบอกสิ่งที่จะลงมือทำ เช่น ปรับ ลด เพิ่ม หรือเลือกวิธีให้ตรงกับสาระสำคัญในข้อ 2"]; }
    ] },
  2: { manual:[0], titles:["ปัญหาที่เลือก", "อัลกอริทึมแบบภาษาธรรมชาติ", "รหัสลำลอง (Pseudo Code)", "ผังงาน (Flowchart)"],
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
// ───── ใบงาน 1.10–1.14 (แบบฝึกหัด/กิจกรรมประกอบหนังสือเรียน) ─────
const hitN = (v, res) => res.filter(r => r.test(String(v || ""))).length;
const kwRule = (res, k, msg, minLen) => (v) => short(v, minLen || 12) ? [SHORTMSG] : hitN(v, res) >= k ? [] : [msg];
const hasNo = (v, k) => new RegExp("(^|[^0-9.])" + k + "([^0-9]|$)").test(String(v || ""));
const nlLines = (v) => String(v || "").split(/\n+/).map(x => x.replace(/^\s*\d+[.)]\s*/, "").trim()).filter(Boolean);
const algoNL = (extra) => (v) => {
  if(short(v, 20)) return [SHORTMSG];
  const m = [], L = nlLines(v);
  if(L.length < 5) m.push("ควรมีอย่างน้อย 5 ขั้นตอน (ขึ้นบรรทัดใหม่ทุกขั้นตอน)");
  if(!/เริ่ม/.test(v)) m.push("ควรมีขั้นตอน “เริ่มต้น”");
  if(!/จบ|สิ้นสุด/.test(v)) m.push("ควรมีขั้นตอน “จบการทำงาน”");
  if(!/นำเข้า|รับ|input/i.test(v)) m.push("ควรมีขั้นตอนนำเข้าข้อมูล");
  if(!/คำนวณ|=/.test(v)) m.push("ควรมีขั้นตอนคำนวณ");
  if(!/แสดง|output|พิมพ์/i.test(v)) m.push("ควรมีขั้นตอนแสดงผล");
  if(extra && !extra.re.test(v)) m.push(extra.msg);
  return m;
};
const pseudoBasic = (extra) => (v) => {
  v = noLink(v); if(short(v, 15)) return [SHORTMSG];
  const m = [];
  if(!/INPUT|READ/i.test(v)) m.push("ควรมีคำสั่ง INPUT");
  if(!/COMPUTE|=/i.test(v)) m.push("ควรมีคำสั่งคำนวณ (COMPUTE หรือ =)");
  if(!/OUTPUT|PRINT|DISPLAY/i.test(v)) m.push("ควรมีคำสั่ง OUTPUT");
  if(extra && !extra.re.test(v)) m.push(extra.msg);
  return m;
};
const flowOrText = (re, msg) => (v) => {
  if(hasFlowLink(v)) return /เริ่ม/.test(v) && /จบ/.test(v) ? [] : ["ผังงานต้องมี ⬭ “เริ่มต้น” และ ⬭ “จบ”"];
  if(short(v, 15)) return [SHORTMSG];
  return re.test(v) ? [] : [msg];
};
const have = (res, k) => (v) => hitN(v, res) >= k;
R1[10] = { titles:["นิยามแนวคิดเชิงนามธรรม", "ประโยชน์", "พื้นที่ห้องรูปตัวแอล", "คัดสาระสำคัญ/ตัดรายละเอียด", "จักรยานเป็นสนิม", "อัลกอริทึมกับคอมพิวเตอร์", "รูปแบบ 3 แบบ", "เลือกเส้นทางที่เร็วกว่า"], f:[
  kwRule([/สำคัญ/, /รายละเอียด/, /ตัด|ละ|ไม่จำเป็น|ปลีกย่อย/, /คัด|แยก/, /ปัญหา/], 2, "ควรกล่าวถึงการคัดสาระสำคัญและตัดรายละเอียดที่ไม่จำเป็น", 15),
  kwRule([/ง่าย/, /เข้าใจ/, /เร็ว/, /ประหยัด/, /ชัด/, /ตรงจุด/, /ลด/], 1, "ควรบอกประโยชน์ เช่น ทำให้ปัญหาง่ายขึ้น เข้าใจชัดเจนขึ้น", 12),
  (v) => short(v, 5) ? [SHORTMSG] : hasNo(v, 23) ? [] : ["พื้นที่ห้องคือ (5×3) + (4×2) = 23 ตารางเมตร"],
  kwRule([/แบ่ง|แยก|ส่วน|สี่เหลี่ยม/, /บวก|รวม/, /ตัด|ไม่ใช้|ไม่ต้อง|ไม่สนใจ/], 2, "ควรบอกว่าแบ่งเป็นรูปสี่เหลี่ยม คำนวณแต่ละส่วนแล้วรวมกัน และตัดรายละเอียดที่ไม่จำเป็น", 15),
  (v) => short(v, 15) ? [SHORTMSG] : (hitN(v, [/น้ำ|ความชื้น|ฝน|อากาศ|ออกซิเจน/]) && hitN(v, [/เช็ด|ทา|น้ำมัน|เก็บ|แห้ง|คลุม|ร่ม|หล่อลื่น/])) ? [] : ["ควรตอบทั้งสาเหตุ (เช่น น้ำ/ความชื้น/อากาศ) และวิธีป้องกัน (เช่น เช็ดให้แห้ง ทาน้ำมัน)"],
  kwRule([/ขั้นตอน/, /ลำดับ/, /คำสั่ง/, /แก้ปัญหา/, /ประมวลผล/], 1, "ควรกล่าวถึงขั้นตอนหรือคำสั่งที่ใช้แก้ปัญหา", 15),
  (v) => short(v, 10) ? [SHORTMSG] : (/ธรรมชาติ/.test(v) && /รหัส(ลำลอง|จำลอง)/.test(v) && /ผังงาน/.test(v)) ? [] : ["ต้องมี 3 รูปแบบ: ภาษาธรรมชาติ รหัสลำลอง และผังงาน"],
  (v) => short(v, 12) ? [SHORTMSG] : (/ก/.test(v) && (hasNo(v, 10) || /10\s*นาที/.test(v))) ? [] : ["ทาง ก ใช้เวลา 8 + 2 = 10 นาที ทาง ข ใช้ 10 + 0.5 = 10.5 นาที จึงเลือกทาง ก"]
] };
R1[11] = { titles:["ภาษาธรรมชาติ", "ภาษาคอมพิวเตอร์", "5 ยุคของภาษา", "ความสัมพันธ์ของภาษา", "อัลกอริทึมเงินทอน", "อัลกอริทึมสี่เหลี่ยมคางหมู", "อัลกอริทึมค่าเฉลี่ย"], f:[
  (v) => short(v, 15) ? [SHORTMSG] : hitN(v, [/ไทย/, /อังกฤษ/, /จีน/, /ญี่ปุ่น/, /เกาหลี/, /ลาว/, /มลายู|มาเลย์/, /ฝรั่งเศส/, /เยอรมัน/, /เขมร|กัมพูชา/, /พม่า|เมียนมา/, /สเปน/, /อินโด/]) >= 3 ? [] : ["ควรยกตัวอย่างภาษาธรรมชาติให้ครบ 3 ภาษา เช่น ไทย อังกฤษ จีน"],
  kwRule([/ชุดคำสั่ง/, /สั่งงาน/, /โปรแกรม/, /คำสั่ง/, /คอมพิวเตอร์/], 2, "ควรกล่าวถึงภาษาที่ใช้เขียนชุดคำสั่งเพื่อสั่งงานคอมพิวเตอร์", 15),
  (v) => short(v, 20) ? [SHORTMSG] : hitN(v, [/ภาษาเครื่อง/, /แอสเซมบลี|แอสเซมเบลอร์/, /ชั้นสูง/, /ขั้นสูงมาก|สูงมาก/, /ภาษาธรรมชาติ|ธรรมชาติ/]) >= 4 ? [] : ["ควรเขียนให้ครบ 5 ยุค: ภาษาเครื่อง ภาษาแอสเซมบลี ภาษาชั้นสูง ภาษาขั้นสูงมาก ภาษาธรรมชาติ"],
  kwRule([/แปล/, /เข้าใจ/, /สั่งงาน/, /สื่อสาร/, /ใกล้เคียง/, /ง่าย/], 1, "ควรอธิบายว่าคอมพิวเตอร์ต้องใช้ภาษาคอมพิวเตอร์ ส่วนมนุษย์ใช้ภาษาธรรมชาติ และพัฒนาให้ใกล้ภาษามนุษย์ขึ้น", 15),
  algoNL(),
  algoNL({ re: /บวก|\+|ผลรวม/, msg: "ควรมีขั้นตอนบวกด้านคู่ขนานทั้งสองด้าน" }),
  algoNL({ re: /หาร|\/|÷|3/, msg: "ควรมีขั้นตอนนำผลรวมไปหารด้วย 3" })
] };
R1[12] = { titles:["รหัสลำลองคืออะไร", "ประโยชน์ของรหัสลำลอง", "หลักเกณฑ์การเขียน", "รหัสลำลองสี่เหลี่ยมคางหมู", "รหัสลำลอง IF-ELSE", "เรียงบรรทัดรหัสลำลอง"], f:[
  kwRule([/ขั้นตอน/, /จำลอง/, /สั้น|กระชับ/, /ภาษาอังกฤษ/, /ไม่ขึ้นกับ|ไม่ใช่ภาษา/, /โปรแกรม/], 1, "ควรอธิบายว่าเป็นการเขียนขั้นตอนอย่างสั้น ๆ ไม่ขึ้นกับภาษาโปรแกรมใด", 12),
  (v) => short(v, 15) ? [SHORTMSG] : (itemsOf(v).length >= 2 || hitN(v, [/ทบทวน/, /ปรับปรุง|แก้ไข/, /วางโครง|โครงร่าง/, /ต้นแบบ/, /พัฒนา/, /อ่านง่าย|เข้าใจง่าย/]) >= 2) ? [] : ["ควรเขียนประโยชน์อย่างน้อย 2 ข้อ (คั่นด้วย , หรือขึ้นบรรทัดใหม่)"],
  (v) => short(v, 20) ? [SHORTMSG] : itemsOf(v).length >= 3 ? [] : ["ควรเขียนหลักเกณฑ์อย่างน้อย 3 ข้อ (คั่นด้วย , หรือขึ้นบรรทัดใหม่)"],
  pseudoBasic({ re: /\+|\(.*\)|\*|\//, msg: "ควรมีสูตรคำนวณ เช่น area = 1/2 * (a + b) * h" }),
  (v) => { v = noLink(v); if(short(v, 15)) return [SHORTMSG]; const m = []; if(!/IF/i.test(v)) m.push("ควรมีคำสั่ง IF"); if(!/ELSE/i.test(v)) m.push("ควรมีคำสั่ง ELSE"); if(!/>=|≥|>|18/.test(v)) m.push("ควรมีเงื่อนไขเปรียบเทียบอายุกับ 18"); if((v.match(/OUTPUT|PRINT|DISPLAY/ig) || []).length < 2) m.push("ควรมี OUTPUT ทั้งกรณีผู้ใหญ่และเด็ก"); return m; },
  (v) => { v = noLink(v); if(short(v, 20)) return [SHORTMSG]; const m = [], at = (re) => v.search(re);
    const a = at(/START/i), i1 = at(/INPUT\s*price1/i), i2 = at(/INPUT\s*price2/i), c = at(/COMPUTE/i), o = at(/OUTPUT/i), z = at(/STOP/i);
    if([a, i1, i2, c, o, z].some(x => x < 0)) return ["ควรพิมพ์ให้ครบทั้ง 6 บรรทัด"];
    if(!(a < i1 && a < i2)) m.push("START ต้องมาก่อน"); if(!(i1 < c && i2 < c)) m.push("ต้อง INPUT ราคาทั้งสองก่อน COMPUTE"); if(!(c < o)) m.push("ต้อง COMPUTE ก่อน OUTPUT"); if(!(o < z)) m.push("STOP ต้องอยู่ท้ายสุด"); return m; }
] };
R1[13] = { titles:["ผังงานคืออะไร/ประโยชน์", "สัญลักษณ์ผังงาน", "ผังงานเรียงลำดับ", "ผังงานเลือกกระทำ", "ผังงานทำซ้ำ"], f:[
  (v) => short(v, 20) ? [SHORTMSG] : (hitN(v, [/สัญลักษณ์|ภาพ|ลูกศร|แผนภาพ|ลำดับ/]) && hitN(v, [/เข้าใจ|ง่าย|ข้อผิดพลาด|ชัดเจน|ลำดับ/])) ? [] : ["ควรบอกว่าผังงานคือภาพสัญลักษณ์แสดงลำดับขั้นตอน และบอกประโยชน์ เช่น เข้าใจง่าย เห็นลำดับชัดเจน"],
  (v) => short(v, 20) ? [SHORTMSG] : hitN(v, [/วงรี|เริ่มต้น|สิ้นสุด/, /สี่เหลี่ยมผืนผ้า|ประมวลผล/, /สี่เหลี่ยมด้านขนาน|รับข้อมูล|แสดงผล/, /ข้าวหลามตัด|ขนมเปียกปูน|เงื่อนไข|ตัดสินใจ/, /ลูกศร/]) >= 3 ? [] : ["ควรบอกสัญลักษณ์ให้ครบ 3 อย่างพร้อมหน้าที่ เช่น วงรี = เริ่มต้น/จบ, สี่เหลี่ยมผืนผ้า = ประมวลผล"],
  flowOrText(/เริ่ม/, "ควรมีผังงานที่เริ่มด้วย “เริ่มต้น” และจบด้วย “จบ”"),
  flowOrText(/ถ้า|ใช่|ไม่ใช่|IF|ครบ|เงื่อนไข/, "ผังงานเลือกกระทำต้องมีการตัดสินใจ (◇) ที่มีทางใช่/ไม่ใช่"),
  flowOrText(/ซ้ำ|กลับไป|วน|ย้อน|เพิ่ม/, "ผังงานทำซ้ำต้องมีลูกศรย้อนกลับ")
] };
R1[14] = { titles:["อัลกอริทึมภาษาธรรมชาติ", "อัลกอริทึมรหัสลำลอง", "อัลกอริทึมผังงาน", "เปรียบเทียบ 3 รูปแบบ"], f:[
  algoNL({ re: /ทอน|30|-|ลบ/, msg: "ควรมีขั้นตอนคำนวณเงินทอน (เงินที่จ่าย − 30)" }),
  pseudoBasic({ re: /30/, msg: "ควรใช้ราคา 30 บาทในการคำนวณเงินทอน" }),
  flowOrText(/เริ่ม/, "ควรมีผังงานที่เริ่มด้วย “เริ่มต้น” และจบด้วย “จบ”"),
  kwRule([/เพราะ/, /ง่าย/, /เห็น/, /ชัด/, /ลำดับ/, /ภาพ/], 2, "ควรบอกรูปแบบที่เลือกพร้อมเหตุผลว่าเพราะอะไร", 20)
] };

// ───── ใบงานหน่วย 2 (แบบฝึกหัด/กิจกรรมประกอบหนังสือเรียน) เรียกด้วย run1("u2-N", ...) ─────
const pyHas = (v, res, msgs) => { v = noLink(v); const m = []; res.forEach((re, i) => { if(!re.test(v)) m.push(msgs[i]); }); return m; };
R1["u2-9"] = { titles:["การเขียนโปรแกรมคืออะไร", "หลักการ 4 ขั้นตอน", "วัตถุประสงค์", "ข้อมูลนำเข้า", "ข้อมูลนำออก", "วิธีประมวลผล", "คำนวณราคา 500 บาท"], f:[
  kwRule([/ชุดคำสั่ง/, /ภาษา/, /สั่ง/, /คอมพิวเตอร์/, /ทำงาน/], 2, "ควรอธิบายว่าเป็นการเขียนชุดคำสั่งเพื่อสั่งให้คอมพิวเตอร์ทำงาน", 15),
  (v) => short(v, 15) ? [SHORTMSG] : hitN(v, [/วิเคราะห์|กำหนด/, /ออกแบบ/, /เขียน/, /ทดสอบ/]) >= 4 ? [] : ["ควรเขียนให้ครบ 4 ขั้นตอน: กำหนด/วิเคราะห์ปัญหา ออกแบบ เขียนโปรแกรม ทดสอบ"],
  kwRule([/คำนวณ/, /ราคา/, /ลด/, /จ่าย/], 2, "ควรบอกว่าโปรแกรมใช้คำนวณราคาหลังลด 10%", 8),
  (v) => short(v, 8) ? [SHORTMSG] : (/ราคา|price|ป้าย/i.test(v) && /ตัวแปร|[a-z]{3,}/i.test(v)) ? [] : ["ควรบอกว่านำเข้าราคาป้าย และตั้งชื่อตัวแปร เช่น price"],
  (v) => short(v, 8) ? [SHORTMSG] : (/จ่าย|สุทธิ|pay|total|net|ผลลัพธ์/i.test(v) && /ตัวแปร|[a-z]{3,}/i.test(v)) ? [] : ["ควรบอกว่าแสดงราคาที่ต้องจ่าย และตั้งชื่อตัวแปร เช่น pay"],
  (v) => short(v, 6) ? [SHORTMSG] : (/=/.test(v) && /0\.9|0\.1|90|10/.test(v)) ? [] : ["ควรเขียนสมการ เช่น pay = price - price * 0.1 หรือ pay = price * 0.9"],
  (v) => short(v, 3) ? [SHORTMSG] : hasNo(v, 450) ? [] : ["ลด 10% ของ 500 คือ 50 ต้องจ่าย 450 บาท และสมเหตุสมผลเพราะน้อยกว่าราคาป้าย"]
] };
R1["u2-11"] = { titles:["วิเคราะห์ปัญหาค่าโทร", "รหัสลำลอง", "โปรแกรมไพทอน", "ไล่ผล 20 นาที", "ไพทอน if", "ไพทอน while"], f:[
  (v) => short(v, 15) ? [SHORTMSG] : (/นาที|minute/i.test(v) && /ค่าโทร|cost|bill|จ่าย|บาท/i.test(v) && /3/.test(v)) ? [] : ["ควรบอกข้อมูลนำเข้า (จำนวนนาที) ข้อมูลนำออก (ค่าโทร) และสมการที่คูณ 3"],
  pseudoBasic({ re: /3/, msg: "ควรใช้ 3 บาทต่อนาทีในการคำนวณ" }),
  (v) => { const m = pyHas(v, [/input\s*\(/, /print\s*\(/, /\*\s*3|3\s*\*/], ["ควรมี input() รับจำนวนนาที", "ควรมี print() แสดงค่าโทร", "ควรคำนวณด้วยการคูณ 3"]); return short(v, 15) ? [SHORTMSG] : m; },
  (v) => short(v, 2) ? [SHORTMSG] : hasNo(v, 60) ? [] : ["20 นาที × 3 บาท = 60 บาท"],
  (v) => { const m = pyHas(v, [/if\s/i, /else\s*:/i, />=\s*2|>\s*=\s*2|2\s*<=/, /50/, /30/, /print\s*\(/], ["ควรมี if", "ควรมี else:", "เงื่อนไขควรเปรียบเทียบน้ำหนักกับ 2 (>= 2)", "ควรแสดงค่าส่ง 50 บาท", "ควรแสดงค่าส่ง 30 บาท", "ควรมี print()"]); return short(v, 20) ? [SHORTMSG] : m; },
  (v) => { const m = pyHas(v, [/while\s/i, /print\s*\(/, /<=\s*5|<\s*6/, /\+\s*1|\+=\s*1/], ["ควรมี while", "ควรมี print()", "ต้องกำหนดเงื่อนไขให้หยุดที่ 5 (<= 5)", "ต้องเพิ่มค่าตัวนับทีละ 1"]); return short(v, 20) ? [SHORTMSG] : m; }
] };
R1["u2-12"] = { titles:["ตั้งชื่อตัวแปร", "คำสั่งรับค่า", "คำสั่งประมวลผล", "คำสั่งแสดงผล"], f:[
  (v) => short(v, 8) ? [SHORTMSG] : (new Set((v.match(/[A-Za-z_][A-Za-z_0-9]{2,}/g) || []).map(x => x.toLowerCase())).size >= 2 ? [] : ["ควรตั้งชื่อตัวแปรภาษาอังกฤษอย่างน้อย 2 ตัว เช่น bottles, total"]),
  (v) => { v = noLink(v); return short(v, 8) ? [SHORTMSG] : (/input\s*\(/.test(v) && /int\s*\(|float\s*\(/.test(v)) ? [] : ["ควรใช้ input() ร่วมกับ int() เพื่อรับจำนวนขวดเป็นเลขจำนวนเต็ม"]; },
  (v) => short(v, 6) ? [SHORTMSG] : (/=/.test(v) && /\*\s*8|8\s*\*/.test(v)) ? [] : ["ควรคำนวณ เช่น total = bottles * 8"],
  (v) => short(v, 6) ? [SHORTMSG] : /print\s*\(/.test(v) ? [] : ["ควรใช้ print() แสดงราคารวม"]
] };

// ───── ใบงานหน่วย 3 (การจัดการข้อมูลและสารสนเทศ) เรียกด้วย run1("u3-N", ...) ─────
const methodWhy = (methodRes, mmsg) => (v) => { if(short(v, 15)) return [SHORTMSG]; const m = []; if(!methodRes.some(r => r.test(v))) m.push(mmsg); if(!/เพราะ|เนื่องจาก|เหตุผล|ดังนั้น|เพื่อ/.test(v)) m.push("ควรบอกเหตุผลด้วย (ขึ้นต้นด้วย “เพราะ...”)"); return m; };
const SWNAME = /windows|วินโดวส์|วินโดว์|android|แอนดรอยด์|แอนดรอย|linux|ลินุกซ์|ลีนุกซ์|macos|mac os|แมค|ios|ไอโอเอส|ubuntu|อูบุนตู|chrome ?os/ig;
const swNames = (v) => new Set((String(v || "").match(SWNAME) || []).map(x => x.toLowerCase())).size;
R1["u3-2"] = { titles:["ข้อมูลคืออะไร", "ปฐมภูมิ-ทุติยภูมิ", "นับรถหน้าโรงเรียน", "จำนวนนักเรียนทั้งประเทศ", "ความรู้สึกนักวิ่ง", "คุณภาพน้ำในบ่อ", "ผลงานวิจัยการนอน"], f:[
  kwRule([/ข้อเท็จจริง/, /เหตุการณ์/, /ตัวเลข/, /ข้อความ/, /ภาพ/, /เสียง/], 3, "ควรบอกว่าข้อมูลคือข้อเท็จจริงหรือเหตุการณ์ และยกตัวอย่างตัวเลข ข้อความ ภาพ หรือเสียง", 15),
  (v) => short(v, 20) ? [SHORTMSG] : (/โดยตรง|เอง|แหล่งแรก|ต้นทาง|ลงมือ/.test(v) && /รวบรวมไว้|ผู้อื่น|คนอื่น|มีอยู่แล้ว|ที่มีผู้|อ้างอิง|แล้ว/.test(v)) ? [] : ["ควรบอกว่าปฐมภูมิเก็บเองจากแหล่งโดยตรง ส่วนทุติยภูมิมีผู้อื่นรวบรวมไว้แล้ว"],
  methodWhy([/สังเกต|นับ|ตรวจนับ|จด/], "วิธีที่เหมาะสมคือการสังเกตการณ์ (ยืนนับรถ)"),
  methodWhy([/ขอข้อมูล|หน่วยงาน|กระทรวง|สืบค้น|เว็บไซต์|ค้น|สถิติ|ทุติยภูมิ|ราชการ/], "ควรขอข้อมูลจากหน่วยงาน หรือสืบค้นข้อมูลที่มีผู้รวบรวมไว้แล้ว (ข้อมูลทุติยภูมิ)"),
  methodWhy([/สัมภาษณ์/], "วิธีที่เหมาะสมคือการสัมภาษณ์ เพราะต้องการข้อมูลเชิงลึก"),
  methodWhy([/ทดลอง|ตรวจวัด|วัดค่า|เก็บตัวอย่าง|ตรวจน้ำ|ทดสอบ/], "วิธีที่เหมาะสมคือการทดลองหรือการตรวจวัดตัวอย่างน้ำ"),
  methodWhy([/สืบค้น|เว็บไซต์|ค้นหา|ห้องสมุด|อินเทอร์เน็ต|ออนไลน์|ฐานข้อมูล|วารสาร/], "วิธีที่เหมาะสมคือการสืบค้นจากเว็บไซต์หรือห้องสมุด")
] };
R1["u3-3"] = { titles:["สารสนเทศคืออะไร", "ด้านการศึกษา", "ด้านสังคม", "ด้านเศรษฐกิจ", "ด้านวัฒนธรรม", "ลักษณะสารสนเทศที่ดี"], f:[
  kwRule([/ประมวลผล|ผ่านการ/, /วิเคราะห์|คำนวณ|แปลความ|สรุป/, /ประโยชน์|ตัดสินใจ|นำไปใช้/], 2, "ควรบอกว่าสารสนเทศคือข้อมูลที่ผ่านการประมวลผลแล้วและนำไปใช้ประโยชน์ได้", 15),
  kwRule([/เรียน|ศึกษา|ความรู้|ค้นคว้า|ครู|นักเรียน|การศึกษา|หนังสือ/], 1, "ควรอธิบายประโยชน์ต่อการเรียนรู้หรือการศึกษา", 15),
  kwRule([/สังคม|ข่าว|สื่อสาร|ติดต่อ|ชุมชน|อยู่ร่วม|เพื่อน|ความสัมพันธ์|แจ้งเตือน/], 1, "ควรอธิบายประโยชน์ต่อสังคม เช่น การรับรู้ข่าวสารหรือการติดต่อสื่อสาร", 15),
  kwRule([/เศรษฐกิจ|ธุรกิจ|ขาย|ซื้อ|เงิน|การค้า|รายได้|ตลาด|ลูกค้า|องค์กร|ต้นทุน/], 1, "ควรอธิบายประโยชน์ต่อเศรษฐกิจ เช่น การวางแผนธุรกิจหรือการซื้อขาย", 15),
  kwRule([/วัฒนธรรม|ประเพณี|ศิลป|สืบทอด|ภาษา|ค่านิยม|ชาติ|ภูมิปัญญา|ดนตรี|ไทย/], 1, "ควรอธิบายประโยชน์ต่อวัฒนธรรม เช่น การสืบทอดภูมิปัญญาหรือประเพณี", 15),
  (v) => short(v, 30) ? [SHORTMSG] : hitN(v, [/ถูกต้อง|แม่นยำ/, /ทันเวลา|ทันสมัย|ปัจจุบัน|ทันต่อ/, /สมบูรณ์|ครบ/, /สอดคล้อง|ตรงกับ|ความต้องการ/, /พิสูจน์|ตรวจสอบ|ที่มา|อ้างอิง/]) >= 4 ? [] : ["ควรเขียนให้ครบ 5 ข้อ: ถูกต้องแม่นยำ ทันเวลา สมบูรณ์ครบถ้วน สอดคล้องกับความต้องการ พิสูจน์ได้"]
] };
R1["u3-5"] = { titles:["รวบรวมข้อมูล", "ตรวจสอบข้อมูล", "เตรียมข้อมูล", "วิธีประมวลผล", "คำนวณ BMI", "เก็บรักษาข้อมูล", "แสดงผล"], f:[
  (v) => short(v, 15) ? [SHORTMSG] : (/น้ำหนัก|ส่วนสูง|เพศ|ชื่อ/.test(v) && /สัมภาษณ์|ชั่ง|วัด|สอบถาม|จด|บันทึก|แบบสอบถาม|สำรวจ/.test(v)) ? [] : ["ควรบอกว่าจะเก็บข้อมูลอะไร (เช่น ชื่อ เพศ น้ำหนัก ส่วนสูง) และวิธีเก็บ (เช่น ชั่ง วัด สัมภาษณ์)"],
  kwRule([/ครบ|ครอบคลุม|ครบถ้วน/, /ถูกต้อง|สมเหตุสมผล|ผิด|ตรวจ/], 1, "ควรบอกว่าตรวจความครบถ้วนและความถูกต้องของข้อมูล", 15),
  (v) => short(v, 15) ? [SHORTMSG] : (/excel|เอ็กเซล|ตารางคำนวณ|สเปรดชีต|sheets|calc|โปรแกรม|คอมพิวเตอร์/i.test(v) && /กิโลกรัม|กก|เมตร|หน่วย/.test(v)) ? [] : ["ควรบอกโปรแกรมที่ใช้ (เช่น Excel) และหน่วยที่ใช้ (กิโลกรัม เมตร)"],
  (v) => short(v, 25) ? [SHORTMSG] : hitN(v, [/จัดกลุ่ม|จำแนก|แยก/, /เรียง/, /คำนวณ/, /ค้นคืน|ค้นหา|เรียกดู|เรียกใช้/, /สรุป|แปลผล/]) >= 3 ? [] : ["ควรยกตัวอย่างอย่างน้อย 3 วิธี เช่น จัดกลุ่ม เรียงลำดับ คำนวณ ค้นคืน สรุป"],
  (v) => short(v, 6) ? [SHORTMSG] : (/19\.5|19\.53|19,5/.test(v) && /สมส่วน|เหมาะสม|ปกติ|สมดุล|เกณฑ์/.test(v)) ? [] : ["50 ÷ (1.60 × 1.60) ≈ 19.5 อยู่ในเกณฑ์สมส่วน (18.5–22.9) ควรเขียนทั้งค่าและเกณฑ์"],
  (v) => short(v, 20) ? [SHORTMSG] : hitN(v, [/จัดเก็บ|เก็บ|บันทึก|ไฟล์/, /สำเนา|สำรอง|ก๊อป|คัดลอก|แฟลช|ดิสก์|คลาวด์/, /ปรับปรุง|อัปเดต|แก้ไข|ทันสมัย/]) >= 2 ? [] : ["ควรบอกการจัดเก็บ การทำสำเนา และการปรับปรุงข้อมูลอย่างน้อย 2 อย่าง"],
  kwRule([/กราฟ|แผนภูมิ|ตาราง|รายงาน|แผนภาพ/], 1, "ควรบอกรูปแบบนำเสนอ เช่น กราฟแท่ง ตาราง หรือรายงาน", 15)
] };
R1["u3-6"] = { titles:["กิจกรรมที่ใช้ประมวลผลข้อมูล", "เชื่อมตรง", "แบบกลุ่ม", "ร้านค้าออนไลน์"], f:[
  (v) => short(v, 20) ? [SHORTMSG] : (nlLines(v).length >= 2 || /(^|\s)(1|2|๑|๒)\s*[).]|กิจกรรมที่ ?[12]/.test(v)) ? [] : ["ควรเขียนให้ครบ 2 กิจกรรม ขึ้นบรรทัดใหม่ทีละกิจกรรม"],
  kwRule([/ทันที/, /แต่ละรายการ|ทีละ|ทุกครั้ง|ทันสมัย|ปัจจุบัน|ออนไลน์/, /ATM|เอทีเอ็ม|จอง|ซื้อ|ธนาคาร|ตู้|ร้านสะดวกซื้อ|ฝาก|ถอน/i], 2, "ควรบอกว่าประมวลผลทันทีที่ข้อมูลเข้า พร้อมตัวอย่าง เช่น ตู้ ATM การจองตั๋ว", 20),
  kwRule([/ช่วงเวลา|รวบรวม|สะสม|พร้อมกัน|รอบ|เดือน|ชุด|ทีเดียว|ครั้งเดียว/, /สลิป|ใบแจ้ง|ค่าน้ำ|ค่าไฟ|ค่าไฟฟ้า|สำรวจ|ตรวจข้อสอบ|เงินเดือน|รายงาน|ประจำ/], 2, "ควรบอกว่าเก็บสะสมช่วงหนึ่งแล้วประมวลผลพร้อมกัน พร้อมตัวอย่าง เช่น ค่าน้ำค่าไฟประจำเดือน", 20),
  (v) => short(v, 25) ? [SHORTMSG] : hitN(v, [/เชื่อมตรง|ออนไลน์/, /กลุ่ม/, /ทันที|ปัจจุบัน|คงเหลือ|สต็อก/, /สรุป|เดือน|รวบรวม|พร้อมกัน/]) >= 3 ? [] : ["ควรบอกว่ายืนยันสินค้าคงเหลือเป็นแบบเชื่อมตรง และสรุปยอดทั้งเดือนเป็นแบบกลุ่ม พร้อมเหตุผล"]
] };
R1["u3-7"] = { titles:["ซอฟต์แวร์คืออะไร", "ระบบกับประยุกต์", "ตัวอย่างซอฟต์แวร์ระบบ", "ซอฟต์แวร์ระบบที่เลือก", "โอเพนซอร์ส", "ซอฟต์แวร์ประยุกต์ที่ใช้บ่อย", "ชุดโปรแกรมสำนักงาน", "โปรแกรมสร้างกราฟ"], f:[
  kwRule([/ชุดคำสั่ง|โปรแกรม/, /สั่ง|ควบคุม|ทำงาน|ใช้งาน/], 2, "ควรบอกว่าซอฟต์แวร์คือชุดคำสั่งหรือโปรแกรมที่สั่งให้คอมพิวเตอร์ทำงาน", 12),
  (v) => short(v, 25) ? [SHORTMSG] : hitN(v, [/ซอฟต์แวร์ระบบ|ระบบ/, /ซอฟต์แวร์ประยุกต์|ประยุกต์/, /บริหาร|จัดการ|ควบคุม|พื้นฐาน|ทรัพยากร|ระบบปฏิบัติการ/, /เฉพาะ|ผู้ใช้|งานด้าน|ตามความต้องการ|พิมพ์|กราฟ/]) >= 3 ? [] : ["ควรบอกหน้าที่ของซอฟต์แวร์ระบบ (จัดการระบบ/เครื่อง) และซอฟต์แวร์ประยุกต์ (ใช้ทำงานเฉพาะด้าน)"],
  (v) => short(v, 5) ? [SHORTMSG] : swNames(v) >= 2 ? [] : ["ควรตอบชื่อซอฟต์แวร์ระบบอย่างน้อย 2 ชื่อ เช่น Windows, Android, Linux"],
  (v) => short(v, 12) ? [SHORTMSG] : (swNames(v) >= 1 && /เพราะ|เนื่องจาก|เหตุผล/.test(v)) ? [] : ["ควรตอบชื่อซอฟต์แวร์ระบบและเหตุผล (เพราะ...)"],
  (v) => { if(short(v, 20)) return [SHORTMSG]; const m = []; if(!/ฟรี|ไม่เสียค่า|แก้ไข|ซอร์สโค้ด|ซอร์ส|เปิดเผย|ต้นฉบับ|source|ดัดแปลง/i.test(v)) m.push("ควรอธิบายลักษณะ เช่น เปิดเผยซอร์สโค้ด ใช้ฟรี แก้ไขได้"); if(!/linux|ลินุกซ์|firefox|ไฟร์ฟอกซ์|libreoffice|openoffice|vlc|gimp|python|ไพทอน|blender|inkscape|audacity|android|แอนดรอยด์|wordpress|chromium|apache/i.test(v)) m.push("ควรยกตัวอย่างโปรแกรมโอเพนซอร์ส เช่น Firefox, VLC, LibreOffice"); return m; },
  (v) => short(v, 25) ? [SHORTMSG] : (/ใช้|สำหรับ|ทำ|เพื่อ|ค้น|พิมพ์|ดู|สร้าง/.test(v) && (nlLines(v).length >= 2 || /(^|\s)(1|2|๑|๒)\s*[).]|อันดับ/.test(v))) ? [] : ["ควรตอบ 2 อันดับ ขึ้นบรรทัดใหม่ พร้อมบอกลักษณะการใช้งานของแต่ละอัน"],
  (v) => short(v, 30) ? [SHORTMSG] : hitN(v, [/เหมือน|คล้าย|เทียบ/, /ต่าง|ฟรี|ไม่เสียค่า|ลิขสิทธิ์|ราคา|เสียค่า|โอเพนซอร์ส/, /writer|calc|impress|word|excel|powerpoint|เอกสาร|ตาราง|นำเสนอ|พิมพ์/i]) >= 2 ? [] : ["ควรบอกความเหมือน (ทำงานคล้ายกัน เช่น Writer กับ Word) และความต่าง (เช่น ฟรีหรือเสียค่าลิขสิทธิ์)"],
  (v) => short(v, 10) ? [SHORTMSG] : (/excel|เอ็กเซล|calc|ตารางคำนวณ|สเปรดชีต|sheets/i.test(v) && /แท่ง|เส้น|วงกลม|โดนัท|เรดาร์|พื้นที่|กราฟ/.test(v)) ? [] : ["ควรตอบ Microsoft Excel (หรือโปรแกรมตารางคำนวณ) และชนิดกราฟ เช่น กราฟแท่ง กราฟเส้น กราฟวงกลม"]
] };
R1["u3-8"] = { titles:["ขั้นตอนสร้างกราฟ", "แกนของกราฟ", "คะแนนรวม", "วิชาที่เท่ากัน/ต่างมากสุด", "วิชาที่ควรปรับปรุง"], f:[
  (v) => short(v, 30) ? [SHORTMSG] : hitN(v, [/พิมพ์|กรอก|ป้อน|ใส่ข้อมูล|เตรียมข้อมูล/, /เลือก|คลุม|ลาก|ไฮไลต์/, /แทรก|insert/i, /กราฟ|แผนภูมิ|chart/i, /แท่ง|คอลัมน์|column|bar/i]) >= 4 ? [] : ["ควรเล่าให้ครบ: พิมพ์ข้อมูล → เลือกข้อมูล → แทรกกราฟ/แผนภูมิ → เลือกกราฟแท่ง"],
  (v) => short(v, 8) ? [SHORTMSG] : (/วิชา/.test(v) && /คะแนน/.test(v)) ? [] : ["แกนหนึ่งเป็นวิชา อีกแกนเป็นคะแนน ควรตอบทั้งสองแกน"],
  (v) => short(v, 8) ? [SHORTMSG] : (hasNo(v, 62) && hasNo(v, 76) && hasNo(v, 14)) ? [] : ["ภูผารวม 62 คะแนน ฟ้าใสรวม 76 คะแนน ฟ้าใสมากกว่า 14 คะแนน ควรตอบให้ครบ"],
  (v) => short(v, 8) ? [SHORTMSG] : (/ไทย/.test(v) && /วิทย|อังกฤษ/.test(v)) ? [] : ["วิชาที่เท่ากันคือภาษาไทย ส่วนที่ต่างกันมากที่สุดคือวิทยาศาสตร์และภาษาอังกฤษ"],
  kwRule([/คณิต|วิทย|ไทย|สังคม|อังกฤษ/, /เพราะ|เนื่องจาก|เหตุผล|ต่ำ|น้อย|ต่าง/], 2, "ควรเลือกวิชาและบอกเหตุผลจากข้อมูลในกราฟ", 12)
] };

// ───── ใบงาน ม.3 หน่วย 1 (การจัดการข้อมูลและสารสนเทศ) เรียกด้วย run1("u31-N", ...) · 1.2, 1.4 (ลากไปวาง) และ 1.7 (ปรนัย) ตรวจในหน้า ─────
const whyIn = (v) => /เพราะ|เนื่องจาก|เหตุผล|ดังนั้น|เพราะว่า/.test(v);
const typeWhy = (kind, msg) => (v) => { if(short(v, 15)) return [SHORTMSG]; const m = []; if(!kind.test(v)) m.push(msg); if(!whyIn(v)) m.push("ควรบอกเหตุผลด้วย (ขึ้นต้นด้วย “เพราะ...”)"); return m; };
const twoEx = (v) => nlLines(v).length >= 2 || /(^|\s)(1|2|๑|๒)\s*[).]/.test(v) || String(v||"").split(/[,;·、]|\s+และ\s+/).filter(x => x.trim().length >= 3).length >= 2;
R1["u31-1"] = { titles:["ปฐมภูมิ", "ทุติยภูมิ", "ขอข้อมูลจากฝ่ายทะเบียน", "รีวิวเว็บไซต์ท่องเที่ยว", "จดราคาตลาดเอง", "วิดีโอฝึกวิ่ง", "ประโยชน์ปฐมภูมิ", "ประโยชน์ทุติยภูมิ", "เลือกธนาคาร", "เลือกชมรม"], f:[
  (v) => short(v, 20) ? [SHORTMSG] : (/เอง|โดยตรง|ผู้ใช้เก็บ|ตนเอง/.test(v) && /ตรง|ต้องการ|ค่าใช้จ่าย|เวลา|ควบคุม/.test(v)) ? [] : ["ควรบอกว่าผู้ใช้เก็บรวบรวมเอง ทำให้ได้ข้อมูลตรงความต้องการ (และอาจมีค่าใช้จ่ายหรือใช้เวลามาก)"],
  (v) => short(v, 25) ? [SHORTMSG] : hitN(v, [/ผู้อื่น|คนอื่น|รวบรวมไว้|มีอยู่แล้ว|ที่มีผู้/, /ตรวจสอบ|พิจารณา|คุณภาพ|น่าเชื่อถือ/, /ถูกต้อง|ทันสมัย|ใครเป็นผู้|ผู้รวบรวม|วิธี|ข้อดี|ข้อเสีย|แหล่งที่มา/]) >= 3 ? [] : ["ควรบอกว่ามีผู้อื่นรวบรวมไว้แล้ว และต้องตรวจสอบคุณภาพ เช่น ผู้รวบรวม ความถูกต้อง ความทันสมัย"],
  typeWhy(/ทุติยภูมิ/, "ข้อมูลที่ขอจากฝ่ายทะเบียนเป็นข้อมูลทุติยภูมิ"),
  typeWhy(/ทุติยภูมิ/, "ข้อมูลจากรีวิวในเว็บไซต์เป็นข้อมูลทุติยภูมิ"),
  typeWhy(/ปฐมภูมิ/, "การไปสำรวจและจดราคาด้วยตนเองเป็นข้อมูลปฐมภูมิ"),
  typeWhy(/ทุติยภูมิ/, "ข้อมูลจากวิดีโอที่ผู้อื่นทำไว้เป็นข้อมูลทุติยภูมิ"),
  (v) => short(v, 30) ? [SHORTMSG] : (twoEx(v) && /เอง|จด|สำรวจ|สัมภาษณ์|แบบสอบถาม|สังเกต|นับ|ทดลอง/.test(v)) ? [] : ["ควรเล่า 2 ตัวอย่าง (ขึ้นบรรทัดใหม่) ที่ผู้ใช้เก็บข้อมูลเอง แล้วนำไปใช้"],
  (v) => short(v, 30) ? [SHORTMSG] : (twoEx(v) && /เว็บไซต์|อินเทอร์เน็ต|หนังสือ|รีวิว|สถิติ|หน่วยงาน|รายงาน|ห้องสมุด|ผู้อื่น|วิดีโอ/.test(v)) ? [] : ["ควรเล่า 2 ตัวอย่าง (ขึ้นบรรทัดใหม่) ที่นำข้อมูลที่ผู้อื่นรวบรวมไว้แล้วมาใช้"],
  (v) => short(v, 15) ? [SHORTMSG] : (/เว็บไซต์|ธนาคาร|ดอกเบี้ย|เปรียบเทียบ|สืบค้น|ค้นหา|ขอข้อมูล|โทร|สอบถาม/.test(v) && /เปรียบเทียบ|ดอกเบี้ย|อัตรา/.test(v)) ? [] : ["ควรบอกว่าค้นข้อมูลอัตราดอกเบี้ยจากเว็บไซต์ของธนาคารแล้วเปรียบเทียบกัน"],
  (v) => short(v, 15) ? [SHORTMSG] : /ครู|ฝ่าย|แนะแนว|กิจกรรม|ประกาศ|เว็บไซต์|เพื่อน|สอบถาม|สัมภาษณ์|แบบสอบถาม|รายชื่อ|ขอข้อมูล|สำรวจ/.test(v) ? [] : ["ควรบอกแหล่งข้อมูลหรือวิธีรวบรวม เช่น ขอรายชื่อชมรมจากครูฝ่ายแนะแนว หรือสอบถามเพื่อน"]
] };
R1["u31-3"] = { titles:["ประมวลผลด้วยมือ", "ด้วยเครื่องจักรกล", "ด้วยคอมพิวเตอร์", "ร้านขนมออนไลน์", "ซื้อหูฟัง 3 ร้าน", "ตัวอย่างแบตช์", "ตัวอย่างอินเทอร์แอ็กทีฟ", "ขั้นเตรียมข้อมูล", "ขั้นประมวลผล", "ขั้นนำไปใช้และแสดงผล"], f:[
  kwRule([/กระดาษ|ลูกคิด|เครื่องคิดเลข|จด/, /น้อย|ไม่ซับซ้อน|ไม่ยุ่งยาก|ไม่เร่งด่วน|ไม่เร่ง|ง่าย/], 2, "ควรบอกอุปกรณ์ (กระดาษ ลูกคิด เครื่องคิดเลข) และว่าเหมาะกับข้อมูลน้อย ไม่ซับซ้อน", 20),
  kwRule([/เครื่องจักร|เครื่องทำบัญชี|เครื่องคิด|เครื่อง/, /คน|แรงงาน|มนุษย์|ร่วมกับ/, /เร็ว|ปานกลาง|ไม่มาก|ถูกต้อง/], 2, "ควรบอกว่าใช้แรงงานคนร่วมกับเครื่องจักรกล เช่น เครื่องทำบัญชี ได้ผลเร็วและถูกต้องกว่าทำด้วยมือ", 20),
  kwRule([/คอมพิวเตอร์/, /มาก|ซับซ้อน|ปริมาณ|จำนวนมาก/, /รวดเร็ว|เร็ว|ถูกต้อง|แม่นยำ|นิยม/], 2, "ควรบอกว่าใช้คอมพิวเตอร์เป็นหลัก รองรับข้อมูลมากและซับซ้อน ได้ผลเร็วและถูกต้อง", 20),
  (v) => short(v, 20) ? [SHORTMSG] : (/คอมพิวเตอร์|excel|เอ็กเซล|ตารางคำนวณ|สเปรดชีต|sheets/i.test(v) && /กำไร|ยอดขาย|กราฟ|สูตร|คำนวณ|ตาราง/.test(v)) ? [] : ["ควรเลือกการประมวลผลด้วยคอมพิวเตอร์ และบอกขั้นตอน เช่น สร้างตารางหากำไรรายสัปดาห์ แล้วทำกราฟ"],
  (v) => short(v, 20) ? [SHORTMSG] : (/มือ|เครื่องคิดเลข/.test(v) && /ลบ|หัก|ส่วนลด|เปรียบเทียบ|คำนวณ|ของแถม|ราคา/.test(v)) ? [] : ["ควรเลือกการประมวลผลด้วยมือ (เครื่องคิดเลข) และบอกขั้นตอน เช่น หักส่วนลด ลบของแถม แล้วเปรียบเทียบราคา"],
  (v) => short(v, 30) ? [SHORTMSG] : (twoEx(v) && /เดือน|ช่วงเวลา|รอบ|ทุก|สะสม|รวบรวม|พร้อมกัน|ดอกเบี้ย|ค่าน้ำ|ค่าไฟ|ใบแจ้ง|ผลประกอบ|ผลการเรียน/.test(v)) ? [] : ["ควรยกตัวอย่าง 2 ตัวอย่าง (ขึ้นบรรทัดใหม่) เช่น คิดค่าน้ำค่าไฟทุกสิ้นเดือน และบอกว่าสะสมแล้วประมวลผลพร้อมกัน"],
  (v) => short(v, 30) ? [SHORTMSG] : (twoEx(v) && /atm|เอทีเอ็ม|ตู้|ทันที|ความคิดเห็น|โซเชียล|เฟซบุก|เฟซบุ๊ก|ออนไลน์|จอง|ตอบสนอง/i.test(v)) ? [] : ["ควรยกตัวอย่าง 2 ตัวอย่าง (ขึ้นบรรทัดใหม่) เช่น ตู้ ATM การแสดงความคิดเห็นบนโซเชียล และบอกว่าได้ผลทันที"],
  (v) => short(v, 20) ? [SHORTMSG] : hitN(v, [/รหัส/, /ตรวจสอบ|แก้ไข/, /แยกประเภท|จำแนก/, /บันทึก/]) >= 3 ? [] : ["ควรตอบอย่างน้อย 3 ใน 4 ขั้น: ลงรหัส ตรวจสอบแก้ไข แยกประเภท บันทึกลงสื่อ"],
  kwRule([/นำเข้า|ป้อน|เตรียม/, /ซอฟต์แวร์|โปรแกรม|คอมพิวเตอร์/, /สารสนเทศ|ผลลัพธ์|ถูกต้อง|ตรงตามความต้องการ|ประมวลผล/], 2, "ควรบอกว่านำข้อมูลที่เตรียมไว้เข้าคอมพิวเตอร์ แล้วประมวลผลผ่านซอฟต์แวร์จนได้สารสนเทศ", 20),
  kwRule([/ผลลัพธ์|ผลที่ได้|แสดงผล|แปลผล/, /เข้าใจง่าย|รายงาน|กราฟ|ตาราง|นำไปใช้|ส่งต่อ|ประโยชน์/], 2, "ควรบอกว่าแปลผลลัพธ์ให้อยู่ในรูปที่เข้าใจง่าย เช่น รายงาน กราฟ เพื่อนำไปใช้ประโยชน์", 20)
] };
R1["u31-5"] = { titles:["ซอฟต์แวร์รวบรวมข้อมูล", "ซอฟต์แวร์ประมวลผล", "ซอฟต์แวร์นำเสนอ", "สำรวจรสชานม", "นำเสนอผลงานถ่ายภาพ"], f:[
  (v) => short(v, 30) ? [SHORTMSG] : (/forms|ฟอร์ม|google|docs|แบบสอบถาม|แบบสำรวจ|survey|sheets|แบบฟอร์ม/i.test(v) && twoEx(v) && /ใช้|สร้าง|เก็บ|ทำ/.test(v)) ? [] : ["ควรยกตัวอย่าง 3 ซอฟต์แวร์ (เช่น Google Forms, Microsoft Forms) ขึ้นบรรทัดใหม่ พร้อมหน้าที่"],
  (v) => short(v, 30) ? [SHORTMSG] : (/excel|เอ็กเซล|sheets|ชีต|power ?bi|calc|ตารางคำนวณ|สเปรดชีต|access/i.test(v) && twoEx(v) && /ใช้|คำนวณ|ตาราง|กราฟ|วิเคราะห์/.test(v)) ? [] : ["ควรยกตัวอย่าง 3 ซอฟต์แวร์ประมวลผล (เช่น Excel, Google Sheets) ขึ้นบรรทัดใหม่ พร้อมหน้าที่"],
  (v) => short(v, 30) ? [SHORTMSG] : (/powerpoint|พาวเวอร์|slides|สไลด์|canva|แคนวา|photoshop|โฟโต้ช็อป|infographic|อินโฟกราฟิก|prezi|keynote/i.test(v) && twoEx(v) && /ใช้|นำเสนอ|สร้าง|ภาพ/.test(v)) ? [] : ["ควรยกตัวอย่าง 3 ซอฟต์แวร์นำเสนอ (เช่น PowerPoint, Google Slides, Canva) ขึ้นบรรทัดใหม่ พร้อมหน้าที่"],
  (v) => short(v, 15) ? [SHORTMSG] : (/forms|ฟอร์ม|google|แบบสอบถาม|แบบสำรวจ|ออนไลน์/i.test(v) && whyIn(v)) ? [] : ["ควรเลือกซอฟต์แวร์สร้างแบบสอบถามออนไลน์ (เช่น Google Forms) พร้อมเหตุผล"],
  (v) => short(v, 15) ? [SHORTMSG] : (/powerpoint|พาวเวอร์|slides|สไลด์|canva|แคนวา|นำเสนอ/i.test(v) && whyIn(v)) ? [] : ["ควรเลือกซอฟต์แวร์นำเสนอ (เช่น PowerPoint) พร้อมเหตุผล"]
] };
R1["u31-6"] = { titles:["รวบรวมข้อมูล", "ประมวลผล", "คำนวณ BMI", "สรุปค่าเฉลี่ย 24.3", "นำเสนอ"], f:[
  (v) => short(v, 25) ? [SHORTMSG] : (/forms|ฟอร์ม|google|แบบสอบถาม|แบบสำรวจ|ออนไลน์|ชั่ง|วัด/i.test(v) && /น้ำหนัก|ส่วนสูง/.test(v)) ? [] : ["ควรบอกวิธีรวบรวม (เช่น แบบสอบถามออนไลน์ หรือชั่งวัดจริง) และซอฟต์แวร์ที่ใช้"],
  (v) => short(v, 25) ? [SHORTMSG] : (/excel|เอ็กเซล|sheets|ชีต|ตารางคำนวณ|สเปรดชีต/i.test(v) && hitN(v, [/ป้อน|กรอก|พิมพ์|นำเข้า/, /สูตร|คำนวณ/, /เฉลี่ย|average/i]) >= 2) ? [] : ["ควรใช้ Excel/Sheets ป้อนข้อมูล ใส่สูตร BMI แล้วหาค่าเฉลี่ย"],
  (v) => short(v, 6) ? [SHORTMSG] : (/19\.8|19\.83|19,8/.test(v) && /สมส่วน|ปกติ|เหมาะสม|เกณฑ์/.test(v)) ? [] : ["54 ÷ (1.65 × 1.65) ≈ 19.8 อยู่ในเกณฑ์สมส่วน (18.5–22.9) ควรเขียนทั้งค่าและเกณฑ์"],
  (v) => short(v, 12) ? [SHORTMSG] : (/เกิน|23|24|ไม่ปกติ|ไม่อยู่ใน/.test(v) && /น้ำหนัก|เกณฑ์|ปกติ|สมส่วน/.test(v)) ? [] : ["24.3 อยู่ในช่วง 23–24.9 คือน้ำหนักเกิน ไม่อยู่ในเกณฑ์ปกติ"],
  (v) => short(v, 15) ? [SHORTMSG] : (/powerpoint|พาวเวอร์|slides|สไลด์|canva|แคนวา|กราฟ|อินโฟกราฟิก|infographic|ตาราง/i.test(v) && whyIn(v)) ? [] : ["ควรเลือกซอฟต์แวร์/รูปแบบนำเสนอ (เช่น สไลด์ กราฟแท่ง) พร้อมเหตุผล"]
] };
R1["u31-8"] = { titles:["ประเภทข้อมูลโฆษณา", "วิธีประมวลผล", "ตารางเปรียบเทียบและรุ่นที่คุ้มค่า"], f:[
  typeWhy(/ทุติยภูมิ/, "ข้อมูลในโฆษณาเป็นข้อมูลทุติยภูมิ เพราะร้านรวบรวมไว้แล้ว"),
  (v) => short(v, 12) ? [SHORTMSG] : (/มือ/.test(v) && /คอมพิวเตอร์|excel|เอ็กเซล|ตารางคำนวณ/i.test(v) || /เครื่องจักร/.test(v) && /คอมพิวเตอร์|มือ/.test(v)) ? [] : ["ควรตอบอย่างน้อย 2 วิธี เช่น ด้วยมือ (เครื่องคิดเลข) และด้วยคอมพิวเตอร์ (Excel)"],
  (v) => short(v, 30) ? [SHORTMSG] : (/12,?900|12900/.test(v) && /15,?900|15900/.test(v) && /14,?500|14500/.test(v) && /รุ่น ?[ABC]|คุ้ม/.test(v) && whyIn(v)) ? [] : ["ควรทำตารางที่มีราคา แรม แบตเตอรี่ของทั้ง 3 รุ่น แล้วเลือกรุ่นที่คุ้มค่าพร้อมเหตุผล"]
] };

// ───── ใบงาน ม.3 หน่วย 2 (ความน่าเชื่อถือของข้อมูล) เรียกด้วย run1("u32-N", ...) · 2.2, 2.7 (ลากไปวาง) และ 2.9 (ปรนัย) ตรวจในหน้า ─────
const thrEx = (v, n) => nlLines(v).length >= (n || 3) || (new RegExp("(^|\\s)(" + (n >= 3 ? "3|๓" : "2|๒") + ")\\s*[).]")).test(v) || String(v || "").split(/[,;·、]|\s+และ\s+/).filter(x => x.trim().length >= 3).length >= (n || 3);
const rsn = (v) => /เพราะ|เนื่องจาก|เหตุผล|ดังนั้น/.test(v);
R1["u32-1"] = { titles:["สืบค้นด้วยมือ", "สืบค้นด้วยคอมพิวเตอร์", "ประโยชน์อินเทอร์เน็ต", "โทษอินเทอร์เน็ต", "จริยธรรมการใช้อินเทอร์เน็ต", "ขั้นที่ 1–2", "ขั้นที่ 3–4", "ค้นวิธีดูแลแบตเตอรี่"], f:[
  (v) => short(v, 20) ? [SHORTMSG] : (/เอกสาร|หนังสือ|ตำรา|ห้องสมุด|แผ่นพับ|วารสาร/.test(v) && /ค้น|สืบค้น|อ่าน|หา/.test(v)) ? [] : ["ควรบอกว่าค้นจากเอกสาร หนังสือ ตำรา เช่น ห้องสมุด"],
  (v) => short(v, 20) ? [SHORTMSG] : (/คอมพิวเตอร์|อินเทอร์เน็ต|ออนไลน์|ฐานข้อมูล|google|กูเกิล|search|โปรแกรมค้นหา|เว็บ/i.test(v) && /ค้น|สืบค้น|หา/.test(v)) ? [] : ["ควรบอกว่าค้นผ่านคอมพิวเตอร์ เช่น อินเทอร์เน็ต ฐานข้อมูล โปรแกรมค้นหา"],
  (v) => short(v, 25) ? [SHORTMSG] : (thrEx(v, 3) && /ข่าว|สื่อสาร|ติดต่อ|ซื้อ|หาความรู้|เรียน|ค้น|ประหยัด|แลกเปลี่ยน|บันเทิง/.test(v)) ? [] : ["ควรบอกประโยชน์อย่างน้อย 3 ข้อ (ขึ้นบรรทัดใหม่) เช่น แลกเปลี่ยนข่าวสาร ติดต่อสื่อสาร ซื้อของออนไลน์"],
  (v) => short(v, 25) ? [SHORTMSG] : (thrEx(v, 3) && /เท็จ|ปลอม|กระจัด|หาไม่เจอ|เสพติด|เวลา|เสียสุขภาพ|การเรียน|หลอก|ไวรัส|ติดเกม|กระทบ|ภัย/.test(v)) ? [] : ["ควรบอกโทษอย่างน้อย 3 ข้อ (ขึ้นบรรทัดใหม่) เช่น ข้อมูลเท็จปะปน ใช้มากกระทบการเรียน ข้อมูลกระจัดกระจาย"],
  (v) => short(v, 25) ? [SHORTMSG] : (thrEx(v, 3) && /ไม่เผยแพร่|ไม่ละเมิด|สุภาพ|เคารพ|ข้อตกลง|ไม่ใช้|ไม่ทำ|อนุญาต|ลิขสิทธิ์|เท็จ/.test(v)) ? [] : ["ควรบอกอย่างน้อย 3 ข้อ เช่น ไม่เผยแพร่ข้อมูลเท็จ ใช้ถ้อยคำสุภาพ เคารพข้อตกลง ไม่ละเมิดสิทธิผู้อื่น"],
  (v) => short(v, 30) ? [SHORTMSG] : (/วัตถุประสงค์|หัวข้อ|เป้าหมาย/.test(v) && /ประเภท|ข้อความ|ภาพ|วิดีโอ/.test(v)) ? [] : ["ควรอธิบายขั้นกำหนดวัตถุประสงค์/หัวข้อ และขั้นกำหนดประเภทข้อมูล (ข้อความ ภาพ วิดีโอ)"],
  (v) => short(v, 30) ? [SHORTMSG] : (/คำสำคัญ|คำค้น|keyword/i.test(v) && /ประเมิน|น่าเชื่อถือ|ตรวจสอบ|คัด/.test(v)) ? [] : ["ควรอธิบายขั้นกำหนดคำสำคัญ และขั้นประเมินความน่าเชื่อถือของข้อมูล"],
  (v) => short(v, 30) ? [SHORTMSG] : (/วัตถุประสงค์|เพื่อ|หา/.test(v) && /ข้อความ|ภาพ|วิดีโอ|ประเภท/.test(v) && /แบตเตอรี่|แบต|ดูแล|ยืดอายุ|ชาร์จ/.test(v)) ? [] : ["ควรเขียนวัตถุประสงค์ ประเภทข้อมูล และคำสำคัญ เช่น วิธีดูแลแบตเตอรี่โทรศัพท์"]
] };
R1["u32-3"] = { manual:[2], titles:["เทคนิคการค้นหา 2 เทคนิค", "ค้นกฎหมายหมวกนิรภัย", "ค้นหัวข้อที่เลือกเอง", "คำค้นหม้อทอดไร้น้ำมัน", "คำค้นค่าไฟแอร์", "คำค้นผลไม้ไม่เอาส้ม"], f:[
  (v) => short(v, 25) ? [SHORTMSG] : (thrEx(v, 2) && /\+|บวก|-|ลบ|"|อัญประกาศ|or\b/i.test(v)) ? [] : ["ควรบอก 2 เทคนิค (ขึ้นบรรทัดใหม่) เช่น เครื่องหมายบวก ลบ อัญประกาศ OR พร้อมตัวอย่างคำค้น"],
  (v) => short(v, 30) ? [SHORTMSG] : (/หมวก|นิรภัย|หมวกกันน็อก|ปรับ|โทษ|กฎหมาย|จราจร|บาดเจ็บ|อุบัติเหตุ/.test(v) && /https?:\/\//i.test(v)) ? [] : ["ควรสรุปสิ่งที่พบ (เช่น โทษปรับ ความเสี่ยง) และวางลิงก์แหล่งข้อมูล (ขึ้นต้นด้วย https://)"],
  (v) => [],
  (v) => short(v, 8) ? [SHORTMSG] : (/หม้อทอด|ไร้น้ำมัน/.test(v) && /ทำความสะอาด|ล้าง|ดูแล/.test(v)) ? [] : ["คำค้นควรมีคำสำคัญ เช่น หม้อทอดไร้น้ำมัน ทำความสะอาด"],
  (v) => short(v, 8) ? [SHORTMSG] : (/ประหยัด|ลด/.test(v) && /ไฟ|ค่าไฟ/.test(v) && /แอร์|เครื่องปรับอากาศ/.test(v)) ? [] : ["คำค้นควรมีคำสำคัญ เช่น ประหยัดไฟ แอร์ หรือ เครื่องปรับอากาศ"],
  (v) => short(v, 6) ? [SHORTMSG] : (/ผลไม้/.test(v) && /วิตามินซี|วิตามิน ซี|วิตามินC/i.test(v) && /(^|\s)[-−–]\s?ส้ม/.test(v)) ? [] : ["ควรพิมพ์เช่น ผลไม้ วิตามินซีสูง -ส้ม (ใช้เครื่องหมายลบหน้าคำที่ไม่ต้องการ)"]
] };
R1["u32-4"] = { titles:["หลักการประเมิน 3 ข้อ", "ปฐมภูมิ", "ทุติยภูมิ", "ตติยภูมิ", "วิธีตรวจสอบเว็บไซต์", "แหล่งที่น่าเชื่อถือ", "ประเมินด้วย PROMPT", "สรุปความน่าเชื่อถือ"], f:[
  (v) => short(v, 40) ? [SHORTMSG] : hitN(v, [/ตรงตามความต้องการ|ความต้องการ|ตรงกับ/, /น่าเชื่อถือ|ทันสมัย|แหล่งที่มา|ผู้เขียน|วันที่/, /ระดับเนื้อหา|ปฐมภูมิ|ทุติยภูมิ|ตติยภูมิ/]) >= 3 ? [] : ["ควรตอบให้ครบ 3 ข้อ: ความตรงตามความต้องการ ความน่าเชื่อถือและความทันสมัย และระดับเนื้อหา"],
  (v) => short(v, 20) ? [SHORTMSG] : (/ศึกษา|ค้นคว้า|วิจัย|โดยตรง|เผยแพร่ครั้งแรก|ผู้เขียนเอง/.test(v) && /วิทยานิพนธ์|รายงานวิจัย|รายงานการวิจัย|งานวิจัย|เว็บไซต์ของรัฐ|เว็บไซต์รัฐ|สิ่งพิมพ์/.test(v)) ? [] : ["ควรบอกว่าผู้เขียนศึกษาค้นคว้าเองและเผยแพร่ครั้งแรก เช่น วิทยานิพนธ์ รายงานวิจัย"],
  (v) => short(v, 20) ? [SHORTMSG] : (/เรียบเรียง|อธิบาย|วิจารณ์|สรุป|นำ.*ปฐมภูมิ|เข้าใจง่าย/.test(v) && /บทความ|วารสาร|บทคัดย่อ|บทวิจารณ์|หนังสือ|ตำรา/.test(v)) ? [] : ["ควรบอกว่านำข้อมูลปฐมภูมิมาเรียบเรียง/วิจารณ์ เช่น บทความวารสาร บทคัดย่อ"],
  (v) => short(v, 20) ? [SHORTMSG] : (/ชี้แนะ|แนะนำ|แหล่งข้อมูล|ไม่ได้ให้เนื้อหา|ไม่ให้เนื้อหา|บอกที่มา|บอกว่า/.test(v) && /บรรณานุกรม|ดรรชนี|ดัชนี|เอกสารอ้างอิง|แหล่งที่มา|อ้างอิง/.test(v)) ? [] : ["ควรบอกว่าชี้แนะแหล่งข้อมูลอื่น เช่น บรรณานุกรม ดรรชนีวารสาร เอกสารอ้างอิง"],
  (v) => short(v, 30) ? [SHORTMSG] : (thrEx(v, 3) && hitN(v, [/ผู้เขียน|ผู้จัดทำ|ชื่อ/, /อ้างอิง|แหล่งที่มา|ที่มา/, /วัน|ปี|เวลา|ปรับปรุง|เผยแพร่/, /กฎหมาย|ศีลธรรม|จริยธรรม/, /วัตถุประสงค์/, /ลิงก์|link|เชื่อมโยง/i, /ติดต่อ|ช่องทาง/]) >= 3) ? [] : ["ควรบอกอย่างน้อย 4 วิธี (ขึ้นบรรทัดใหม่) เช่น ระบุผู้เขียน อ้างอิงแหล่งที่มา ระบุวันที่เผยแพร่ ไม่ขัดกฎหมาย"],
  (v) => short(v, 30) ? [SHORTMSG] : (hitN(v, [/เจ้าของข้อมูล|ประสบการณ์ตรง/, /องค์กร|ผู้เชี่ยวชาญ|ผู้รู้|ผู้มีความรู้/, /หน่วยงาน.*รัฐ|รัฐ|ราชการ|กระทรวง|กรม/]) >= 2 && rsn(v)) ? [] : ["ควรตอบ 3 ประเภท: เจ้าของข้อมูล องค์กร/ผู้เชี่ยวชาญ หน่วยงานของรัฐ พร้อมเหตุผล"],
  (v) => short(v, 50) ? [SHORTMSG] : hitN(v, [/นำเสนอ|ชัดเจน/, /ความสัมพันธ์|ครบ|รายละเอียด|เกี่ยวข้อง/, /วัตถุประสงค์|ชวนเชื่อ|เจตนา/, /วิธีการ|รวบรวม|พิสูจน์วิธี|ทดลอง/, /พิสูจน์|ยืนยัน|อ้างอิง|แหล่งที่มา/, /ทัน|ปัจจุบัน|เก่า|2558/]) >= 4 ? [] : ["ควรประเมินให้ครบอย่างน้อย 4 ข้อของ PROMPT เช่น การนำเสนอ วัตถุประสงค์ พิสูจน์/อ้างอิง ความทันสมัย (โพสต์ปี 2558)"],
  (v) => short(v, 25) ? [SHORTMSG] : (/ไม่น่าเชื่อถือ|ไม่เชื่อ|เชื่อถือไม่ได้|ขาดความน่าเชื่อถือ/.test(v) && rsn(v) && /ตรวจสอบ|เว็บไซต์|หน่วยงาน|กรม|โรงพยาบาล|แพทย์|กระทรวง|องค์การ/.test(v)) ? [] : ["ควรสรุปว่าไม่น่าเชื่อถือ พร้อมเหตุผล และบอกแหล่งที่จะตรวจสอบเพิ่ม เช่น เว็บไซต์หน่วยงานสาธารณสุข"]
] };
R1["u32-5"] = { titles:["ข้อมูล (ก)", "ข้อมูล (ข)", "เหตุผลวิบัติ", "ตัวอย่างเหตุผลวิบัติ", "ผลกระทบข้อมูลผิดพลาด"], f:[
  (v) => short(v, 20) ? [SHORTMSG] : (/น่าเชื่อถือ/.test(v) && !/ไม่น่าเชื่อถือ/.test(v) && rsn(v) && /โรงพยาบาล|รัฐ|แพทย์|ชื่อ|วันที่|อ้างอิง|ผู้เชี่ยวชาญ|หน่วยงาน/.test(v)) ? [] : ["ข้อมูล (ก) น่าเชื่อถือ เพราะมาจากโรงพยาบาลรัฐ ระบุชื่อแพทย์ วันที่ และแหล่งอ้างอิง"],
  (v) => short(v, 20) ? [SHORTMSG] : (/ไม่น่าเชื่อถือ|เชื่อถือไม่ได้|ขาดความน่าเชื่อถือ/.test(v) && rsn(v) && /ไม่ระบุ|ไม่มี|เกินจริง|100|ไม่ทราบ|ไม่อ้างอิง|แชร์/.test(v)) ? [] : ["ข้อมูล (ข) ไม่น่าเชื่อถือ เพราะไม่ระบุที่มา อ้างผล 100% เกินจริง และเร่งให้แชร์"],
  (v) => short(v, 20) ? [SHORTMSG] : (/เหตุผล/.test(v) && /ผิด|ไม่ถูก|บกพร่อง|ขาดความ|ไม่สมเหตุสมผล/.test(v) && /เชื่อ|ยอมรับ|เข้าใจผิด|สรุป|นำเสนอ|โน้มน้าว/.test(v)) ? [] : ["ควรบอกว่าเป็นการใช้เหตุผลที่ผิดพลาดเพื่อให้ผู้อื่นเชื่อหรือยอมรับ ทำให้เข้าใจผิด"],
  (v) => short(v, 30) ? [SHORTMSG] : (/ใคร ๆ|ใครๆ|ทุกคน|คนอื่น|เพื่อน|เหมารวม|เพราะ|ดังนั้น|จึง/.test(v) && /ปัญหา|ผลเสีย|เสียหาย|เข้าใจผิด|ผิดกฎหมาย|อันตราย|ผลกระทบ/.test(v)) ? [] : ["ควรเล่าสถานการณ์ที่ใช้เหตุผลผิด (เช่น ใคร ๆ ก็ทำ) และบอกปัญหาที่เกิด"],
  (v) => short(v, 25) ? [SHORTMSG] : (thrEx(v, 2) && /เข้าใจผิด|เสียหาย|ดำเนินคดี|ตื่นตระหนก|อันตราย|สูญเสีย|ถูกหลอก|เชื่อ|แชร์|กระทบ/.test(v)) ? [] : ["ควรบอกผลกระทบอย่างน้อย 2 ข้อ (ขึ้นบรรทัดใหม่) เช่น เข้าใจผิด ถูกดำเนินคดี ตื่นตระหนก"]
] };
R1["u32-6"] = { titles:["เข้าถึงสื่อ", "เข้าใจและประเมินค่า", "สร้าง ใช้ประโยชน์ เฝ้าระวัง", "สะท้อนคิด", "รู้เท่าทันสื่อดิจิทัล/สื่อ", "ใบเตยแอบอ้างผลงาน"], f:[
  kwRule([/เข้าถึง|ได้รับ|รับสื่อ/, /เข้าใจ|รับรู้|เนื้อหา|รวดเร็ว|เต็มที่/], 2, "ควรบอกว่าได้รับสื่อหลายประเภทอย่างเต็มที่ รวดเร็ว และเข้าใจเนื้อหา", 15),
  kwRule([/วิเคราะห์|ประเมิน/, /คุณภาพ|คุณค่า|เนื้อหา|ประโยชน์/], 2, "ควรบอกว่าวิเคราะห์สื่อเพื่อประเมินคุณภาพและคุณค่าของเนื้อหา", 15),
  kwRule([/สร้าง/, /ใช้ประโยชน์|เฝ้าระวัง|ระวัง|วิเคราะห์|วิจารณ์|ออกแบบ/], 2, "ควรบอกว่าสร้างสื่อของตนเอง ใช้ประโยชน์ และเฝ้าระวังเนื้อหา", 15),
  kwRule([/พิจารณา|ตรวจสอบตนเอง|คิดทบทวน|สะท้อน/, /ผลกระทบ|ผู้อื่น|จริยธรรม|ความรับผิดชอบ|ผลลัพธ์/], 2, "ควรบอกว่าพิจารณาการกระทำของตนเองและผลกระทบต่อผู้อื่น (จริยธรรม ความรับผิดชอบ)", 15),
  (v) => short(v, 30) ? [SHORTMSG] : hitN(v, [/ดิจิทัล/, /เข้าถึง/, /วิเคราะห์|ประเมิน/, /สร้าง|สื่อความ|แต่ง/, /สะท้อน|อธิบาย/]) >= 3 ? [] : ["ควรอธิบายทั้งรู้เท่าทันสื่อดิจิทัลและรู้เท่าทันสื่อ โดยกล่าวถึงเข้าถึง วิเคราะห์ ประเมิน สร้าง สะท้อนคิด"],
  (v) => short(v, 25) ? [SHORTMSG] : (/ลิขสิทธิ์|สร้างสรรค์|แอบอ้าง|ละเมิด/.test(v) && rsn(v)) ? [] : ["ควรตอบด้านการใช้ข้อมูลดิจิทัลอย่างสร้างสรรค์และไม่ละเมิดลิขสิทธิ์ เพราะนำผลงานผู้อื่นมาแอบอ้าง"]
] };
R1["u32-8"] = { manual:[0], titles:["ข่าวที่เลือก", "สรุปเนื้อหา", "น่าเชื่อถือหรือไม่", "หลักการที่ใช้ตัดสิน", "ผลกระทบหากผิดพลาด"], f:[
  (v) => [],
  (v) => short(v, 25) ? [SHORTMSG] : [],
  (v) => short(v, 25) ? [SHORTMSG] : (/น่าเชื่อถือ|เชื่อถือไม่ได้|เชื่อถือได้/.test(v) && rsn(v)) ? [] : ["ควรตอบว่าน่าเชื่อถือหรือไม่ พร้อมเหตุผล (เพราะ...)"],
  (v) => short(v, 25) ? [SHORTMSG] : hitN(v, [/แหล่งที่มา|แหล่งข้อมูล|หน่วยงาน/, /ผู้เขียน|ผู้จัดทำ/, /วัน|ปี|ทันสมัย|เผยแพร่/, /อ้างอิง|ลิงก์|link/i, /วัตถุประสงค์|กฎหมาย|ศีลธรรม/, /prompt|ความสัมพันธ์|พิสูจน์|ยืนยัน/i]) >= 3 ? [] : ["ควรบอกอย่างน้อย 3 ข้อ เช่น แหล่งที่มา ผู้เขียน วันที่เผยแพร่ การอ้างอิง"],
  (v) => short(v, 20) ? [SHORTMSG] : hitN(v, [/เข้าใจผิด/, /เสียหาย|เสียเงิน|สูญเสีย/, /ตื่นตระหนก/, /ตัดสินใจผิด/, /แชร์|เผยแพร่ต่อ|บอกต่อ/, /อันตราย|เสี่ยง/, /หลอก|ถูกโกง/]) >= 2 ? [] : ["ควรบอกผลกระทบอย่างน้อย 2 ข้อ (ขึ้นบรรทัดใหม่) เช่น เข้าใจผิด ตัดสินใจผิด แชร์ต่อจนเสียหาย"]
] };
R1["u32-10"] = { titles:["แหล่งและวิธีสืบค้น", "ตรวจสอบความน่าเชื่อถือ"], f:[
  (v) => short(v, 15) ? [SHORTMSG] : (/อินเทอร์เน็ต|เว็บไซต์|ออนไลน์|google|โปรแกรมค้นหา|search/i.test(v) && /หน่วยงาน|เว็บไซต์|ทดสอบ/.test(v)) ? [] : ["ควรตอบว่าสืบค้นจากอินเทอร์เน็ต (เว็บไซต์ของหน่วยงานทดสอบสินค้า) ด้วยโปรแกรมค้นหา"],
  (v) => short(v, 40) ? [SHORTMSG] : (/ได้/.test(v) && !/ไม่สามารถตรวจสอบได้/.test(v) && rsn(v) && hitN(v, [/ผู้จัดทำ|ผู้เขียน|ชื่อ/, /วัน|ปี|เผยแพร่|ทันสมัย/, /วิธีทดสอบ|วิธีการ|ทดสอบ/, /มาตรฐาน|อ้างอิง/, /เชี่ยวชาญ|หน่วยงาน|องค์กร/]) >= 3) ? [] : ["ควรตอบว่าตรวจสอบได้ เพราะระบุผู้จัดทำ วันที่ วิธีทดสอบ อ้างอิงมาตรฐาน และมาจากหน่วยงานที่เชี่ยวชาญ"]
] };

// ───── ใบงาน ป.4 หน่วย 1 (ขั้นตอนวิธีการแก้ปัญหา) เรียกด้วย run1("u41-N", ...) · 1.2, 1.4 (ลากไปวาง) และ 1.6 (ปรนัย) ตรวจในหน้า ─────
const whyP4 = (v) => /เพราะ|เนื่องจาก|เหตุผล|ดังนั้น/.test(v);
const stepsP4 = (v, n) => nlLines(v).length >= n || (new RegExp("(^|\\s)(" + (n >= 5 ? "5|๕" : "3|๓") + ")\\s*[).]")).test(v);
R1["u41-1"] = { titles:["เหตุผลเชิงตรรกะคืออะไร", "ตัวอย่างในชีวิตประจำวัน", "แพร ฟ้า เมฆ", "แบบรูป 2 4 6 8", "เริ่มต้นต่างกัน ผลต่างกัน", "ประโยชน์ของเหตุผลเชิงตรรกะ"], f:[
  kwRule([/เหตุผล|กฎ|เงื่อนไข/, /แก้ปัญหา|ตัดสินใจ|คิด/], 2, "ควรบอกว่าเป็นการใช้เหตุผล กฎ หรือเงื่อนไข มาช่วยคิดแก้ปัญหาหรือตัดสินใจ", 12),
  kwRule([/เพราะ|เนื่องจาก|เหตุผล|เลือก|ตัดสินใจ|เปรียบเทียบ|ดู|คิด/, /เช่น|ตอน|เวลา|ไป|ซื้อ|เล่น|เรียน|เดิน|กิน|ทำ/], 2, "ควรเล่าสถานการณ์ใกล้ตัวที่ใช้เหตุผลตัดสินใจ เช่น เลือกเส้นทางไปโรงเรียน", 15),
  (v) => short(v, 8) ? [SHORTMSG] : (/เมฆ/.test(v) && whyP4(v)) ? [] : ["เมฆเตี้ยที่สุด ควรบอกเหตุผล เช่น แพรสูงกว่าฟ้า และฟ้าสูงกว่าเมฆ"],
  (v) => short(v, 6) ? [SHORTMSG] : (hasNo(v, 10) && /(เพิ่ม|บวก|ทีละ|\+).{0,12}2|2.{0,10}(เพิ่ม|บวก|ทีละ)/.test(v)) ? [] : ["ตัวต่อไปคือ 10 เพราะเพิ่มขึ้นทีละ 2 ควรตอบทั้งตัวเลขและกฎ"],
  (v) => short(v, 20) ? [SHORTMSG] : (/ต่าง|ไม่เหมือน|คนละ/.test(v) && /เส้นทาง|ผลลัพธ์|ผล|ถึง|เร็ว|ช้า|เริ่มต้น/.test(v)) ? [] : ["ควรบอกว่าเริ่มต้นต่างกันผลลัพธ์อาจต่างกัน พร้อมตัวอย่าง"],
  kwRule([/ถูกต้อง|เหตุผล|ตัดสินใจ|แก้ปัญหา|คาดการณ์|ผิดพลาด|รอบคอบ|ดีขึ้น|เร็วขึ้น/], 1, "ควรบอกว่าช่วยแก้ปัญหา ตัดสินใจอย่างมีเหตุผล หรือคาดการณ์ผลลัพธ์ได้", 12)
] };
R1["u41-3"] = { titles:["ขั้นตอนของอัลกอริทึม", "ต้มไข่ (ภาษาธรรมชาติ)", "รหัสลำลอง if-else", "ส่งอีเมล", "ภาษาธรรมชาติกับรหัสลำลอง"], f:[
  (v) => short(v, 25) ? [SHORTMSG] : hitN(v, [/เข้าใจปัญหา|ทำความเข้าใจ|วิเคราะห์ปัญหา/, /คิดวิธี|วิธีการแก้ปัญหา|วิธีแก้/, /เรียงลำดับ|ลำดับขั้นตอน/, /ทบทวน/, /ตรวจสอบ/, /เลือกวิธี|ดีที่สุด/]) >= 3 ? [] : ["ควรบอกอย่างน้อย 3 ขั้นตอน เช่น ทำความเข้าใจปัญหา คิดวิธีแก้ เรียงลำดับขั้นตอน ตรวจสอบ เลือกวิธีที่ดีที่สุด"],
  (v) => short(v, 30) ? [SHORTMSG] : (stepsP4(v, 5) && /ไข่/.test(v) && /น้ำ/.test(v) && /(ต้ม|เดือด)/.test(v) && /(ปิดไฟ|นาที|ปอก|เย็น|เสร็จ|สุก|ตัก|ยก)/.test(v)) ? [] : ["ควรเขียนอย่างน้อย 5 ข้อ (ขึ้นบรรทัดใหม่) มีเตรียมน้ำและไข่ ต้มจนเดือด จับเวลา และปิดไฟ/ปอกเปลือก"],
  (v) => short(v, 10) ? [SHORTMSG] : (/if/i.test(v) && /else/i.test(v) && /ฝน/.test(v) && /ร่ม/.test(v) && /หมวก/.test(v)) ? [] : ["ควรเขียนเช่น if ฝนตก then กางร่ม else ใส่หมวก (ต้องมี if และ else)"],
  (v) => short(v, 30) ? [SHORTMSG] : (stepsP4(v, 5) && /อีเมล|email|เมล/i.test(v) && /(ส่ง)/.test(v) && /(ที่อยู่|ผู้รับ|เพื่อน|ข้อความ|พิมพ์|เขียน)/.test(v)) ? [] : ["ควรเขียนอย่างน้อย 5 ข้อ (ขึ้นบรรทัดใหม่) เช่น เปิดโปรแกรมอีเมล เขียนอีเมล ใส่ที่อยู่ผู้รับ ตรวจสอบ กดส่ง"],
  (v) => short(v, 20) ? [SHORTMSG] : (/ภาษา|คำพูด|ประโยค|ธรรมชาติ/.test(v) && /if|else|สั้น|กระชับ|โปรแกรม|รหัส|อังกฤษ/i.test(v)) ? [] : ["ควรบอกว่าภาษาธรรมชาติเขียนเป็นประโยคทั่วไป ส่วนรหัสลำลองสั้น กระชับ ใช้ if else ใกล้ภาษาโปรแกรม"]
] };
R1["u41-5"] = { titles:["เลือกซื้อและรวมราคา", "ข้อความ", "รหัสลำลอง", "ผังงาน", "วิธีที่ชอบ"], f:[
  (v) => short(v, 12) ? [SHORTMSG] : (/ตุ๊กตา|กล่องดนตรี|ชุดสี|สมุด|พวงกุญแจ/.test(v) && /\d{2,3}/.test(v) && /ไม่เกิน|น้อยกว่า|เหลือ|พอ|ได้|ไม่ถึง/.test(v)) ? [] : ["ควรบอกรายการที่เลือก รวมราคา และบอกว่าไม่เกิน 800 บาท"],
  (v) => short(v, 40) ? [SHORTMSG] : (stepsP4(v, 5) && /เริ่ม/.test(v) && /(จบ|สิ้นสุด|เสร็จ)/.test(v) && /800/.test(v) && /(เลือก|ราคา|บวก|รวม)/.test(v)) ? [] : ["ควรเขียนอย่างน้อย 5 ข้อ (ขึ้นบรรทัดใหม่) มีเริ่ม เลือกสินค้า รวมราคา ตรวจว่าไม่เกิน 800 และจบ"],
  (v) => short(v, 30) ? [SHORTMSG] : (/start|begin|เริ่ม/i.test(v) && /(end|stop|จบ|สิ้นสุด)/i.test(v) && /if/i.test(v) && /800/.test(v)) ? [] : ["ควรมี START ... END และ if ... else ที่ตรวจว่ารวมเงินไม่เกิน 800"],
  (v) => short(v, 25) ? [SHORTMSG] : (hitN(v, [/วงรี|เริ่มต้น/, /สี่เหลี่ยม|กระบวนการ|รวม|คำนวณ/, /ข้าวหลามตัด|ตัดสินใจ|เกิน/, /ลูกศร/, /สิ้นสุด|จบ/]) >= 3 || /flowchart\.html/.test(v)) ? [] : ["ควรบอกสัญลักษณ์ที่ใช้ (วงรี สี่เหลี่ยม ข้าวหลามตัด ลูกศร) หรือวางลิงก์ผังงานที่วาด"],
  kwRule([/ข้อความ|รหัสลำลอง|ผังงาน/, /เพราะ|เนื่องจาก|เหตุผล/], 2, "ควรบอกวิธีที่ชอบและเหตุผล (เพราะ...)", 10)
] };

// ───── ใบงาน ม.2 หน่วย 1 (แก้ปัญหาด้วยแนวคิดเชิงคำนวณ) เรียกด้วย run1("u21-N", ...) · 1.2 (ลากไปวาง) และ 1.5 (ปรนัย) ตรวจในหน้า ─────
const stepsM2 = (v, n) => nlLines(v).length >= n || (new RegExp("(^|\\s)(" + (n >= 5 ? "5|๕" : "3|๓") + ")\\s*[).]")).test(v);
R1["u21-1"] = { titles:["แนวคิดเชิงคำนวณ", "4 องค์ประกอบ", "การแยกย่อย", "การหารูปแบบ", "เชิงนามธรรม", "อัลกอริทึมจัดแถว", "ประโยชน์"], f:[
  kwRule([/แก้ปัญหา|แก้ไขปัญหา/, /ระบบ|ลำดับ|ขั้นตอน|ตรรกะ/], 2, "ควรบอกว่าเป็นแนวคิดแก้ปัญหาอย่างเป็นระบบและมีลำดับขั้นตอนชัดเจน", 15),
  (v) => short(v, 30) ? [SHORTMSG] : hitN(v, [/แยกย่อย|แตกปัญหา|ปัญหาย่อย/, /รูปแบบ/, /นามธรรม/, /อัลกอริทึม|ขั้นตอนวิธี/]) >= 4 ? [] : ["ควรบอกให้ครบ 4 อย่าง: การแยกย่อย การหารูปแบบ แนวคิดเชิงนามธรรม อัลกอริทึม"],
  (v) => short(v, 20) ? [SHORTMSG] : (/แบ่ง|แยก|แตก/.test(v) && /(กลุ่ม|ปัญหาย่อย|ส่วน)/.test(v)) ? [] : ["ควรบอกว่าแบ่งปัญหาหรือแบ่งนักเรียนเป็นกลุ่มย่อย เช่น ตำแหน่งหลักแล้วแบ่ง 2 กลุ่ม"],
  (v) => short(v, 15) ? [SHORTMSG] : (/ซ้ำ|เหมือน|เดียวกัน|กฎ|ทุกกลุ่ม|เสมอ/.test(v)) ? [] : ["ควรบอกกฎหรือรูปแบบที่ซ้ำกัน เช่น คนเตี้ยกว่าอยู่ซ้ายเสมอ หรือทุกกลุ่มใช้วิธีเดียวกัน"],
  (v) => short(v, 15) ? [SHORTMSG] : (/ส่วนสูง/.test(v) && /(เพศ|อายุ|น้ำหนัก|ชื่อ)/.test(v)) ? [] : ["ควรบอกว่าใช้ส่วนสูง และตัดข้อมูลอื่น เช่น เพศ อายุ น้ำหนัก"],
  (v) => short(v, 40) ? [SHORTMSG] : (stepsM2(v, 5) && /เริ่ม/.test(v) && /(จบ|สิ้นสุด|เสร็จ)/.test(v) && /(ตำแหน่งหลัก|เลือก|เปรียบเทียบ|เตี้ย|สูง)/.test(v)) ? [] : ["ควรเขียนอย่างน้อย 5 ข้อ (ขึ้นบรรทัดใหม่) มีเริ่ม เลือกตำแหน่งหลัก แบ่งกลุ่ม ทำซ้ำ และจบ"],
  kwRule([/แก้ปัญหา|เป็นระบบ|เร็ว|ประสิทธิภาพ|ผิดพลาด|ลำดับ|ชัดเจน|ตัดสินใจ/], 1, "ควรบอกประโยชน์ เช่น แก้ปัญหาอย่างเป็นระบบ ทำงานได้เร็วและมีประสิทธิภาพ", 12)
] };
R1["u21-3"] = { titles:["แยกย่อยจัดตู้เสื้อผ้า", "หารูปแบบ", "เชิงนามธรรม", "อัลกอริทึมจัดตู้", "เปรียบเทียบ 2 วิธี", "ปัญหาอื่นในชีวิตประจำวัน"], f:[
  (v) => short(v, 20) ? [SHORTMSG] : (/แยก|แบ่ง|จัด|พับ|แขวน|วาง|ติดป้าย/.test(v) && (nlLines(v).length >= 2 || /(^|\s)(1|2|๑|๒)\s*[).]/.test(v) || String(v).split(/[,;·、]|\s+และ\s+/).filter(x => x.trim().length >= 3).length >= 2)) ? [] : ["ควรบอกอย่างน้อย 3 ปัญหาย่อย (ขึ้นบรรทัดใหม่) เช่น แยกตามประเภท แยกตามสี จัดวาง ติดป้าย"],
  (v) => short(v, 15) ? [SHORTMSG] : (/ประเภท|สี|ชนิด|ลักษณะ|โอกาส|ฤดู|ขนาด/.test(v) && /(ซ้ำ|เหมือน|เดียวกัน|กลุ่ม|แยก)/.test(v)) ? [] : ["ควรบอกลักษณะที่ซ้ำและการจัดกลุ่ม เช่น ประเภทเดียวกันจัดเป็นกลุ่มเดียวกัน"],
  (v) => short(v, 20) ? [SHORTMSG] : (/ประเภท|สี|ชนิด/.test(v) && /เพราะ|เนื่องจาก|เหตุผล/.test(v) && /(ยี่ห้อ|ราคา|วันที่|ตัดทิ้ง|ไม่ต้อง|ไม่เกี่ยว|ไม่ใช้)/.test(v)) ? [] : ["ควรเลือก 1 เกณฑ์ เช่น ประเภท พร้อมเหตุผล และบอกสิ่งที่ไม่ต้องใช้ เช่น ยี่ห้อ ราคา"],
  (v) => short(v, 40) ? [SHORTMSG] : (stepsM2(v, 5) && /เริ่ม/.test(v) && /(จบ|สิ้นสุด|เสร็จ)/.test(v) && /(เสื้อ|กางเกง|ตู้|แยก|จัด)/.test(v)) ? [] : ["ควรเขียนอย่างน้อย 5 ข้อ (ขึ้นบรรทัดใหม่) มีเริ่ม แยก/จัดกลุ่ม จัดวาง และจบ"],
  (v) => short(v, 40) ? [SHORTMSG] : (/วิธีที่ ?1|วิธี ?1|1\)/.test(v) && /วิธีที่ ?2|วิธี ?2|2\)/.test(v) && /เลือก/.test(v) && /เพราะ|เนื่องจาก|เหตุผล/.test(v)) ? [] : ["ควรยกตัวอย่าง 2 วิธี เลือก 1 วิธี พร้อมเหตุผล (เพราะ...)"],
  (v) => short(v, 25) ? [SHORTMSG] : hitN(v, [/แยกย่อย|แบ่ง|แยก/, /รูปแบบ|ซ้ำ|กฎ/, /นามธรรม|ตัด|ไม่เกี่ยว/, /ขั้นตอน|อัลกอริทึม|เรียง/]) >= 2 ? [] : ["ควรเล่าปัญหา 1 เรื่อง และบอกว่าใช้แนวคิดใดช่วย เช่น แยกย่อย หารูปแบบ ขั้นตอน"]
] };
R1["u21-4"] = { titles:["วิเคราะห์ปัญหา", "แยกย่อย", "รูปแบบและนามธรรม", "อัลกอริทึมจัดตาราง", "ตารางและการตรวจสอบ", "เลือกวิธีด้วยวิจารณญาณ"], f:[
  (v) => short(v, 40) ? [SHORTMSG] : (/(ข้อมูล|มี)/.test(v) && /เงื่อนไข/.test(v) && /(ผลลัพธ์|ตาราง|ต้องการ)/.test(v)) ? [] : ["ควรเขียนให้ครบ 3 อย่าง: ข้อมูลที่มี เงื่อนไข และผลลัพธ์ที่ต้องการ"],
  (v) => short(v, 15) ? [SHORTMSG] : (/ห้อง|คาบ|ทีละ|ส่วน|ย่อย/.test(v)) ? [] : ["ควรแยกปัญหา เช่น พิจารณาทีละห้องหรือทีละคาบ"],
  (v) => short(v, 30) ? [SHORTMSG] : (/ว่ายน้ำ|ไม่ว่าง|ติด|ข้อจำกัด|คาบ ?1|คาบ ?3|ซ้ำ/.test(v) && /(ไม่เกี่ยว|ไม่ต้อง|ตัด|ไม่ใช้)/.test(v)) ? [] : ["ควรบอกข้อจำกัดสำคัญ (ม.2/2 ไม่ว่างคาบ 1, ม.2/3 ไม่ว่างคาบ 3) และสิ่งที่ไม่เกี่ยวข้อง"],
  (v) => short(v, 40) ? [SHORTMSG] : (stepsM2(v, 5) && /เริ่ม/.test(v) && /(จบ|สิ้นสุด|เสร็จ)/.test(v) && /(ห้อง|คาบ)/.test(v)) ? [] : ["ควรเขียนอย่างน้อย 5 ข้อ (ขึ้นบรรทัดใหม่) มีเริ่ม จัดห้องที่มีข้อจำกัดก่อน ตรวจสอบ และจบ"],
  (v) => { if(short(v, 25)) return [SHORTMSG]; const m = []; const get = (re) => { const x = v.match(re); return x ? x[0] : ""; };
    const hasAll = /(ม\.?\s?2\/1|2\/1)/.test(v) && /(ม\.?\s?2\/2|2\/2)/.test(v) && /(ม\.?\s?2\/3|2\/3)/.test(v);
    if(!hasAll) m.push("ควรเขียนตารางให้ครบทั้ง 3 ห้อง (ม.2/1, ม.2/2, ม.2/3) และ 3 คาบ");
    if(/(ม\.?\s?2\/2|2\/2)[^\d]{0,12}(คาบ ?)?1\b/.test(v) && !/(ม\.?\s?2\/2|2\/2)[^\d]{0,12}(คาบ ?)?[23]/.test(v)) m.push("ม.2/2 ติดว่ายน้ำคาบ 1 จึงใช้คาบ 1 ไม่ได้");
    if(!/ตรวจ|เงื่อนไข|ถูกต้อง|ไม่ซ้ำ/.test(v)) m.push("ควรบอกวิธีตรวจสอบว่าตรงตามเงื่อนไข");
    return m; },
  (v) => short(v, 20) ? [SHORTMSG] : (/เลือก|วิธี/.test(v) && /เพราะ|เนื่องจาก|เหตุผล/.test(v)) ? [] : ["ควรเลือกวิธีและบอกเหตุผล (เพราะ...) เช่น ความยุติธรรม ความถูกต้อง"]
] };

R1["u21-6"] = { titles:["แยกย่อย: งานวันเกิด", "แยกย่อย: รายงานกลุ่ม", "หารูปแบบ: 5 10 15 20", "หารูปแบบ: ขั้นตอนทำการบ้าน", "นามธรรม: แผนที่รถไฟฟ้า", "นามธรรม: ผังห้องเรียน", "อัลกอริทึม: หาค่ามากที่สุด", "อัลกอริทึม: ยืมหนังสือ"], f:[
  (v) => short(v, 20) ? [SHORTMSG] : (nlLines(v).length >= 3 || /(^|\s)(1|2|3|๑|๒|๓)\s*[).]/.test(v) || String(v).split(/[,;·、]|\s+และ\s+/).filter(x => x.trim().length >= 3).length >= 3) ? [] : ["ควรบอกอย่างน้อย 4 ปัญหาย่อย (ขึ้นบรรทัดใหม่) เช่น เลือกสถานที่ เชิญเพื่อน เตรียมอาหาร ของขวัญ"],
  (v) => short(v, 20) ? [SHORTMSG] : (/แบ่ง|แยก|ให้|รับผิดชอบ|คน/.test(v) && /ค้น|เขียน|ทำ|จัด|ตรวจ|รูป|หน้า/.test(v)) ? [] : ["ควรบอกงานย่อย (เช่น ค้นข้อมูล เขียน ทำรูป จัดหน้า) และแบ่งให้สมาชิก"],
  (v) => short(v, 5) ? [SHORTMSG] : (hasNo(v, 25) && /(เพิ่ม|บวก|ทีละ|\+).{0,10}5|5.{0,8}(เพิ่ม|บวก|ทีละ)/.test(v)) ? [] : ["ตัวต่อไปคือ 25 เพราะเพิ่มทีละ 5 ควรตอบทั้งตัวเลขและกฎ"],
  (v) => short(v, 20) ? [SHORTMSG] : (/ซ้ำ|เหมือน|ทุกวิชา|เดียวกัน/.test(v) && /อ่าน|ทำ|ตรวจ|โจทย์|ข้อ/.test(v)) ? [] : ["ควรบอกขั้นตอนที่ซ้ำกัน เช่น อ่านโจทย์ ทำ ตรวจคำตอบ และใช้ซ้ำได้ทุกวิชา"],
  (v) => short(v, 25) ? [SHORTMSG] : (/สถานี|เส้นทาง|สาย|ชื่อ/.test(v) && /(ตัด|ไม่ต้อง|ไม่เกี่ยว|ไม่จำเป็น|ออก)/.test(v)) ? [] : ["ควรบอกว่าเก็บชื่อสถานีและเส้นทาง และตัดสิ่งที่ไม่จำเป็น เช่น รูปอาคาร สีรถ"],
  (v) => short(v, 25) ? [SHORTMSG] : (/ห้อง|ตึก|ชั้น|ทาง/.test(v) && /(ตัด|ไม่ต้อง|ไม่เกี่ยว|ไม่จำเป็น|ออก)/.test(v)) ? [] : ["ควรบอกว่าเก็บชื่อห้อง ตึก ชั้น ทางเดิน และตัดสิ่งที่ไม่จำเป็น เช่น ต้นไม้ สีผนัง"],
  (v) => short(v, 40) ? [SHORTMSG] : (stepsM2(v, 5) && /เริ่ม/.test(v) && /(จบ|สิ้นสุด|เสร็จ)/.test(v) && /(มากที่สุด|max|มากกว่า|>|เปรียบเทียบ)/i.test(v) && /[abc]/i.test(v)) ? [] : ["ควรเขียนอย่างน้อย 5 ข้อ มีเริ่ม รับค่า a b c เปรียบเทียบทีละค่า เก็บค่ามากที่สุด และจบ"],
  (v) => short(v, 40) ? [SHORTMSG] : (stepsM2(v, 5) && /เริ่ม/.test(v) && /(จบ|สิ้นสุด|เสร็จ)/.test(v) && /หนังสือ/.test(v) && /(บัตร|บันทึก|เคาน์เตอร์|ค้น)/.test(v)) ? [] : ["ควรเขียนอย่างน้อย 5 ข้อ เช่น ค้นหนังสือ ไปเคาน์เตอร์ แสดงบัตร บันทึกการยืม รับหนังสือ"]
] };

function run1(n, vals){
  const rule = R1[n]; if(!rule) return null;
  const F = rule.f.map((fn, i) => { let msgs; try{ msgs = fn(vals[i] || "", vals); }catch(e){ msgs = ["ตรวจข้อนี้ไม่ได้ — ลองเขียนใหม่ให้ชัดเจนขึ้น"]; } return { ok:!msgs.length, title:rule.titles[i], msgs, note:"" }; });
  const man = rule.manual || [];                       // ข้อที่ให้ครูตรวจเอง: ไม่นับคะแนนระบบ ไม่ขึ้นถูก/ผิด
  F.forEach((x, i) => { if(man.includes(i)){ x.manual = true; x.ok = true; x.msgs = []; } });
  const auto = F.filter(x => !x.manual);
  return { fields:F, score:auto.filter(x => x.ok).length, max:auto.length };
}

const blocksFromText = (txt) => { const p = linkParam(txt || "", "p"); if(!p) return null; try{ const d = b64d(p); return { d, bs:allBlocks(d) }; }catch(e){ return null; } };
// จดผลตรวจรายข้อ (ถูก/ผิด + เหตุผล) ไว้ให้ submitwork.js ส่งไปกับคำตอบ เพื่อให้ครูเห็นว่าข้อไหนผ่านหรือไม่ผ่าน
const keepItems = (fn) => (n, vals) => { const r = fn(n, vals); window.__wsItems = r && r.fields ? { ta: r.fields.map(f => f.manual ? { manual:true } : { ok:!!f.ok, hint:(f.msgs || []).join(" · ") }) } : null; return r; };
window.WSCheck = { blocksFromText, util:{ has, count, hasStr }, run8, run, run1, rules:R, runCode, analyzeCode };
window.WSCheck.run = keepItems(run); window.WSCheck.run1 = keepItems(run1);
})();
