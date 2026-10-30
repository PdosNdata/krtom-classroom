/* askdlg.js — กล่องยืนยันสวย ๆ (SweetAlert2) แทน confirm() ของเบราว์เซอร์
 * ใช้: if(await askConfirm("ข้อความ", { title, confirmText, danger })) { ... }
 * ถ้าโหลด SweetAlert2 ไม่ได้ (ออฟไลน์) จะถอยไปใช้ confirm() เดิม
 */
window.askConfirm = async function(text, o){
  o = o || {};
  if(!window.Swal) return window.confirm(text);
  const r = await Swal.fire({
    icon: o.danger ? "warning" : "question",
    title: o.title || "ยืนยันการทำรายการ",
    text: text,
    showCancelButton: true,
    confirmButtonText: o.confirmText || "ตกลง",
    cancelButtonText: o.cancelText || "ยกเลิก",
    confirmButtonColor: o.danger ? "#EF4444" : "#6366F1",
    cancelButtonColor: "#94A3B8",
    reverseButtons: true,
    focusCancel: !!o.danger,
    heightAuto: false,
    customClass: { popup: "askdlg" }
  });
  return !!r.isConfirmed;
};
