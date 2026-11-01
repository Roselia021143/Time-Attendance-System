"use client";
import { useState } from "react";

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const todayStr = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

/** เลือกวันที่แบบไทย (วัน / เดือน / ปี พ.ศ.) ส่งค่าในฟอร์มเป็น YYYY-MM-DD ผ่าน hidden input */
export default function DateInput({ name, defaultValue, onChange, label }: {
  name: string; defaultValue?: string; onChange?: (v: string) => void; label?: string;
}) {
  const [v, setV] = useState(defaultValue || todayStr());
  const [y, m, d] = v.split("-").map(Number);
  const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const thisYear = Number(todayStr().slice(0, 4));
  const set = (ny: number, nm: number, nd: number) => {
    const next = `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(nd, new Date(Date.UTC(ny, nm, 0)).getUTCDate())).padStart(2, "0")}`;
    setV(next);
    onChange?.(next);
  };
  const cls = "input w-auto px-2 py-1.5";
  return (
    <span className="inline-flex gap-1" role="group" aria-label={label}>
      <input type="hidden" name={name} value={v} />
      <select className={cls} aria-label="วัน" value={d} onChange={(e) => set(y, m, +e.target.value)}>
        {Array.from({ length: daysIn }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
      </select>
      <select className={cls} aria-label="เดือน" value={m} onChange={(e) => set(y, +e.target.value, d)}>
        {MONTHS.map((t, i) => <option key={t} value={i + 1}>{t}</option>)}
      </select>
      <select className={cls} aria-label="ปี" value={y} onChange={(e) => set(+e.target.value, m, d)}>
        {[thisYear - 2, thisYear - 1, thisYear, thisYear + 1].map((yy) => <option key={yy} value={yy}>{yy + 543}</option>)}
      </select>
    </span>
  );
}
