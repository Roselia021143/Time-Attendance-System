"use client";
import { ArrowLeft, CalendarPlus, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminDayActions from "@/components/AdminDayActions";
import DayList from "@/components/DayList";
import TimeInput from "@/components/TimeInput";
import { LeaveDecision, LeaveForm, LeaveItem } from "@/components/Leave";
import { api, dateLabel, hrs, monthLabel, shiftMonth, thisMonth, type Day, type Leave, type Profile, type Totals } from "@/lib/client";

type Data = { user: Profile; totals: Totals & { leaveDays: number }; days: Day[]; leaves: Leave[] };

export default function EmployeeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [month, setMonth] = useState("");
  const [data, setData] = useState<Data>();
  const [err, setErr] = useState("");
  const [leaveOpen, setLeaveOpen] = useState(false);

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
    <main className="mx-auto max-w-6xl space-y-4 p-4 pb-10">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-sky-700 hover:underline"><ArrowLeft size={16} />กลับหน้าแดชบอร์ด</Link>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-sky-900">
          {data.user.firstName} {data.user.lastName} {data.user.nickname && <span className="text-slate-500">({data.user.nickname})</span>}
        </h1>
        <div className="ml-auto flex items-center gap-1">
          <button className="btn-ghost px-2 py-1" aria-label="เดือนก่อน" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft /></button>
          <span className="w-36 text-center font-medium">{monthLabel(month)}</span>
          <button className="btn-ghost px-2 py-1" aria-label="เดือนถัดไป" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight /></button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[["วันทำงาน", `${t.daysWorked} วัน`], ["ชม.ปกติ", hrs(t.regularMin)], ["OT อนุมัติ", hrs(t.otApprovedMin)], ["สาย", `${t.lateDays} วัน`], ["ลา", `${t.leaveDays} วัน`]].map(([l, v]) => (
          <div key={l} className="card p-3 text-center"><p className="text-xs text-slate-500">{l}</p><p className="font-semibold text-sky-900">{v}</p></div>
        ))}
      </section>

      {err && <p className="text-sm text-red-600">{err}</p>}
      {/* ซ้าย: รายวัน (เลื่อนในกรอบ) · ขวา: การลา + ฟอร์ม (ติดอยู่กับที่บนจอใหญ่) */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="card max-h-[calc(100vh-14rem)] overflow-y-auto py-2">
        <DayList days={data.days} leaves={data.leaves} renderActions={(d) => <AdminDayActions day={d} onChange={load} />} />
      </section>

      <aside className="space-y-4 lg:sticky lg:top-4">
      <section className="card">
        <div className="flex items-center">
          <h2 className="font-semibold text-sky-900">การลา {monthLabel(month)}</h2>
          <button className="btn-ghost ml-auto py-1 text-sm" onClick={() => setLeaveOpen(!leaveOpen)}><CalendarPlus />ลงลาแทน</button>
        </div>
        {!data.leaves.length && <p className="py-3 text-sm text-slate-400">ไม่มีการลาในเดือนนี้</p>}
        <div className="max-h-64 divide-y divide-sky-100 overflow-y-auto">
          {data.leaves.map((l) => <LeaveItem key={l.id} l={l} actions={<LeaveDecision l={l} onDone={load} />} />)}
        </div>
      </section>
      {leaveOpen && <LeaveForm endpoint="/api/admin/leaves" userId={Number(id)} onDone={() => { setLeaveOpen(false); load(); }} onCancel={() => setLeaveOpen(false)} />}

      <form onSubmit={addSession} className="card flex flex-wrap items-end gap-2">
        <h2 className="w-full font-semibold text-sky-900">เพิ่มรอบเวลา <span className="text-sm font-normal text-slate-500">(กรณีพนักงานลืมกด)</span></h2>
        <label className="flex w-full flex-col text-sm">วันที่
          <select className="input" name="day" key={month} required
            defaultValue={month === thisMonth() ? new Date(Date.now() + 7 * 3600_000).getUTCDate() : 1}>
            {Array.from({ length: new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate() }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{dateLabel(`${month}-${String(d).padStart(2, "0")}`)}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm">เข้า<TimeInput className="w-24" name="in" defaultValue="09:00" required /></label>
        <label className="flex flex-col text-sm">ออก<TimeInput className="w-24" name="out" defaultValue="18:00" allow24 required /></label>
        <label className="w-full text-sm">เหตุผล<input className="input" name="reason" /></label>
        <button className="btn w-full"><Plus />เพิ่มรอบเวลา</button>
      </form>
      </aside>
      </div>
    </main>
  );
}
