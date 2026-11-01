"use client";
import { X } from "lucide-react";
import { useEffect } from "react";

/** หน้าต่างลอย: มือถือเลื่อนขึ้นจากด้านล่าง, จอใหญ่อยู่กลางจอ · ปิดด้วย Esc / คลิกพื้นหลัง / ปุ่ม × */
export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-white sm:max-w-md sm:rounded-2xl [&>.card]:shadow-none [&>.card]:ring-0">
        <button onClick={onClose} aria-label="ปิด" className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-slate-400 hover:bg-sky-50 hover:text-slate-600"><X size={20} /></button>
        {children}
      </div>
    </div>
  );
}
