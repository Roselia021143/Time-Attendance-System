"use client";
import { dateLabel, hrs, LEAVE_TYPE, timeOf, type Day, type Leave } from "@/lib/client";

/** รายการรายวัน ใช้ทั้งหน้าพนักงานและเจ้าของร้าน (ส่ง renderActions เพื่อเพิ่มปุ่มแก้ไข) */
export default function DayList({ days, leaves = [], renderActions }: { days: Day[]; leaves?: Leave[]; renderActions?: (d: Day) => React.ReactNode }) {
  if (!days.length) return <p className="py-6 text-center text-slate-400">ยังไม่มีการลงเวลาในช่วงนี้</p>;
  return (
    <ul className="divide-y divide-sky-100">
      {[...days].reverse().map((d) => (
        <li key={d.date} className="py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-sky-900">{dateLabel(d.date)}</span>
            {leaves.filter((l) => l.status === "approved" && l.fromDate <= d.date && d.date <= l.toDate).map((l) => (
              <span key={l.id} className="badge bg-violet-100 text-violet-700">มีลาวันนี้ · {LEAVE_TYPE[l.type]}</span>
            ))}
            {d.lateMin > 0 && <span className="badge bg-amber-100 text-amber-800">สาย {d.lateMin} นาที</span>}
            {d.forgotten && <span className="badge bg-red-100 text-red-700">ลืมออกงาน</span>}
            {d.open && <span className="badge bg-emerald-100 text-emerald-700">กำลังทำงาน</span>}
            {d.otPendingMin > 0 && <span className="badge bg-sky-100 text-sky-700">OT รออนุมัติ {hrs(d.otPendingMin)}</span>}
            {d.otApprovedMin > 0 && <span className="badge bg-sky-600 text-white">OT {hrs(d.otApprovedMin)}</span>}
            <span className="ml-auto text-sm font-semibold text-slate-700">{hrs(d.regularMin + d.otApprovedMin)}</span>
          </div>
          <ul className="mt-1 space-y-0.5 text-sm text-slate-500">
            {d.sessions.map((s) => (
              <li key={s.id}>
                {timeOf(s.clockIn)} – {timeOf(s.clockOut)}
                {s.edited && <span className="ml-2 text-xs text-sky-600">แก้ไขโดยเจ้าของร้าน</span>}
              </li>
            ))}
          </ul>
          {renderActions?.(d)}
        </li>
      ))}
    </ul>
  );
}
