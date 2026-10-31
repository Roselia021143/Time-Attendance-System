"use client";
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminDayActions from "@/components/AdminDayActions";
import DayList from "@/components/DayList";
import TimeInput from "@/components/TimeInput";
import { api, dateLabel, hrs, monthLabel, shiftMonth, thisMonth, type Day, type Profile, type Totals } from "@/lib/client";

type Data = { user: Profile; totals: Totals; days: Day[] };

export default function EmployeeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [month, setMonth] = useState("");
  const [data, setData] = useState<Data>();
  const [err, setErr] = useState("");

  const load = useCallback(
    () => api<Data>(`/api/admin/employees/${id}/days?month=${month}`).then(setData).catch((e) => setErr(e.message)),
    [id, month],
  );
  useEffect(() => setMonth(new URLSearchParams(location.search).get("month") || thisMonth()), []);
  useEffect(() => { if (month) load(); }, [load, month]);

  async function addSession(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, f = new FormData(form);
    try {
      await api("/api/admin/sessions", { body: { userId: Number(id), date: `${month}-${String(f.get("day")).padStart(2, "0")}`, in: f.get("in"), out: f.get("out"), reason: f.get("reason") } });
      form.reset();
      load();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  if (!data) return <main className="p-8 text-center text-slate-400">{err || "กำลังโหลด…"}</main>;
  const t = data.totals;
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 pb-10">
      <Link href="/admin" className="text-sm text-sky-700">‹ กลับหน้าสรุป</Link>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-sky-900">
          {data.user.firstName} {data.user.lastName} {data.user.nickname && <span className="text-slate-500">({data.user.nickname})</span>}
        </h1>
        <div className="ml-auto flex items-center gap-1">
          <button className="btn-ghost px-2 py-1" aria-label="เดือนก่อน" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
          <span className="w-36 text-center font-medium">{monthLabel(month)}</span>
          <button className="btn-ghost px-2 py-1" aria-label="เดือนถัดไป" onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[["วันทำงาน", `${t.daysWorked} วัน`], ["ชม.ปกติ", hrs(t.regularMin)], ["OT อนุมัติ", hrs(t.otApprovedMin)], ["สาย", `${t.lateDays} วัน`]].map(([l, v]) => (
          <div key={l} className="card p-3 text-center"><p className="text-xs text-slate-500">{l}</p><p className="font-semibold text-sky-900">{v}</p></div>
        ))}
      </section>

      {err && <p className="text-sm text-red-600">{err}</p>}
      <section className="card">
        <DayList days={data.days} renderActions={(d) => <AdminDayActions day={d} onChange={load} />} />
      </section>

      <form onSubmit={addSession} className="card flex flex-wrap items-end gap-2">
        <h2 className="w-full font-semibold text-sky-900">เพิ่มรอบเวลา {monthLabel(month)} (กรณีพนักงานลืมกด)</h2>
        <label className="text-sm">วันที่
          <select className="input" name="day" key={month} required
            defaultValue={month === thisMonth() ? new Date(Date.now() + 7 * 3600_000).getUTCDate() : 1}>
            {Array.from({ length: new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate() }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{dateLabel(`${month}-${String(d).padStart(2, "0")}`)}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">เข้า<TimeInput className="w-24" name="in" defaultValue="09:00" required /></label>
        <label className="text-sm">ออก<TimeInput className="w-24" name="out" defaultValue="18:00" allow24 required /></label>
        <label className="flex-1 text-sm">เหตุผล<input className="input" name="reason" /></label>
        <button className="btn">เพิ่ม</button>
      </form>
    </main>
  );
}
