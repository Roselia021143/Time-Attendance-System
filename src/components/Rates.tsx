"use client";
import { useCallback, useEffect, useState } from "react";
import DateInput from "./DateInput";
import { api, baht, dateLabel, type Rate } from "@/lib/client";

/** ประวัติค่าแรง + ตั้งอัตราใหม่ ของพนักงานหนึ่งคน */
export default function Rates({ userId }: { userId: number }) {
  const [list, setList] = useState<Rate[]>();
  const [err, setErr] = useState("");
  const load = useCallback(() => api<Rate[]>(`/api/admin/employees/${userId}/rates`).then(setList), [userId]);
  useEffect(() => { load(); }, [load]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    try {
      await api(`/api/admin/employees/${userId}/rates`, { body: Object.fromEntries(new FormData(form)) });
      setErr("");
      form.reset();
      load();
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  const remove = (r: Rate) =>
    confirm(`ลบอัตราที่มีผล ${dateLabel(r.effectiveFrom)}?`) && api(`/api/admin/employees/${userId}/rates/${r.id}`, { method: "DELETE" }).then(load);

  return (
    <div className="card space-y-3">
      <h3 className="font-semibold text-sky-900">ค่าแรง (บาท/ชั่วโมง)</h3>
      {list && !list.length && <p className="text-sm text-amber-700">ยังไม่ได้ตั้งค่าแรง</p>}
      <ul className="space-y-1 text-sm">
        {list?.map((r, i) => (
          <li key={r.id} className={`flex items-center gap-2 ${i ? "text-slate-500" : "font-medium text-sky-900"}`}>
            ตั้งแต่ {dateLabel(r.effectiveFrom)} {Number(r.effectiveFrom.slice(0, 4)) + 543}: ปกติ {baht(r.rateSatang)}/ชม. · OT {baht(r.otRateSatang)}/ชม.
            {i === 0 && <span className="badge bg-sky-100 text-sky-700">ล่าสุด</span>}
            <button type="button" className="ml-auto text-xs text-red-600 hover:underline" onClick={() => remove(r)}>ลบ</button>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-2 text-sm">
        <label>ค่าแรงปกติ (บาท/ชม.)<input className="input w-32" name="rate" type="number" min="0.01" step="0.01" required /></label>
        <label>ค่า OT (บาท/ชม.)<input className="input w-32" name="otRate" type="number" min="0.01" step="0.01" required /></label>
        <div><span className="block">มีผลตั้งแต่</span><DateInput name="effectiveFrom" label="มีผลตั้งแต่" /></div>
        <button className="btn">ตั้งค่าแรง</button>
      </form>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
