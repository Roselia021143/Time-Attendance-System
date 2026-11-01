"use client";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api, baht, dateLabel, hrs, monthLabel, type Pay, type Profile } from "@/lib/client";
import { matchUser, SearchBox } from "./SearchBox";

type Period = "week" | "month" | "year";
type Row = Pay & { user: Profile; hasRate: boolean };
type Data = { from: string; to: string; rows: Row[]; total: Pay };

export const periodLabel = (p: Period, from: string, to: string) =>
  p === "week" ? `${dateLabel(from)} – ${dateLabel(to)}` : p === "month" ? monthLabel(from.slice(0, 7)) : `ปี ${Number(from.slice(0, 4)) + 543}`;

/** แท็บ "ค่าแรง" ของเจ้าของร้าน */
export default function Payroll() {
  const [period, setPeriod] = useState<Period>("month");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<Data>();
  const [pick, setPick] = useState<Profile | null>(null);
  const [q, setQ] = useState("");
  const qs = `period=${period}&offset=${offset}`;
  useEffect(() => { setPick(null); api<Data>(`/api/admin/payroll?${qs}`).then(setData); }, [qs]);

  return (
    <section className={`grid items-start gap-4 ${pick && period === "year" ? "xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" : ""}`}>
      <div className="card min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-sky-50 p-1 text-sm">
            {(["week", "month", "year"] as const).map((p) => (
              <button key={p} onClick={() => { setPeriod(p); setOffset(0); }}
                className={`rounded-lg px-3 py-1 ${period === p ? "bg-white font-medium text-sky-700 shadow-sm" : "text-slate-500"}`}>
                {{ week: "สัปดาห์", month: "เดือน", year: "ปี" }[p]}
              </button>
            ))}
          </div>
          <button className="btn-ghost px-2 py-1" aria-label="ก่อนหน้า" onClick={() => setOffset(offset + 1)}><ChevronLeft /></button>
          <span className="min-w-36 text-center font-medium">{data && periodLabel(period, data.from, data.to)}</span>
          <button className="btn-ghost px-2 py-1" aria-label="ถัดไป" disabled={offset === 0} onClick={() => setOffset(offset - 1)}><ChevronRight /></button>
          <div className="ml-auto flex gap-2">
            <SearchBox value={q} onChange={setQ} />
            <a className="btn text-sm" href={`/api/admin/payroll?${qs}&format=csv`}><Download />CSV</a>
          </div>
        </div>
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="sticky top-0 z-10 bg-white text-left text-slate-500">
              <tr className="border-b border-sky-100">
                {["พนักงาน", "ชม.ปกติ", "ค่าแรงปกติ", "ชม.OT", "ค่า OT", "รวม", "OT รออนุมัติ"].map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {data?.rows.filter((r) => matchUser(r.user, q)).map((r) => (
                <tr key={r.user.id} className="border-b border-sky-50 hover:bg-sky-50/50">
                  <td className="px-2 py-2">
                    {period === "year" ? (
                      <button className="font-medium text-sky-700 hover:underline" onClick={() => setPick(r.user)}>{r.user.firstName} {r.user.lastName}</button>
                    ) : (
                      <span className="font-medium text-sky-900">{r.user.firstName} {r.user.lastName}</span>
                    )}
                    {!r.hasRate ? (
                      <span className="badge ml-1 bg-amber-100 text-amber-800">ยังไม่ได้ตั้งค่าแรง</span>
                    ) : r.missingRateDays > 0 && (
                      <span className="badge ml-1 bg-amber-100 text-amber-800">ไม่มีอัตรา {r.missingRateDays} วัน</span>
                    )}
                  </td>
                  <Cells p={r} />
                </tr>
              ))}
            </tbody>
            {data && data.rows.length > 0 && (
              <tfoot className="sticky bottom-0 bg-white shadow-[0_-1px_0_#e0f2fe]">
                <tr className="font-semibold text-sky-900"><td className="px-2 py-2">รวมทั้งร้าน</td><Cells p={data.total} /></tr>
              </tfoot>
            )}
          </table>
          {data && !data.rows.length && <p className="py-6 text-center text-slate-400">ยังไม่มีพนักงาน</p>}
        </div>
        <p className="text-xs text-slate-500">ประมาณการจากชั่วโมงที่ลงเวลา · ไม่รวมภาษี ประกันสังคม และการลา (ลาไม่ได้รับค่าแรง)</p>
      </div>
      {pick && period === "year" && <YearBreakdown user={pick} offset={offset} onClose={() => setPick(null)} />}
    </section>
  );
}

function Cells({ p }: { p: Pay }) {
  return (
    <>
      <td className="px-2 py-2">{hrs(p.regularMin)}</td>
      <td className="px-2 py-2">{baht(p.regularSatang)}</td>
      <td className="px-2 py-2">{hrs(p.otMin)}</td>
      <td className="px-2 py-2">{baht(p.otSatang)}</td>
      <td className="px-2 py-2 font-semibold text-sky-900">{baht(p.totalSatang)}</td>
      <td className="px-2 py-2 text-sky-700">{p.otPendingSatang ? baht(p.otPendingSatang) : "—"}</td>
    </>
  );
}

function YearBreakdown({ user, offset, onClose }: { user: Profile; offset: number; onClose: () => void }) {
  const [months, setMonths] = useState<(Pay & { month: string })[]>();
  useEffect(() => {
    api<{ months: typeof months }>(`/api/admin/payroll?period=year&offset=${offset}&userId=${user.id}`).then((r) => setMonths(r.months));
  }, [user.id, offset]);
  return (
    <div className="card min-w-0 space-y-2 xl:sticky xl:top-4">
      <div className="flex items-center">
        <h2 className="font-semibold text-sky-900">ค่าแรงรายเดือน · {user.firstName} {user.lastName}</h2>
        <button className="btn-ghost ml-auto px-2 py-1" aria-label="ปิด" onClick={onClose}><X /></button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-slate-500">
            <tr className="border-b border-sky-100">
              {["เดือน", "ชม.ปกติ", "ค่าแรงปกติ", "ชม.OT", "ค่า OT", "รวม", "OT รออนุมัติ"].map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {months?.map((m) => (
              <tr key={m.month} className={`border-b border-sky-50 ${m.regularMin + m.otMin ? "" : "text-slate-400"}`}>
                <td className="px-2 py-2">{monthLabel(m.month)}</td>
                <Cells p={m} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
