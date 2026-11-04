/* unitinfo.js — กล่อง "ตัวชี้วัด · จุดประสงค์ · สมรรถนะ · คุณลักษณะ" บนหน้าใบความรู้ ใบงาน และแบบทดสอบ
 * ใช้กับ ม.1 หน่วย 3 (content/m1-cs-2) และ ม.3 หน่วย 1–2 (content/m3-cs-0, m3-cs-1)
 * จุดประสงค์ของ ม.3 มาจากแผนการจัดการเรียนรู้ อจท. ส่วน ม.1 หน่วย 3 สรุปตามใบความรู้ของหน่วย
 * ใส่ <script src="../../assets/js/unitinfo.js"></script> ท้ายหน้า
 */
(function(){
  const dir = (location.pathname.match(/\/content\/([a-z0-9-]+)\//i) || [])[1];
  const file = (location.pathname.split("/").pop() || "").replace(/\.html$/i, "");
  const C = { C1:"ความสามารถในการสื่อสาร", C2:"ความสามารถในการคิด", C3:"ความสามารถในการแก้ปัญหา", C4:"ความสามารถในการใช้ทักษะชีวิต", C5:"ความสามารถในการใช้เทคโนโลยี" };
  const STD = "ว 4.2 เข้าใจและใช้แนวคิดเชิงคำนวณในการแก้ปัญหาที่พบในชีวิตจริงอย่างเป็นขั้นตอนและเป็นระบบ ใช้เทคโนโลยีสารสนเทศและการสื่อสารในการเรียนรู้ การทำงาน และการแก้ปัญหาได้อย่างมีประสิทธิภาพ รู้เท่าทัน และมีจริยธรรม";
  const UNITS = {
    "m3-cs-0": { name:"ม.3 หน่วยที่ 1 การจัดการข้อมูลและสารสนเทศ", ind:["ว 4.2 ม.3/2", "รวบรวมข้อมูล ประมวลผล ประเมินผล นำเสนอข้อมูลและสารสนเทศตามวัตถุประสงค์ โดยใช้ซอฟต์แวร์หรือบริการบนอินเทอร์เน็ตที่หลากหลาย"],
      O:["บอกลักษณะและประเภทของข้อมูลได้ (K)", "เลือกวิธีรวบรวมข้อมูลได้เหมาะสมกับประเภทข้อมูล (K, P)", "ตระหนักถึงความสำคัญของวิธีการรวบรวมข้อมูล (A)",
         "บอกประเภทของการประมวลผลข้อมูลได้ (K)", "เลือกวิธีประมวลผลข้อมูลได้เหมาะสมกับประเภทของข้อมูล (K, P)", "ยกตัวอย่างประโยชน์ของการประมวลผลข้อมูลได้ (A)",
         "ใช้ซอฟต์แวร์ที่เหมาะสมในการจัดการข้อมูลและสารสนเทศตรงวัตถุประสงค์ได้ (K, P)", "ตระหนักว่าข้อมูลที่นำเสนอไม่ควรส่งผลกระทบต่อผู้อื่น (A)"],
      P:{ knowledge:[1,2,3,4,5,6,7,8], list:[1,2,3,4,5,6,7,8], quiz:[1,2,4,5,7],
          "worksheet-31-1":[1,2,3], "worksheet-31-2":[1,2], "worksheet-31-3":[4,5,6], "worksheet-31-4":[4,5], "worksheet-31-5":[7,8], "worksheet-31-6":[2,5,7], "worksheet-31-7":[1,2,4,5,7], "worksheet-31-8":[1,5] } },
    "m3-cs-1": { name:"ม.3 หน่วยที่ 2 ความน่าเชื่อถือของข้อมูล", ind:["ว 4.2 ม.3/3", "ประเมินความน่าเชื่อถือของข้อมูล วิเคราะห์สื่อและผลกระทบจากการให้ข่าวสารที่ผิด เพื่อการใช้งานอย่างรู้เท่าทัน"],
      O:["บอกขั้นตอนการสืบค้นเพื่อหาแหล่งข้อมูลด้วยอินเทอร์เน็ตได้ (K)", "ค้นหาข้อมูลได้ตรงตามวัตถุประสงค์ (P)", "ค้นหาข้อมูลที่มีความน่าเชื่อถือและมีคุณค่าสำหรับการนำไปใช้ประโยชน์ได้ (P, A)",
         "บอกหลักการประเมินความน่าเชื่อถือของข้อมูลได้ (K)", "ประเมินความน่าเชื่อถือของข้อมูลได้ (P)", "คำนึงถึงผลกระทบที่เกิดขึ้นจากการใช้เหตุผลวิบัติได้ (A)",
         "บอกความหมายการรู้เท่าทันสื่อดิจิทัลและการรู้เท่าทันสื่อได้ (K)", "วิเคราะห์ความน่าเชื่อถือและประเมินผลกระทบของข้อมูลจากข่าวสารที่ผิด เพื่อการใช้งานอย่างรู้เท่าทันได้ (P, A)"],
      P:{ knowledge:[1,2,3,4,5,6,7,8], list:[1,2,3,4,5,6,7,8], quiz:[1,4,5,7,8],
          "worksheet-32-1":[1,2], "worksheet-32-2":[1,2], "worksheet-32-3":[2,3], "worksheet-32-4":[3,4,5], "worksheet-32-5":[5,6,8], "worksheet-32-6":[7], "worksheet-32-7":[4,7], "worksheet-32-8":[5,6,8], "worksheet-32-9":[1,2,5,7], "worksheet-32-10":[3,5] },
      MORE:{ "worksheet-32-5":["ซื่อสัตย์สุจริต", "มีจิตสาธารณะ"], "worksheet-32-6":["ซื่อสัตย์สุจริต", "มีจิตสาธารณะ"], "worksheet-32-7":["ซื่อสัตย์สุจริต"], "worksheet-32-8":["ซื่อสัตย์สุจริต", "มีจิตสาธารณะ"] } },
    "m2-cs-0": { name:"ม.2 หน่วยที่ 1 แก้ปัญหาด้วยแนวคิดเชิงคำนวณ", ind:["ว 4.2 ม.2/1", "ออกแบบอัลกอริทึมที่ใช้แนวคิดเชิงคำนวณในการแก้ปัญหาหรือการทำงานที่พบในชีวิตจริง"],
      O:["อธิบายความหมายของแนวคิดเชิงคำนวณได้ (K)", "อธิบายองค์ประกอบของแนวคิดเชิงคำนวณได้ (K)", "ออกแบบอัลกอริทึมเพื่อแก้ปัญหาผ่านการประยุกต์ใช้แนวคิดเชิงคำนวณได้ (K, P)", "เห็นประโยชน์ของการใช้แนวคิดเชิงคำนวณในการแก้ปัญหา (K, P, A)",
         "อธิบายแนวทางการแก้ปัญหาที่ประยุกต์ใช้แนวคิดเชิงคำนวณได้ (K)", "อธิบายแนวทางการวิเคราะห์และวางแผนการแก้ปัญหาจากสถานการณ์โดยใช้แนวคิดเชิงคำนวณได้ (K)", "พิจารณาสถานการณ์และเลือกวิธีการแก้ปัญหาอย่างมีวิจารณญาณได้ (K, P, A)"],
      P:{ knowledge:[1,2,3,4,5,6,7], list:[1,2,3,4,5,6,7], quiz:[1,2,3,4],
          "worksheet-21-1":[1,2,3,4], "worksheet-21-2":[2,3], "worksheet-21-3":[3,4,5], "worksheet-21-4":[3,4,6,7], "worksheet-21-5":[1,2,3,5], "worksheet-21-6":[2,3,4], "worksheet-21-7":[2,3], "worksheet-21-8":[2,3], "worksheet-21-9":[2,3], "worksheet-21-10":[2,3], "worksheet-21-11":[2,3], "worksheet-21-12":[2,3], "worksheet-21-13":[2,3,4], "worksheet-21-14":[2,3,4], "worksheet-21-15":[1,2,3,4], "worksheet-21-16":[2,3,4], "worksheet-21-17":[2,3,4], "worksheet-21-18":[2,3,4], "worksheet-21-19":[2,3,4], "worksheet-21-20":[2,3,4], "worksheet-21-21":[2,3,4], "worksheet-21-22":[2,3,4] } },
    "p4-cs-0": { name:"ป.4 หน่วยที่ 1 ขั้นตอนวิธีการแก้ปัญหา", ind:["ว 4.2 ป.4/1", "ใช้เหตุผลเชิงตรรกะในการแก้ปัญหา การอธิบายการทำงาน การคาดการณ์ผลลัพธ์จากปัญหาอย่างง่าย"],
      O:["อธิบายการทำงานและการคาดการณ์ผลลัพธ์โดยใช้เหตุผลเชิงตรรกะและอัลกอริทึมได้ (K)", "ใช้เหตุผลเชิงตรรกะและอัลกอริทึมในการแก้ปัญหาอย่างง่ายได้ (K, P)", "เห็นประโยชน์ของการแก้ปัญหาในชีวิตประจำวันโดยใช้เหตุผลเชิงตรรกะและอัลกอริทึม (A)",
         "อธิบายหลักการเขียนอัลกอริทึมด้วยข้อความและรหัสลำลองได้ (K)", "อธิบายหลักการทำงานของอัลกอริทึมด้วยผังงานได้ (K)", "แสดงอัลกอริทึมเพื่อแก้ปัญหาด้วยข้อความ รหัสลำลอง และผังงานได้อย่างถูกต้อง (K, P, A)"],
      P:{ knowledge:[1,2,3,4,5,6], list:[1,2,3,4,5,6], quiz:[1,2,4,5],
          "worksheet-41-1":[1,2,3], "worksheet-41-2":[1,4,5], "worksheet-41-3":[2,4], "worksheet-41-4":[1,5], "worksheet-41-5":[2,3,6], "worksheet-41-6":[1,2,4,5] } },
    "p6-cs-0": { name:"ป.6 หน่วยที่ 1 การแก้ปัญหา", ind:["ว 4.2 ป.6/1", "ใช้เหตุผลเชิงตรรกะในการอธิบายและออกแบบวิธีการแก้ปัญหาที่พบในชีวิตประจำวัน"],
      O:["ใช้เหตุผลเชิงตรรกะในการแก้ปัญหา (K)", "อธิบายขั้นตอนการทำงานและผลลัพธ์ของรหัสลำลอง (K)", "แก้ปัญหาโดยใช้เหตุผลเชิงตรรกะ (K)", "อธิบายขั้นตอนการทำงานและผลลัพธ์ของผังงาน (K)", "วิเคราะห์สถานการณ์และการทำงานของผังงานที่มีการตรวจสอบเงื่อนไข (K)", "อธิบายขั้นตอนการทำงานหรือแก้ปัญหาที่มีหลายทางเลือก (K)",
         "แก้ปัญหาโดยใช้เหตุผลเชิงตรรกะในสถานการณ์ที่หลากหลาย (P)", "เขียนรหัสลำลองแสดงขั้นตอนการแก้ปัญหาหรือการทำงานแบบลำดับในชีวิตประจำวัน (P)", "แก้ปัญหาและแสดงขั้นตอนการแก้ปัญหาด้วยรหัสลำลอง (P)", "เขียนผังงานแสดงขั้นตอนการแก้ปัญหาหรือการทำงานในชีวิตประจำวัน (P)", "เขียนผังงานแสดงขั้นตอนการแก้ปัญหาที่มีการตรวจสอบเงื่อนไข (P)", "เขียนผังงานแสดงวิธีการทำงานหรือแก้ปัญหาที่มีหลายทางเลือก (P)"],
      CP:["แก้ปัญหาโดยใช้เหตุผลเชิงตรรกะในสถานการณ์ที่หลากหลาย", "เขียนรหัสลำลองแสดงขั้นตอนการแก้ปัญหาหรือการทำงานแบบลำดับในชีวิตประจำวัน", "เขียนรหัสลำลองแสดงวิธีในการแก้ปัญหาโดยใช้เหตุผลเชิงตรรกะ", "เขียนผังงานแสดงขั้นตอนการทำงานในชีวิตประจำวัน", "วิเคราะห์สถานการณ์และเขียนขั้นตอนการแก้ปัญหาที่มีการตรวจสอบเงื่อนไขโดยใช้ผังงาน", "แสดงวิธีในการทำงานหรือแก้ปัญหาที่มีหลายทางเลือกโดยใช้ผังงาน"],
      TR:["ใฝ่เรียนรู้", "มุ่งมั่นในการทำงาน"],
      P:{ knowledge:[1,2,3,4,5,6], list:[1,2,3,4,5,6,7,8,9,10,11,12], quiz:[1,2,4,5],
          "worksheet-61-1":[1,7], "worksheet-61-2":[2,8], "worksheet-61-3":[3,9], "worksheet-61-4":[4,10], "worksheet-61-5":[5,11], "worksheet-61-6":[6,12], "worksheet-61-7":[4,6,10,12], "worksheet-61-8":[1,2,3,4,5,6], "worksheet-61-9":[4,5,10,11] },
      CPM:{ knowledge:[1,2,3,4,5,6], list:[1,2,3,4,5,6], quiz:[1,4,5], "worksheet-61-1":[1], "worksheet-61-2":[2], "worksheet-61-3":[3], "worksheet-61-4":[4], "worksheet-61-5":[5], "worksheet-61-6":[6], "worksheet-61-7":[4,6], "worksheet-61-8":[1,2,3,4,5,6], "worksheet-61-9":[4,5] } },
    "p2-cs-0": { name:"ป.2 หน่วยที่ 1 การแก้ปัญหา", ind:["ว 4.2 ป.2/1", "แสดงลำดับขั้นตอนการทำงานหรือการแก้ปัญหาอย่างง่ายโดยใช้ภาพ สัญลักษณ์ หรือข้อความ"],
      O:["บอกขั้นตอนการแก้ปัญหาอย่างง่ายได้ (K)", "บอกแนวทางการค้นหาอย่างเป็นระบบได้ (K)", "แสดงขั้นตอนการแก้ปัญหาด้วยภาพหรือสัญลักษณ์ทิศทางได้ (P)", "แก้ปัญหาโดยเรียงลำดับขั้นตอนการทำกิจกรรมต่าง ๆ (P)", "แก้ปัญหาโดยการค้นหาอย่างเป็นระบบ (P)", "แก้ปัญหาโดยการค้นหาอย่างเป็นระบบ และเขียนแสดงวิธีการหาคำตอบ (P)", "นำขั้นตอนการแก้ปัญหาไปใช้แก้สถานการณ์ง่าย ๆ ในชีวิตประจำวันได้ (P)",
         "เห็นคุณค่าของการทำงานเพื่อช่วยเหลือตนเองและครอบครัว (A)", "เห็นคุณค่าของการทำงานเพื่อช่วยเหลือตนเอง (A)"],
      CP:["แก้ปัญหาโดยการเรียงลำดับขั้นตอนในการทำกิจกรรมต่าง ๆ และเห็นคุณค่าของการทำงานเพื่อช่วยเหลือตนเองและครอบครัว", "แก้ปัญหาโดยการเรียงลำดับขั้นตอนในการทำกิจกรรมต่าง ๆ และเห็นคุณค่าของการทำงานเพื่อช่วยเหลือตนเอง", "แก้ปัญหาโดยการค้นหาอย่างเป็นระบบ และเขียนแสดงวิธีการหาคำตอบในการแก้ปัญหาได้"],
      TR:["ใฝ่เรียนรู้", "มุ่งมั่นในการทำงาน"],
      P:{ knowledge:[1,2,3,4,5,6,7,8,9], list:[1,2,3,4,5,6,7,8,9], quiz:[1,3,7],
          "worksheet-71-1":[4,8], "worksheet-71-2":[4,9], "worksheet-71-3":[4,7], "worksheet-71-4":[2,5], "worksheet-71-5":[5,6], "worksheet-71-6":[5,6], "worksheet-71-7":[3] },
      CPM:{ knowledge:[1,2,3], list:[1,2,3], quiz:[1], "worksheet-71-1":[1], "worksheet-71-2":[2], "worksheet-71-3":[2], "worksheet-71-4":[3], "worksheet-71-5":[3], "worksheet-71-6":[3] } },
    "m1-cs-2": { name:"ม.1 หน่วยที่ 3 การจัดการข้อมูลและสารสนเทศ", ind:["ว 4.2 ม.1/3", "รวบรวมข้อมูลปฐมภูมิ ประมวลผล ประเมินผล นำเสนอข้อมูล และสารสนเทศ ตามวัตถุประสงค์โดยใช้ซอฟต์แวร์หรือบริการบนอินเทอร์เน็ตที่หลากหลาย"],
      O:["อธิบายความแตกต่างระหว่างข้อมูลปฐมภูมิและข้อมูลทุติยภูมิ และวัฏจักรการประมวลผลสารสนเทศได้", "จำแนกประเภทซอฟต์แวร์และเลือกใช้ให้เหมาะสมกับงานได้", "สืบค้น รวบรวม ประมวลผล และนำเสนอสารสนเทศได้อย่างถูกต้องและน่าเชื่อถือ"],
      P:{ knowledge:[1,2,3], list:[1,2,3], quiz:[1,2,3],
          "worksheet-3-1":[1,2], "worksheet-3-2":[1,3], "worksheet-3-3":[1], "worksheet-3-4":[1,2], "worksheet-3-5":[1,3], "worksheet-3-6":[1,3], "worksheet-3-7":[2], "worksheet-3-8":[3], "worksheet-3-9":[1,2,3] } }
  };
  const TESTS = ["quiz", "worksheet-31-7", "worksheet-32-9", "worksheet-3-9", "worksheet-41-6", "worksheet-21-5"];
  const DRAGS = ["worksheet-31-2", "worksheet-31-4", "worksheet-32-2", "worksheet-32-7", "worksheet-3-4", "worksheet-41-2", "worksheet-41-4", "worksheet-21-2", "worksheet-61-9", "worksheet-71-1", "worksheet-71-2", "worksheet-71-3", "worksheet-71-4", "worksheet-71-5", "worksheet-71-6"];
  const GAMEF = /^(game|game-[a-z-]+|variable-slides|blocks|flowchart|pseudocode)$/.test(file);
  const kind = GAMEF ? "game" : file === "knowledge" ? "know" : TESTS.includes(file) ? "test" : (DRAGS.includes(file) || /^worksheet-21-(7|8|9|10|11|12|13|14|16|18|20|21)$/.test(file)) ? "drag" : file === "worksheet" ? "list" : "text";
  const cs = { know:["C1", "C2", "C5"], list:["C1", "C2", "C3", "C5"], text:["C1", "C2", "C3", "C5"], drag:["C2", "C5"], test:["C2", "C3"], game:["C2", "C3", "C5"] }[kind];
  const TR = { know:["ใฝ่เรียนรู้"], list:["ใฝ่เรียนรู้", "มุ่งมั่นในการทำงาน", "ซื่อสัตย์สุจริต"], text:["ใฝ่เรียนรู้", "มุ่งมั่นในการทำงาน"], drag:["ใฝ่เรียนรู้", "มุ่งมั่นในการทำงาน"], test:["ซื่อสัตย์สุจริต", "มีวินัย"], game:["ใฝ่เรียนรู้", "มุ่งมั่นในการทำงาน"] }[kind];
  const what = { know:"ใบความรู้นี้", list:"ใบงานชุดนี้", text:"ใบงานนี้", drag:"ใบงานนี้", test:"แบบทดสอบนี้", game:(/^(blocks|flowchart|pseudocode)$/.test(file) ? "โปรแกรมนี้" : file === "variable-slides" ? "สไลด์นี้" : "เกมนี้") }[kind] || "หน้านี้";
  const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const css = document.createElement("style");
  css.textContent = `
  .ui-box{ background:linear-gradient(135deg,#EFF6FF,#F5F3FF); border:2px solid #C7D2FE; border-radius:16px; padding:12px 16px; margin:0 0 16px; font-family:"Sarabun","TH Sarabun New",sans-serif; font-size:.88rem; line-height:1.65; color:#1F2430; box-shadow:0 3px 8px rgba(67,56,202,.08); text-align:left; }
  .ui-box .ui-h{ font-weight:800; color:#4338CA; margin-bottom:4px; }
  .ui-box .ui-ind{ background:#fff; border:1px solid #DDD6FE; border-radius:12px; padding:6px 10px; margin:4px 0 6px; }
  .ui-box .ui-ind b{ color:#6D28D9; }
  .ui-box .ui-row{ display:flex; flex-wrap:wrap; gap:4px 6px; align-items:center; margin-top:4px; }
  .ui-box .ui-lab{ font-weight:700; color:#475569; margin-right:2px; }
  .ui-box .ui-chip{ display:inline-block; border-radius:99px; padding:0 10px; font-weight:700; font-size:.78rem; }
  .ui-box .ui-c{ background:#BBF7D0; color:#14532D; } .ui-box .ui-t{ background:#FBCFE8; color:#831843; }
  .ui-box ul{ margin:2px 0 0; padding-left:20px; }
  details.ui-fold{ font-family:"Sarabun","TH Sarabun New",sans-serif; font-size:.85rem; margin:6px 10px; flex:none; text-align:left; } details.ui-fold > summary{ cursor:pointer; font-weight:700; color:#4338CA; background:#EEF2FF; border:1px solid #C7D2FE; border-radius:999px; padding:3px 14px; display:inline-block; list-style:none; } details.ui-fold[open] > summary{ margin-bottom:6px; } details.ui-fold .ui-box{ margin:0; max-height:50vh; overflow:auto; }
  .ui-box .ui-std{ font-size:.78rem; color:#64748B; margin-top:4px; }
  @media print{ .ui-box{ box-shadow:none; } }`;
  document.head.appendChild(css);
  // inds = [[รหัส, ข้อความ], ...] · objs = ข้อความจุดประสงค์ (ว่าง = ไม่แสดง) · compact = แสดงเฉพาะตัวชี้วัดกับคุณลักษณะ (หน้าที่มีกล่องสมรรถนะของตัวเองอยู่แล้ว)
  function render(inds, objs, extraTraits, compact, comps, traits){
    const ts = (traits || TR).concat(extraTraits || []);
    const box = document.createElement("div");
    box.className = "ui-box";
    box.innerHTML = `<div class="ui-h">🎯 ${esc(what)}ทำแล้วได้ตามตัวชี้วัด${compact ? "" : "และจุดประสงค์"}</div>` +
      inds.map(r => `<div class="ui-ind">📌 <b>ตัวชี้วัด ${esc(r[0])}</b> ${esc(r[1])}</div>`).join("") +
      (!compact && objs && objs.length ? `<div>🎯 <b>จุดประสงค์การเรียนรู้</b></div><ul>${objs.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : "") +
      (!compact && comps && comps.length ? `<div>🧩 <b>สมรรถนะที่ต้องการให้เกิดกับผู้เรียน (KSA)</b></div><ul>${comps.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : "") +
      (compact ? "" : `<div class="ui-row"><span class="ui-lab">🧠 สมรรถนะสำคัญของผู้เรียน:</span>${cs.map(k => `<span class="ui-chip ui-c">${esc(C[k])}</span>`).join("")}</div>`) +
      `<div class="ui-row"><span class="ui-lab">🌟 คุณลักษณะอันพึงประสงค์:</span>${ts.map(t => `<span class="ui-chip ui-t">${esc(t)}</span>`).join("")}</div>` +
      `<div class="ui-std">มาตรฐาน ${esc(STD)}</div>`;
    if(!compact){ const st = document.createElement("style"); st.textContent = ".obj-box{ display:none !important; }"; document.head.appendChild(st); }
    if(GAMEF){   // เกม/เครื่องมือ: พับเก็บไว้ใต้หัวหน้า ไม่รบกวนหน้าจอเล่น
      const dt = document.createElement("details"); dt.className = "ui-fold"; dt.innerHTML = `<summary>🎯 ตัวชี้วัด · จุดประสงค์ · สมรรถนะ · คุณลักษณะ ของ${esc(what.replace("นี้", ""))}</summary>`; dt.append(box);
      const h = document.querySelector("header"); if(h && h.parentNode) h.parentNode.insertBefore(dt, h.nextSibling); else document.body.insertBefore(dt, document.body.firstChild); return;
    }
    const main = document.querySelector("main");
    const anchor = document.querySelector("main .oc-box") || document.querySelector("main .card.intro, main .intro");
    if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor.nextSibling);
    else if(main) main.insertBefore(box, main.firstChild);
    else { const h = document.querySelector("header"); if(h && h.parentNode) h.parentNode.insertBefore(box, h.nextSibling); else document.body.insertBefore(box, document.body.firstChild); }
  }
  const U = UNITS[dir];
  if(U){
    const idx = U.P[file === "worksheet" ? "list" : file] || (GAMEF ? U.O.map((_, i) => i + 1) : null); if(!idx) return;
    const ck = file === "worksheet" ? "list" : file;
    render([U.ind], idx.map(i => U.O[i - 1]), (U.MORE && U.MORE[file]) || [], false, U.CP && U.CPM && U.CPM[ck] ? U.CPM[ck].map(i => U.CP[i - 1]) : null, U.TR || null);
    return;
  }
  // หน่วยอื่น ๆ: ดึงตัวชี้วัดจาก standards.js และจุดประสงค์จาก .obj-box ของใบความรู้หน่วยเดียวกัน
  const m = /^([a-z]\d)-([a-z]+)-(\d+)$/.exec(dir || ""); if(!m) return;
  const ukey = m[1] + "/" + m[2] + "/" + m[3];
  if(!GAMEF && file !== "knowledge" && file !== "quiz" && file !== "worksheet" && !/^worksheet-/.test(file)) return;
  const loadStd = () => new Promise(res => {
    if(typeof UNIT_STANDARDS !== "undefined") return res();
    const sc = document.createElement("script"); sc.src = "../../assets/js/standards.js?v=6"; sc.onload = () => res(); sc.onerror = () => res(); document.head.appendChild(sc);
  });
  const getObjs = async () => {
    if(file === "knowledge") return [...document.querySelectorAll(".obj-box li")].map(li => li.textContent.trim()).filter(Boolean);
    try{ const doc = new DOMParser().parseFromString(await (await fetch("knowledge.html")).text(), "text/html"); return [...doc.querySelectorAll(".obj-box li")].map(li => li.textContent.trim()).filter(Boolean); }catch(e){ return []; }
  };
  loadStd().then(async () => {
    const st = typeof UNIT_STANDARDS !== "undefined" && UNIT_STANDARDS[ukey]; if(!st || !st.indicators || !st.indicators.length) return;
    const compact = dir === "m1-cs-1" && !!(window.KrtomOutcomes && KrtomOutcomes.PAGES[file]);                // ม.1 หน่วย 2 มีกล่องจุดประสงค์/สมรรถนะอยู่แล้ว (outcomes.js) จึงเพิ่มเฉพาะตัวชี้วัดและคุณลักษณะ
    const objs = compact ? [] : await getObjs();
    render(st.indicators.map(r => [r.code, r.text]), objs, [], compact);
  });
})();
