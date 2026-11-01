"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { OtControl } from "@/components/AdminDayActions";
import TimeInput from "@/components/TimeInput";
import Payroll from "@/components/Payroll";
import { matchUser, SearchBox } from "@/components/SearchBox";
import Rates from "@/components/Rates";
import { LeaveDecision, LeaveItem } from "@/components/Leave";
import { api, baht, dateLabel, hrs, LEAVE_TYPE, logout, monthLabel, shiftMonth, thisMonth, timeOf, type Day, type Leave, type Profile, type Rate, type Totals } from "@/lib/client";

const TABS = { today: "วันนี้", summary: "สรุปรายเดือน", payroll: "ค่าแรง", pending: "รอดำเนินการ", employees: "พนักงาน", settings: "ตั้งค่า" } as const;
type Tab = keyof typeof TABS;

export default function Admin() {
  const [tab, setTab] = useState<Tab>("today");
  const [ok, setOk] = useState(false);
  const [pending, setPending] = useState(0);
  useEffect(() => {
    api<{ user: Profile }>("/api/me").then((m) => (m.user.role === "owner" ? setOk(true) : (location.href = "/clock")));
    Promise.all([api<unknown[]>("/api/admin/pending"), api<unknown[]>("/api/admin/leaves?status=pending")])
      .then(([a, b]) => setPending(a.length + b.length)).catch(() => {});
  }, []);
  if (!ok) return <main className="p-8 text-center text-slate-400">กำลังโหลด…</main>;
  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4 pb-10">
      <header className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-sky-900">แดชบอร์ดเจ้าของร้าน</h1>
        <button className="btn-ghost ml-auto text-sm" onClick={logout}>ออกจากระบบ</button>
      </header>
      <nav className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 ring-1 ring-sky-100">
        {(Object.keys(TABS) as Tab[]).map((k) => (
          <button key={k} onClick={() => setTab(k)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm ${tab === k ? "bg-sky-600 font-medium text-white" : "text-slate-600 hover:bg-sky-50"}`}>
            {TABS[k]}
            {k === "pending" && pending > 0 && (
              <span className={`badge ml-1.5 ${tab === k ? "bg-white text-sky-700" : "bg-red-500 text-white"}`}>{pending}</span>
            )}
          </button>
        ))}
      </nav>
      {tab === "today" && <Today pending={pending} goPending={() => setTab("pending")} />}
      {tab === "summary" && <Summary />}
      {tab === "payroll" && <Payroll />}
      {tab === "pending" && <Pending onCount={setPending} />}
      {tab === "employees" && <Employees />}
      {tab === "settings" && <Settings />}
    </main>
  );
}

/** ป้าย "กำลังทำงาน" พร้อมเวลาที่ทำมาแล้ว */
function Working({ since }: { since: number | null | undefined }) {
  if (since == null) return null;
  return (
    <span className="badge ml-1 bg-emerald-100 text-emerald-700">
      <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-emerald-500 align-middle" />
      กำลังทำงาน · {timeOf(since)} ({hrs(Math.max(0, Math.floor((Date.now() - since) / 60_000)))})
    </span>
  );
}

type TodayData = { date: string; dayOff: boolean; rules: { workStart: string }; rows: { user: Profile; day: Day | null; leave: Leave | null }[] };

function Today({ pending, goPending }: { pending: number; goPending: () => void }) {
  const [data, setData] = useState<TodayData>();
  useEffect(() => {
    const load = () => api<TodayData>("/api/admin/today").then(setData);
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);
  if (!data) return <p className="text-slate-400">กำลังโหลด…</p>;

  const nowHM = new Date(Date.now() + 7 * 3600_000).toISOString().slice(11, 16);
  const pastStart = nowHM > data.rules.workStart && !data.dayOff; // วันหยุดไม่เตือนว่าใครยังไม่มา
  const working = data.rows.filter((r) => r.day?.open);
  const absent = data.rows.filter((r) => !r.day && !r.leave);
  const onLeave = data.rows.filter((r) => !r.day && r.leave);
  const done = data.rows.filter((r) => r.day && !r.day.open);
  const late = data.rows.filter((r) => r.day && r.day.lateMin > 0).length;

  const stats: [string, number, string, (() => void)?][] = [
    ["กำลังทำงาน", working.length, "bg-sky-600 text-white"],
    [data.dayOff ? "หยุด (วันหยุด)" : "ยังไม่เข้างาน", absent.length, pastStart && absent.length ? "bg-red-50 text-red-700" : "bg-white text-sky-900"],
    ["มาสายวันนี้", late, late ? "bg-amber-50 text-amber-800" : "bg-white text-sky-900"],
    ["รอดำเนินการ", pending, pending ? "bg-sky-50 text-sky-800" : "bg-white text-sky-900", goPending],
  ];

  return (
    <section className="space-y-4">
      <p className="text-sm text-slate-500">
        {dateLabel(data.date)}
        {data.dayOff && <span className="badge ml-2 bg-slate-100 text-slate-600">วันหยุดประจำสัปดาห์</span>}
        {" "}· อัปเดตอัตโนมัติทุก 1 นาที
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map(([label, n, cls, onClick]) => (
          <button key={label} onClick={onClick} disabled={!onClick}
            className={`rounded-2xl p-4 text-left shadow-sm ring-1 ring-sky-100 ${cls} ${onClick ? "hover:brightness-95" : "cursor-default"}`}>
            <p className="text-sm opacity-80">{label}</p>
            <p className="text-3xl font-semibold">{n}</p>
          </button>
        ))}
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Group title="กำลังทำงาน" rows={working} />
        <Group title={data.dayOff ? "หยุด (วันหยุด)" : pastStart ? `ยังไม่เข้างาน (เลย ${data.rules.workStart} แล้ว)` : "ยังไม่เข้างาน"}
          rows={absent} alert={pastStart && absent.length > 0} />
        <Group title="ลาวันนี้" rows={onLeave} />
        <Group title="เลิกงานแล้ว" rows={done} />
      </div>
    </section>
  );
}

function Group({ title, rows, alert }: { title: string; rows: TodayData["rows"]; alert?: boolean }) {
  return (
    <div className="card p-0">
      <h2 className={`border-b border-sky-100 px-5 py-3 font-semibold ${alert ? "text-red-700" : "text-sky-900"}`}>{title} ({rows.length})</h2>
      {!rows.length && <p className="px-5 py-4 text-sm text-slate-400">—</p>}
      <ul className="max-h-80 divide-y divide-sky-50 overflow-y-auto">
        {rows.map(({ user, day, leave }) => (
          <li key={user.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-5 py-2.5">
            <Link className="font-medium text-sky-700 hover:underline" href={`/admin/employees/${user.id}`}>
              {user.firstName} {user.lastName}
            </Link>
            {user.nickname && <span className="text-slate-400">({user.nickname})</span>}
            {day?.open && <Working since={day.sessions.at(-1)!.clockIn} />}
            {day && day.lateMin > 0 && <span className="badge bg-amber-100 text-amber-800">สาย {day.lateMin} นาที</span>}
            {leave && (
              <span className="badge bg-violet-100 text-violet-700">
                {day ? "มีลาวันนี้ · " : ""}{LEAVE_TYPE[leave.type]}{leave.part !== "full" ? (leave.part === "am" ? " (ครึ่งเช้า)" : " (ครึ่งบ่าย)") : ""}
              </span>
            )}
            {leave && !day && <span className="text-sm text-slate-500">— {leave.reason}</span>}
            <span className="ml-auto text-sm text-slate-500">
              {day
                ? `เข้า ${timeOf(day.sessions[0].clockIn)}${day.open ? "" : ` · ออก ${timeOf(day.sessions.at(-1)!.clockOut)} · ${hrs(day.regularMin)}`}`
                : !leave && user.phone && <a className="text-sky-700" href={`tel:${user.phone}`}>โทร {user.phone}</a>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Summary() {
  const [month, setMonth] = useState(thisMonth);
  const [rows, setRows] = useState<(Totals & { user: Profile; workingSince: number | null; leaveDays: number })[]>();
  const [showInactive, setShowInactive] = useState(false);
  const [q, setQ] = useState("");
  useEffect(() => { api<{ rows: typeof rows }>(`/api/admin/summary?month=${month}`).then((r) => setRows(r.rows)); }, [month]);
  const list = rows?.filter((r) => (showInactive || r.user.active) && matchUser(r.user, q));

  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-ghost px-2 py-1" aria-label="เดือนก่อน" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
        <span className="w-36 text-center font-medium">{monthLabel(month)}</span>
        <button className="btn-ghost px-2 py-1" aria-label="เดือนถัดไป" onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
        <label className="ml-2 flex items-center gap-1 text-sm text-slate-500">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> แสดงพนักงานที่ปิดแล้ว
        </label>
        <div className="ml-auto flex gap-2">
          <SearchBox value={q} onChange={setQ} />
          <a className="btn text-sm" href={`/api/admin/summary?month=${month}&format=csv`}>CSV</a>
        </div>
      </div>
      <div className="max-h-[65vh] overflow-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="sticky top-0 z-10 bg-white text-left text-slate-500">
            <tr className="border-b border-sky-100">
              {["พนักงาน", "วันทำงาน", "ชม.ปกติ", "OT อนุมัติ", "OT รออนุมัติ", "สาย", "ลืมออก", "ลา (วัน)"].map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {list?.map((r) => (
              <tr key={r.user.id} className="border-b border-sky-50 hover:bg-sky-50/50">
                <td className="px-2 py-2">
                  <Link className="font-medium text-sky-700 hover:underline" href={`/admin/employees/${r.user.id}?month=${month}`}>
                    {r.user.firstName} {r.user.lastName}
                  </Link>
                  {r.user.nickname && <span className="text-slate-400"> ({r.user.nickname})</span>}
                  {!r.user.active && <span className="badge ml-1 bg-slate-100 text-slate-500">ปิดแล้ว</span>}
                  <Working since={r.workingSince} />
                </td>
                <td className="px-2 py-2">{r.daysWorked}</td>
                <td className="px-2 py-2">{hrs(r.regularMin)}</td>
                <td className="px-2 py-2">{hrs(r.otApprovedMin)}</td>
                <td className="px-2 py-2">{r.otPendingMin ? <span className="text-sky-700">{hrs(r.otPendingMin)}</span> : "—"}</td>
                <td className="px-2 py-2">{r.lateDays ? `${r.lateDays} วัน (${r.lateMin} น.)` : "—"}</td>
                <td className="px-2 py-2">{r.forgotten ? <span className="text-red-600">{r.forgotten}</span> : "—"}</td>
                <td className="px-2 py-2">{r.leaveDays || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list && !list.length && <p className="py-6 text-center text-slate-400">{q ? "ไม่พบพนักงานที่ค้นหา" : "ยังไม่มีพนักงาน"}</p>}
      </div>
    </section>
  );
}

function Pending({ onCount }: { onCount: (n: number) => void }) {
  const [items, setItems] = useState<(Day & { user: Profile })[]>();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [err, setErr] = useState("");
  const [bulk, setBulk] = useState(false);
  const load = useCallback(
    () => Promise.all([api<(Day & { user: Profile })[]>("/api/admin/pending"), api<Leave[]>("/api/admin/leaves?status=pending")])
      .then(([d, l]) => { setItems(d); setLeaves(l); onCount(d.length + l.length); }),
    [onCount],
  );
  useEffect(() => { load(); }, [load]);
  const run = (p: Promise<unknown>) => p.then(load).catch((e) => setErr(e.message));

  if (!items) return <p className="text-slate-400">กำลังโหลด…</p>;
  if (!items.length && !leaves.length) return <p className="card text-center text-slate-500">ไม่มีรายการรอดำเนินการ 🎉</p>;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
    {leaves.length > 0 && (
      <section className="card max-h-[75vh] divide-y divide-sky-100 overflow-y-auto">
        <h2 className="pb-2 font-semibold text-sky-900">คำขอลา ({leaves.length})</h2>
        {leaves.map((l) => <LeaveItem key={l.id} l={l} actions={<LeaveDecision l={l} onDone={load} />} />)}
      </section>
    )}
    {items.length > 0 && (
    <section className="card max-h-[75vh] divide-y divide-sky-100 overflow-y-auto">
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <h2 className="font-semibold text-sky-900">OT รออนุมัติ / ลืมออกงาน ({items.length})</h2>
        {items.some((d) => !d.forgotten) && (
          <button className="btn-ghost ml-auto py-1 text-sm" disabled={bulk}
            onClick={() => {
              const ot = items.filter((d) => !d.forgotten);
              if (!confirm(`อนุมัติ OT ทั้ง ${ot.length} รายการ ตามเวลาที่ทำจริง?`)) return;
              setBulk(true);
              // ทีละรายการ: API อนุมัติเป็นรายวัน
              run(ot.reduce((p, d) => p.then(() => api("/api/admin/ot", { body: { userId: d.userId, date: d.date, minutes: d.otRawMin } })), Promise.resolve() as Promise<unknown>)
                .finally(() => setBulk(false)));
            }}>
            {bulk ? "กำลังอนุมัติ…" : "อนุมัติทั้งหมดตามจริง"}
          </button>
        )}
      </div>
      {err && <p className="pb-2 text-sm text-red-600">{err}</p>}
      {items.map((d) => (
        <div key={`${d.userId}|${d.date}`} className="space-y-2 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-sky-900">{d.user?.firstName} {d.user?.lastName}</span>
            <span className="text-slate-500">{dateLabel(d.date)}</span>
            <span className="text-sm text-slate-400">{d.sessions.map((s) => `${timeOf(s.clockIn)}–${timeOf(s.clockOut)}`).join(", ")}</span>
          </div>
          {d.forgotten ? (
            <p className="text-sm">
              <span className="badge bg-red-100 text-red-700">ลืมออกงาน</span>{" "}
              <Link className="text-sky-700 underline" href={`/admin/employees/${d.userId}?month=${d.date.slice(0, 7)}`}>ไปแก้เวลาออก</Link>
            </p>
          ) : (
            <OtControl day={d} run={run} />
          )}
        </div>
      ))}
    </section>
    )}
    </div>
  );
}

const FIELDS = [["username", "ชื่อผู้ใช้"], ["firstName", "ชื่อจริง"], ["lastName", "นามสกุล"], ["nickname", "ชื่อเล่น"], ["phone", "เบอร์โทร"], ["lineId", "LINE ID"]] as const;

function Employees() {
  const [list, setList] = useState<(Profile & { workingSince: number | null; rate: Rate | null })[]>();
  const [editing, setEditing] = useState<Profile | "new" | null>(null);
  const [q, setQ] = useState("");
  const load = useCallback(() => api<(Profile & { workingSince: number | null; rate: Rate | null })[]>("/api/admin/employees").then(setList), []);
  useEffect(() => { load(); }, [load]);
  const shown = list?.filter((e) => matchUser(e, q));
  const selectedId = editing && editing !== "new" ? editing.id : null;

  return (
    <section className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="card p-0">
        <div className="flex items-center gap-2 border-b border-sky-100 p-3">
          <SearchBox value={q} onChange={setQ} />
          <span className="text-sm text-slate-400">{list?.length ?? 0} คน</span>
          <button className="btn ml-auto py-1.5 text-sm" onClick={() => setEditing("new")}>+ เพิ่ม</button>
        </div>
        <div className="max-h-[70vh] divide-y divide-sky-50 overflow-y-auto">
          {shown?.map((e) => (
            <button key={e.id} onClick={() => setEditing(e)}
              className={`block w-full px-4 py-2.5 text-left transition hover:bg-sky-50 ${selectedId === e.id ? "bg-sky-50 ring-2 ring-inset ring-sky-300" : ""}`}>
              <p className="font-medium text-sky-900">
                {e.firstName} {e.lastName} {e.nickname && <span className="font-normal text-slate-400">({e.nickname})</span>}
                {!e.active && <span className="badge ml-1 bg-slate-100 text-slate-500">ปิดใช้งาน</span>}
                <Working since={e.workingSince} />
              </p>
              <p className="text-xs text-slate-500">
                @{e.username} · {e.phone || "—"} ·{" "}
                {e.rate
                  ? <>{baht(e.rate.rateSatang)}/ชม. · OT {baht(e.rate.otRateSatang)}</>
                  : <span className="text-amber-700">ยังไม่ได้ตั้งค่าแรง</span>}
              </p>
            </button>
          ))}
          {shown && !shown.length && <p className="p-6 text-center text-slate-400">{q ? "ไม่พบพนักงานที่ค้นหา" : "ยังไม่มีพนักงาน"}</p>}
        </div>
      </div>

      {/* มือถือ: แผงแก้ไขขึ้นก่อนรายชื่อ จะได้ไม่ต้องเลื่อนหา */}
      <div className={`space-y-4 lg:sticky lg:top-4 ${editing ? "order-first lg:order-none" : ""}`}>
        {editing ? (
          <>
            {editing !== "new" && (
              <Link className="text-sm text-sky-700 hover:underline" href={`/admin/employees/${editing.id}`}>ดูเวลางานและการลาของ {editing.firstName} →</Link>
            )}
            <EmployeeForm key={editing === "new" ? "form-new" : `form-${editing.id}`} emp={editing === "new" ? null : editing} onDone={(created) => { setEditing(created ?? null); load(); }} />
            {editing !== "new" && <Rates key={`rates-${editing.id}`} userId={editing.id} />}
          </>
        ) : (
          <p className="card hidden py-10 text-center text-slate-400 lg:block">เลือกพนักงานทางซ้ายเพื่อดูหรือแก้ไข</p>
        )}
      </div>
    </section>
  );
}

function EmployeeForm({ emp, onDone }: { emp: Profile | null; onDone: (created?: Profile) => void }) {
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body: Record<string, unknown> = Object.fromEntries(new FormData(e.currentTarget));
    if (emp && !body.password) delete body.password;
    try {
      const saved = await api<Profile>(emp ? `/api/admin/employees/${emp.id}` : "/api/admin/employees", { method: emp ? "PATCH" : "POST", body });
      onDone(emp ? undefined : saved); // พนักงานใหม่: เปิดค้างไว้ให้ตั้งค่าแรงต่อ
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  async function toggle() {
    if (!emp || !confirm(emp.active ? "ปิดการใช้งานพนักงานคนนี้? (ประวัติยังอยู่)" : "เปิดใช้งานอีกครั้ง?")) return;
    await api(`/api/admin/employees/${emp.id}`, { method: "PATCH", body: { active: !emp.active } }).then(() => onDone()).catch((e) => setErr(e.message));
  }
  return (
    <form onSubmit={submit} className="card grid gap-3 sm:grid-cols-2">
      <h2 className="font-semibold text-sky-900 sm:col-span-2">{emp ? "แก้ไขข้อมูลพนักงาน" : "เพิ่มพนักงาน"}</h2>
      {FIELDS.map(([k, label]) => (
        <label key={k} className="text-sm">
          <span className="label">{label}{["username", "firstName", "lastName"].includes(k) && " *"}</span>
          <input className="input" name={k} defaultValue={emp?.[k] ?? ""} required={["username", "firstName", "lastName"].includes(k)} autoCapitalize={k === "username" ? "none" : undefined} />
        </label>
      ))}
      <label className="text-sm">
        <span className="label">{emp ? "รีเซ็ตรหัสผ่าน (เว้นว่างถ้าไม่เปลี่ยน)" : "รหัสผ่าน *"}</span>
        <input className="input" name="password" type="text" minLength={6} required={!emp} autoComplete="new-password" />
      </label>
      {err && <p className="text-sm text-red-600 sm:col-span-2">{err}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn">บันทึก</button>
        <button type="button" className="btn-ghost" onClick={() => onDone()}>{emp ? "ปิด" : "ยกเลิก"}</button>
        {emp && (
          <button type="button" className={`btn-ghost ml-auto ${emp.active ? "text-red-600" : ""}`} onClick={toggle}>
            {emp.active ? "ปิดการใช้งาน" : "เปิดใช้งาน"}
          </button>
        )}
      </div>
    </form>
  );
}

function Settings() {
  const [rules, setRules] = useState<Record<string, string>>();
  const [msg, setMsg] = useState("");
  useEffect(() => { api<Record<string, string>>("/api/admin/settings").then(setRules); }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      setRules(await api("/api/admin/settings", { method: "PUT", body: Object.fromEntries(new FormData(e.currentTarget)) }));
      setMsg("บันทึกแล้ว มีผลกับวันที่ยังไม่มีการลงเวลา");
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  if (!rules) return <p className="text-slate-400">กำลังโหลด…</p>;
  return (
    <form onSubmit={submit} className="card grid max-w-lg gap-3 sm:grid-cols-2">
      {([["workStart", "เวลาเริ่มงาน"], ["workEnd", "เวลาเลิกงาน (หลังจากนี้เป็น OT)"], ["breakStart", "เริ่มพัก"], ["breakEnd", "จบพัก"]] as const).map(([k, l]) => (
        <label key={k} className="text-sm"><span className="label">{l}</span><TimeInput name={k} defaultValue={rules[k]} required /></label>
      ))}
      <p className="text-sm text-slate-500 sm:col-span-2">การเปลี่ยนแปลงไม่กระทบวันที่ลงเวลาไปแล้ว</p>
      {msg && <p className="text-sm text-sky-700 sm:col-span-2">{msg}</p>}
      <button className="btn sm:col-span-2">บันทึก</button>
    </form>
  );
}
