"use client";
import { useCallback, useEffect, useState } from "react";
import DayList from "@/components/DayList";
import Modal from "@/components/Modal";
import { LeaveForm, LeaveItem } from "@/components/Leave";
import { periodLabel } from "@/components/Payroll";
import { api, baht, hrs, logout, timeOf, type Day, type Leave, type Pay, type Profile, type Totals } from "@/lib/client";

type Summary = { from: string; to: string; totals: Totals & { leaveDays: number }; pay: Pay; days: Day[] };

export default function Clock() {
  const [me, setMe] = useState<{ user: Profile; openSince: number | null }>();
  const [now, setNow] = useState(Date.now());
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  const [offset, setOffset] = useState(0);
  const [sum, setSum] = useState<Summary>();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [pwOpen, setPwOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [tab, setTab] = useState<"history" | "leaves">("history");
  // จอใหญ่แสดงทั้งหมด (เลื่อนในกรอบ) · มือถือแสดงล่าสุดก่อน ("me" ยังไม่โหลดตอน render แรก จึงไม่ชนกับ HTML ฝั่งเซิร์ฟเวอร์)
  const [wide] = useState(() => typeof window !== "undefined" && matchMedia("(min-width: 1024px)").matches);
  const [showAll, setShowAll] = useState(wide);
  const closePw = useCallback(() => setPwOpen(false), []);
  const closeLeave = useCallback(() => setLeaveOpen(false), []);

  const load = useCallback(async () => {
    const [m, s, l] = await Promise.all([
      api<{ user: Profile; openSince: number | null }>("/api/me"),
      api<Summary>(`/api/me/summary?period=${period}&offset=${offset}`),
      api<Leave[]>("/api/me/leaves"),
    ]);
    if (m.user.role === "owner") location.href = "/admin";
    setMe(m);
    setSum(s);
    setLeaves(l);
  }, [period, offset]);
  useEffect(() => setShowAll(wide), [period, offset, wide]);

  useEffect(() => { load().catch((e) => setMsg(e.message)); }, [load]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  async function clock() {
    setBusy(true);
    try {
      const r = await api<{ action: string; at: number }>("/api/clock", { method: "POST" });
      setMsg(`${r.action === "in" ? "เข้างาน" : "ออกงาน"}แล้ว เวลา ${timeOf(r.at)} น.`);
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  if (!me) return <main className="p-8 text-center text-slate-400">{msg || "กำลังโหลด…"}</main>;
  const working = me.openSince != null;
  const t = sum?.totals;
  const pendingLeaves = leaves.filter((l) => l.status === "pending").length;
  // มือถือ: แสดงล่าสุดก่อนแค่บางส่วน กด "ดูทั้งหมด" เพื่อขยาย (จอใหญ่เลื่อนในกรอบแทน)
  const days = sum && period !== "year" ? (showAll ? sum.days : sum.days.slice(-7)) : [];
  const shownLeaves = showAll ? leaves : leaves.slice(0, 5);
  const more = tab === "history" ? (sum && period !== "year" ? sum.days.length - days.length : 0) : leaves.length - shownLeaves.length;

  return (
    <main className="mx-auto max-w-md space-y-4 p-4 pb-10 lg:max-w-6xl">
      <header className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">สวัสดี</p>
          <h1 className="truncate text-lg font-semibold text-sky-900">{me.user.firstName} {me.user.lastName}</h1>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button className="btn-ghost whitespace-nowrap px-2.5 text-xs" onClick={() => setPwOpen(true)}>เปลี่ยนรหัส</button>
          <button className="btn-ghost whitespace-nowrap px-2.5 text-xs" onClick={logout}>ออกจากระบบ</button>
        </div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* ซ้าย: นาฬิกา + สรุป (ติดอยู่กับที่บนจอใหญ่) */}
        <div className="space-y-4 lg:sticky lg:top-4">
          <section className="card text-center">
            <p className="text-5xl font-semibold tabular-nums text-sky-900">
              {new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now)}
            </p>
            <p className="mt-1 text-slate-500">
              {new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "full" }).format(now)}
            </p>
            <p className="mt-3 text-sm">
              {working ? <span className="text-emerald-700">● กำลังทำงาน ตั้งแต่ {timeOf(me.openSince)} น.</span> : <span className="text-slate-500">ยังไม่ได้เข้างาน</span>}
            </p>
            <button
              onClick={clock}
              disabled={busy}
              className={`mt-4 h-20 w-full rounded-2xl text-2xl font-semibold text-white shadow-lg transition active:scale-[.98] disabled:opacity-60 ${working ? "bg-slate-700 hover:bg-slate-800" : "bg-sky-600 hover:bg-sky-700"}`}
            >
              {busy ? "…" : working ? "ออกงาน" : "เข้างาน"}
            </button>
            {msg && <p role="status" className="mt-3 text-sm text-sky-700">{msg}</p>}
          </section>

          <section className="card space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex rounded-xl bg-sky-50 p-1 text-sm">
                {(["week", "month", "year"] as const).map((p) => (
                  <button key={p} onClick={() => { setPeriod(p); setOffset(0); }}
                    className={`rounded-lg px-3 py-1 ${period === p ? "bg-white font-medium text-sky-700 shadow-sm" : "text-slate-500"}`}>
                    {{ week: "สัปดาห์", month: "เดือน", year: "ปี" }[p]}
                  </button>
                ))}
              </div>
              <button className="btn-ghost ml-auto px-2 py-1" aria-label="ก่อนหน้า" onClick={() => setOffset(offset + 1)}>‹</button>
              <button className="btn-ghost px-2 py-1" aria-label="ถัดไป" disabled={offset === 0} onClick={() => setOffset(offset - 1)}>›</button>
            </div>
            {sum && t && (
              <>
                <p className="text-sm font-medium text-slate-600">{periodLabel(period, sum.from, sum.to)}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="ชม.ปกติ" value={hrs(t.regularMin)} />
                  <Stat label="OT อนุมัติ" value={hrs(t.otApprovedMin)} />
                  <Stat label="รวม" value={hrs(t.regularMin + t.otApprovedMin)} strong />
                </div>
                <div className="rounded-xl bg-sky-50 p-3 text-sm">
                  <div className="flex items-baseline">
                    <span className="text-slate-600">ค่าแรง (ยืนยันแล้ว)</span>
                    <span className="ml-auto text-xl font-semibold text-sky-900">{baht(sum.pay.totalSatang)}</span>
                  </div>
                  <p className="text-slate-500">ปกติ {baht(sum.pay.regularSatang)} · OT {baht(sum.pay.otSatang)}</p>
                  {sum.pay.otPendingSatang > 0 && <p className="text-sky-700">OT รออนุมัติ {baht(sum.pay.otPendingSatang)} (ยังไม่รวม)</p>}
                  {sum.pay.missingRateDays > 0 && <p className="text-amber-700">มี {sum.pay.missingRateDays} วันที่ยังไม่ได้ตั้งค่าแรง กรุณาแจ้งเจ้าของร้าน</p>}
                </div>
                <p className="text-sm text-slate-500">
                  มาทำงาน {t.daysWorked} วัน
                  {t.leaveDays > 0 && <> · ลา {t.leaveDays} วัน</>}
                  {t.otPendingMin > 0 && <> · OT รออนุมัติ {hrs(t.otPendingMin)}</>}
                </p>
              </>
            )}
          </section>
        </div>

        {/* ขวา: แท็บ ประวัติ / การลา */}
        <section className="card p-0">
          <div className="flex items-center gap-1 border-b border-sky-100 p-2">
            {([["history", "ประวัติลงเวลา"], ["leaves", "การลา"]] as const).map(([k, label]) => (
              <button key={k} onClick={() => { setTab(k); setShowAll(wide); }}
                className={`rounded-lg px-4 py-2 text-sm ${tab === k ? "bg-sky-600 font-medium text-white" : "text-slate-600 hover:bg-sky-50"}`}>
                {label}
                {k === "leaves" && pendingLeaves > 0 && (
                  <span className={`badge ml-1.5 ${tab === k ? "bg-white text-sky-700" : "bg-sky-100 text-sky-700"}`}>รอ {pendingLeaves}</span>
                )}
              </button>
            ))}
            <button className="btn ml-auto py-1.5 text-sm" onClick={() => setLeaveOpen(true)}>+ ขอลา</button>
          </div>

          <div className="px-5 lg:max-h-[calc(100dvh-10rem)] lg:overflow-y-auto">
            {tab === "history" && (
              period === "year"
                ? <p className="py-8 text-center text-sm text-slate-400">เลือก "สัปดาห์" หรือ "เดือน" เพื่อดูรายวัน</p>
                : sum && <DayList days={days} leaves={leaves} />
            )}
            {tab === "leaves" && (
              <div className="divide-y divide-sky-100">
                {!leaves.length && <p className="py-8 text-center text-sm text-slate-400">ยังไม่มีคำขอลา</p>}
                {shownLeaves.map((l) => (
                  <LeaveItem key={l.id} l={l} actions={l.status === "pending" && (
                    <button className="text-sm text-red-600 hover:underline"
                      onClick={() => confirm("ยกเลิกคำขอลานี้?") && api(`/api/me/leaves/${l.id}/cancel`, { method: "POST" }).then(load)}>
                      ยกเลิกคำขอ
                    </button>
                  )} />
                ))}
              </div>
            )}
            {more > 0 && (
              <button className="my-3 w-full rounded-xl py-2 text-sm font-medium text-sky-700 hover:bg-sky-50" onClick={() => setShowAll(true)}>
                ดูทั้งหมด (อีก {more} รายการ)
              </button>
            )}
          </div>
        </section>
      </div>

      {pwOpen && (
        <Modal title="เปลี่ยนรหัสผ่าน" onClose={closePw}>
          <PasswordForm onDone={closePw} />
        </Modal>
      )}
      {leaveOpen && (
        <Modal title="ขอลา" onClose={closeLeave}>
          <LeaveForm endpoint="/api/me/leaves" onCancel={closeLeave}
            onDone={() => { closeLeave(); setTab("leaves"); setMsg("ส่งคำขอลาแล้ว รอเจ้าของร้านอนุมัติ"); load(); }} />
        </Modal>
      )}
    </main>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`rounded-xl px-1.5 py-2.5 ${strong ? "bg-sky-600 text-white" : "bg-sky-50 text-sky-900"}`}>
      <p className={`text-xs ${strong ? "text-sky-100" : "text-slate-500"}`}>{label}</p>
      <p className="whitespace-nowrap text-sm font-semibold sm:text-base">{value}</p>
    </div>
  );
}

function PasswordForm({ onDone }: { onDone: () => void }) {
  const [msg, setMsg] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("next") !== f.get("confirm")) return setMsg("รหัสผ่านใหม่ไม่ตรงกัน");
    try {
      await api("/api/me/password", { body: { current: f.get("current"), next: f.get("next") } });
      alert("เปลี่ยนรหัสผ่านแล้ว");
      onDone();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-semibold text-sky-900">เปลี่ยนรหัสผ่าน</h2>
      <input className="input" name="current" type="password" placeholder="รหัสผ่านเดิม" aria-label="รหัสผ่านเดิม" autoComplete="current-password" required />
      <input className="input" name="next" type="password" placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)" aria-label="รหัสผ่านใหม่" autoComplete="new-password" minLength={6} required />
      <input className="input" name="confirm" type="password" placeholder="ยืนยันรหัสผ่านใหม่" aria-label="ยืนยันรหัสผ่านใหม่" autoComplete="new-password" required />
      {msg && <p className="text-sm text-red-600">{msg}</p>}
      <button className="btn w-full">บันทึก</button>
    </form>
  );
}
