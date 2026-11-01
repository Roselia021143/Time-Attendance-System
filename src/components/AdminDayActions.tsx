"use client";
import { Check, Pencil, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { api, hrs, type Day } from "@/lib/client";
import TimeInput from "./TimeInput";

const hhmm = (ms: number | null) => (ms == null ? "" : new Date(ms + 7 * 3600_000).toISOString().slice(11, 16));

/** ปุ่มของเจ้าของร้านต่อหนึ่งวัน: อนุมัติ OT + แก้/ลบรอบเวลา */
export default function AdminDayActions({ day, onChange }: { day: Day; onChange: () => void }) {
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(day.forgotten); // ลืมออกงาน = เปิดฟอร์มให้เลย
  const run = (p: Promise<unknown>) => p.then(() => { setEditing(false); onChange(); }).catch((e) => setErr(e.message));
  // OT ที่ตัดสินแล้วซ่อนไว้ (เปิดดูได้ผ่าน "แก้ไขเวลา") เพื่อให้รายการสั้นลง
  const showOt = day.otRawMin > 0 && !day.open && (day.otPendingMin > 0 || editing);

  if (!editing && !showOt)
    return <button className="mt-1 inline-flex items-center gap-1 text-sm text-sky-700 hover:underline" onClick={() => setEditing(true)}><Pencil size={14} />แก้ไขเวลา</button>;

  return (
    <div className="mt-2 space-y-2 rounded-xl bg-sky-50/60 p-3 text-sm">
      {showOt && <OtControl day={day} run={run} />}
      {!editing && <button className="inline-flex items-center gap-1 text-sky-700 hover:underline" onClick={() => setEditing(true)}><Pencil size={14} />แก้ไขเวลา</button>}
      {editing && day.sessions.map((s) => (
        <form key={s.id} className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run(api(`/api/admin/sessions/${s.id}`, { method: "PATCH", body: { in: f.get("in"), out: f.get("out"), reason: f.get("reason") } }));
          }}>
          <TimeInput className="w-24 py-1" name="in" defaultValue={hhmm(s.clockIn)} aria-label="เวลาเข้า" required />
          <span>–</span>
          <TimeInput className="w-24 py-1" name="out" defaultValue={hhmm(s.clockOut)} aria-label="เวลาออก" allow24 required />
          <input className="input w-40 flex-1 py-1" name="reason" placeholder="เหตุผล (ไม่บังคับ)" aria-label="เหตุผล" />
          <button className="btn py-1"><Save />บันทึก</button>
          <button type="button" className="btn-ghost px-2 py-1 text-red-600" aria-label="ลบรอบนี้" title="ลบรอบนี้"
            onClick={() => confirm("ลบรอบนี้?") && run(api(`/api/admin/sessions/${s.id}?reason=`, { method: "DELETE" }))}>
            <Trash2 />
          </button>
        </form>
      ))}
      {editing && !day.forgotten && <button className="text-slate-500 hover:underline" onClick={() => setEditing(false)}>ปิด</button>}
      {err && <p className="text-red-600">{err}</p>}
    </div>
  );
}

export function OtControl({ day, run }: { day: Day; run: (p: Promise<unknown>) => void }) {
  const decided = day.otPendingMin === 0;
  const min = decided ? day.otApprovedMin : day.otRawMin;
  const post = (minutes: number | null) => run(api("/api/admin/ot", { body: { userId: day.userId, date: day.date, minutes } }));
  return (
    <form className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        post(Number(f.get("h")) * 60 + Number(f.get("m")));
      }}>
      <span className="text-slate-600">OT จริง {hrs(day.otRawMin)}{decided && <> · อนุมัติแล้ว {hrs(day.otApprovedMin)}</>}</span>
      <span className="whitespace-nowrap">
        <input className="input w-14 px-2 py-1" name="h" type="number" min="0" max="24" required
          defaultValue={Math.floor(min / 60)} aria-label="ชั่วโมง OT ที่อนุมัติ" /> ชม.{" "}
        <input className="input w-14 px-2 py-1" name="m" type="number" min="0" max="59" required
          defaultValue={min % 60} aria-label="นาที OT ที่อนุมัติ" /> นาที
      </span>
      <button className="btn py-1">{decided ? <><Pencil />แก้ไข</> : <><Check />อนุมัติ</>}</button>
      {!decided && <button type="button" className="btn-ghost py-1 text-red-600" onClick={() => post(0)}><X />ปฏิเสธ</button>}
    </form>
  );
}
